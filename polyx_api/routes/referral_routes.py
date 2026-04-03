"""Referral routes."""

from fastapi import APIRouter, Depends, HTTPException

from polyx_bot.database import Database
from ..deps import get_db, get_current_user_id
from ..schemas import ReferralStats

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


@router.get("", response_model=ReferralStats)
async def referral_stats(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = await db.get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use telegram_id if available for backward compat, else use user_id-based queries
    telegram_id = user.get("telegram_id")
    if telegram_id:
        stats = await db.get_referral_stats(telegram_id)
    else:
        stats = {
            "tier1": 0, "tier2": 0, "tier3": 0,
            "total_reach": 0, "total_earned": 0.0, "claimable": 0.0,
        }

    return ReferralStats(
        referral_code=user["referral_code"],
        **stats,
    )


@router.get("/link")
async def referral_link(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = await db.get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    code = user["referral_code"]
    return {
        "referral_code": code,
        "link": f"https://polyx.app/ref/{code}",
    }
