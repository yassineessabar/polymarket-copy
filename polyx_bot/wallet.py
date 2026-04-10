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
    """Get USDC.e balance on Polygon for a single address."""
    data = "0x70a08231" + address[2:].lower().zfill(64)
    try:
        r = requests.post(POLYGON_RPC, json={
            "jsonrpc": "2.0", "method": "eth_call",
            "params": [{"to": USDC_CONTRACT, "data": data}, "latest"], "id": 1
        }, timeout=10)
        return int(r.json()["result"], 16) / 1e6
    except Exception:
        return 0.0


def get_full_balance(eoa_address: str, proxy_address: str = "") -> float:
    """Get total USDC.e balance across EOA + Polymarket proxy wallet."""
    total = get_usdc_balance(eoa_address)
    if proxy_address:
        total += get_usdc_balance(proxy_address)
    return total


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


def transfer_usdc(private_key: str, to_address: str, amount_usdc: float) -> str | None:
    """Transfer USDC on Polygon. Returns tx hash or None on failure."""
    from web3 import Web3

    w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
    account = Account.from_key(private_key)
    sender = account.address

    # USDC has 6 decimals
    amount_raw = int(amount_usdc * 1e6)
    if amount_raw <= 0:
        return None

    # ERC-20 transfer(address,uint256) selector
    data = (
        "0xa9059cbb"
        + to_address[2:].lower().zfill(64)
        + hex(amount_raw)[2:].zfill(64)
    )

    try:
        nonce = w3.eth.get_transaction_count(sender)
        gas_price = w3.eth.gas_price

        tx = {
            "to": Web3.to_checksum_address(USDC_CONTRACT),
            "data": data,
            "gas": 80_000,
            "gasPrice": gas_price,
            "nonce": nonce,
            "chainId": 137,
        }

        signed = w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()
    except Exception:
        return None
