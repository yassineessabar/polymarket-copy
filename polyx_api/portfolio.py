"""Portfolio endpoints: positions, trades, P&L."""
import aiohttp
from fastapi import APIRouter, Depends, Query
from polyx_bot.database import Database
from polyx_bot.wallet import get_usdc_balance, get_full_balance
from polyx_bot.portfolio import get_position_with_pnl
from .deps import get_db, get_current_user

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


@router.get("/summary")
async def portfolio_summary(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Dashboard summary: balance, net worth, P&L, win rate."""
    user_id = user["user_id"]
    settings = await db.get_settings_by_user_id(user_id)
    demo_mode = bool(settings.get("demo_mode", 0)) if settings else False

    if demo_mode:
        balance = settings.get("demo_balance", 0)
    else:
        try:
            balance = get_full_balance(
                user.get("wallet_address", ""),
                user.get("proxy_wallet", ""),
            )
        except Exception:
            balance = 0.0

    stats = await db.get_portfolio_stats_by_user_id(user_id)
    pos_value = stats.get("positions_value", 0) if stats else 0
    pos_count = stats.get("position_count", 0) if stats else 0

    risk = await db.get_daily_risk_by_user_id(user_id)
    daily_pnl = risk.get("daily_pnl", 0) if risk else 0

    # Win rate from closed positions
    closed = await db.get_closed_positions_by_user_id(user_id, limit=500)
    wins = sum(1 for p in closed if (p.get("pnl_usd") or 0) > 0)
    total_closed = len(closed)
    win_rate = (wins / total_closed * 100) if total_closed > 0 else 0
    total_pnl = sum(p.get("pnl_usd", 0) or 0 for p in closed)

    return {
        "balance_usdc": round(balance, 2),
        "positions_value": round(pos_value, 2),
        "position_count": pos_count,
        "net_worth": round(balance + pos_value, 2),
        "daily_pnl": round(daily_pnl, 2),
        "total_pnl": round(total_pnl, 2),
        "win_rate": round(win_rate, 1),
        "total_trades": total_closed,
        "demo_mode": demo_mode,
    }


@router.get("/positions")
async def get_positions(
    status: str = Query("open", regex="^(open|closed)$"),
    limit: int = Query(50, ge=1, le=10000),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get open or closed positions."""
    user_id = user["user_id"]

    if status == "open":
        positions = await db.get_open_positions_by_user_id(user_id)
        # Enrich with live prices (preserve originals on failure)
        enriched = []
        try:
            async with aiohttp.ClientSession() as session:
                for pos in positions:
                    try:
                        p = await get_position_with_pnl(session, pos)
                        enriched.append(p)
                    except Exception:
                        pos["live_price"] = pos.get("entry_price", 0)
                        pos["unrealized_pnl"] = 0
                        pos["pnl_pct"] = 0
                        enriched.append(pos)
        except Exception:
            enriched = positions
        return {"positions": enriched}
    else:
        positions = await db.get_closed_positions_by_user_id(user_id, limit=limit)
        return {"positions": positions}


@router.get("/trades")
async def get_trades(
    limit: int = Query(50, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get trade history."""
    user_id = user["user_id"]
    trades = await db.get_trades_by_user_id(user_id, limit=limit, offset=offset)
    return {"trades": trades}


@router.get("/performance")
async def get_performance(
    days: int = Query(365, ge=1, le=365),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get equity curve built from closed positions P&L."""
    import aiosqlite
    from datetime import datetime, timedelta
    user_id = user["user_id"]

    # Get starting balance from settings
    settings = await db.get_settings_by_user_id(user_id)
    demo_mode = bool(settings.get("demo_mode", 0)) if settings else False

    # Get all closed positions with their dates and P&L
    async with aiosqlite.connect(db.path) as conn:
        conn.row_factory = aiosqlite.Row
        # Get closed positions grouped by day
        async with conn.execute(
            "SELECT date(closed_at) as day, "
            "SUM(pnl_usd) as day_pnl, "
            "COUNT(*) as trades, "
            "SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) as wins "
            "FROM positions WHERE user_id=? AND is_open=0 AND closed_at IS NOT NULL "
            "GROUP BY date(closed_at) ORDER BY day ASC",
            (user_id,)
        ) as cur:
            daily_pnl = [dict(r) for r in await cur.fetchall()]

        # Get initial deposit amount (sum of all bets + current balance approximates starting capital)
        async with conn.execute(
            "SELECT MIN(date(opened_at)) as first_day FROM positions WHERE user_id=?",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            first_day = dict(row).get("first_day") if row else None

    if not daily_pnl:
        balance = settings.get("demo_balance", 0) if demo_mode else 0
        today = datetime.now().strftime("%Y-%m-%d")
        return {"daily": [{"date": today, "value": round(balance, 2)}]}

    total_pnl_sum = sum(d["day_pnl"] or 0 for d in daily_pnl)
    current_balance = settings.get("demo_balance", 0) if demo_mode else 0
    starting_balance = current_balance - total_pnl_sum

    # If only 1-2 days of data, build hourly equity curve from individual positions
    if len(daily_pnl) <= 2:
        async with aiosqlite.connect(db.path) as conn:
            conn.row_factory = aiosqlite.Row
            async with conn.execute(
                "SELECT closed_at, pnl_usd FROM positions "
                "WHERE user_id=? AND is_open=0 AND closed_at IS NOT NULL "
                "ORDER BY closed_at ASC",
                (user_id,)
            ) as cur:
                trades = [dict(r) for r in await cur.fetchall()]

        if not trades:
            return {"daily": [{"date": datetime.now().strftime("%Y-%m-%d %H:%M"), "value": starting_balance}]}

        equity = [{"date": trades[0]["closed_at"][:16], "value": round(starting_balance, 2)}]
        cumulative = starting_balance
        for t in trades:
            cumulative += (t["pnl_usd"] or 0)
            equity.append({
                "date": t["closed_at"][:16],
                "value": round(cumulative, 2)
            })
        return {"daily": equity}

    # Multi-day: daily granularity
    first = datetime.strptime(daily_pnl[0]["day"], "%Y-%m-%d")
    last = datetime.now()
    pnl_by_day = {d["day"]: d["day_pnl"] or 0 for d in daily_pnl}

    equity = []
    cumulative = starting_balance
    current = first
    while current <= last:
        day_str = current.strftime("%Y-%m-%d")
        day_pnl_val = pnl_by_day.get(day_str, 0)
        cumulative += day_pnl_val
        equity.append({"date": day_str, "value": round(cumulative, 2)})
        current += timedelta(days=1)

    return {"daily": equity}
