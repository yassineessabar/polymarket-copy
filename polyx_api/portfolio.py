"""Portfolio endpoints: positions, trades, P&L."""
import aiohttp
from fastapi import APIRouter, Depends, Query
from polyx_bot.database import Database
from polyx_bot.wallet import get_usdc_balance
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
            balance = get_usdc_balance(user["wallet_address"])
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
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get open or closed positions."""
    user_id = user["user_id"]

    if status == "open":
        positions = await db.get_open_positions_by_user_id(user_id)
        # Enrich with live prices
        enriched = []
        async with aiohttp.ClientSession() as session:
            for pos in positions:
                try:
                    p = await get_position_with_pnl(session, pos)
                    enriched.append(p)
                except Exception:
                    enriched.append(pos)
        return {"positions": enriched}
    else:
        positions = await db.get_closed_positions_by_user_id(user_id, limit=limit)
        return {"positions": positions}


@router.get("/trades")
async def get_trades(
    limit: int = Query(50, ge=1, le=200),
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
    days: int = Query(30, ge=1, le=90),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get daily P&L history for charting."""
    import aiosqlite
    user_id = user["user_id"]
    async with aiosqlite.connect(db.path) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT date, daily_pnl, daily_bets_placed, daily_amount_wagered "
            "FROM daily_risk WHERE user_id=? ORDER BY date DESC LIMIT ?",
            (user_id, days)
        ) as cur:
            rows = [dict(r) for r in await cur.fetchall()]
    return {"daily": list(reversed(rows))}
