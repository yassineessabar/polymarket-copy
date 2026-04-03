"""Wallet info routes."""

from fastapi import APIRouter, Depends, HTTPException

from polyx_bot.database import Database
from ..deps import get_db, get_current_user_id
from ..schemas import WalletInfo, DepositInfo

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletInfo)
async def get_wallet(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = await db.get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return WalletInfo(
        wallet_address=user.get("wallet_address"),
        usdc_balance=0.0,  # TODO: query on-chain balance
        matic_balance=0.0,
    )


@router.get("/deposit-info", response_model=DepositInfo)
async def deposit_info(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = await db.get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return DepositInfo(
        polygon_address=user.get("wallet_address"),
        network="Polygon (MATIC)",
        accepted_tokens=["USDC", "MATIC"],
    )
