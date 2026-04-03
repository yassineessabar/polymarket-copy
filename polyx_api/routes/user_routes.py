"""User profile and settings routes."""

from fastapi import APIRouter, Depends, HTTPException

from polyx_bot.database import Database
from ..deps import get_db, get_current_user_id
from ..schemas import UserSettings, UpdateSettingsRequest, DemoModeRequest

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile")
async def get_profile(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = await db.get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    stats = await db.get_portfolio_stats_by_user_id(user_id)
    return {**user, **stats}


@router.get("/settings", response_model=UserSettings)
async def get_settings(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    settings = await db.get_settings_by_user_id(user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings


@router.patch("/settings")
async def update_settings(
    body: UpdateSettingsRequest,
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return {"ok": True}

    # Validate allowed keys
    allowed = set(UpdateSettingsRequest.model_fields.keys())
    for key in updates:
        if key not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid setting: {key}")

    for key, value in updates.items():
        await db.update_setting_by_user_id(user_id, key, value)
    return {"ok": True}


@router.post("/demo/enable")
async def enable_demo(
    body: DemoModeRequest,
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    await db.update_setting_by_user_id(user_id, "demo_mode", 1)
    await db.update_setting_by_user_id(user_id, "demo_balance", body.balance)
    return {"ok": True, "demo_mode": True, "balance": body.balance}


@router.post("/demo/disable")
async def disable_demo(
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    await db.update_setting_by_user_id(user_id, "demo_mode", 0)
    return {"ok": True, "demo_mode": False}


@router.post("/demo/reset")
async def reset_demo(
    body: DemoModeRequest,
    user_id: int = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    await db.reset_demo_by_user_id(user_id, body.balance)
    return {"ok": True, "balance": body.balance}
