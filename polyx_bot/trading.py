"""
Per-user CLOB client and trade execution.
Supports optional HTTP proxy for geoblocked regions.
"""
import os
import logging
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import MarketOrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL

from .config import CLOB_API

log = logging.getLogger("polyx")

# Proxy for CLOB API calls (set CLOB_PROXY in .env, e.g. socks5://user:pass@host:port)
CLOB_PROXY = os.getenv("CLOB_PROXY", "")

# Per-user CLOB client cache: {telegram_id: ClobClient}
_client_cache: dict[int, ClobClient] = {}


def _apply_proxy(client: ClobClient):
    """Patch the CLOB client's session to use a proxy if configured."""
    if not CLOB_PROXY:
        return
    import requests
    # Patch the internal session used by py_clob_client
    if hasattr(client, "session"):
        client.session.proxies = {"http": CLOB_PROXY, "https": CLOB_PROXY}
    # Also set env vars as fallback for requests library
    os.environ["HTTP_PROXY"] = CLOB_PROXY
    os.environ["HTTPS_PROXY"] = CLOB_PROXY
    log.info(f"[Trading] Proxy configured: {CLOB_PROXY.split('@')[-1] if '@' in CLOB_PROXY else CLOB_PROXY[:30]}")


def get_user_clob_client(telegram_id: int, private_key: str, wallet_address: str) -> ClobClient:
    """Get or create a CLOB client for a user."""
    if telegram_id in _client_cache:
        return _client_cache[telegram_id]

    if CLOB_PROXY:
        os.environ["HTTP_PROXY"] = CLOB_PROXY
        os.environ["HTTPS_PROXY"] = CLOB_PROXY

    client = ClobClient(
        CLOB_API,
        key=private_key,
        chain_id=137,
        signature_type=0,
        funder=wallet_address,
    )
    _apply_proxy(client)
    creds = client.derive_api_key()
    client.set_api_creds(creds)
    _client_cache[telegram_id] = client

    if CLOB_PROXY:
        log.info(f"[Trading] CLOB client created via proxy for {telegram_id}")

    return client


def invalidate_client(telegram_id: int):
    """Remove cached client (e.g., when wallet changes)."""
    _client_cache.pop(telegram_id, None)


def place_buy(client: ClobClient, token_id: str, amount: float):
    """Execute a FOK market buy order."""
    order = MarketOrderArgs(token_id=token_id, amount=amount, side=BUY, order_type=OrderType.FOK)
    signed = client.create_market_order(order)
    return client.post_order(signed, OrderType.FOK)


def place_sell(client: ClobClient, token_id: str, amount: float):
    """Execute a FOK market sell order."""
    order = MarketOrderArgs(token_id=token_id, amount=amount, side=SELL, order_type=OrderType.FOK)
    signed = client.create_market_order(order)
    return client.post_order(signed, OrderType.FOK)
