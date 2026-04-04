"""Market browsing endpoints (public, no auth required)."""
import aiohttp
from fastapi import APIRouter, Query
from polyx_bot.api_helpers import browse_markets

router = APIRouter(prefix="/api/v1/markets", tags=["markets"])


@router.get("")
async def list_markets(
    category: str = Query("", description="Filter: politics, sports, crypto, etc."),
    limit: int = Query(10, ge=1, le=50),
):
    """Browse active Polymarket markets. Public endpoint."""
    async with aiohttp.ClientSession() as session:
        markets = await browse_markets(session, category=category, limit=limit)
    return {"markets": markets}
