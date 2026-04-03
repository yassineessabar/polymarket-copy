"""WebSocket endpoint — real-time portfolio updates and notifications."""

import asyncio
import json
import logging

import aiohttp
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from polyx_bot.database import Database
from polyx_bot.api_helpers import get_market_price
from .auth import verify_jwt

log = logging.getLogger("polyx")

router = APIRouter(tags=["websocket"])

# How often to poll for new notifications (seconds)
NOTIFICATION_POLL_INTERVAL = 2
# How often to send price updates for open positions (seconds)
PRICE_UPDATE_INTERVAL = 15


@router.websocket("/ws/portfolio")
async def portfolio_ws(websocket: WebSocket):
    """Real-time portfolio updates via WebSocket.

    Authentication: pass JWT as query param  /ws/portfolio?token=xxx
    Sends:
      - New notifications (polled every 2s, marked read after sending)
      - Position price updates (every 15s)
    """
    # ── Authenticate ──
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = verify_jwt(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await websocket.accept()
    log.info(f"[WS] Client connected: user_id={user_id}")

    db: Database = websocket.app.state.db

    # Track last notification ID we sent so we only send new ones
    last_notif_id = await _get_max_notification_id(db, user_id)

    try:
        # Run notification polling and price updates concurrently
        notif_task = asyncio.create_task(
            _notification_loop(websocket, db, user_id, last_notif_id)
        )
        price_task = asyncio.create_task(
            _price_update_loop(websocket, db, user_id)
        )
        ping_task = asyncio.create_task(
            _receive_loop(websocket)
        )

        # Wait until any task finishes (disconnect or error)
        done, pending = await asyncio.wait(
            [notif_task, price_task, ping_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for t in pending:
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.error(f"[WS] Error for user {user_id}: {e}")
    finally:
        log.info(f"[WS] Client disconnected: user_id={user_id}")


async def _receive_loop(websocket: WebSocket):
    """Keep the connection alive by consuming client messages (ping/pong)."""
    try:
        while True:
            data = await websocket.receive_text()
            # Respond to explicit ping messages
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass


async def _notification_loop(
    websocket: WebSocket, db: Database, user_id: int, last_id: int
):
    """Poll notifications table every NOTIFICATION_POLL_INTERVAL seconds."""
    import aiosqlite

    cursor_id = last_id

    while True:
        try:
            notifications = []
            async with aiosqlite.connect(db.path) as conn:
                conn.row_factory = aiosqlite.Row
                async with conn.execute(
                    "SELECT id, type, payload, created_at FROM notifications "
                    "WHERE user_id=? AND id > ? ORDER BY id ASC LIMIT 50",
                    (user_id, cursor_id),
                ) as cur:
                    rows = await cur.fetchall()
                    notifications = [dict(r) for r in rows]

            if notifications:
                ids_to_mark = []
                for notif in notifications:
                    try:
                        notif_payload = json.loads(notif["payload"])
                    except (json.JSONDecodeError, TypeError):
                        notif_payload = {"text": notif["payload"]}

                    await websocket.send_json({
                        "type": "notification",
                        "data": {
                            "id": notif["id"],
                            "notif_type": notif["type"],
                            "payload": notif_payload,
                            "created_at": notif["created_at"],
                        },
                    })
                    ids_to_mark.append(notif["id"])
                    cursor_id = max(cursor_id, notif["id"])

                # Mark as read
                if ids_to_mark:
                    async with aiosqlite.connect(db.path) as conn:
                        placeholders = ",".join("?" for _ in ids_to_mark)
                        await conn.execute(
                            f"UPDATE notifications SET read=1 WHERE id IN ({placeholders})",
                            ids_to_mark,
                        )
                        await conn.commit()

        except WebSocketDisconnect:
            break
        except asyncio.CancelledError:
            break
        except Exception as e:
            log.error(f"[WS:notif] Error for user {user_id}: {e}")

        await asyncio.sleep(NOTIFICATION_POLL_INTERVAL)


async def _price_update_loop(websocket: WebSocket, db: Database, user_id: int):
    """Send price updates for open positions every PRICE_UPDATE_INTERVAL seconds."""
    while True:
        try:
            positions = await db.get_open_positions_by_user_id(user_id)

            if positions:
                price_updates = []
                async with aiohttp.ClientSession() as session:
                    for pos in positions:
                        token_id = pos.get("token_id", "")
                        if not token_id:
                            continue
                        try:
                            current_price = await get_market_price(session, token_id)
                        except Exception:
                            current_price = 0.0

                        entry_price = pos.get("entry_price", 0)
                        bet_amount = pos.get("bet_amount", 0)
                        shares = bet_amount / entry_price if entry_price > 0 else 0
                        unrealized_pnl = shares * (current_price - entry_price)
                        pnl_pct = (
                            (current_price - entry_price) / entry_price * 100
                            if entry_price > 0
                            else 0
                        )

                        price_updates.append({
                            "position_id": pos["id"],
                            "title": pos.get("title", ""),
                            "outcome": pos.get("outcome", ""),
                            "token_id": token_id,
                            "entry_price": entry_price,
                            "current_price": current_price,
                            "bet_amount": bet_amount,
                            "unrealized_pnl": round(unrealized_pnl, 4),
                            "pnl_pct": round(pnl_pct, 2),
                        })

                if price_updates:
                    await websocket.send_json({
                        "type": "price_update",
                        "data": price_updates,
                    })

        except WebSocketDisconnect:
            break
        except asyncio.CancelledError:
            break
        except Exception as e:
            log.error(f"[WS:price] Error for user {user_id}: {e}")

        await asyncio.sleep(PRICE_UPDATE_INTERVAL)


async def _get_max_notification_id(db: Database, user_id: int) -> int:
    """Get the highest notification ID already read for this user."""
    import aiosqlite

    try:
        async with aiosqlite.connect(db.path) as conn:
            async with conn.execute(
                "SELECT COALESCE(MAX(id), 0) FROM notifications WHERE user_id=? AND read=1",
                (user_id,),
            ) as cur:
                row = await cur.fetchone()
                return row[0] if row else 0
    except Exception:
        return 0
