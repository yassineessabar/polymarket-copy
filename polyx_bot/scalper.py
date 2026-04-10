"""
5-Minute Resolution Scalper — buys the winning outcome after the observation window closes.

Strategy:
1. Discover active 5-min "Up or Down" markets on Polymarket (BTC, ETH, SOL, DOGE, XRP)
2. Record the asset price at window START from Binance
3. At window END, compare prices: went up or down?
4. Instantly buy the winning outcome token at ~99c
5. Collect $1.00 on resolution → ~1% profit per trade

Architecture:
- Binance WebSocket for real-time price feeds (sub-second)
- Polymarket Gamma API to discover markets every 60s
- Pre-cached CLOB client for instant order execution
- Tracks P&L and sends Telegram notifications
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
BINANCE_REST = "https://api.binance.com/api/v3"

# Assets we trade
ASSETS = {
    "btc": {"binance": "btcusdt", "slug_prefix": "btc-updown-5m-"},
    "eth": {"binance": "ethusdt", "slug_prefix": "eth-updown-5m-"},
    "sol": {"binance": "solusdt", "slug_prefix": "sol-updown-5m-"},
    "doge": {"binance": "dogeusdt", "slug_prefix": "doge-updown-5m-"},
    "xrp": {"binance": "xrpusdt", "slug_prefix": "xrp-updown-5m-"},
}

# How many seconds after window end to place the trade
# (window closes, we compare prices, then buy immediately)
TRADE_DELAY_SECS = 2  # wait 2s after window end for price to settle


class Market:
    """A single 5-min Up/Down market."""
    def __init__(self, asset: str, slug: str, window_start_ts: int,
                 condition_id: str, up_token: str, down_token: str, title: str):
        self.asset = asset
        self.slug = slug
        self.window_start_ts = window_start_ts
        self.window_end_ts = window_start_ts + 300  # 5 minutes
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
        self.bot = bot  # Telegram bot for notifications
        self.prices: dict[str, float] = {}  # {symbol: price} from Binance
        self.markets: dict[str, Market] = {}  # {slug: Market}
        self.client = None  # CLOB client
        self.private_key = ""
        self.wallet = ""
        self.proxy_wallet = ""
        self.running = False
        self.stats = {"trades": 0, "wins": 0, "pnl": 0.0}

    async def start(self):
        """Initialize and start the scalper."""
        user = await self.db.get_user(self.telegram_id)
        if not user or not user.get("private_key_enc"):
            log.error(f"[Scalper] No wallet for user {self.telegram_id}")
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
        balance = get_usdc_balance(self.proxy_wallet) if self.proxy_wallet else get_usdc_balance(self.wallet)
        log.info(f"[Scalper] Started | Balance: ${balance:.2f} | Assets: {list(ASSETS.keys())}")

        await self._notify(
            f"<b>Scalper Started</b>\n"
            f"Balance: ${balance:.2f}\n"
            f"Assets: BTC, ETH, SOL, DOGE, XRP\n"
            f"Strategy: 5-min resolution scalping"
        )

        # Run all tasks concurrently
        await asyncio.gather(
            self._binance_price_feed(),
            self._market_discovery_loop(),
            self._trading_loop(),
        )

    async def stop(self):
        self.running = False

    # ── Binance WebSocket for real-time prices ──

    async def _binance_price_feed(self):
        """Connect to Binance WebSocket for real-time price updates."""
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
                await asyncio.sleep(2)  # reconnect after 2s

    # ── Market Discovery ──

    async def _market_discovery_loop(self):
        """Discover new 5-min markets every 60 seconds."""
        while self.running:
            try:
                await self._discover_markets()
            except Exception as e:
                log.error(f"[Scalper] Discovery error: {e}")
            await asyncio.sleep(60)

    async def _discover_markets(self):
        """Fetch active 5-min Up/Down markets from Polymarket."""
        now = int(time.time())
        async with aiohttp.ClientSession() as s:
            for asset, cfg in ASSETS.items():
                try:
                    async with s.get(
                        f"{GAMMA_API}/events",
                        params={
                            "active": "true", "closed": "false", "limit": "5",
                            "slug_contains": cfg["slug_prefix"],
                            "order": "startDate", "ascending": "false",
                        },
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as r:
                        events = await r.json()

                    for e in events:
                        title = e.get("title", "")
                        if "up or down" not in title.lower():
                            continue
                        # Check asset matches (title contains asset name)
                        asset_names = {
                            "btc": "bitcoin", "eth": "ethereum", "sol": "solana",
                            "doge": "dogecoin", "xrp": "xrp",
                        }
                        if asset_names.get(asset, "") not in title.lower():
                            continue

                        slug = e.get("slug", "")
                        if slug in self.markets:
                            continue  # already tracking

                        # Extract window timestamp from slug
                        parts = slug.split("-")
                        slug_ts = int(parts[-1]) if parts[-1].isdigit() else 0
                        if not slug_ts:
                            continue

                        # Only track markets that haven't ended yet (with 5min buffer)
                        window_end = slug_ts + 300
                        if window_end + 300 < now:  # skip if ended > 5min ago
                            continue

                        markets = e.get("markets", [])
                        if not markets:
                            continue

                        m = markets[0]
                        condition_id = m.get("conditionId", "")
                        outcomes = m.get("outcomes", [])
                        tokens_raw = m.get("clobTokenIds") or m.get("clob_token_ids") or []

                        # Parse tokens - could be JSON string or list
                        if isinstance(tokens_raw, str):
                            try:
                                tokens = json.loads(tokens_raw)
                            except json.JSONDecodeError:
                                tokens = []
                        else:
                            tokens = tokens_raw

                        if len(tokens) < 2 or len(outcomes) < 2:
                            continue

                        # Map outcomes to tokens
                        up_idx = next((i for i, o in enumerate(outcomes) if o.lower() == "up"), 0)
                        down_idx = next((i for i, o in enumerate(outcomes) if o.lower() == "down"), 1)

                        market = Market(
                            asset=asset,
                            slug=slug,
                            window_start_ts=slug_ts,
                            condition_id=condition_id,
                            up_token=tokens[up_idx],
                            down_token=tokens[down_idx],
                            title=title,
                        )
                        self.markets[slug] = market
                        log.info(f"[Scalper] Tracking: {title} (window {datetime.fromtimestamp(slug_ts, tz=timezone.utc).strftime('%H:%M')}-{datetime.fromtimestamp(slug_ts+300, tz=timezone.utc).strftime('%H:%M')} UTC)")

                except Exception as e:
                    log.error(f"[Scalper] Discovery error for {asset}: {e}")

    # ── Trading Loop ──

    async def _trading_loop(self):
        """Check markets every 0.5s and trade when windows close."""
        while self.running:
            now = int(time.time())

            for slug, market in list(self.markets.items()):
                if market.traded:
                    # Clean up old markets (5 min after trade)
                    if now > market.window_end_ts + 300:
                        del self.markets[slug]
                    continue

                binance_sym = ASSETS[market.asset]["binance"]
                current_price = self.prices.get(binance_sym)

                if not current_price:
                    continue

                # Record start price when window opens
                if market.start_price is None and now >= market.window_start_ts:
                    market.start_price = current_price
                    log.info(f"[Scalper] {market.asset.upper()} window open | start=${current_price:,.2f} | {market.title[:50]}")

                # Trade when window closes
                if now >= market.window_end_ts + TRADE_DELAY_SECS and market.start_price is not None:
                    market.end_price = current_price
                    await self._execute_trade(market)

            await asyncio.sleep(0.5)

    async def _execute_trade(self, market: Market):
        """Buy the winning outcome."""
        market.traded = True

        start_price = market.start_price
        end_price = market.end_price
        if not start_price or not end_price:
            return

        went_up = end_price >= start_price
        direction = "Up" if went_up else "Down"
        token_id = market.up_token if went_up else market.down_token
        price_change = ((end_price - start_price) / start_price) * 100

        log.info(f"[Scalper] {market.asset.upper()} {direction} | "
                 f"${start_price:,.2f} -> ${end_price:,.2f} ({price_change:+.3f}%) | "
                 f"Buying {direction} token")

        # Calculate bet size
        settings = await self.db.get_settings(self.telegram_id)
        balance = get_usdc_balance(self.proxy_wallet) if self.proxy_wallet else get_usdc_balance(self.wallet)

        max_bet = balance * 0.25  # max 25% per trade
        bet = min(max_bet, balance * 0.10)  # default 10% of balance
        min_bet = settings.get("min_bet", 0.01) if settings else 0.01

        if bet < min_bet:
            log.info(f"[Scalper] Bet too small: ${bet:.2f}")
            market.trade_result = "TOO_SMALL"
            return

        # Execute the buy
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
                entry_price=0.99,  # approximate
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

        except Exception as e:
            market.trade_result = f"FAILED: {e}"
            log.error(f"[Scalper] Buy failed: {e}")
            await self._notify(
                f"<b>SCALP FAILED</b>\n"
                f"{market.title}\n"
                f"{direction} | ${bet:.2f}\n"
                f"Error: {str(e)[:100]}"
            )

    async def _notify(self, text: str):
        """Send Telegram notification."""
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
