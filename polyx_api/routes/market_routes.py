"""Market browsing routes — proxies to Gamma API."""

import ssl

import aiohttp
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/markets", tags=["markets"])

GAMMA_API = "https://gamma-api.polymarket.com"


def _make_ssl_ctx() -> ssl.SSLContext:
    """Relaxed SSL context — Gamma API cert sometimes mismatches."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


async def _gamma_get(path: str, params: dict) -> list:
    """Fetch from Gamma API with SSL-error fallback."""
    connector = aiohttp.TCPConnector(ssl=_make_ssl_ctx())
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(f"{GAMMA_API}{path}", params=params) as resp:
            if resp.status == 200:
                ct = resp.headers.get("content-type", "")
                if "json" not in ct:
                    return []
                return await resp.json(content_type=None)
            return []


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
        data = await _gamma_get("/markets", params)
        return {"markets": data}
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
        data = await _gamma_get("/markets", params)
        return {"markets": data}
    except Exception as e:
        return {"markets": [], "error": str(e)}
