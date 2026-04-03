"""
Migration 001: Add universal user_id to all tables.

Allows web users (no telegram_id) to share the same database as Telegram users.
Idempotent — safe to run multiple times.
"""

import aiosqlite
import asyncio
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "polyx.db")


async def column_exists(db: aiosqlite.Connection, table: str, column: str) -> bool:
    async with db.execute(f"PRAGMA table_info({table})") as cur:
        rows = await cur.fetchall()
        return any(row[1] == column for row in rows)


async def table_exists(db: aiosqlite.Connection, table: str) -> bool:
    async with db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ) as cur:
        return await cur.fetchone() is not None


async def run(db_path: str | None = None):
    path = db_path or DB_PATH
    async with aiosqlite.connect(path) as db:
        # ── 1. users table: add user_id, auth_provider, nonce ──
        if not await column_exists(db, "users", "user_id"):
            await db.execute("ALTER TABLE users ADD COLUMN user_id INTEGER")
            # Backfill: user_id = rowid
            await db.execute("UPDATE users SET user_id = rowid WHERE user_id IS NULL")
            await db.commit()

        if not await column_exists(db, "users", "auth_provider"):
            await db.execute(
                "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'telegram'"
            )
            await db.commit()

        if not await column_exists(db, "users", "nonce"):
            await db.execute("ALTER TABLE users ADD COLUMN nonce TEXT")
            await db.commit()

        # ── 2. Child tables: add user_id column ──
        child_tables = [
            "user_settings",
            "targets",
            "positions",
            "trades",
            "daily_risk",
            "processed_trades",
            "referral_rewards",
            "fees",
        ]

        for table in child_tables:
            if not await table_exists(db, table):
                continue
            if not await column_exists(db, table, "user_id"):
                await db.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")
                await db.commit()

        # ── 3. Backfill user_id in child tables by joining on telegram_id ──
        for table in child_tables:
            if not await table_exists(db, table):
                continue
            if not await column_exists(db, table, "telegram_id"):
                continue
            # Only backfill rows where user_id is NULL
            if table == "referral_rewards":
                # referral_rewards uses referrer_id / referee_id, not telegram_id
                await db.execute(
                    "UPDATE referral_rewards SET user_id = ("
                    "  SELECT u.user_id FROM users u WHERE u.telegram_id = referral_rewards.referrer_id"
                    ") WHERE user_id IS NULL"
                )
            else:
                await db.execute(
                    f"UPDATE {table} SET user_id = ("
                    f"  SELECT u.user_id FROM users u WHERE u.telegram_id = {table}.telegram_id"
                    f") WHERE user_id IS NULL"
                )
            await db.commit()

        # ── 4. Create notifications table ──
        await db.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                type       TEXT NOT NULL,
                payload    TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                read       INTEGER DEFAULT 0
            )
        """)
        await db.commit()

        # ── 5. Add last_menu_msg_id to user_settings ──
        if not await column_exists(db, "user_settings", "last_menu_msg_id"):
            await db.execute("ALTER TABLE user_settings ADD COLUMN last_menu_msg_id INTEGER")
            await db.commit()

        print("Migration 001_add_user_id completed successfully.")


if __name__ == "__main__":
    asyncio.run(run())
