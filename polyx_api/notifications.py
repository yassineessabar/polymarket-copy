"""Notification endpoints."""
from fastapi import APIRouter, Depends, Query
from polyx_bot.database import Database
from .deps import get_db, get_current_user
from .models import MarkReadRequest

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get user notifications."""
    user_id = user["user_id"]
    notifications = await db.get_notifications_by_user_id(
        user_id, limit=limit, unread_only=unread_only)

    import aiosqlite
    async with aiosqlite.connect(db.path) as conn:
        async with conn.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id=? AND read=0",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            unread_count = row[0] if row else 0

    return {
        "notifications": notifications,
        "unread_count": unread_count,
    }


@router.post("/read")
async def mark_read(
    body: MarkReadRequest,
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Mark notifications as read."""
    user_id = user["user_id"]
    await db.mark_notifications_read(user_id, body.ids, mark_all=body.all)
    return {"success": True}
