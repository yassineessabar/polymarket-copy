"""
Portfolio P&L calculations.
"""
import logging
import aiohttp
from .api_helpers import get_market_price

log = logging.getLogger("polysync")


async def compute_unrealized_pnl(session: aiohttp.ClientSession, positions: list) -> float:
    """Compute unrealized P&L for a list of open positions using live CLOB prices."""
    total = 0.0
    for pos in positions:
        token_id = pos.get("token_id", "")
        entry = pos.get("entry_price", 0)
        bet_amt = pos.get("bet_amount", 0)
        if not token_id or entry <= 0 or bet_amt <= 0:
            continue
        try:
            live_price = await get_market_price(session, token_id)
            if live_price > 0:
                shares = bet_amt / entry
                total += shares * (live_price - entry)
        except Exception:
            continue
    return total


async def get_position_with_pnl(session: aiohttp.ClientSession, pos: dict) -> dict:
    """Enrich a position dict with live price and unrealized P&L."""
    token_id = pos.get("token_id", "")
    entry = pos.get("entry_price", 0)
    bet_amt = pos.get("bet_amount", 0)

    live_price = 0.0
    unrealized_pnl = 0.0

    if token_id and entry > 0 and bet_amt > 0:
        try:
            live_price = await get_market_price(session, token_id)
            if live_price > 0:
                shares = bet_amt / entry
                unrealized_pnl = shares * (live_price - entry)
        except Exception:
            pass

    return {
        **pos,
        "live_price": live_price,
        "unrealized_pnl": unrealized_pnl,
        "pnl_pct": ((live_price - entry) / entry * 100) if entry > 0 and live_price > 0 else 0,
    }
