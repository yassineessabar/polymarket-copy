"""
PolyX Worker — standalone copy engine process.
Runs CopyTradeManager for ALL users (Telegram + web).

Usage:
    python -m polyx_bot.worker
"""
import asyncio
import json
import logging
import signal
import sys
from datetime import datetime

import aiosqlite

from .database import Database
from .copy_engine import CopyTradeManager

log = logging.getLogger("polyx")

# How often to check for newly activated/deactivated users
USER_POLL_INTERVAL = 10  # seconds


class NotificationWriter:
    """Writes notifications to the DB notifications table instead of Telegram.

    Mimics the telegram.Bot.send_message interface so CopyTradeManager can use
    it as a drop-in replacement for telegram.Bot.
    """

    def __init__(self, db: Database):
        self.db = db

    async def send_message(self, chat_id, text, **kwargs):
        """Mimics telegram.Bot.send_message — writes to DB notifications table.

        chat_id is the telegram_id passed by CopyTradeManager._notify.
        We resolve it to a user_id for the notifications table.
        """
        # Determine notification type from message content
        notif_type = self._classify(text)

        # Resolve user_id from telegram_id
        user_id = await self.db.get_user_id_for_telegram(int(chat_id))
        if user_id is None:
            # Fallback: use telegram_id as user_id (for telegram-only users
            # that may not have a user_id yet)
            user_id = int(chat_id)

        payload = json.dumps({
            "text": text,
            "telegram_id": int(chat_id),
            "timestamp": datetime.utcnow().isoformat(),
        })

        try:
            async with aiosqlite.connect(self.db.path) as conn:
                await conn.execute(
                    "INSERT INTO notifications (user_id, type, payload, created_at, read) "
                    "VALUES (?, ?, ?, datetime('now'), 0)",
                    (user_id, notif_type, payload),
                )
                await conn.commit()
        except Exception as e:
            log.error(f"[NotificationWriter] Failed to write notification for user {chat_id}: {e}")

    @staticmethod
    def _classify(text: str) -> str:
        """Parse notification text to determine type."""
        upper = text.upper()
        if "<B>BUY" in upper:
            return "BUY"
        if "<B>SELL" in upper:
            return "SELL"
        if "<B>CLOSE" in upper:
            return "CLOSE"
        if "STARTED" in upper or "STOPPED" in upper:
            return "STATUS"
        if "WARNING" in upper or "ERROR" in upper:
            return "ALERT"
        return "INFO"


class Worker:
    """Manages CopyTradeManager lifecycle for all active users."""

    def __init__(self):
        self.db: Database | None = None
        self.manager: CopyTradeManager | None = None
        self._running = True
        self._active_users: set[int] = set()

    async def start(self):
        log.info("[Worker] Initializing database...")
        self.db = Database()
        await self.db.init()

        notifier = NotificationWriter(self.db)
        self.manager = CopyTradeManager(self.db, notifier)

        log.info("[Worker] Starting user poll loop...")
        await self._poll_loop()

    async def _poll_loop(self):
        """Poll for activated/deactivated users every USER_POLL_INTERVAL seconds."""
        while self._running:
            try:
                await self._sync_users()
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.error(f"[Worker] Poll error: {e}")

            try:
                await asyncio.sleep(USER_POLL_INTERVAL)
            except asyncio.CancelledError:
                break

    async def _sync_users(self):
        """Compare DB active users with running tasks, start/stop as needed."""
        # Query all users with copy_trading_active=1
        active_ids = set(await self.db.get_active_copy_traders())

        # Start tasks for newly activated users
        to_start = active_ids - self._active_users
        for tid in to_start:
            log.info(f"[Worker] Starting copy engine for user {tid}")
            await self.manager.start_user(tid)

        # Stop tasks for deactivated users
        to_stop = self._active_users - active_ids
        for tid in to_stop:
            log.info(f"[Worker] Stopping copy engine for user {tid}")
            await self.manager.stop_user(tid)

        # Also restart any tasks that died unexpectedly
        for tid in active_ids:
            task = self.manager.tasks.get(tid)
            if task and task.done():
                log.warning(f"[Worker] Task for user {tid} died, restarting...")
                await self.manager.start_user(tid)

        self._active_users = active_ids

        if to_start or to_stop:
            log.info(f"[Worker] Active users: {len(self._active_users)}")

    async def shutdown(self):
        """Graceful shutdown — stop all copy tasks."""
        log.info("[Worker] Shutting down...")
        self._running = False
        if self.manager:
            await self.manager.stop_all()
        log.info("[Worker] Shutdown complete.")


async def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("worker.log"),
        ],
    )

    worker = Worker()

    # Graceful shutdown on SIGINT / SIGTERM
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def _signal_handler():
        log.info("[Worker] Received shutdown signal")
        shutdown_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass

    # Run worker in a task so we can await the shutdown event
    worker_task = asyncio.create_task(worker.start())

    # Wait for either the worker to finish or a shutdown signal
    shutdown_waiter = asyncio.create_task(shutdown_event.wait())
    done, pending = await asyncio.wait(
        [worker_task, shutdown_waiter],
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Clean up
    for t in pending:
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass

    await worker.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
