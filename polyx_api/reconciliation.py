"""Reconciliation endpoints: compare Sharky6999 trades with our DB positions."""
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
SHARKY_TELEGRAM_ID = -3
SHARKY_USER_ID = -3


async def _ensure_user(db: Database):
    """Make sure user -3 exists so positions get the right user_id."""
    async with aiosqlite.connect(db.path) as conn:
        await conn.execute(
            "INSERT OR IGNORE INTO users (telegram_id, username, wallet_address, private_key_enc, "
            "referral_code, user_id, auth_provider) VALUES (?, ?, ?, '', 'SHARKY_RECON', ?, 'web')",
            (SHARKY_TELEGRAM_ID, "essabar.yassine@gmail.com",
             "0xb6c9718dfacaa2397e36193ec1639baa87913b7d", SHARKY_USER_ID),
        )
        await conn.execute(
            "INSERT OR IGNORE INTO user_settings (telegram_id, user_id, demo_mode, demo_balance, "
            "copy_trading_active) VALUES (?, ?, 1, 1000.0, 1)",
            (SHARKY_TELEGRAM_ID, SHARKY_USER_ID),
        )
        await conn.commit()


async def _get_imported_trade_ids(db: Database) -> set:
    """Get all trade_ids we already imported (stored in source_timestamp)."""
    async with aiosqlite.connect(db.path) as conn:
        async with conn.execute(
            "SELECT source_timestamp FROM positions WHERE user_id=? AND source_timestamp LIKE '%|tid:%'",
            (SHARKY_USER_ID,),
        ) as cur:
            rows = await cur.fetchall()
    result = set()
    for row in rows:
        val = row[0] or ""
        if "|tid:" in val:
            result.add(val.split("|tid:")[1])
    return result


# ── GET /sharky — raw activity + our DB positions side by side ──


@router.get("/sharky")
async def sharky_overview(
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db),
):
    """Fetch Sharky6999 recent activity from Polymarket and our DB positions."""
    async with aiohttp.ClientSession() as session:
        activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)
        sharky_name = await get_profile_name(session, SHARKY_WALLET)

    our_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)
    our_closed = await db.get_closed_positions_by_user_id(SHARKY_USER_ID, limit=limit)

    return {
        "sharky_wallet": SHARKY_WALLET,
        "sharky_name": sharky_name,
        "sharky_activity": activity,
        "our_positions": {
            "open": our_open,
            "closed": our_closed,
        },
    }


# ── POST /import — import Sharky trades into our DB ──


@router.post("/import")
async def import_sharky_trades(
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db),
):
    """Fetch Sharky6999 trade history and import into positions/trades tables.

    Each Sharky trade becomes one position. Deduplication uses trade_id
    stored in the source_timestamp field as 'timestamp|tid:trade_id'.
    """
    await _ensure_user(db)

    async with aiohttp.ClientSession() as session:
        activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)

    # Filter to TRADE type only
    trades = [a for a in activity if a.get("type", "").upper() == "TRADE"]

    imported_buys = 0
    imported_sells = 0
    skipped = 0
    errors = []

    # Get already-imported trade IDs to avoid duplicates
    already_imported = await _get_imported_trade_ids(db)

    # Get existing open positions to match sells against
    existing_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)

    for trade in reversed(trades):  # oldest first so positions exist before sells
        side = (trade.get("side") or "").upper()
        condition_id = trade.get("conditionId", "")
        outcome_index = int(trade.get("outcomeIndex", 0))
        token_id = trade.get("asset", "") or trade.get("tokenId", "")
        title = trade.get("title", "") or trade.get("question", "")
        outcome = trade.get("outcome", "") or trade.get("outcomeName", "")
        price = float(trade.get("price", 0) or 0)
        usdc_size = float(trade.get("usdcSize", 0) or trade.get("size", 0) or 0)
        event_slug = trade.get("slug", "") or trade.get("eventSlug", "")
        raw_ts = trade.get("createdAt") or trade.get("timestamp") or ""
        tid = make_trade_id(trade)

        if not condition_id or not token_id:
            skipped += 1
            continue

        # Deduplicate by trade_id
        if tid in already_imported:
            skipped += 1
            continue

        # Encode trade_id into source_timestamp for later retrieval
        source_ts = f"{raw_ts}|tid:{tid}"

        try:
            if side == "BUY":
                position_id = await db.open_position(
                    telegram_id=SHARKY_TELEGRAM_ID,
                    target_wallet=SHARKY_WALLET,
                    condition_id=condition_id,
                    outcome_index=outcome_index,
                    token_id=token_id,
                    title=title,
                    outcome=outcome,
                    entry_price=price,
                    bet_amount=usdc_size,
                    target_usdc_size=usdc_size,
                    event_slug=event_slug,
                    source_timestamp=source_ts,
                )
                await db.record_trade(
                    telegram_id=SHARKY_TELEGRAM_ID,
                    position_id=position_id,
                    side="BUY",
                    token_id=token_id,
                    amount=usdc_size,
                    price=price,
                    fee=0.0,
                    is_copy=True,
                    source_wallet=SHARKY_WALLET,
                    dry_run=False,
                )
                imported_buys += 1
                already_imported.add(tid)

                # Refresh open positions list
                existing_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)

            elif side == "SELL":
                # Find matching open position to close (oldest first)
                matching = [
                    p for p in existing_open
                    if p.get("condition_id") == condition_id
                    and p.get("outcome_index") == outcome_index
                    and p.get("is_open") == 1
                ]
                if matching:
                    pos = matching[0]
                    entry_price = pos.get("entry_price", 0)
                    bet_amount = pos.get("bet_amount", 0)
                    if entry_price > 0 and bet_amount > 0:
                        shares = bet_amount / entry_price
                        pnl = (price - entry_price) * shares
                    else:
                        pnl = 0.0

                    # Update source_timestamp to include this sell's trade_id
                    await db.update_position(pos["id"], source_timestamp=source_ts)

                    await db.close_position(
                        position_id=pos["id"],
                        exit_price=price,
                        pnl_usd=round(pnl, 4),
                        reason="sharky_sold",
                    )
                    await db.record_trade(
                        telegram_id=SHARKY_TELEGRAM_ID,
                        position_id=pos["id"],
                        side="SELL",
                        token_id=token_id,
                        amount=usdc_size,
                        price=price,
                        fee=0.0,
                        is_copy=True,
                        source_wallet=SHARKY_WALLET,
                        dry_run=False,
                    )
                    imported_sells += 1
                    already_imported.add(tid)

                    # Refresh open positions list
                    existing_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)
                else:
                    skipped += 1
            else:
                skipped += 1
        except Exception as e:
            log.error(f"Import error for trade {tid}: {e}")
            errors.append({"trade_id": tid, "error": str(e)})

    return {
        "imported_buys": imported_buys,
        "imported_sells": imported_sells,
        "skipped": skipped,
        "errors": errors,
        "total_activity": len(trades),
    }


# ── POST /reset — clear all imported positions to re-import cleanly ──


@router.post("/reset")
async def reset_imported(db: Database = Depends(get_db)):
    """Delete all positions and trades for user_id=-3 so you can re-import."""
    async with aiosqlite.connect(db.path) as conn:
        await conn.execute("DELETE FROM trades WHERE user_id=?", (SHARKY_USER_ID,))
        await conn.execute("DELETE FROM positions WHERE user_id=?", (SHARKY_USER_ID,))
        await conn.execute("DELETE FROM daily_risk WHERE telegram_id=?", (SHARKY_TELEGRAM_ID,))
        await conn.commit()
    return {"status": "ok", "message": "All imported positions and trades deleted."}


# ── GET /compare — structured comparison ──


@router.get("/compare")
async def compare_sharky(
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db),
):
    """Compare Sharky6999 Polymarket trades vs our DB positions.

    Matching is 1:1 per trade using trade_id stored in source_timestamp.
    """
    async with aiohttp.ClientSession() as session:
        activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)

    sharky_trades = [a for a in activity if a.get("type", "").upper() == "TRADE"]

    our_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)
    our_closed = await db.get_closed_positions_by_user_id(SHARKY_USER_ID, limit=500)
    all_our = our_open + our_closed

    # Build set of imported trade_ids
    imported_tids = set()
    pos_by_tid = {}
    for p in all_our:
        src = p.get("source_timestamp") or ""
        if "|tid:" in src:
            tid = src.split("|tid:")[1]
            imported_tids.add(tid)
            pos_by_tid[tid] = p

    matched = []
    unmatched_sharky = []

    for trade in sharky_trades:
        tid = make_trade_id(trade)
        trade_summary = {
            "trade_id": tid,
            "side": trade.get("side", ""),
            "title": trade.get("title", ""),
            "outcome": trade.get("outcome", ""),
            "price": float(trade.get("price", 0) or 0),
            "usdcSize": float(trade.get("usdcSize", 0) or trade.get("size", 0) or 0),
            "createdAt": trade.get("createdAt", ""),
            "conditionId": trade.get("conditionId", ""),
        }

        if tid in imported_tids:
            pos = pos_by_tid.get(tid, {})
            matched.append({
                "sharky_trade": trade_summary,
                "our_position": {
                    "id": pos.get("id"),
                    "entry_price": pos.get("entry_price"),
                    "exit_price": pos.get("exit_price"),
                    "bet_amount": pos.get("bet_amount"),
                    "is_open": pos.get("is_open"),
                    "pnl_usd": pos.get("pnl_usd"),
                    "opened_at": pos.get("opened_at"),
                    "closed_at": pos.get("closed_at"),
                    "close_reason": pos.get("close_reason"),
                },
            })
        else:
            unmatched_sharky.append(trade_summary)

    total_pnl = sum(p.get("pnl_usd", 0) or 0 for p in our_closed)
    open_pnl = 0  # would need live prices

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
            "our_positions_count": len(all_our),
            "matched_count": len(matched),
            "unmatched_count": len(unmatched_sharky),
            "total_pnl": round(total_pnl, 2),
        },
    }
