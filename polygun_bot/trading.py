"""
Per-user CLOB client and trade execution.
"""
import logging
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import MarketOrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL

from .config import CLOB_API

log = logging.getLogger("polysync")

# Per-user CLOB client cache: {telegram_id: ClobClient}
_client_cache: dict[int, ClobClient] = {}


def get_user_clob_client(telegram_id: int, private_key: str, wallet_address: str) -> ClobClient:
    """Get or create a CLOB client for a user."""
    if telegram_id in _client_cache:
        return _client_cache[telegram_id]

    client = ClobClient(
        CLOB_API,
        key=private_key,
        chain_id=137,
        signature_type=0,
        funder=wallet_address,
    )
    creds = client.derive_api_key()
    client.set_api_creds(creds)
    _client_cache[telegram_id] = client
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


def calculate_fee(amount: float, fee_rate: float = 0.01) -> tuple[float, float]:
    """Calculate fee. Returns (net_amount, fee_amount)."""
    fee = round(amount * fee_rate, 6)
    net = amount - fee
    return net, fee
