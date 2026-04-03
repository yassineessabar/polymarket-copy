"""Portfolio routes — positions, stats, daily risk."""

from fastapi import APIRouter, Depends

from polyx_bot.database import Database
from ..deps import get_db, get_current_user_id
from ..schemas import PortfolioStats, DailyRisk

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/open")
async def open_positions(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    positions = await db.get_open_positions_by_user_id(user_id)
    return {"positions": positions}


@router.get("/closed")
async def closed_positions(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
    limit: int = 50,
):
    positions = await db.get_closed_positions_by_user_id(user_id, limit=limit)
    return {"positions": positions}


@router.get("/stats", response_model=PortfolioStats)
async def portfolio_stats(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    stats = await db.get_portfolio_stats_by_user_id(user_id)
    return stats


@router.get("/daily-risk", response_model=DailyRisk)
async def daily_risk(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    risk = await db.get_daily_risk_by_user_id(user_id)
    return risk
