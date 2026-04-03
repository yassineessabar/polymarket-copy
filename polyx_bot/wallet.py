import secrets
import requests
from eth_account import Account
from cryptography.fernet import Fernet
from .config import ENCRYPTION_KEY, POLYGON_RPC, USDC_CONTRACT


def generate_wallet() -> tuple[str, str]:
    """Generate a new Polygon wallet. Returns (address, private_key)."""
    private_key = "0x" + secrets.token_hex(32)
    account = Account.from_key(private_key)
    return account.address, private_key


def encrypt_key(private_key: str) -> str:
    f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
    return f.encrypt(private_key.encode()).decode()


def decrypt_key(encrypted: str) -> str:
    f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
    return f.decrypt(encrypted.encode()).decode()


def get_usdc_balance(address: str) -> float:
    """Get USDC balance on Polygon."""
    data = "0x70a08231" + address[2:].lower().zfill(64)
    try:
        r = requests.post(POLYGON_RPC, json={
            "jsonrpc": "2.0", "method": "eth_call",
            "params": [{"to": USDC_CONTRACT, "data": data}, "latest"], "id": 1
        }, timeout=10)
        return int(r.json()["result"], 16) / 1e6
    except Exception:
        return 0.0


def get_matic_balance(address: str) -> float:
    """Get MATIC/POL balance on Polygon."""
    try:
        r = requests.post(POLYGON_RPC, json={
            "jsonrpc": "2.0", "method": "eth_getBalance",
            "params": [address, "latest"], "id": 1
        }, timeout=10)
        return int(r.json()["result"], 16) / 1e18
    except Exception:
        return 0.0


def is_valid_private_key(key: str) -> bool:
    """Check if a string is a valid Ethereum private key."""
    try:
        if not key.startswith("0x"):
            key = "0x" + key
        Account.from_key(key)
        return True
    except Exception:
        return False


def address_from_key(key: str) -> str:
    """Get address from private key."""
    if not key.startswith("0x"):
        key = "0x" + key
    return Account.from_key(key).address
