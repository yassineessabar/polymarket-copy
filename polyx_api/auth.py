"""SIWE authentication + JWT tokens."""

import os
import secrets
import time

import jwt
from eth_account.messages import encode_defunct
from eth_account import Account

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 24 * 60 * 60  # 24 hours


def generate_nonce() -> str:
    return secrets.token_hex(16)


def verify_siwe(message: str, signature: str) -> str:
    """Verify a Sign-In with Ethereum message. Returns checksummed address."""
    msg = encode_defunct(text=message)
    address = Account.recover_message(msg, signature=signature)
    return address


def create_jwt(user_id: int, wallet_address: str) -> str:
    payload = {
        "sub": str(user_id),
        "wallet": wallet_address.lower(),
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> dict:
    """Decode and verify JWT. Raises jwt.PyJWTError on failure."""
    decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    decoded["sub"] = int(decoded["sub"])
    return decoded
