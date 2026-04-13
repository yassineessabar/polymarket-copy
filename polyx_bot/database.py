import aiosqlite
import os
from datetime import date, datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "polyx.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    telegram_id     INTEGER PRIMARY KEY,
    username        TEXT,
    wallet_address  TEXT,
    private_key_enc TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    referral_code   TEXT UNIQUE NOT NULL,
    referred_by     INTEGER,
    total_fees_paid REAL NOT NULL DEFAULT 0.0,
    user_id         INTEGER,
    auth_provider   TEXT DEFAULT 'telegram',
    nonce           TEXT
);

CREATE TABLE IF NOT EXISTS user_settings (
    telegram_id          INTEGER PRIMARY KEY REFERENCES users(telegram_id),
    trade_mode           TEXT NOT NULL DEFAULT 'standard',
    quickbuy_amount      REAL NOT NULL DEFAULT 25.0,
    max_risk_pct         REAL NOT NULL DEFAULT 10.0,
    min_bet              REAL NOT NULL DEFAULT 1.0,
    max_open_positions   INTEGER NOT NULL DEFAULT 20,
    max_per_event        INTEGER NOT NULL DEFAULT 2,
    max_exposure_pct     REAL NOT NULL DEFAULT 50.0,
    daily_loss_limit_pct REAL NOT NULL DEFAULT 15.0,
    drawdown_scale_start REAL NOT NULL DEFAULT 5.0,
    correlation_penalty  REAL NOT NULL DEFAULT 0.5,
    dry_run              INTEGER NOT NULL DEFAULT 1,
    notifications_on     INTEGER NOT NULL DEFAULT 1,
    copy_trading_active  INTEGER NOT NULL DEFAULT 0,
    two_factor_enabled   INTEGER NOT NULL DEFAULT 0,
    demo_mode            INTEGER NOT NULL DEFAULT 0,
    demo_balance         REAL NOT NULL DEFAULT 0.0,
    last_menu_msg_id     INTEGER,
    user_id              INTEGER
);

CREATE TABLE IF NOT EXISTS targets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
    wallet_addr TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    added_at    TEXT NOT NULL DEFAULT (datetime('now')),
    is_active   INTEGER NOT NULL DEFAULT 1,
    user_id     INTEGER,
    UNIQUE(telegram_id, wallet_addr)
);

CREATE TABLE IF NOT EXISTS positions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id     INTEGER NOT NULL REFERENCES users(telegram_id),
    target_wallet   TEXT,
    condition_id    TEXT NOT NULL,
    outcome_index   INTEGER NOT NULL,
    token_id        TEXT NOT NULL,
    title           TEXT,
    outcome         TEXT,
    entry_price     REAL NOT NULL,
    bet_amount      REAL NOT NULL,
    target_usdc_size REAL,
    event_slug      TEXT,
    source_timestamp TEXT,
    opened_at       TEXT NOT NULL DEFAULT (datetime('now')),
    is_open         INTEGER NOT NULL DEFAULT 1,
    closed_at       TEXT,
    exit_price      REAL,
    pnl_usd         REAL,
    close_reason    TEXT,
    user_id         INTEGER,
    end_date        TEXT
);

CREATE TABLE IF NOT EXISTS trades (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id  INTEGER NOT NULL REFERENCES users(telegram_id),
    position_id  INTEGER REFERENCES positions(id),
    side         TEXT NOT NULL,
    token_id     TEXT NOT NULL,
    amount_usdc  REAL NOT NULL,
    price        REAL NOT NULL,
    fee_usdc     REAL NOT NULL DEFAULT 0.0,
    is_copy      INTEGER NOT NULL DEFAULT 0,
    source_wallet TEXT,
    executed_at  TEXT NOT NULL DEFAULT (datetime('now')),
    dry_run      INTEGER NOT NULL DEFAULT 0,
    user_id      INTEGER
);

CREATE TABLE IF NOT EXISTS daily_risk (
    telegram_id        INTEGER NOT NULL REFERENCES users(telegram_id),
    date               TEXT NOT NULL,
    daily_pnl          REAL NOT NULL DEFAULT 0.0,
    daily_bets_placed  INTEGER NOT NULL DEFAULT 0,
    daily_amount_wagered REAL NOT NULL DEFAULT 0.0,
    halted             INTEGER NOT NULL DEFAULT 0,
    trades_copied      INTEGER NOT NULL DEFAULT 0,
    trades_blocked     INTEGER NOT NULL DEFAULT 0,
    trades_skipped     INTEGER NOT NULL DEFAULT 0,
    user_id            INTEGER,
    PRIMARY KEY (telegram_id, date)
);

CREATE TABLE IF NOT EXISTS processed_trades (
    telegram_id   INTEGER NOT NULL,
    target_wallet TEXT NOT NULL,
    trade_id      TEXT NOT NULL,
    processed_at  TEXT NOT NULL DEFAULT (datetime('now')),
    user_id       INTEGER,
    PRIMARY KEY (telegram_id, target_wallet, trade_id)
);

CREATE TABLE IF NOT EXISTS bet_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    target_wallet TEXT NOT NULL,
    trade_id      TEXT NOT NULL UNIQUE,
    usdc_size     REAL NOT NULL,
    recorded_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_rewards (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id  INTEGER NOT NULL REFERENCES users(telegram_id),
    referee_id   INTEGER NOT NULL REFERENCES users(telegram_id),
    trade_id     INTEGER REFERENCES trades(id),
    tier         INTEGER NOT NULL DEFAULT 1,
    reward_usdc  REAL NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    user_id      INTEGER
);

CREATE TABLE IF NOT EXISTS fees (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id  INTEGER NOT NULL REFERENCES users(telegram_id),
    trade_id     INTEGER REFERENCES trades(id),
    fee_usdc     REAL NOT NULL,
    collected_at TEXT NOT NULL DEFAULT (datetime('now')),
    user_id      INTEGER
);

CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    type       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    read       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS performance_fees (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id  INTEGER NOT NULL REFERENCES users(telegram_id),
    position_id  INTEGER REFERENCES positions(id),
    profit_usd   REAL NOT NULL,
    fee_usd      REAL NOT NULL,
    demo         INTEGER NOT NULL DEFAULT 0,
    collected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
    telegram_id             INTEGER PRIMARY KEY REFERENCES users(telegram_id),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    status                  TEXT NOT NULL DEFAULT 'none',
    trial_started_at        TEXT,
    trial_ends_at           TEXT,
    current_period_end      TEXT,
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


class Database:
    def __init__(self, path=None):
        self.path = path or DB_PATH

    async def init(self):
        async with aiosqlite.connect(self.path) as db:
            await db.executescript(SCHEMA)
            await db.execute("PRAGMA journal_mode=WAL")
            # Migrate: add demo columns if missing
            try:
                await db.execute("ALTER TABLE user_settings ADD COLUMN demo_mode INTEGER NOT NULL DEFAULT 0")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE user_settings ADD COLUMN demo_balance REAL NOT NULL DEFAULT 0.0")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE user_settings ADD COLUMN copy_factor REAL NOT NULL DEFAULT 1.0")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE positions ADD COLUMN source_timestamp TEXT")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE users ADD COLUMN proxy_wallet TEXT")
            except Exception:
                pass
            # Backfill user_id on positions/trades where it's NULL
            try:
                await db.execute(
                    "UPDATE positions SET user_id = (SELECT user_id FROM users WHERE users.telegram_id = positions.telegram_id) "
                    "WHERE user_id IS NULL AND telegram_id IS NOT NULL")
                await db.execute(
                    "UPDATE trades SET user_id = (SELECT user_id FROM users WHERE users.telegram_id = trades.telegram_id) "
                    "WHERE user_id IS NULL AND telegram_id IS NOT NULL")
            except Exception:
                pass
            await db.commit()
        # Run user_id migration (idempotent)
        try:
            import importlib.util, sys
            mig_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", "migrations", "001_add_user_id.py")
            if os.path.exists(mig_path):
                spec = importlib.util.spec_from_file_location("mig_001", mig_path)
                mig = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mig)
                await mig.run(self.path)
        except Exception:
            pass  # migration may not be available in all contexts

    async def _conn(self):
        return await aiosqlite.connect(self.path)

    # ── Users ──
    async def get_user(self, telegram_id: int) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM users WHERE telegram_id=?", (telegram_id,)) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def create_user(self, telegram_id: int, username: str, wallet_address: str,
                          private_key_enc: str, referral_code: str, referred_by: int = None):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT INTO users (telegram_id, username, wallet_address, private_key_enc, referral_code, referred_by) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (telegram_id, username, wallet_address, private_key_enc, referral_code, referred_by))
            await db.execute(
                "INSERT INTO user_settings (telegram_id) VALUES (?)", (telegram_id,))
            await db.commit()

    async def update_user_wallet(self, telegram_id: int, wallet_address: str, private_key_enc: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE users SET wallet_address=?, private_key_enc=? WHERE telegram_id=?",
                (wallet_address, private_key_enc, telegram_id))
            await db.commit()

    # ── Settings ──
    async def get_settings(self, telegram_id: int) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM user_settings WHERE telegram_id=?", (telegram_id,)) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def update_setting(self, telegram_id: int, key: str, value):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(f"UPDATE user_settings SET {key}=? WHERE telegram_id=?", (value, telegram_id))
            await db.commit()

    # ── Demo Mode ──
    async def adjust_demo_balance(self, telegram_id: int, delta: float):
        """Atomic increment/decrement of demo balance."""
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE user_settings SET demo_balance = MAX(0, demo_balance + ?) WHERE telegram_id=?",
                (delta, telegram_id))
            await db.commit()

    async def get_demo_balance(self, telegram_id: int) -> float:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT demo_balance FROM user_settings WHERE telegram_id=?", (telegram_id,)) as cur:
                row = await cur.fetchone()
                return row[0] if row else 0.0

    # ── Targets ──
    async def get_targets(self, telegram_id: int) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM targets WHERE telegram_id=? AND is_active=1", (telegram_id,)) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def add_target(self, telegram_id: int, wallet_addr: str, display_name: str = "", description: str = ""):
        async with aiosqlite.connect(self.path) as db:
            # Re-activate if previously removed, otherwise insert new
            await db.execute(
                """INSERT INTO targets (telegram_id, wallet_addr, display_name, description, is_active)
                   VALUES (?,?,?,?,1)
                   ON CONFLICT(telegram_id, wallet_addr)
                   DO UPDATE SET is_active=1, display_name=COALESCE(NULLIF(excluded.display_name,''), display_name)""",
                (telegram_id, wallet_addr.lower(), display_name, description))
            await db.commit()

    async def remove_target(self, telegram_id: int, wallet_addr: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE targets SET is_active=0 WHERE telegram_id=? AND wallet_addr=?",
                (telegram_id, wallet_addr.lower()))
            await db.commit()

    # ── Positions ──
    async def get_open_positions(self, telegram_id: int) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM positions WHERE telegram_id=? AND is_open=1", (telegram_id,)) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def get_closed_positions(self, telegram_id: int, limit: int = 20) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM positions WHERE telegram_id=? AND is_open=0 ORDER BY closed_at DESC LIMIT ?",
                (telegram_id, limit)) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def open_position(self, telegram_id: int, target_wallet: str, condition_id: str,
                            outcome_index: int, token_id: str, title: str, outcome: str,
                            entry_price: float, bet_amount: float, target_usdc_size: float,
                            event_slug: str, source_timestamp: str = None,
                            end_date: str = None) -> int:
        async with aiosqlite.connect(self.path) as db:
            # Look up user_id for this telegram_id so web API can find positions
            user_id = None
            async with db.execute(
                "SELECT user_id FROM users WHERE telegram_id=?", (telegram_id,)
            ) as ucur:
                row = await ucur.fetchone()
                if row:
                    user_id = row[0]
            cur = await db.execute(
                "INSERT INTO positions (telegram_id, user_id, target_wallet, condition_id, outcome_index, "
                "token_id, title, outcome, entry_price, bet_amount, target_usdc_size, event_slug, source_timestamp, end_date) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (telegram_id, user_id, target_wallet, condition_id, outcome_index, token_id,
                 title, outcome, entry_price, bet_amount, target_usdc_size, event_slug, source_timestamp, end_date))
            await db.commit()
            return cur.lastrowid

    async def update_position(self, position_id: int, **kwargs):
        async with aiosqlite.connect(self.path) as db:
            sets = ", ".join(f"{k}=?" for k in kwargs)
            vals = list(kwargs.values()) + [position_id]
            await db.execute(f"UPDATE positions SET {sets} WHERE id=?", vals)
            await db.commit()

    async def close_position(self, position_id: int, exit_price: float, pnl_usd: float, reason: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE positions SET is_open=0, closed_at=datetime('now'), exit_price=?, pnl_usd=?, close_reason=? WHERE id=?",
                (exit_price, pnl_usd, reason, position_id))
            await db.commit()

    async def reset_demo(self, telegram_id: int, new_balance: float):
        """Delete all positions/trades, clear processed trades, reset daily risk, set new demo balance."""
        async with aiosqlite.connect(self.path) as db:
            await db.execute("DELETE FROM trades WHERE telegram_id=?", (telegram_id,))
            await db.execute("DELETE FROM positions WHERE telegram_id=?", (telegram_id,))
            await db.execute("DELETE FROM processed_trades WHERE telegram_id=?", (telegram_id,))
            await db.execute("DELETE FROM daily_risk WHERE telegram_id=?", (telegram_id,))
            await db.execute("DELETE FROM performance_fees WHERE telegram_id=?", (telegram_id,))
            await db.execute(
                "UPDATE user_settings SET demo_balance=?, demo_mode=1 WHERE telegram_id=?",
                (new_balance, telegram_id))
            await db.commit()

    # ── Trades ──
    async def record_trade(self, telegram_id: int, position_id: int, side: str, token_id: str,
                           amount: float, price: float, fee: float, is_copy: bool,
                           source_wallet: str = "", dry_run: bool = False) -> int:
        async with aiosqlite.connect(self.path) as db:
            # Look up user_id so web API can find trades
            user_id = None
            async with db.execute(
                "SELECT user_id FROM users WHERE telegram_id=?", (telegram_id,)
            ) as ucur:
                row = await ucur.fetchone()
                if row:
                    user_id = row[0]
            cur = await db.execute(
                "INSERT INTO trades (telegram_id, user_id, position_id, side, token_id, amount_usdc, price, "
                "fee_usdc, is_copy, source_wallet, dry_run) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (telegram_id, user_id, position_id, side, token_id, amount, price, fee,
                 1 if is_copy else 0, source_wallet, 1 if dry_run else 0))
            await db.commit()
            return cur.lastrowid

    # ── Daily Risk ──
    async def get_daily_risk(self, telegram_id: int) -> dict:
        today = str(date.today())
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM daily_risk WHERE telegram_id=? AND date=?", (telegram_id, today)) as cur:
                row = await cur.fetchone()
                if row:
                    return dict(row)
            await db.execute(
                "INSERT OR IGNORE INTO daily_risk (telegram_id, date) VALUES (?,?)", (telegram_id, today))
            await db.commit()
            return {"telegram_id": telegram_id, "date": today, "daily_pnl": 0.0,
                    "daily_bets_placed": 0, "daily_amount_wagered": 0.0, "halted": 0,
                    "trades_copied": 0, "trades_blocked": 0, "trades_skipped": 0}

    async def update_daily_risk(self, telegram_id: int, **kwargs):
        today = str(date.today())
        # Ensure row exists
        await self.get_daily_risk(telegram_id)
        async with aiosqlite.connect(self.path) as db:
            sets = ", ".join(f"{k}=?" for k in kwargs)
            vals = list(kwargs.values()) + [telegram_id, today]
            await db.execute(f"UPDATE daily_risk SET {sets} WHERE telegram_id=? AND date=?", vals)
            await db.commit()

    async def increment_daily_pnl(self, telegram_id: int, pnl_delta: float):
        """Atomic increment — avoids read-then-write race condition."""
        today = str(date.today())
        await self.get_daily_risk(telegram_id)
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE daily_risk SET daily_pnl = daily_pnl + ? WHERE telegram_id=? AND date=?",
                (pnl_delta, telegram_id, today))
            await db.commit()

    # ── Bet History ──
    async def get_bet_history(self, target_wallet: str, limit: int = 200) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM bet_history WHERE target_wallet=? ORDER BY recorded_at DESC LIMIT ?",
                (target_wallet.lower(), limit)) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def add_bet_history(self, target_wallet: str, trade_id: str, usdc_size: float):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT OR IGNORE INTO bet_history (target_wallet, trade_id, usdc_size) VALUES (?,?,?)",
                (target_wallet.lower(), trade_id, usdc_size))
            await db.commit()

    # ── Processed Trades ──
    async def is_trade_processed(self, telegram_id: int, target_wallet: str, trade_id: str) -> bool:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT 1 FROM processed_trades WHERE telegram_id=? AND target_wallet=? AND trade_id=?",
                (telegram_id, target_wallet.lower(), trade_id)) as cur:
                return await cur.fetchone() is not None

    async def mark_trade_processed(self, telegram_id: int, target_wallet: str, trade_id: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT OR IGNORE INTO processed_trades (telegram_id, target_wallet, trade_id) VALUES (?,?,?)",
                (telegram_id, target_wallet.lower(), trade_id))
            await db.commit()

    # ── Referrals ──
    async def get_user_by_referral(self, code: str) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM users WHERE referral_code=?", (code,)) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def get_referral_stats(self, telegram_id: int) -> dict:
        async with aiosqlite.connect(self.path) as db:
            # Tier 1: direct referrals
            async with db.execute(
                "SELECT COUNT(*) FROM users WHERE referred_by=?", (telegram_id,)) as cur:
                tier1 = (await cur.fetchone())[0]
            # Tier 2: referrals of referrals
            async with db.execute(
                "SELECT COUNT(*) FROM users WHERE referred_by IN (SELECT telegram_id FROM users WHERE referred_by=?)",
                (telegram_id,)) as cur:
                tier2 = (await cur.fetchone())[0]
            # Tier 3
            async with db.execute(
                "SELECT COUNT(*) FROM users WHERE referred_by IN "
                "(SELECT telegram_id FROM users WHERE referred_by IN "
                "(SELECT telegram_id FROM users WHERE referred_by=?))",
                (telegram_id,)) as cur:
                tier3 = (await cur.fetchone())[0]
            # Earnings
            async with db.execute(
                "SELECT COALESCE(SUM(reward_usdc), 0) FROM referral_rewards WHERE referrer_id=?",
                (telegram_id,)) as cur:
                total_earned = (await cur.fetchone())[0]
            return {
                "tier1": tier1, "tier2": tier2, "tier3": tier3,
                "total_reach": tier1 + tier2 + tier3,
                "total_earned": total_earned,
                "claimable": total_earned,  # simplified
            }

    # ── Portfolio stats ──
    async def get_portfolio_stats(self, telegram_id: int) -> dict:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT COALESCE(SUM(bet_amount), 0) FROM positions WHERE telegram_id=? AND is_open=1",
                (telegram_id,)) as cur:
                positions_value = (await cur.fetchone())[0]
            async with db.execute(
                "SELECT COUNT(*) FROM positions WHERE telegram_id=? AND is_open=1",
                (telegram_id,)) as cur:
                position_count = (await cur.fetchone())[0]
            risk = await self.get_daily_risk(telegram_id)
            return {
                "positions_value": positions_value,
                "position_count": position_count,
                "daily_pnl": risk.get("daily_pnl", 0),
            }

    # ── Active copy traders ──
    async def get_active_copy_traders(self) -> list:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT telegram_id FROM user_settings WHERE copy_trading_active=1") as cur:
                return [r[0] for r in await cur.fetchall()]

    # ── Performance Fees ──
    async def record_performance_fee(self, telegram_id: int, position_id: int,
                                      profit_usd: float, fee_usd: float, demo: bool = False):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT INTO performance_fees (telegram_id, position_id, profit_usd, fee_usd, demo) "
                "VALUES (?,?,?,?,?)",
                (telegram_id, position_id, profit_usd, fee_usd, 1 if demo else 0))
            await db.commit()

    async def get_total_performance_fees(self, telegram_id: int, demo: bool = False) -> float:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT COALESCE(SUM(fee_usd), 0) FROM performance_fees WHERE telegram_id=? AND demo=?",
                (telegram_id, 1 if demo else 0)) as cur:
                return (await cur.fetchone())[0]

    # ── Subscriptions ──
    async def get_subscription(self, telegram_id: int) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM subscriptions WHERE telegram_id=?", (telegram_id,)) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def upsert_subscription(self, telegram_id: int, **kwargs):
        async with aiosqlite.connect(self.path) as db:
            existing = await self.get_subscription(telegram_id)
            if existing:
                sets = ", ".join(f"{k}=?" for k in kwargs)
                vals = list(kwargs.values()) + [telegram_id]
                await db.execute(
                    f"UPDATE subscriptions SET {sets}, updated_at=datetime('now') WHERE telegram_id=?", vals)
            else:
                kwargs["telegram_id"] = telegram_id
                cols = ", ".join(kwargs.keys())
                placeholders = ", ".join("?" for _ in kwargs)
                await db.execute(
                    f"INSERT INTO subscriptions ({cols}) VALUES ({placeholders})",
                    list(kwargs.values()))
            await db.commit()

    async def is_subscription_active(self, telegram_id: int) -> bool:
        """Check if user has an active subscription or is in trial."""
        sub = await self.get_subscription(telegram_id)
        if not sub:
            return False
        return sub.get("status") in ("trialing", "active")

    async def get_telegram_id_by_stripe_customer(self, stripe_customer_id: str) -> int | None:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT telegram_id FROM subscriptions WHERE stripe_customer_id=?",
                (stripe_customer_id,)) as cur:
                row = await cur.fetchone()
                return row[0] if row else None

    # ══════════════════════════════════════════════════════════════════
    # Lookup helpers
    # ══════════════════════════════════════════════════════════════════

    async def get_user_by_wallet(self, wallet_address: str) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM users WHERE LOWER(wallet_address)=?",
                (wallet_address.lower(),)
            ) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def create_web_user(self, wallet_address: str, referral_code: str,
                              private_key_enc: str | None = None,
                              referred_by: int | None = None) -> int:
        """Create a web-only user (no telegram_id). Returns user_id."""
        async with aiosqlite.connect(self.path) as db:
            # Use a large negative telegram_id to avoid collisions with real Telegram IDs
            # This is a pragmatic workaround since telegram_id is the PK.
            async with db.execute("SELECT MIN(telegram_id) FROM users") as cur:
                row = await cur.fetchone()
                min_id = row[0] if row and row[0] is not None else 0
            fake_tg_id = min(min_id, 0) - 1

            await db.execute(
                "INSERT INTO users (telegram_id, username, wallet_address, private_key_enc, "
                "referral_code, referred_by, auth_provider) "
                "VALUES (?, ?, ?, ?, ?, ?, 'web')",
                (fake_tg_id, None, wallet_address.lower(), private_key_enc,
                 referral_code, referred_by))
            # Set user_id = rowid
            await db.execute(
                "UPDATE users SET user_id = rowid WHERE telegram_id=? AND user_id IS NULL",
                (fake_tg_id,))
            # Create default settings
            await db.execute(
                "INSERT INTO user_settings (telegram_id) VALUES (?)", (fake_tg_id,))
            # Backfill user_id on settings
            async with db.execute(
                "SELECT user_id FROM users WHERE telegram_id=?", (fake_tg_id,)
            ) as cur:
                uid_row = await cur.fetchone()
                user_id = uid_row[0]
            await db.execute(
                "UPDATE user_settings SET user_id=? WHERE telegram_id=?",
                (user_id, fake_tg_id))
            await db.commit()
            return user_id

    async def get_user_id_for_telegram(self, telegram_id: int) -> int | None:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT user_id FROM users WHERE telegram_id=?", (telegram_id,)
            ) as cur:
                row = await cur.fetchone()
                return row[0] if row else None

    async def get_user_by_user_id(self, user_id: int) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM users WHERE user_id=?", (user_id,)
            ) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def update_nonce(self, user_id: int, nonce: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE users SET nonce=? WHERE user_id=?", (nonce, user_id))
            await db.commit()

    async def get_settings_by_user_id(self, user_id: int) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM user_settings WHERE user_id=?", (user_id,)
            ) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def update_setting_by_user_id(self, user_id: int, key: str, value):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                f"UPDATE user_settings SET {key}=? WHERE user_id=?", (value, user_id))
            await db.commit()

    async def get_open_positions_by_user_id(self, user_id: int) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM positions WHERE user_id=? AND is_open=1 ORDER BY id DESC", (user_id,)
            ) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def get_closed_positions_by_user_id(self, user_id: int, limit: int = 50) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM positions WHERE user_id=? AND is_open=0 "
                "ORDER BY closed_at DESC LIMIT ?",
                (user_id, limit)
            ) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def get_targets_by_user_id(self, user_id: int) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM targets WHERE user_id=? AND is_active=1", (user_id,)
            ) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def add_target_by_user_id(self, user_id: int, wallet_addr: str,
                                     display_name: str = "", description: str = ""):
        async with aiosqlite.connect(self.path) as db:
            # Get telegram_id for this user_id (needed for existing FK/unique constraints)
            async with db.execute(
                "SELECT telegram_id FROM users WHERE user_id=?", (user_id,)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return
                telegram_id = row[0]
            await db.execute(
                "INSERT INTO targets (telegram_id, wallet_addr, display_name, "
                "description, user_id) VALUES (?,?,?,?,?) "
                "ON CONFLICT(telegram_id, wallet_addr) DO UPDATE SET "
                "is_active=1, display_name=excluded.display_name, "
                "description=excluded.description",
                (telegram_id, wallet_addr.lower(), display_name, description, user_id))
            await db.commit()

    async def remove_target_by_user_id(self, user_id: int, wallet_addr: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE targets SET is_active=0 WHERE user_id=? AND wallet_addr=?",
                (user_id, wallet_addr.lower()))
            await db.commit()

    async def get_portfolio_stats_by_user_id(self, user_id: int) -> dict:
        async with aiosqlite.connect(self.path) as db:
            async with db.execute(
                "SELECT COALESCE(SUM(bet_amount), 0) FROM positions "
                "WHERE user_id=? AND is_open=1", (user_id,)
            ) as cur:
                positions_value = (await cur.fetchone())[0]
            async with db.execute(
                "SELECT COUNT(*) FROM positions WHERE user_id=? AND is_open=1",
                (user_id,)
            ) as cur:
                position_count = (await cur.fetchone())[0]
            # Total realized P&L
            async with db.execute(
                "SELECT COALESCE(SUM(pnl_usd), 0) FROM positions "
                "WHERE user_id=? AND is_open=0", (user_id,)
            ) as cur:
                total_pnl = (await cur.fetchone())[0]
            # Win rate
            async with db.execute(
                "SELECT COUNT(*) FROM positions WHERE user_id=? AND is_open=0",
                (user_id,)
            ) as cur:
                total_closed = (await cur.fetchone())[0]
            async with db.execute(
                "SELECT COUNT(*) FROM positions WHERE user_id=? AND is_open=0 AND pnl_usd > 0",
                (user_id,)
            ) as cur:
                wins = (await cur.fetchone())[0]
            win_rate = (wins / total_closed * 100) if total_closed > 0 else 0.0

            risk = await self.get_daily_risk_by_user_id(user_id)
            return {
                "positions_value": positions_value,
                "position_count": position_count,
                "daily_pnl": risk.get("daily_pnl", 0),
                "total_pnl": total_pnl,
                "win_rate": win_rate,
            }

    async def get_daily_risk_by_user_id(self, user_id: int) -> dict:
        today = str(date.today())
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM daily_risk WHERE user_id=? AND date=?",
                (user_id, today)
            ) as cur:
                row = await cur.fetchone()
                if row:
                    return dict(row)
        return {
            "date": today, "daily_pnl": 0.0,
            "daily_bets_placed": 0, "daily_amount_wagered": 0.0, "halted": 0,
            "trades_copied": 0, "trades_blocked": 0, "trades_skipped": 0,
        }

    async def reset_demo_by_user_id(self, user_id: int, new_balance: float):
        """Delete all positions/trades, clear processed trades, reset daily risk, set new demo balance."""
        async with aiosqlite.connect(self.path) as db:
            # Get telegram_id
            async with db.execute(
                "SELECT telegram_id FROM users WHERE user_id=?", (user_id,)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return
                telegram_id = row[0]
            await db.execute("DELETE FROM trades WHERE user_id=?", (user_id,))
            await db.execute("DELETE FROM positions WHERE user_id=?", (user_id,))
            await db.execute("DELETE FROM processed_trades WHERE telegram_id=?", (telegram_id,))
            await db.execute("DELETE FROM daily_risk WHERE telegram_id=?", (telegram_id,))
            await db.execute("DELETE FROM performance_fees WHERE telegram_id=?", (telegram_id,))
            await db.execute(
                "UPDATE user_settings SET demo_balance=?, demo_mode=1 WHERE user_id=?",
                (new_balance, user_id))
            await db.commit()

    # ── Web API helpers ──

    async def get_notifications_by_user_id(self, user_id: int, limit: int = 50,
                                            unread_only: bool = False) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            if unread_only:
                query = ("SELECT * FROM notifications WHERE user_id=? AND read=0 "
                         "ORDER BY created_at DESC LIMIT ?")
            else:
                query = ("SELECT * FROM notifications WHERE user_id=? "
                         "ORDER BY created_at DESC LIMIT ?")
            async with db.execute(query, (user_id, limit)) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def mark_notifications_read(self, user_id: int, ids: list[int] = None,
                                       mark_all: bool = False):
        async with aiosqlite.connect(self.path) as db:
            if mark_all:
                await db.execute(
                    "UPDATE notifications SET read=1 WHERE user_id=?", (user_id,))
            elif ids:
                placeholders = ",".join("?" for _ in ids)
                await db.execute(
                    f"UPDATE notifications SET read=1 WHERE user_id=? AND id IN ({placeholders})",
                    [user_id] + ids)
            await db.commit()

    async def get_trades_by_user_id(self, user_id: int, limit: int = 50,
                                     offset: int = 0) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM trades WHERE user_id=? "
                "ORDER BY executed_at DESC LIMIT ? OFFSET ?",
                (user_id, limit, offset)
            ) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def get_subscription(self, telegram_id: int) -> dict | None:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM subscriptions WHERE telegram_id=?",
                (telegram_id,)
            ) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def upsert_subscription(self, telegram_id: int, stripe_customer_id: str,
                                   stripe_subscription_id: str, status: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO subscriptions "
                "(telegram_id, stripe_customer_id, stripe_subscription_id, status) "
                "VALUES (?, ?, ?, ?)",
                (telegram_id, stripe_customer_id, stripe_subscription_id, status))
            await db.commit()

    async def update_subscription_status(self, stripe_customer_id: str, status: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE subscriptions SET status=? WHERE stripe_customer_id=?",
                (status, stripe_customer_id))
            await db.commit()

    async def get_user_by_wallet(self, wallet_address: str) -> dict | None:
        """Find user by wallet address or auth wallet (stored in username)."""
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM users WHERE LOWER(wallet_address)=? OR LOWER(username)=?",
                (wallet_address.lower(), wallet_address.lower())
            ) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None
