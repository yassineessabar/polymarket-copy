"""Copy trading routes."""

from fastapi import APIRouter, Depends, HTTPException

from polyx_bot.database import Database
from ..deps import get_db, get_current_user_id
from ..schemas import CopyTarget, AddTargetRequest, SmartWallet, CopyStatus

router = APIRouter(prefix="/api/copy", tags=["copy"])

# Curated smart wallets (same as Telegram bot)
SMART_WALLETS = [
    SmartWallet(
        name="Theo4",
        address="0x56687bf447db6ffa42ffe2204a05edaa20f55839",
        copiers=1240,
        description="$22M+ PnL, top Polymarket whale, diverse bets",
        weekly_pnl="+12.5% weekly",
        stats_url="https://polymarketanalytics.com/traders/0x56687bf447db6ffa42ffe2204a05edaa20f55839",
    ),
    SmartWallet(
        name="Sports-Whale",
        address="0x0c154c190E293B7e5F8D453b5F690C4dC9599A45",
        copiers=336,
        description="Sports whale -- NBA, NHL, large $44K+ bets",
        weekly_pnl="+29.28% weekly",
        stats_url="https://polymarketanalytics.com/traders/0x0c154c190E293B7e5F8D453b5F690C4dC9599A45",
    ),
    SmartWallet(
        name="Spread-Master",
        address="0x492442eab586f242b53bda933fd5de859c8a3782",
        copiers=376,
        description="High-volume spread trader, $117K positions",
        weekly_pnl="+31.48% weekly",
        stats_url="https://polymarketanalytics.com/traders/0x492442eab586f242b53bda933fd5de859c8a3782",
    ),
    SmartWallet(
        name="Geopolitics-Pro",
        address="0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
        copiers=280,
        description="Politics & Geopolitics, steady conviction bets",
        weekly_pnl="+27.15% weekly",
        stats_url="https://polymarketanalytics.com/traders/0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
    ),
    SmartWallet(
        name="Sharky6999",
        address="0x751a2b86cab503496efd325c8344e10159349ea1",
        copiers=150,
        description="High-frequency crypto & BTC/XRP 5-min markets",
        weekly_pnl="+18.5% weekly",
        stats_url="https://polymarketanalytics.com/traders/0x751a2b86cab503496efd325c8344e10159349ea1",
    ),
]


@router.get("/targets", response_model=list[CopyTarget])
async def list_targets(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    return await db.get_targets_by_user_id(user_id)


@router.post("/targets", response_model=dict)
async def add_target(
    body: AddTargetRequest,
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    import re
    if not re.match(r"^0x[a-fA-F0-9]{40}$", body.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    await db.add_target_by_user_id(
        user_id, body.wallet_address, body.display_name or "", body.description or ""
    )
    return {"ok": True, "wallet_address": body.wallet_address.lower()}


@router.delete("/targets/{wallet}")
async def remove_target(
    wallet: str,
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    await db.remove_target_by_user_id(user_id, wallet)
    return {"ok": True}


@router.post("/start")
async def start_copy(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    targets = await db.get_targets_by_user_id(user_id)
    if not targets:
        raise HTTPException(status_code=400, detail="Add a target wallet first")
    await db.update_setting_by_user_id(user_id, "copy_trading_active", 1)
    return {"ok": True, "is_active": True}


@router.post("/stop")
async def stop_copy(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    await db.update_setting_by_user_id(user_id, "copy_trading_active", 0)
    return {"ok": True, "is_active": False}


@router.get("/smart-wallets", response_model=list[SmartWallet])
async def get_smart_wallets():
    return SMART_WALLETS


@router.get("/status", response_model=CopyStatus)
async def copy_status(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    settings = await db.get_settings_by_user_id(user_id)
    targets = await db.get_targets_by_user_id(user_id)
    is_active = bool(settings and settings.get("copy_trading_active", 0))
    return CopyStatus(is_active=is_active, target_count=len(targets))
