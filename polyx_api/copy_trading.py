"""Copy trading management endpoints."""
import aiohttp
from fastapi import APIRouter, Depends, HTTPException
from polyx_bot.database import Database
from polyx_bot.api_helpers import get_profile_name
from .deps import get_db, get_current_user
from .models import AddTargetRequest

router = APIRouter(prefix="/api/v1/copy", tags=["copy-trading"])


@router.get("/targets")
async def list_targets(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """List all copy trading targets."""
    user_id = user["user_id"]
    targets = await db.get_targets_by_user_id(user_id)
    return {"targets": targets}


@router.post("/targets")
async def add_target(
    body: AddTargetRequest,
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Add a new copy trading target."""
    user_id = user["user_id"]
    addr = body.wallet_address.strip()

    if not addr.startswith("0x") or len(addr) != 42:
        raise HTTPException(400, "Invalid wallet address")

    # Get display name from Polymarket if not provided
    display_name = body.display_name
    if not display_name:
        async with aiohttp.ClientSession() as session:
            display_name = await get_profile_name(session, addr)

    await db.add_target_by_user_id(
        user_id, addr, display_name, body.description)

    return {"success": True, "display_name": display_name}


@router.delete("/targets/{wallet_address}")
async def remove_target(
    wallet_address: str,
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Remove a copy trading target."""
    user_id = user["user_id"]
    await db.remove_target_by_user_id(user_id, wallet_address)
    return {"success": True}


@router.post("/start")
async def start_copying(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Activate copy trading. Worker picks this up within 10s."""
    user_id = user["user_id"]

    # Check user has targets
    targets = await db.get_targets_by_user_id(user_id)
    if not targets:
        raise HTTPException(400, "Add at least one target wallet first")

    await db.update_setting_by_user_id(user_id, "copy_trading_active", 1)
    return {"status": "active", "message": "Copy trading activated"}


@router.post("/stop")
async def stop_copying(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Deactivate copy trading."""
    user_id = user["user_id"]
    await db.update_setting_by_user_id(user_id, "copy_trading_active", 0)
    return {"status": "stopped", "message": "Copy trading stopped"}


@router.get("/status")
async def copy_status(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get current copy trading status."""
    user_id = user["user_id"]
    settings = await db.get_settings_by_user_id(user_id)
    targets = await db.get_targets_by_user_id(user_id)
    open_pos = await db.get_open_positions_by_user_id(user_id)

    return {
        "active": bool(settings.get("copy_trading_active", 0)) if settings else False,
        "target_count": len(targets),
        "open_positions": len(open_pos),
        "demo_mode": bool(settings.get("demo_mode", 0)) if settings else False,
    }


@router.get("/suggested")
async def suggested_traders():
    """Return list of suggested traders to copy."""
    return {
        "traders": [
            {
                "wallet": "0x751a2b86cab503496efd325c8344e10159349ea1",
                "name": "Sharky6999",
                "emoji": "\U0001f988",
                "description": "High-freq crypto & BTC",
                "win_rate": 81,
                "profit": "$890K",
                "trades": "5,600+",
                "copiers": 150,
            },
            {
                "wallet": "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
                "name": "Theo4",
                "emoji": "\U0001f40b",
                "description": "Top whale, diverse bets",
                "win_rate": 67,
                "profit": "$22.4M",
                "trades": "4,200+",
                "copiers": 1240,
            },
            {
                "wallet": "0x0c154c190e293b7e5f8d453b5f690c4dc9599a45",
                "name": "Sports-Whale",
                "emoji": "\U0001f3c0",
                "description": "NBA, NHL, large bets",
                "win_rate": 72,
                "profit": "$2.1M",
                "trades": "1,850+",
                "copiers": 336,
            },
            {
                "wallet": "0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
                "name": "Geopolitics-Pro",
                "emoji": "\U0001f30d",
                "description": "Politics & geopolitics",
                "win_rate": 69,
                "profit": "$1.5M",
                "trades": "920+",
                "copiers": 280,
            },
            {
                "wallet": "0x8c80d213c0cbad777d06ee3f58f6ca4bc03102c3",
                "name": "SecondWindCapital",
                "emoji": "\U0001f30a",
                "description": "Macro & crypto plays",
                "win_rate": 71,
                "profit": "$1.2M",
                "trades": "2,400+",
                "copiers": 200,
            },
        ]
    }
