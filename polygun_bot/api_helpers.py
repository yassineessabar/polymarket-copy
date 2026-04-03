"""
Polymarket API helpers — reused from polymarket_copy_bot.py.
Shared across all users (stateless).
"""
import json
import socket
import aiohttp
import requests
import logging

from .config import DATA_API, CLOB_API, GAMMA_API, POLYGON_RPC, USDC_CONTRACT

log = logging.getLogger("polyx")

# ── DNS RESOLUTION WITH FALLBACK ──
_POLYMARKET_HOSTS = {
    "gamma-api.polymarket.com": "104.18.34.205",
    "data-api.polymarket.com": "104.18.34.205",
    "clob.polymarket.com": "104.18.34.205",
}
_original_getaddrinfo = socket.getaddrinfo


def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host in _POLYMARKET_HOSTS:
        try:
            return _original_getaddrinfo(host, port, *args, **kwargs)
        except socket.gaierror:
            ip = _POLYMARKET_HOSTS[host]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, port))]
    return _original_getaddrinfo(host, port, *args, **kwargs)


socket.getaddrinfo = _patched_getaddrinfo


async def api_get(session: aiohttp.ClientSession, url: str, params: dict = None, retries: int = 2):
    for attempt in range(retries + 1):
        try:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as r:
                r.raise_for_status()
                return await r.json()
        except Exception as e:
            if attempt == retries:
                raise
            import asyncio
            await asyncio.sleep(1)


async def get_profile_name(session: aiohttp.ClientSession, addr: str) -> str:
    try:
        data = await api_get(session, f"{GAMMA_API}/public-profile", {"address": addr})
        return data.get("name") or data.get("pseudonym") or addr[:10] + "..."
    except Exception:
        return addr[:10] + "..."


async def get_positions(session: aiohttp.ClientSession, addr: str) -> list:
    try:
        result = await api_get(session, f"{DATA_API}/positions", {"user": addr, "sizeThreshold": 0})
        return result if isinstance(result, list) else []
    except Exception as e:
        log.error(f"get_positions failed for {addr[:10]}: {e}")
        raise


async def get_recent_activity(session: aiohttp.ClientSession, addr: str, limit: int = 100) -> list:
    result = await api_get(session, f"{DATA_API}/activity", {"user": addr, "limit": limit})
    return result if isinstance(result, list) else []


async def get_market_price(session: aiohttp.ClientSession, token_id: str) -> float:
    try:
        data = await api_get(session, f"{CLOB_API}/price", {"token_id": token_id, "side": "sell"}, retries=1)
        return float(data.get("price", 0))
    except Exception:
        return 0.0


async def check_condition_resolved(session: aiohttp.ClientSession, condition_id: str,
                                    token_id: str = "", outcome_index: str = "0") -> dict:
    # Method 1: gamma /markets
    try:
        data = await api_get(session, f"{GAMMA_API}/markets",
                             {"condition_id": condition_id}, retries=1)
        markets = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
        for mkt in markets:
            if not isinstance(mkt, dict):
                continue
            resolved = mkt.get("resolved", False) or mkt.get("closed", False) or mkt.get("active") is False
            if resolved:
                winner = mkt.get("winner")
                if winner is not None:
                    return {"resolved": True, "winning_index": int(winner) if str(winner).isdigit() else None}
                payouts = mkt.get("payoutNumerators", [])
                if payouts:
                    for i, p in enumerate(payouts):
                        if int(p) > 0:
                            return {"resolved": True, "winning_index": i}
                prices = mkt.get("outcomePrices", mkt.get("outcome_prices", ""))
                if isinstance(prices, str) and prices:
                    try:
                        price_list = json.loads(prices) if prices.startswith("[") else prices.split(",")
                        for i, p in enumerate(price_list):
                            if float(p) >= 0.99:
                                return {"resolved": True, "winning_index": i}
                    except (json.JSONDecodeError, ValueError):
                        pass
                return {"resolved": True, "winning_index": None}
    except Exception:
        pass

    # Method 2: CLOB price
    if token_id:
        try:
            data = await api_get(session, f"{CLOB_API}/price",
                                 {"token_id": token_id, "side": "sell"}, retries=0)
            price = float(data.get("price", 0))
            if price > 0:
                return {"resolved": False}
        except Exception:
            pass

    # Method 3: gamma /events
    try:
        data = await api_get(session, f"{GAMMA_API}/events",
                             {"slug_contains": condition_id[:16]}, retries=0)
        if isinstance(data, list):
            for evt in data:
                if isinstance(evt, dict) and (evt.get("resolved") or evt.get("closed")):
                    return {"resolved": True, "winning_index": None}
    except Exception:
        pass

    return {"resolved": False, "api_error": True}


async def browse_markets(session: aiohttp.ClientSession, category: str = "", limit: int = 8) -> list:
    """Fetch active markets, optionally filtered by keyword category."""
    try:
        params = {"active": "true", "closed": "false", "limit": "50",
                  "order": "volume24hr", "ascending": "false"}
        events = await api_get(session, f"{GAMMA_API}/events", params)
        if not isinstance(events, list):
            return []

        # Category keyword mapping
        keywords = {
            "politics": ["election", "president", "democrat", "republican", "congress", "vote", "nominee", "presidential"],
            "sports": ["vs.", "nba", "nfl", "mlb", "nhl", "fifa", "champion", "winner", "spread", "lakers", "celtics"],
            "crypto": ["bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "token", "coin"],
            "trump": ["trump"],
            "finance": ["stock", "sp500", "nasdaq", "fed", "rate", "gdp", "recession", "ipo", "revenue"],
            "geopolitics": ["war", "iran", "china", "russia", "ceasefire", "nato", "sanction", "tariff", "forces"],
            "volume": [],  # just return by volume
            "trending": [],  # same, by volume
        }

        kw_list = keywords.get(category, [])
        if not kw_list:
            # No filter — return top by volume
            results = []
            for e in events[:limit]:
                mkts = e.get("markets", [])
                results.append({
                    "title": e.get("title", "?"),
                    "slug": e.get("slug", ""),
                    "markets_count": len(mkts),
                    "volume": sum(float(m.get("volume24hr", 0) or 0) for m in mkts),
                })
            return results

        # Filter by keywords in title
        filtered = []
        for e in events:
            title_lower = e.get("title", "").lower()
            slug_lower = e.get("slug", "").lower()
            if any(kw in title_lower or kw in slug_lower for kw in kw_list):
                mkts = e.get("markets", [])
                filtered.append({
                    "title": e.get("title", "?"),
                    "slug": e.get("slug", ""),
                    "markets_count": len(mkts),
                    "volume": sum(float(m.get("volume24hr", 0) or 0) for m in mkts),
                })
                if len(filtered) >= limit:
                    break
        return filtered
    except Exception as e:
        log.error(f"browse_markets error: {e}")
        return []


def make_trade_id(a: dict) -> str:
    tx = str(a.get("transactionHash") or a.get("proxyWallet") or a.get("proxyWalletAddress") or a.get("id") or "")
    ts = str(a.get("createdAt") or a.get("timestamp") or "")
    size = str(a.get("size", "?"))
    return f"{a.get('conditionId', '?')}_{a.get('side', '?')}_{size}_{a.get('outcomeIndex', '?')}_{tx[:20]}_{ts[:20]}"
