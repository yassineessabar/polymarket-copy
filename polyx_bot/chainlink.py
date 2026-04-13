"""Read Chainlink price feeds on Polygon — same oracle Polymarket uses."""
import logging
import time
from web3 import Web3

log = logging.getLogger("scalper")

RPC = "https://polygon-bor-rpc.publicnode.com"

# Chainlink Aggregator V3 addresses on Polygon
FEEDS = {
    "btc": "0xc907E116054Ad103354f2D350FD2514433D57F6f",
    "eth": "0xF9680D99D6C9589e2a93a78A04A279e509205945",
    "doge": "0xbaf9327b6564454F4a3364C33eFeEf032b4b4444",
    "xrp": "0x785ba89291f676b5386652eB12b30cF361020694",
}

# Function selectors
LATEST_ROUND_DATA = "0xfeaf968c"
DECIMALS = "0x313ce567"

_w3 = None
_decimals_cache: dict[str, int] = {}


def _get_w3():
    global _w3
    if _w3 is None or not _w3.is_connected():
        _w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 10}))
    return _w3


def get_chainlink_price(asset: str) -> float:
    """Get latest price from Chainlink on Polygon. Returns 0 if stale or failed."""
    feed_addr = FEEDS.get(asset.lower())
    if not feed_addr:
        return 0.0

    try:
        w3 = _get_w3()
        addr = Web3.to_checksum_address(feed_addr)

        # Get decimals (cached)
        if asset not in _decimals_cache:
            dec_result = w3.eth.call({"to": addr, "data": DECIMALS})
            _decimals_cache[asset] = int(dec_result.hex(), 16)

        decimals = _decimals_cache[asset]

        # Get latest price + timestamp
        result = w3.eth.call({"to": addr, "data": LATEST_ROUND_DATA})
        hex_val = result.hex()
        answer = int(hex_val[64:128], 16)
        if answer > 2**255:
            answer = answer - 2**256
        updated_at = int(hex_val[192:256], 16)

        # STALENESS CHECK: reject prices older than 120 seconds
        age = int(time.time()) - updated_at
        if age > 120:
            log.warning(f"[Chainlink] {asset} price is STALE ({age}s old) — skipping")
            return 0.0

        return answer / (10 ** decimals)
    except Exception as e:
        log.error(f"[Chainlink] {asset} price error: {e}")
        return 0.0


def get_all_prices() -> dict[str, float]:
    """Get all available Chainlink prices."""
    prices = {}
    for asset in FEEDS:
        p = get_chainlink_price(asset)
        if p > 0:
            prices[asset] = p
    return prices
