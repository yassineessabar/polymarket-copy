"""Shared FastAPI dependencies: DB access and JWT auth."""
import jwt
from fastapi import Depends, HTTPException, Request
from polyx_bot.config import JWT_SECRET
from polyx_bot.database import Database

_db: Database | None = None


async def init_db():
    global _db
    _db = Database()
    await _db.init()
    return _db


def get_db() -> Database:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


# Default public user — allows dashboard viewing without login
DEFAULT_USER_ID = 7446549575


async def get_current_user(request: Request, db: Database = Depends(get_db)) -> dict:
    """Extract user from JWT Bearer token, or fall back to default public user."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        # No token — return default user for public dashboard access
        user = await db.get_user_by_user_id(DEFAULT_USER_ID)
        if user:
            return user
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token payload")

    user = await db.get_user_by_user_id(int(user_id))
    if not user:
        raise HTTPException(401, "User not found")

    return user
