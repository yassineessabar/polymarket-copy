"""Reconciliation endpoints: compare Sharky6999 Polyscan trades with our copy bot positions."""
import logging
from datetime import datetime

import aiohttp
import aiosqlite
from fastapi import APIRouter, Depends, Query

from polyx_bot.database import Database
from polyx_bot.api_helpers import (
    get_recent_activity,
    get_positions,
    get_market_price,
    get_profile_name,
    make_trade_id,
)
from .deps import get_db

log = logging.getLogger("polyx")

router = APIRouter(prefix="/api/v1/reconciliation", tags=["reconciliation"])

SHARKY_WALLET = "0x751a2b86cab503496efd325c8344e10159349ea1"

# Primary tracking user — Telegram bot account copying Sharky
MY_TELEGRAM_ID = 7446549575
MY_USER_ID = 7446549575

# Only track trades after this timestamp (when live tracking started)
TRACKING_START_TS = 1775794075  # 2026-04-10 ~04:07 UTC


# ── GET /sharky — raw Sharky activity + our bot's positions side by side ──


@router.get("/sharky")
async def sharky_overview(
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db),
):
    """Fetch Sharky6999 recent activity from Polymarket and our bot's positions."""
    async with aiohttp.ClientSession() as session:
        raw_activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)
        sharky_name = await get_profile_name(session, SHARKY_WALLET)

    activity = [a for a in raw_activity if int(a.get("timestamp", 0) or 0) >= TRACKING_START_TS]

    our_open = await db.get_open_positions_by_user_id(MY_USER_ID)
    our_closed = await db.get_closed_positions_by_user_id(MY_USER_ID, limit=limit)

    return {
        "sharky_wallet": SHARKY_WALLET,
        "sharky_name": sharky_name,
        "sharky_activity": activity,
        "our_positions": {
            "open": our_open,
            "closed": our_closed,
        },
    }


# ── GET /compare — structured comparison: Sharky's Polyscan vs our copies ──


@router.get("/compare")
async def compare_sharky(
    limit: int = Query(200, ge=1, le=500),
    db: Database = Depends(get_db),
):
    """Compare Sharky6999 Polymarket trades vs our bot's copy positions.

    Matching uses condition_id + outcome_index + price proximity + timing.
    """
    async with aiohttp.ClientSession() as session:
        activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)

    sharky_trades = [
        a for a in activity
        if a.get("type", "").upper() == "TRADE"
        and int(a.get("timestamp", 0) or 0) >= TRACKING_START_TS
    ]

    our_open = await db.get_open_positions_by_user_id(MY_USER_ID)
    our_closed = await db.get_closed_positions_by_user_id(MY_USER_ID, limit=500)
    all_our = our_open + our_closed

    # Build lookup: condition_id + outcome_index -> list of our positions
    our_by_market: dict[str, list] = {}
    for p in all_our:
        key = f"{p.get('condition_id')}_{p.get('outcome_index')}"
        our_by_market.setdefault(key, []).append(p)

    # Track which of our positions have been matched (avoid double-matching)
    matched_pos_ids = set()
    matched = []
    unmatched_sharky = []

    for trade in sharky_trades:
        cid = trade.get("conditionId", "")
        oi = int(trade.get("outcomeIndex", 0))
        side = (trade.get("side") or "").upper()
        tx_hash = trade.get("transactionHash", "")
        sharky_ts = int(trade.get("timestamp", 0) or 0)
        sharky_price = float(trade.get("price", 0) or 0)

        trade_summary = {
            "trade_id": make_trade_id(trade),
            "side": side,
            "title": trade.get("title", ""),
            "outcome": trade.get("outcome", ""),
            "price": sharky_price,
            "usdcSize": float(trade.get("usdcSize", 0) or trade.get("size", 0) or 0),
            "createdAt": trade.get("createdAt", ""),
            "timestamp": sharky_ts,
            "conditionId": cid,
            "transactionHash": tx_hash,
            "polyscanUrl": f"https://polygonscan.com/tx/{tx_hash}" if tx_hash else "",
        }

        if side != "BUY":
            # For sells, find matching closed position
            key = f"{cid}_{oi}"
            candidates = our_by_market.get(key, [])
            match = None
            for p in candidates:
                if p["id"] not in matched_pos_ids and not p.get("is_open"):
                    match = p
                    break
            if match:
                matched_pos_ids.add(match["id"])
                delay = _calc_delay(sharky_ts, match.get("closed_at", ""))
                matched.append({
                    "sharky_trade": trade_summary,
                    "our_position": _pos_summary(match),
                    "delay_seconds": delay,
                })
            else:
                unmatched_sharky.append(trade_summary)
            continue

        # BUY: find best matching position by condition_id + outcome + price
        key = f"{cid}_{oi}"
        candidates = our_by_market.get(key, [])
        best_match = None
        best_delay = None
        for p in candidates:
            if p["id"] in matched_pos_ids:
                continue
            # Price should be close (within 5c)
            p_price = p.get("entry_price", 0)
            if abs(p_price - sharky_price) > 0.05:
                continue
            delay = _calc_delay(sharky_ts, p.get("opened_at", ""))
            # Prefer closest in time
            if best_match is None or (delay is not None and (best_delay is None or abs(delay) < abs(best_delay))):
                best_match = p
                best_delay = delay

        if best_match:
            matched_pos_ids.add(best_match["id"])
            matched.append({
                "sharky_trade": trade_summary,
                "our_position": _pos_summary(best_match),
                "delay_seconds": best_delay,
            })
        else:
            unmatched_sharky.append(trade_summary)

    total_pnl = sum(p.get("pnl_usd", 0) or 0 for p in our_closed)

    return {
        "sharky_activity": sharky_trades,
        "our_positions": {
            "open": our_open,
            "closed": our_closed,
        },
        "comparison": {
            "matched": matched,
            "unmatched_sharky": unmatched_sharky,
        },
        "summary": {
            "sharky_trades_count": len(sharky_trades),
            "our_open_count": len(our_open),
            "our_closed_count": len(our_closed),
            "matched_count": len(matched),
            "unmatched_count": len(unmatched_sharky),
            "total_pnl": round(total_pnl, 2),
        },
    }


def _calc_delay(sharky_ts: int, our_time_str: str) -> int | None:
    """Seconds between Sharky's trade and our execution."""
    if not sharky_ts or not our_time_str:
        return None
    try:
        our_ts = datetime.fromisoformat(our_time_str.replace("Z", "+00:00")).timestamp()
        return round(our_ts - sharky_ts)
    except Exception:
        return None


def _pos_summary(p: dict) -> dict:
    return {
        "id": p.get("id"),
        "title": p.get("title"),
        "outcome": p.get("outcome"),
        "entry_price": p.get("entry_price"),
        "exit_price": p.get("exit_price"),
        "bet_amount": p.get("bet_amount"),
        "is_open": p.get("is_open"),
        "pnl_usd": p.get("pnl_usd"),
        "opened_at": p.get("opened_at"),
        "closed_at": p.get("closed_at"),
        "close_reason": p.get("close_reason"),
    }
