"""
5-Minute Resolution Scalper — uses Chainlink oracle (same as Polymarket).

FIXES APPLIED:
- Chainlink staleness check (rejects prices >120s old)
- Async discovery (non-blocking)
- Demo balance credits back on resolution
- Position close/resolution detection
- Top-level exception handler
- FOK for immediate execution (not GTC)
"""
import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import aiohttp

from .chainlink import get_chainlink_price, FEEDS
from .database import Database

log = logging.getLogger("scalper")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

GAMMA_API = "https://gamma-api.polymarket.com"
TELEGRAM_ID = 7446549575

PROXY_URL = os.getenv(
    "CLOB_PROXY",
    "http://USudQdWQfvtkruAw:pyssQ8AvUhM8yto9_country-ca@geo.iproyal.com:12321",
)

ASSETS = {
    "btc": {"slug_prefix": "btc-updown-5m-"},
    "eth": {"slug_prefix": "eth-updown-5m-"},
    "doge": {"slug_prefix": "doge-updown-5m-"},
    "xrp": {"slug_prefix": "xrp-updown-5m-"},
}

TRADE_BEFORE_SECS = 5
MIN_PRICE_CHANGE_PCT = 0.05


class Market:
    __slots__ = ("asset", "slug", "window_start_ts", "window_end_ts", "condition_id",
                 "up_token", "down_token", "title", "start_price", "traded",
                 "trade_result", "direction", "bet_amount", "pos_id")

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
        self.traded = False
        self.trade_result: Optional[str] = None
        self.direction: Optional[str] = None
        self.bet_amount: float = 0
        self.pos_id: Optional[int] = None


class ScalperBot:
    def __init__(self, private_key: str, wallet: str):
        self.private_key = private_key
        self.wallet = wallet
        self.markets: dict[str, Market] = {}
        self.client = None
        self.db = Database()
        self.running = False
        self.stats = {"trades": 0, "wins": 0, "losses": 0}

    def _init_clob(self):
        import httpx
        from py_clob_client.http_helpers import helpers
        from py_clob_client.client import ClobClient
        helpers._http_client = httpx.Client(proxy=PROXY_URL, timeout=30.0)
        self.client = ClobClient(
            "https://clob.polymarket.com", key=self.private_key,
            chain_id=137, signature_type=0, funder=self.wallet,
        )
        creds = self.client.derive_api_key()
        self.client.set_api_creds(creds)
        log.info("[Scalper] CLOB client ready (Canada proxy)")

    async def start(self):
        await self.db.init()
        self._init_clob()
        self.running = True
        settings = await self.db.get_settings(TELEGRAM_ID)
        demo = bool(settings.get("demo_mode", 0)) if settings else False
        bal = settings.get("demo_balance", 0) if demo else 0
        mode = "DEMO $" + str(bal) if demo else "LIVE"
        log.info(f"[Scalper] Started | Mode: {mode} | Oracle: Chainlink on-chain")

        # Run discovery and trading as separate tasks
        t1 = asyncio.create_task(self._discovery_loop())
        t2 = asyncio.create_task(self._trading_loop())
        t3 = asyncio.create_task(self._resolution_loop())
        await asyncio.gather(t1, t2, t3)

    # ── DISCOVERY (async, non-blocking) ──

    async def _discovery_loop(self):
        while self.running:
            try:
                await self._discover_markets()
            except Exception as e:
                log.error(f"[Scalper] Discovery error: {e}")
            await asyncio.sleep(15)

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
                            f"{GAMMA_API}/events", params={"slug": slug},
                            timeout=aiohttp.ClientTimeout(total=8),
                        ) as r:
                            data = await r.json()
                        events = data if isinstance(data, list) else [data] if isinstance(data, dict) and data else []
                        for e in events:
                            if not e or "up or down" not in e.get("title", "").lower():
                                continue
                            ms = e.get("markets", [])
                            if not ms:
                                continue
                            m = ms[0]
                            tokens_raw = m.get("clobTokenIds") or []
                            if isinstance(tokens_raw, str):
                                tokens = json.loads(tokens_raw)
                            else:
                                tokens = tokens_raw
                            outcomes = m.get("outcomes", [])
                            if len(tokens) < 2 or len(outcomes) < 2:
                                continue
                            up_idx = next((i for i, o in enumerate(outcomes) if o.lower() == "up"), 0)
                            down_idx = next((i for i, o in enumerate(outcomes) if o.lower() == "down"), 1)
                            market = Market(
                                asset=asset, slug=slug, window_start_ts=window_ts,
                                condition_id=m.get("conditionId", ""),
                                up_token=tokens[up_idx], down_token=tokens[down_idx],
                                title=e.get("title", ""),
                            )
                            self.markets[slug] = market
                            secs_to_end = (window_ts + 300) - now
                            s_utc = datetime.fromtimestamp(window_ts, tz=timezone.utc).strftime("%H:%M")
                            e_utc = datetime.fromtimestamp(window_ts + 300, tz=timezone.utc).strftime("%H:%M")
                            log.info(f"[Scalper] Tracking: {asset.upper()} {s_utc}-{e_utc} UTC (ends in {secs_to_end}s)")
                    except Exception:
                        pass

    # ── TRADING (reads Chainlink, places bets) ──

    async def _trading_loop(self):
        traded_windows: set[int] = set()
        while self.running:
            try:
                now = int(time.time())
                for slug, market in list(self.markets.items()):
                    if market.traded:
                        if now > market.window_end_ts + 600:
                            del self.markets[slug]
                        continue

                    price = get_chainlink_price(market.asset)
                    if price <= 0:
                        continue

                    # Record start price
                    if market.start_price is None and now >= market.window_start_ts:
                        market.start_price = price
                        log.info(f"[Scalper] {market.asset.upper()} OPEN | Chainlink=${price:,.4f}")

                    # Trade 5s before close
                    secs_to_close = market.window_end_ts - now
                    if 0 < secs_to_close <= TRADE_BEFORE_SECS and market.start_price is not None:
                        if market.window_start_ts in traded_windows:
                            market.traded = True
                            continue

                        change_pct = abs(price - market.start_price) / market.start_price * 100
                        if change_pct < MIN_PRICE_CHANGE_PCT:
                            continue

                        went_up = price >= market.start_price
                        direction = "Up" if went_up else "Down"
                        token_id = market.up_token if went_up else market.down_token
                        pct_str = f"{((price - market.start_price) / market.start_price * 100):+.3f}%"
                        log.info(f"[Scalper] {market.asset.upper()} -> {direction} | "
                                 f"Chainlink ${market.start_price:,.2f} -> ${price:,.2f} ({pct_str})")

                        market.traded = True
                        success = await self._execute_trade(market, token_id, direction)
                        if success:
                            traded_windows.add(market.window_start_ts)

                    # Mark as done if window passed
                    if now > market.window_end_ts + 5 and not market.traded:
                        market.traded = True

            except Exception as e:
                log.error(f"[Scalper] Trading loop error: {e}")

            await asyncio.sleep(1)

    async def _execute_trade(self, market, token_id, direction) -> bool:
        settings = await self.db.get_settings(TELEGRAM_ID)
        demo_mode = bool(settings.get("demo_mode", 0)) if settings else False

        if demo_mode:
            balance = settings.get("demo_balance", 0)
        else:
            from .wallet import get_usdc_balance
            balance = get_usdc_balance(self.wallet)

        bet = round(balance * 0.25, 2)
        if bet < 1.0:
            log.info(f"[Scalper] Balance too low: ${balance:.2f}")
            return False

        result = None
        if demo_mode:
            await self.db.adjust_demo_balance(TELEGRAM_ID, -bet)
            result = {"orderID": "demo-" + str(int(time.time())), "status": "demo_matched", "success": True}
            log.info(f"[Scalper] DEMO BUY {direction} ${bet:.2f} | {market.title[:50]}")
        else:
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, self._place_order, token_id, bet)
                log.info(f"[Scalper] BOUGHT {direction} ${bet:.2f} | {market.title[:50]}")
                log.info(f"[Scalper] Order: {result}")
            except Exception as e:
                log.error(f"[Scalper] Buy failed: {e}")
                return False

        if result:
            self.stats["trades"] += 1
            market.direction = direction
            market.bet_amount = bet
            try:
                pos_id = await self.db.open_position(
                    telegram_id=TELEGRAM_ID, target_wallet="scalper",
                    condition_id=market.condition_id,
                    outcome_index=0 if direction == "Up" else 1,
                    token_id=token_id, title=market.title,
                    outcome=direction, entry_price=0.99,
                    bet_amount=bet, target_usdc_size=bet,
                    event_slug=market.slug,
                    source_timestamp=str(int(time.time())),
                )
                await self.db.record_trade(
                    telegram_id=TELEGRAM_ID, position_id=pos_id,
                    side="BUY", token_id=token_id, amount=bet,
                    price=0.99, fee=0, is_copy=False,
                    source_wallet="scalper", dry_run=demo_mode,
                )
                market.pos_id = pos_id
                log.info(f"[Scalper] Recorded position {pos_id}")
            except Exception as db_err:
                log.error(f"[Scalper] DB record failed: {db_err}")
            return True
        return False

    def _place_order(self, token_id: str, amount: float):
        """Place FOK market buy — immediate fill or cancel."""
        from py_clob_client.clob_types import MarketOrderArgs, OrderType
        from py_clob_client.order_builder.constants import BUY
        order = MarketOrderArgs(
            token_id=token_id, amount=amount, side=BUY, order_type=OrderType.FOK
        )
        signed = self.client.create_market_order(order)
        return self.client.post_order(signed, OrderType.FOK)

    # ── RESOLUTION (closes positions, credits demo balance) ──

    async def _resolution_loop(self):
        """Check resolved markets and close positions every 30s."""
        while self.running:
            try:
                await self._check_resolutions()
            except Exception as e:
                log.error(f"[Scalper] Resolution error: {e}")
            await asyncio.sleep(30)

    async def _check_resolutions(self):
        """Check if any open scalper positions have resolved."""
        import aiosqlite
        async with aiosqlite.connect(self.db.path) as conn:
            conn.row_factory = aiosqlite.Row
            async with conn.execute(
                "SELECT * FROM positions WHERE user_id=? AND is_open=1 AND target_wallet='scalper'",
                (TELEGRAM_ID,)
            ) as cur:
                positions = [dict(r) for r in await cur.fetchall()]

        if not positions:
            return

        settings = await self.db.get_settings(TELEGRAM_ID)
        demo_mode = bool(settings.get("demo_mode", 0)) if settings else False

        for pos in positions:
            slug = pos.get("event_slug", "")
            if not slug:
                continue

            # Check if market resolved via Chainlink price comparison
            # The window is encoded in the slug: btc-updown-5m-{timestamp}
            parts = slug.split("-")
            window_ts = int(parts[-1]) if parts[-1].isdigit() else 0
            if not window_ts:
                continue

            window_end = window_ts + 300
            now = int(time.time())

            # Only check markets that closed at least 60s ago
            if now < window_end + 60:
                continue

            # Get the final Chainlink price to determine outcome
            asset = parts[0]  # btc, eth, etc.
            final_price = get_chainlink_price(asset)
            if final_price <= 0:
                continue

            # Determine if the position won
            # We need the start price — it's not stored, so check the market title/outcome
            outcome = pos.get("outcome", "")  # "Up" or "Down"
            entry = pos.get("entry_price", 0.99)
            bet = pos.get("bet_amount", 0)

            # For 5-min markets, resolved = closed > 60s ago
            # We can't know the exact start price from DB, but we can check Polymarket
            try:
                import requests
                r = requests.get(f"{GAMMA_API}/events", params={"slug": slug}, timeout=8)
                data = r.json()
                if not data:
                    continue
                e = data[0] if isinstance(data, list) else data
                m = e.get("markets", [{}])[0]
                prices_str = m.get("outcomePrices", "")
                outcomes = m.get("outcomes", [])

                if not prices_str or not outcomes:
                    continue

                if isinstance(prices_str, str):
                    price_list = json.loads(prices_str) if prices_str.startswith("[") else prices_str.split(",")
                else:
                    price_list = prices_str

                # Find winner
                winner = None
                for i, p in enumerate(price_list):
                    if float(p) >= 0.99 and i < len(outcomes):
                        winner = outcomes[i]
                        break

                if winner is None:
                    continue  # Not resolved yet

                won = winner == outcome
                if won:
                    pnl = round(bet * 0.01, 2)  # ~1% profit
                    exit_price = 1.0
                    reason = "RESOLVED WON"
                    self.stats["wins"] += 1
                else:
                    pnl = -bet
                    exit_price = 0.0
                    reason = "RESOLVED LOST"
                    self.stats["losses"] += 1

                # Close position in DB
                await self.db.close_position(pos["id"], exit_price, pnl, reason)

                # Credit demo balance
                if demo_mode:
                    if won:
                        # Return bet + profit
                        await self.db.adjust_demo_balance(TELEGRAM_ID, bet + pnl)
                    # Lost = already deducted when bet was placed

                await self.db.increment_daily_pnl(TELEGRAM_ID, pnl)

                result = "WIN" if won else "LOSS"
                log.info(f"[Scalper] RESOLVED {result} | {pos['title'][:40]} | "
                         f"Bet ${bet:.2f} | P&L ${pnl:+.2f} | Winner: {winner}")

            except Exception as ex:
                pass  # Market data not available yet, retry next cycle


async def main():
    from .wallet import decrypt_key
    import aiosqlite
    async with aiosqlite.connect("polyx.db") as conn:
        async with conn.execute(
            "SELECT private_key_enc, wallet_address FROM users WHERE telegram_id=7446549575"
        ) as cur:
            row = await cur.fetchone()
    pk = decrypt_key(row[0])
    bot = ScalperBot(pk, row[1])
    await bot.start()


if __name__ == "__main__":
    asyncio.run(main())
