"""Market browsing routes — proxies to Gamma API."""

import aiohttp
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/markets", tags=["markets"])

GAMMA_API = "https://gamma-api.polymarket.com"


@router.get("")
async def list_markets(
    category: str = Query(default="", description="Filter by category"),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Browse markets. Proxies to Gamma API."""
    params = {"limit": limit, "offset": offset, "active": "true", "closed": "false"}
    if category:
        params["tag"] = category

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{GAMMA_API}/markets", params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {"markets": data}
                return {"markets": [], "error": f"Gamma API returned {resp.status}"}
    except Exception as e:
        return {"markets": [], "error": str(e)}


@router.get("/trending")
async def trending_markets(limit: int = Query(default=10, le=50)):
    """Trending markets by volume."""
    params = {
        "limit": limit,
        "active": "true",
        "closed": "false",
        "order": "volume24hr",
        "ascending": "false",
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{GAMMA_API}/markets", params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {"markets": data}
                return {"markets": [], "error": f"Gamma API returned {resp.status}"}
    except Exception as e:
        return {"markets": [], "error": str(e)}
