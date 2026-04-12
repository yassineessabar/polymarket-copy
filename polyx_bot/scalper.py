"""
5-Minute Resolution Scalper — buys the winning outcome before window closes.

Strategy:
1. Discover active 5-min "Up or Down" markets on Polymarket
2. Record asset price at window START from Binance WebSocket
3. 12 seconds before window END, compare prices
4. Buy the winning outcome token
5. Collect on resolution

Uses Canada/IPRoyal proxy to bypass Polymarket geoblock on POST /order.
"""
import asyncio
import aiohttp
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

from .database import Database

log = logging.getLogger("scalper")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

TELEGRAM_ID = 7446549575

GAMMA_API = "https://gamma-api.polymarket.com"
COINBASE_WS = "wss://ws-feed.exchange.coinbase.com"

# IPRoyal Canada proxy — bypasses Polymarket geoblock
PROXY_URL = os.getenv(
    "CLOB_PROXY",
    "http://USudQdWQfvtkruAw:pyssQ8AvUhM8yto9_country-ca@geo.iproyal.com:12321",
)

ASSETS = {
    "btc": {"coinbase": "BTC-USD", "slug_prefix": "btc-updown-5m-"},
    "eth": {"coinbase": "ETH-USD", "slug_prefix": "eth-updown-5m-"},
    "sol": {"coinbase": "SOL-USD", "slug_prefix": "sol-updown-5m-"},
    "doge": {"coinbase": "DOGE-USD", "slug_prefix": "doge-updown-5m-"},
    "xrp": {"coinbase": "XRP-USD", "slug_prefix": "xrp-updown-5m-"},
}

TRADE_BEFORE_SECS = 12


class Market:
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
    def __init__(self, private_key: str, wallet: str):
        self.private_key = private_key
        self.wallet = wallet
        self.prices: dict[str, float] = {}
        self.markets: dict[str, Market] = {}
        self.client = None
        self.db = Database()
        self.running = False
        self.stats = {"trades": 0, "success": 0, "failed": 0}

    def _init_clob(self):
        """Initialize CLOB client with Canada proxy."""
        import httpx
        from py_clob_client.http_helpers import helpers
        from py_clob_client.client import ClobClient

        # Patch httpx with proxy
        helpers._http_client = httpx.Client(proxy=PROXY_URL, timeout=30.0)

        self.client = ClobClient(
            "https://clob.polymarket.com",
            key=self.private_key,
            chain_id=137,
            signature_type=0,
            funder=self.wallet,
        )
        creds = self.client.derive_api_key()
        self.client.set_api_creds(creds)
        log.info("[Scalper] CLOB client ready (Canada proxy)")

    async def start(self):
        await self.db.init()
        self._init_clob()
        self.running = True

        from polyx_bot.wallet import get_usdc_balance
        balance = get_usdc_balance(self.wallet)
        log.info(f"[Scalper] Started | Balance: ${balance:.2f} | Assets: {list(ASSETS.keys())}")

        # Use create_task so each coroutine runs independently
        t1 = asyncio.create_task(self._binance_price_feed())
        t2 = asyncio.create_task(self._market_discovery_loop())
        t3 = asyncio.create_task(self._trading_loop())
        await asyncio.gather(t1, t2, t3)

    # ── Coinbase WebSocket ──

    async def _binance_price_feed(self):
        """Connect to Coinbase WebSocket for real-time prices."""
        product_ids = [cfg["coinbase"] for cfg in ASSETS.values()]

        while self.running:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.ws_connect(COINBASE_WS, heartbeat=20) as ws:
                        await ws.send_json({
                            "type": "subscribe",
                            "channels": [{"name": "ticker", "product_ids": product_ids}],
                        })
                        log.info(f"[Scalper] Coinbase WS connected ({len(product_ids)} feeds)")
                        async for msg in ws:
                            if not self.running:
                                break
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = json.loads(msg.data)
                                if data.get("type") == "ticker":
                                    product = data.get("product_id", "")
                                    price = float(data.get("price", 0))
                                    if product and price > 0:
                                        self.prices[product] = price
                            elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                                break
                            await asyncio.sleep(0.01)
            except Exception as e:
                log.error(f"[Scalper] Coinbase WS error: {e}")
            if self.running:
                await asyncio.sleep(1)

    # ── Market Discovery ──

    async def _market_discovery_loop(self):
        import requests as req
        while self.running:
            try:
                self._discover_markets_sync(req)
            except Exception as e:
                log.error(f"[Scalper] Discovery error: {e}")
            await asyncio.sleep(15)

    def _discover_markets_sync(self, req):
        """Synchronous discovery using requests (avoids aiohttp event loop issues)."""
        now = int(time.time())
        current_window = (now // 300) * 300

        for window_ts in [current_window, current_window + 300]:
            for asset, cfg in ASSETS.items():
                slug = cfg["slug_prefix"] + str(window_ts)
                if slug in self.markets:
                    continue

                try:
                    r = req.get(
                        f"{GAMMA_API}/events",
                        params={"slug": slug},
                        timeout=8,
                    )
                    data = r.json()
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
                            asset=asset, slug=slug, window_start_ts=window_ts,
                            condition_id=condition_id,
                            up_token=tokens[up_idx], down_token=tokens[down_idx],
                            title=title,
                        )

                        coinbase_sym = cfg["coinbase"]
                        if coinbase_sym in self.prices and now >= window_ts:
                            market.start_price = self.prices[coinbase_sym]

                        self.markets[slug] = market
                        secs_to_end = (window_ts + 300) - now
                        start_utc = datetime.fromtimestamp(window_ts, tz=timezone.utc).strftime("%H:%M")
                        end_utc = datetime.fromtimestamp(window_ts + 300, tz=timezone.utc).strftime("%H:%M")
                        log.info(f"[Scalper] Tracking: {asset.upper()} {start_utc}-{end_utc} UTC "
                                 f"(ends in {secs_to_end}s)")
                except Exception:
                    pass

    async def _discover_markets(self):
        now = int(time.time())
        current_window = (now // 300) * 300

        async with aiohttp.ClientSession() as s:
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
                                asset=asset, slug=slug, window_start_ts=window_ts,
                                condition_id=condition_id,
                                up_token=tokens[up_idx], down_token=tokens[down_idx],
                                title=title,
                            )

                            binance_sym = cfg["binance"]
                            if binance_sym in self.prices and now >= window_ts:
                                market.start_price = self.prices[binance_sym]

                            self.markets[slug] = market
                            secs_to_end = (window_ts + 300) - now
                            start_utc = datetime.fromtimestamp(window_ts, tz=timezone.utc).strftime("%H:%M")
                            end_utc = datetime.fromtimestamp(window_ts + 300, tz=timezone.utc).strftime("%H:%M")
                            log.info(f"[Scalper] Tracking: {asset.upper()} {start_utc}-{end_utc} UTC "
                                     f"(ends in {secs_to_end}s)")
                    except Exception:
                        pass

    # ── Trading Loop ──

    async def _trading_loop(self):
        traded_windows: set[int] = set()

        while self.running:
            now = int(time.time())

            for slug, market in list(self.markets.items()):
                if market.traded:
                    if now > market.window_end_ts + 300:
                        del self.markets[slug]
                    continue

                binance_sym = ASSETS[market.asset]["coinbase"]
                current_price = self.prices.get(binance_sym)
                if not current_price:
                    continue

                # Record start price
                if market.start_price is None and now >= market.window_start_ts:
                    market.start_price = current_price
                    log.info(f"[Scalper] {market.asset.upper()} window OPEN | "
                             f"start=${current_price:,.2f}")

                # Trade BEFORE window closes
                secs_to_close = market.window_end_ts - now
                if 0 < secs_to_close <= TRADE_BEFORE_SECS and market.start_price is not None:
                    if market.window_start_ts in traded_windows:
                        market.traded = True
                        continue

                    price_change_pct = abs(current_price - market.start_price) / market.start_price * 100
                    if price_change_pct < 0.005:
                        continue

                    market.end_price = current_price
                    success = await self._execute_trade(market)
                    if success:
                        traded_windows.add(market.window_start_ts)

                if now > market.window_end_ts + 5 and not market.traded:
                    market.traded = True

            await asyncio.sleep(0.5)

    async def _execute_trade(self, market: Market) -> bool:
        market.traded = True

        start_price = market.start_price
        end_price = market.end_price
        if not start_price or not end_price:
            return False

        went_up = end_price >= start_price
        direction = "Up" if went_up else "Down"
        token_id = market.up_token if went_up else market.down_token
        price_change = ((end_price - start_price) / start_price) * 100

        log.info(f"[Scalper] {market.asset.upper()} -> {direction} | "
                 f"${start_price:,.2f} -> ${end_price:,.2f} ({price_change:+.3f}%)")

        # Use 90% of balance
        from polyx_bot.wallet import get_usdc_balance
        balance = get_usdc_balance(self.wallet)
        bet = round(balance * 0.90, 2)

        if bet < 1.0:
            log.info(f"[Scalper] Balance too low: ${balance:.2f}")
            market.trade_result = "LOW_BALANCE"
            return False

        try:
            from py_clob_client.clob_types import MarketOrderArgs, OrderType
            from py_clob_client.order_builder.constants import BUY

            result = await asyncio.get_event_loop().run_in_executor(
                None, self._place_order, token_id, bet)

            market.trade_result = "SUCCESS"
            self.stats["trades"] += 1
            self.stats["success"] += 1
            log.info(f"[Scalper] BOUGHT {direction} ${bet:.2f} | {market.title[:50]}")
            log.info(f"[Scalper] Order: {result}")

            # Record to DB for dashboard
            try:
                pos_id = await self.db.open_position(
                    telegram_id=TELEGRAM_ID,
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
                    telegram_id=TELEGRAM_ID,
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
                log.info(f"[Scalper] Recorded position {pos_id} in DB")
            except Exception as db_err:
                log.error(f"[Scalper] DB record failed: {db_err}")

            return True

        except Exception as e:
            market.trade_result = f"FAILED: {e}"
            self.stats["trades"] += 1
            self.stats["failed"] += 1
            log.error(f"[Scalper] Buy failed: {e}")
            return False

    def _place_order(self, token_id: str, amount: float):
        """Place GTC limit buy at 99c (runs in executor thread)."""
        from py_clob_client.clob_types import OrderArgs, OrderType
        from py_clob_client.order_builder.constants import BUY

        # Buy at 99c — outcome tokens resolve to $1, profit = 1%
        # GTC stays on book until filled (no "no match" issues)
        size = round(amount / 0.99, 1)  # $2.12 / 0.99 = ~2.1 shares
        order = self.client.create_order(
            OrderArgs(
                token_id=token_id,
                price=0.99,
                size=size,
                side=BUY,
            )
        )
        return self.client.post_order(order, OrderType.GTC)


async def main():
    """Standalone entry point."""
    from polyx_bot.wallet import decrypt_key
    import aiosqlite

    async with aiosqlite.connect("polyx.db") as conn:
        async with conn.execute(
            "SELECT private_key_enc, wallet_address FROM users WHERE telegram_id=7446549575"
        ) as cur:
            row = await cur.fetchone()

    pk = decrypt_key(row[0])
    wallet = row[1]

    bot = ScalperBot(pk, wallet)
    await bot.start()


if __name__ == "__main__":
    asyncio.run(main())
