"""
5-Minute Resolution Scalper — buys the winning outcome after the observation window closes.

Strategy:
1. Discover active 5-min "Up or Down" markets on Polymarket (BTC, ETH, SOL, DOGE, XRP)
2. Record the asset price at window START from Binance
3. At window END, compare prices: went up or down?
4. Instantly buy the winning outcome token at ~99c
5. Collect $1.00 on resolution -> ~1% profit per trade

Speed: Binance WebSocket (sub-ms) + 0.5s check loop + pre-cached CLOB = <1s execution
"""
import asyncio
import aiohttp
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from .trading import get_user_clob_client, place_buy, invalidate_client
from .wallet import decrypt_key, get_usdc_balance
from .database import Database

log = logging.getLogger("polyx")

GAMMA_API = "https://gamma-api.polymarket.com"
BINANCE_WS = "wss://stream.binance.com:9443/ws"

# Assets we trade and their Binance symbols
ASSETS = {
    "btc": {"binance": "btcusdt", "name": "bitcoin", "slug_prefix": "btc-updown-5m-"},
    "eth": {"binance": "ethusdt", "name": "ethereum", "slug_prefix": "eth-updown-5m-"},
    "sol": {"binance": "solusdt", "name": "solana", "slug_prefix": "sol-updown-5m-"},
    "doge": {"binance": "dogeusdt", "name": "dogecoin", "slug_prefix": "doge-updown-5m-"},
    "xrp": {"binance": "xrpusdt", "name": "xrp", "slug_prefix": "xrp-updown-5m-"},
}

# How many seconds after window end to place the trade
# Orderbook needs time to fill with sellers at ~99c after window closes
TRADE_DELAY_SECS = 15


class Market:
    """A single 5-min Up/Down market."""
    __slots__ = ("asset", "slug", "window_start_ts", "window_end_ts", "condition_id",
                 "up_token", "down_token", "title", "start_price", "end_price",
                 "traded", "trade_result")

    def __init__(self, asset, slug, window_start_ts, condition_id, up_token, down_token, title):
        self.asset = asset
        self.slug = slug
        self.window_start_ts = window_start_ts
        self.window_end_ts = window_start_ts + 300
        self.condition_id = condition_id
        self.up_token = up_token
        self.down_token = down_token
        self.title = title
        self.start_price: Optional[float] = None
        self.end_price: Optional[float] = None
        self.traded = False
        self.trade_result: Optional[str] = None


class ScalperBot:
    def __init__(self, db: Database, telegram_id: int, bot=None):
        self.db = db
        self.telegram_id = telegram_id
        self.bot = bot
        self.prices: dict[str, float] = {}
        self.markets: dict[str, Market] = {}
        self.client = None
        self.private_key = ""
        self.wallet = ""
        self.proxy_wallet = ""
        self.running = False
        self.stats = {"trades": 0, "wins": 0, "pnl": 0.0}

    async def start(self):
        user = await self.db.get_user(self.telegram_id)
        if not user or not user.get("private_key_enc"):
            log.error("[Scalper] No wallet configured")
            return

        self.private_key = decrypt_key(user["private_key_enc"])
        self.wallet = user["wallet_address"]
        self.proxy_wallet = user.get("proxy_wallet", "")

        # Pre-cache CLOB client
        try:
            invalidate_client(self.telegram_id)
            self.client = get_user_clob_client(self.telegram_id, self.private_key, self.wallet)
            log.info("[Scalper] CLOB client ready")
        except Exception as e:
            log.error(f"[Scalper] CLOB client failed: {e}")
            return

        self.running = True
        balance = get_usdc_balance(self.proxy_wallet or self.wallet)
        log.info(f"[Scalper] Started | Balance: ${balance:.2f} | Assets: {list(ASSETS.keys())}")

        await self._notify(
            "<b>Scalper Started</b>\n"
            f"Balance: ${balance:.2f}\n"
            "Assets: BTC, ETH, SOL, DOGE, XRP\n"
            "Strategy: 5-min resolution scalping"
        )

        await asyncio.gather(
            self._binance_price_feed(),
            self._market_discovery_loop(),
            self._trading_loop(),
        )

    async def stop(self):
        self.running = False

    # ── Binance WebSocket ──

    async def _binance_price_feed(self):
        symbols = [cfg["binance"] for cfg in ASSETS.values()]
        streams = "/".join(f"{sym}@trade" for sym in symbols)
        url = f"{BINANCE_WS}/{streams}"

        while self.running:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.ws_connect(url, heartbeat=20) as ws:
                        log.info(f"[Scalper] Binance WS connected ({len(symbols)} streams)")
                        async for msg in ws:
                            if not self.running:
                                break
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = json.loads(msg.data)
                                symbol = data.get("s", "").lower()
                                price = float(data.get("p", 0))
                                if symbol and price > 0:
                                    self.prices[symbol] = price
                            elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                                break
            except Exception as e:
                log.error(f"[Scalper] Binance WS error: {e}")
            if self.running:
                await asyncio.sleep(1)

    # ── Market Discovery ──

    async def _market_discovery_loop(self):
        """Discover markets every 15 seconds — constructs predictable slugs."""
        while self.running:
            try:
                await self._discover_markets()
            except Exception as e:
                log.error(f"[Scalper] Discovery error: {e}")
            await asyncio.sleep(15)

    async def _discover_markets(self):
        """Construct predictable slugs and fetch market data directly.

        Markets run every 5 minutes: slug = {asset}-updown-5m-{unix_ts}
        where unix_ts is aligned to 300-second intervals.
        """
        now = int(time.time())
        current_window = (now // 300) * 300  # current 5-min slot

        async with aiohttp.ClientSession() as s:
            # Check current window and next window for each asset
            for window_ts in [current_window, current_window + 300]:
                for asset, cfg in ASSETS.items():
                    slug = cfg["slug_prefix"] + str(window_ts)

                    if slug in self.markets:
                        continue

                    try:
                        async with s.get(
                            f"{GAMMA_API}/events",
                            params={"slug": slug},
                            timeout=aiohttp.ClientTimeout(total=8),
                        ) as r:
                            data = await r.json()

                        events = data if isinstance(data, list) else [data] if isinstance(data, dict) and data else []

                        for e in events:
                            if not e or not isinstance(e, dict):
                                continue
                            title = e.get("title", "")
                            if "up or down" not in title.lower():
                                continue

                            markets = e.get("markets", [])
                            if not markets:
                                continue

                            m = markets[0]
                            condition_id = m.get("conditionId", "")
                            outcomes = m.get("outcomes", [])
                            tokens_raw = m.get("clobTokenIds") or m.get("clob_token_ids") or []

                            if isinstance(tokens_raw, str):
                                try:
                                    tokens = json.loads(tokens_raw)
                                except json.JSONDecodeError:
                                    tokens = []
                            else:
                                tokens = tokens_raw

                            if len(tokens) < 2 or len(outcomes) < 2:
                                continue

                            up_idx = next((i for i, o in enumerate(outcomes) if o.lower() == "up"), 0)
                            down_idx = next((i for i, o in enumerate(outcomes) if o.lower() == "down"), 1)

                            market = Market(
                                asset=asset,
                                slug=slug,
                                window_start_ts=window_ts,
                                condition_id=condition_id,
                                up_token=tokens[up_idx],
                                down_token=tokens[down_idx],
                                title=title,
                            )

                            # Record start price if window already open
                            binance_sym = cfg["binance"]
                            if binance_sym in self.prices and now >= window_ts:
                                market.start_price = self.prices[binance_sym]

                            self.markets[slug] = market
                            window_end = window_ts + 300
                            secs_to_end = window_end - now
                            start_utc = datetime.fromtimestamp(window_ts, tz=timezone.utc).strftime("%H:%M")
                            end_utc = datetime.fromtimestamp(window_end, tz=timezone.utc).strftime("%H:%M")
                            log.info(f"[Scalper] Tracking: {asset.upper()} {start_utc}-{end_utc} UTC "
                                     f"(ends in {secs_to_end}s) | {title[:50]}")

                    except Exception as e:
                        pass  # market might not exist yet, that's fine

    # ── Trading Loop ──

    async def _trading_loop(self):
        """Check every 0.5s — record start prices and trade when windows close.

        Only trades ONE asset per 5-min window (BTC preferred, highest liquidity).
        Retries up to 3 times with 5s gaps if orderbook is empty.
        """
        # Priority order — trade the first one that works
        asset_priority = ["btc", "eth", "sol", "doge", "xrp"]
        traded_windows: set[int] = set()  # window_start_ts we already traded

        while self.running:
            now = int(time.time())

            for slug, market in list(self.markets.items()):
                if market.traded:
                    if now > market.window_end_ts + 600:
                        del self.markets[slug]
                    continue

                binance_sym = ASSETS[market.asset]["binance"]
                current_price = self.prices.get(binance_sym)
                if not current_price:
                    continue

                # Record start price at window open
                if market.start_price is None and now >= market.window_start_ts:
                    market.start_price = current_price
                    log.info(f"[Scalper] {market.asset.upper()} window OPEN | "
                             f"start=${current_price:,.2f} | {market.title[:50]}")

                # Trade when window closes + delay
                if now >= market.window_end_ts + TRADE_DELAY_SECS and market.start_price is not None:
                    # Only trade one asset per window to avoid spreading $18 across 5
                    if market.window_start_ts in traded_windows:
                        market.traded = True
                        market.trade_result = "SKIPPED (already traded this window)"
                        continue

                    market.end_price = current_price
                    success = await self._execute_trade_with_retry(market)
                    if success:
                        traded_windows.add(market.window_start_ts)

            await asyncio.sleep(0.5)

    async def _execute_trade_with_retry(self, market: Market, max_retries: int = 3) -> bool:
        """Try to execute trade, retry if orderbook is empty."""
        for attempt in range(max_retries):
            success = await self._execute_trade(market)
            if success:
                return True
            if attempt < max_retries - 1:
                market.traded = False  # reset for retry
                log.info(f"[Scalper] Retry {attempt + 2}/{max_retries} in 5s...")
                await asyncio.sleep(5)
        return False

    async def _execute_trade(self, market: Market) -> bool:
        """Returns True on success, False on failure (for retry)."""
        market.traded = True

        start_price = market.start_price
        end_price = market.end_price
        if not start_price or not end_price:
            log.warning(f"[Scalper] No price data for {market.slug}")
            return False

        went_up = end_price >= start_price
        direction = "Up" if went_up else "Down"
        token_id = market.up_token if went_up else market.down_token
        price_change = ((end_price - start_price) / start_price) * 100

        log.info(f"[Scalper] {market.asset.upper()} -> {direction} | "
                 f"${start_price:,.2f} -> ${end_price:,.2f} ({price_change:+.3f}%) | "
                 f"Buying {direction}")

        # Use 95% of balance — outcome is already known
        balance = get_usdc_balance(self.proxy_wallet or self.wallet)
        bet = round(balance * 0.95, 2)

        if bet < 0.10:
            log.info(f"[Scalper] Low balance: ${balance:.2f}")
            market.trade_result = "LOW_BALANCE"
            return False

        try:
            if not self.client:
                self.client = get_user_clob_client(self.telegram_id, self.private_key, self.wallet)

            result = await asyncio.get_event_loop().run_in_executor(
                None, place_buy, self.client, token_id, bet)

            market.trade_result = "SUCCESS"
            self.stats["trades"] += 1

            log.info(f"[Scalper] BOUGHT {direction} ${bet:.2f} | {market.title[:50]}")

            # Record in DB
            pos_id = await self.db.open_position(
                telegram_id=self.telegram_id,
                target_wallet="scalper",
                condition_id=market.condition_id,
                outcome_index=0 if went_up else 1,
                token_id=token_id,
                title=market.title,
                outcome=direction,
                entry_price=0.99,
                bet_amount=bet,
                target_usdc_size=bet,
                event_slug=market.slug,
                source_timestamp=str(int(time.time())),
            )
            await self.db.record_trade(
                telegram_id=self.telegram_id,
                position_id=pos_id,
                side="BUY",
                token_id=token_id,
                amount=bet,
                price=0.99,
                fee=0,
                is_copy=False,
                source_wallet="scalper",
                dry_run=False,
            )

            await self._notify(
                f"<b>SCALP BUY</b>\n"
                f"{market.title}\n"
                f"{market.asset.upper()}: ${start_price:,.2f} -> ${end_price:,.2f} ({price_change:+.3f}%)\n"
                f"Outcome: <b>{direction}</b>\n"
                f"Bet: <b>${bet:.2f}</b>\n"
                f"Trades today: {self.stats['trades']}"
            )
            return True

        except Exception as e:
            market.trade_result = f"FAILED: {e}"
            log.error(f"[Scalper] Buy failed: {e}")
            return False

    async def _notify(self, text: str):
        if not self.bot:
            return
        try:
            await self.bot.send_message(
                chat_id=self.telegram_id,
                text=text,
                parse_mode="HTML",
            )
        except Exception as e:
            log.error(f"[Scalper] Notify failed: {e}")
