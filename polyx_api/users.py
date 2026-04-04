"""User profile and settings endpoints."""
from fastapi import APIRouter, Depends
from polyx_bot.database import Database
from polyx_bot.wallet import get_usdc_balance
from .deps import get_db, get_current_user
from .models import SettingsUpdate

router = APIRouter(prefix="/api/v1", tags=["users"])


@router.get("/me")
async def get_profile(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get current user profile + settings."""
    user_id = user["user_id"]
    settings = await db.get_settings_by_user_id(user_id)

    try:
        balance = get_usdc_balance(user["wallet_address"])
    except Exception:
        balance = 0.0

    stats = await db.get_portfolio_stats_by_user_id(user_id)
    sub = await db.get_subscription(user["telegram_id"])

    demo_mode = bool(settings.get("demo_mode", 0)) if settings else False
    if demo_mode:
        balance = settings.get("demo_balance", 0)

    return {
        "user_id": user_id,
        "wallet_address": user["wallet_address"],
        "auth_wallet": user.get("username", ""),
        "auth_provider": user.get("auth_provider", "web"),
        "created_at": user.get("created_at"),
        "balance_usdc": balance,
        "positions_value": stats.get("positions_value", 0) if stats else 0,
        "position_count": stats.get("position_count", 0) if stats else 0,
        "net_worth": balance + (stats.get("positions_value", 0) if stats else 0),
        "settings": settings or {},
        "subscription": sub,
    }


@router.patch("/me/settings")
async def update_settings(
    body: SettingsUpdate,
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Update user settings (partial update)."""
    user_id = user["user_id"]
    allowed_keys = {
        "trade_mode", "quickbuy_amount", "max_risk_pct", "min_bet",
        "max_open_positions", "max_per_event", "max_exposure_pct",
        "daily_loss_limit_pct", "drawdown_scale_start", "correlation_penalty",
        "dry_run", "demo_mode", "demo_balance",
    }

    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        if key not in allowed_keys:
            continue
        await db.update_setting_by_user_id(user_id, key, value)

    settings = await db.get_settings_by_user_id(user_id)
    return {"settings": settings}
