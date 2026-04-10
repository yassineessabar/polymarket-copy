"""Reconciliation endpoints: compare Sharky6999 trades with our DB positions."""
import logging
from datetime import datetime

import aiohttp
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
    """Fetch Sharky6999 trade history and import into positions/trades tables for user_id=-3."""
    async with aiohttp.ClientSession() as session:
        activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)

    # Filter to TRADE type only
    trades = [a for a in activity if a.get("type", "").upper() == "TRADE"]

    imported_buys = 0
    imported_sells = 0
    skipped = 0
    errors = []

    # Get existing open positions to match sells against
    existing_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)

    for trade in reversed(trades):  # oldest first so positions exist before sells
        side = (trade.get("side") or trade.get("type_detail") or "").upper()
        condition_id = trade.get("conditionId", "")
        outcome_index = int(trade.get("outcomeIndex", 0))
        token_id = trade.get("asset", "") or trade.get("tokenId", "")
        title = trade.get("title", "") or trade.get("question", "")
        outcome = trade.get("outcome", "") or trade.get("outcomeName", "")
        price = float(trade.get("price", 0) or 0)
        usdc_size = float(trade.get("usdcSize", 0) or trade.get("size", 0) or 0)
        event_slug = trade.get("slug", "") or trade.get("eventSlug", "")
        source_ts = trade.get("createdAt") or trade.get("timestamp") or ""
        trade_id = make_trade_id(trade)

        if not condition_id or not token_id:
            skipped += 1
            continue

        try:
            if side == "BUY":
                # Check if we already have this position (avoid duplicates)
                pos_key = f"{condition_id}_{outcome_index}"
                already_exists = any(
                    p.get("condition_id") == condition_id
                    and p.get("outcome_index") == outcome_index
                    and abs((p.get("entry_price") or 0) - price) < 0.001
                    and abs((p.get("bet_amount") or 0) - usdc_size) < 0.01
                    for p in existing_open
                )
                if already_exists:
                    skipped += 1
                    continue

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

                # Refresh open positions list
                existing_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)

            elif side == "SELL":
                # Find matching open position to close
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

                    # Refresh open positions list
                    existing_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)
                else:
                    skipped += 1
            else:
                skipped += 1
        except Exception as e:
            log.error(f"Import error for trade {trade_id}: {e}")
            errors.append({"trade_id": trade_id, "error": str(e)})

    return {
        "imported_buys": imported_buys,
        "imported_sells": imported_sells,
        "skipped": skipped,
        "errors": errors,
        "total_activity": len(trades),
    }


# ── GET /compare — structured comparison ──


@router.get("/compare")
async def compare_sharky(
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db),
):
    """Compare Sharky6999 Polymarket trades vs our DB positions."""
    async with aiohttp.ClientSession() as session:
        activity = await get_recent_activity(session, SHARKY_WALLET, limit=limit)

    sharky_trades = [a for a in activity if a.get("type", "").upper() == "TRADE"]

    our_open = await db.get_open_positions_by_user_id(SHARKY_USER_ID)
    our_closed = await db.get_closed_positions_by_user_id(SHARKY_USER_ID, limit=limit)
    all_our = our_open + our_closed

    # Build lookup of our positions by condition_id + outcome_index
    our_lookup = {}
    for p in all_our:
        key = f"{p.get('condition_id')}_{p.get('outcome_index')}"
        our_lookup.setdefault(key, []).append(p)

    matched = []
    unmatched_sharky = []

    for trade in sharky_trades:
        condition_id = trade.get("conditionId", "")
        outcome_index = int(trade.get("outcomeIndex", 0))
        key = f"{condition_id}_{outcome_index}"

        our_matches = our_lookup.get(key, [])
        if our_matches:
            matched.append({
                "sharky_trade": {
                    "side": trade.get("side", ""),
                    "title": trade.get("title", ""),
                    "outcome": trade.get("outcome", ""),
                    "price": float(trade.get("price", 0) or 0),
                    "usdcSize": float(trade.get("usdcSize", 0) or trade.get("size", 0) or 0),
                    "createdAt": trade.get("createdAt", ""),
                    "conditionId": condition_id,
                },
                "our_positions": [
                    {
                        "id": p.get("id"),
                        "entry_price": p.get("entry_price"),
                        "bet_amount": p.get("bet_amount"),
                        "is_open": p.get("is_open"),
                        "pnl_usd": p.get("pnl_usd"),
                        "opened_at": p.get("opened_at"),
                    }
                    for p in our_matches
                ],
            })
        else:
            unmatched_sharky.append({
                "side": trade.get("side", ""),
                "title": trade.get("title", ""),
                "outcome": trade.get("outcome", ""),
                "price": float(trade.get("price", 0) or 0),
                "usdcSize": float(trade.get("usdcSize", 0) or trade.get("size", 0) or 0),
                "createdAt": trade.get("createdAt", ""),
                "conditionId": condition_id,
            })

    # Positions in our DB not matching any Sharky trade
    matched_keys = set()
    for trade in sharky_trades:
        key = f"{trade.get('conditionId', '')}_{int(trade.get('outcomeIndex', 0))}"
        matched_keys.add(key)

    missing_from_sharky = []
    for p in all_our:
        key = f"{p.get('condition_id')}_{p.get('outcome_index')}"
        if key not in matched_keys:
            missing_from_sharky.append({
                "id": p.get("id"),
                "title": p.get("title"),
                "outcome": p.get("outcome"),
                "entry_price": p.get("entry_price"),
                "bet_amount": p.get("bet_amount"),
                "is_open": p.get("is_open"),
                "pnl_usd": p.get("pnl_usd"),
            })

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
            "missing_from_sharky": missing_from_sharky,
        },
        "summary": {
            "sharky_trades_count": len(sharky_trades),
            "our_positions_count": len(all_our),
            "matched_count": len(matched),
            "unmatched_count": len(unmatched_sharky),
            "missing_count": len(missing_from_sharky),
            "total_pnl": round(total_pnl, 2),
        },
    }
