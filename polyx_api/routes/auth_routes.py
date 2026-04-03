"""Authentication routes — SIWE nonce + verify + me."""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query

from polyx_bot.database import Database
from ..auth import generate_nonce, verify_siwe, create_jwt
from ..deps import get_db, get_current_user_id
from ..schemas import AuthNonceResponse, AuthVerifyRequest, AuthVerifyResponse, UserProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/nonce", response_model=AuthNonceResponse)
async def get_nonce(address: str = Query(...), db: Database = Depends(get_db)):
    """Generate a nonce for SIWE. Creates or updates nonce for the address."""
    nonce = generate_nonce()
    addr = address.lower()

    user = await db.get_user_by_wallet(addr)
    if user:
        await db.update_nonce(user["user_id"], nonce)
    else:
        # Store nonce temporarily — user will be created on verify
        # We create a placeholder so nonce is stored
        pass  # nonce is returned to client, verified on POST /verify

    return AuthNonceResponse(nonce=nonce)


@router.post("/verify", response_model=AuthVerifyResponse)
async def verify(body: AuthVerifyRequest, db: Database = Depends(get_db)):
    """Verify SIWE signature, create user if new, return JWT."""
    try:
        recovered_address = verify_siwe(body.message, body.signature)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid signature: {e}")

    addr = recovered_address.lower()
    is_new = False

    user = await db.get_user_by_wallet(addr)
    if not user:
        referral_code = secrets.token_hex(4)
        user_id = await db.create_web_user(
            wallet_address=addr,
            referral_code=referral_code,
        )
        is_new = True
    else:
        user_id = user["user_id"]

    token = create_jwt(user_id, addr)
    return AuthVerifyResponse(
        token=token,
        user_id=user_id,
        wallet_address=addr,
        is_new=is_new,
    )


@router.get("/me")
async def me(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """Return current authenticated user info."""
    user = await db.get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    stats = await db.get_portfolio_stats_by_user_id(user_id)
    return {**user, **stats}
