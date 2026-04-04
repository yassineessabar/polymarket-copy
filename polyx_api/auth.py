"""Authentication endpoints: wallet connect + magic link."""
import os
import re
import secrets
import time
import jwt
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request
from eth_account.messages import encode_defunct
from eth_account import Account

from polyx_bot.config import JWT_SECRET
from polyx_bot.wallet import generate_wallet, encrypt_key
from polyx_bot.database import Database
from .deps import get_db, get_current_user
from .models import (
    NonceRequest, NonceResponse, VerifyRequest, TokenResponse,
    MagicLinkRequest, MagicVerifyRequest, RefreshResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

DEV_MODE = os.getenv("DEV_MODE", "1") == "1"
WALLET_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


def _issue_jwt(user_id: int, wallet: str) -> str:
    payload = {
        "sub": str(user_id),
        "wallet": wallet,
        "iss": "polyx",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _make_referral_code() -> str:
    return secrets.token_urlsafe(6)[:8]


def _validate_wallet(addr: str) -> str:
    """Validate and normalize wallet address."""
    addr = addr.strip().lower()
    if not WALLET_RE.match(addr):
        raise HTTPException(400, "Invalid wallet address format")
    return addr


async def _find_or_create_web_user(db: Database, identifier: str, is_wallet: bool = True) -> dict:
    """Find user by wallet/email or create a new one."""
    async with aiosqlite.connect(db.path) as conn:
        conn.row_factory = aiosqlite.Row
        if is_wallet:
            async with conn.execute(
                "SELECT * FROM users WHERE LOWER(username)=? OR LOWER(wallet_address)=?",
                (identifier, identifier)
            ) as cur:
                row = await cur.fetchone()
        else:
            async with conn.execute(
                "SELECT * FROM users WHERE username=?", (identifier,)
            ) as cur:
                row = await cur.fetchone()
        if row:
            return dict(row)

    # Create new user
    trading_addr, trading_key = generate_wallet()
    enc_key = encrypt_key(trading_key)
    ref_code = _make_referral_code()
    user_id = await db.create_web_user(
        wallet_address=trading_addr,
        referral_code=ref_code,
        private_key_enc=enc_key,
    )
    async with aiosqlite.connect(db.path) as conn:
        await conn.execute(
            "UPDATE users SET username=? WHERE user_id=?",
            (identifier, user_id))
        await conn.commit()

    return await db.get_user_by_user_id(user_id)


@router.post("/nonce", response_model=NonceResponse)
async def get_nonce(req: NonceRequest, db: Database = Depends(get_db)):
    """Get a nonce to sign for wallet authentication."""
    addr = _validate_wallet(req.wallet_address)
    user = await _find_or_create_web_user(db, addr, is_wallet=True)

    nonce = secrets.token_hex(16)
    await db.update_nonce(user["user_id"], nonce)

    return NonceResponse(
        nonce=f"Sign this message to log in to PolyX:\n{nonce}",
        user_id=user["user_id"],
    )


@router.post("/verify", response_model=TokenResponse)
async def verify_signature(req: VerifyRequest, db: Database = Depends(get_db)):
    """Verify wallet signature and issue JWT."""
    addr = _validate_wallet(req.wallet_address)

    user = await db.get_user_by_wallet(addr)
    if not user or not user.get("nonce"):
        raise HTTPException(400, "No pending nonce. Call /nonce first.")

    nonce_message = f"Sign this message to log in to PolyX:\n{user['nonce']}"
    try:
        message = encode_defunct(text=nonce_message)
        recovered = Account.recover_message(message, signature=req.signature)
    except Exception:
        raise HTTPException(400, "Invalid signature")

    if recovered.lower() != addr:
        raise HTTPException(400, "Signature does not match wallet address")

    await db.update_nonce(user["user_id"], "")
    token = _issue_jwt(user["user_id"], user["wallet_address"])
    settings = await db.get_settings_by_user_id(user["user_id"])

    return TokenResponse(
        token=token,
        user={
            "user_id": user["user_id"],
            "wallet_address": user["wallet_address"],
            "auth_wallet": addr,
            "auth_provider": user.get("auth_provider", "web"),
            "created_at": user.get("created_at"),
            "demo_mode": settings.get("demo_mode", 0) if settings else 0,
            "demo_balance": settings.get("demo_balance", 0) if settings else 0,
        },
    )


@router.post("/magic-link")
async def request_magic_link(req: MagicLinkRequest, db: Database = Depends(get_db)):
    """Send magic link email for passwordless auth."""
    email = req.email.strip().lower()
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Invalid email address")

    token = secrets.token_urlsafe(32)
    user = await _find_or_create_web_user(db, email, is_wallet=False)
    await db.update_nonce(user["user_id"], f"magic:{token}")

    # In dev mode, return token directly for testing
    if DEV_MODE:
        return {"message": "Magic link sent", "dev_token": token}

    # TODO: Send email via Resend/SendGrid in production
    return {"message": "Magic link sent to your email"}


@router.post("/magic-verify", response_model=TokenResponse)
async def verify_magic_link(req: MagicVerifyRequest, db: Database = Depends(get_db)):
    """Verify magic link token and issue JWT."""
    if not req.token or len(req.token) < 10:
        raise HTTPException(400, "Invalid token")

    async with aiosqlite.connect(db.path) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM users WHERE nonce=?", (f"magic:{req.token}",)
        ) as cur:
            row = await cur.fetchone()
            user = dict(row) if row else None

    if not user:
        raise HTTPException(400, "Invalid or expired magic link")

    await db.update_nonce(user["user_id"], "")
    token = _issue_jwt(user["user_id"], user["wallet_address"])
    settings = await db.get_settings_by_user_id(user["user_id"])

    return TokenResponse(
        token=token,
        user={
            "user_id": user["user_id"],
            "wallet_address": user["wallet_address"],
            "auth_provider": "web",
            "created_at": user.get("created_at"),
            "demo_mode": settings.get("demo_mode", 0) if settings else 0,
            "demo_balance": settings.get("demo_balance", 0) if settings else 0,
        },
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    request: Request,
    db: Database = Depends(get_db),
):
    """Refresh JWT token."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")

    old_token = auth[7:]
    try:
        # Allow expired tokens within 7-day grace window
        payload = jwt.decode(old_token, JWT_SECRET, algorithms=["HS256"],
                             options={"verify_exp": False})
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token")

    user = await db.get_user_by_user_id(int(user_id))
    if not user:
        raise HTTPException(401, "User not found")

    # Check grace period (original exp + 7 days)
    original_exp = payload.get("exp", 0)
    if time.time() > original_exp + 86400 * 7:
        raise HTTPException(401, "Token too old to refresh")

    new_token = _issue_jwt(user["user_id"], user["wallet_address"])
    return RefreshResponse(token=new_token)
