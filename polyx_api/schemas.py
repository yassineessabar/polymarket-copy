"""Pydantic models for API request/response types."""

from pydantic import BaseModel, Field
from typing import Optional


# ── Auth ──

class AuthNonceResponse(BaseModel):
    nonce: str


class AuthVerifyRequest(BaseModel):
    message: str
    signature: str


class AuthVerifyResponse(BaseModel):
    token: str
    user_id: int
    wallet_address: str
    is_new: bool = False


class UserProfile(BaseModel):
    user_id: int
    wallet_address: Optional[str] = None
    username: Optional[str] = None
    referral_code: str
    auth_provider: str = "telegram"
    created_at: str
    is_active: int = 1
    total_fees_paid: float = 0.0
    positions_value: float = 0.0
    position_count: int = 0
    daily_pnl: float = 0.0


# ── Settings ──

class UserSettings(BaseModel):
    trade_mode: str = "standard"
    quickbuy_amount: float = 25.0
    max_risk_pct: float = 10.0
    min_bet: float = 1.0
    max_open_positions: int = 20
    max_per_event: int = 2
    max_exposure_pct: float = 50.0
    daily_loss_limit_pct: float = 15.0
    drawdown_scale_start: float = 5.0
    correlation_penalty: float = 0.5
    dry_run: int = 1
    notifications_on: int = 1
    copy_trading_active: int = 0
    demo_mode: int = 0
    demo_balance: float = 0.0


class UpdateSettingsRequest(BaseModel):
    trade_mode: Optional[str] = None
    quickbuy_amount: Optional[float] = None
    max_risk_pct: Optional[float] = None
    min_bet: Optional[float] = None
    max_open_positions: Optional[int] = None
    max_per_event: Optional[int] = None
    max_exposure_pct: Optional[float] = None
    daily_loss_limit_pct: Optional[float] = None
    drawdown_scale_start: Optional[float] = None
    correlation_penalty: Optional[float] = None
    dry_run: Optional[int] = None
    notifications_on: Optional[int] = None


# ── Wallet ──

class WalletInfo(BaseModel):
    wallet_address: Optional[str] = None
    usdc_balance: float = 0.0
    matic_balance: float = 0.0


class DepositInfo(BaseModel):
    polygon_address: Optional[str] = None
    network: str = "Polygon (MATIC)"
    accepted_tokens: list[str] = ["USDC", "MATIC"]


# ── Copy Trading ──

class CopyTarget(BaseModel):
    id: int
    wallet_addr: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    added_at: str
    is_active: int = 1


class AddTargetRequest(BaseModel):
    wallet_address: str
    display_name: Optional[str] = ""
    description: Optional[str] = ""


class SmartWallet(BaseModel):
    name: str
    address: str
    copiers: int
    description: str
    weekly_pnl: str
    win_rate: str = ""
    total_trades: str = ""
    total_profit: str = ""
    positions: int = 0
    stats_url: Optional[str] = None


class CopyStatus(BaseModel):
    is_active: bool
    target_count: int


# ── Portfolio ──

class Position(BaseModel):
    id: int
    target_wallet: Optional[str] = None
    condition_id: str
    outcome_index: int
    token_id: str
    title: Optional[str] = None
    outcome: Optional[str] = None
    entry_price: float
    bet_amount: float
    target_usdc_size: Optional[float] = None
    event_slug: Optional[str] = None
    opened_at: str
    is_open: int = 1
    closed_at: Optional[str] = None
    exit_price: Optional[float] = None
    pnl_usd: Optional[float] = None
    close_reason: Optional[str] = None


class PositionWithPnL(Position):
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None


class PortfolioStats(BaseModel):
    positions_value: float = 0.0
    position_count: int = 0
    daily_pnl: float = 0.0
    total_pnl: float = 0.0
    win_rate: float = 0.0


class DailyRisk(BaseModel):
    date: str
    daily_pnl: float = 0.0
    daily_bets_placed: int = 0
    daily_amount_wagered: float = 0.0
    halted: int = 0
    trades_copied: int = 0
    trades_blocked: int = 0
    trades_skipped: int = 0


# ── Markets ──

class Market(BaseModel):
    condition_id: str
    question: str
    category: Optional[str] = None
    volume: float = 0.0
    liquidity: float = 0.0
    outcomes: list[str] = []
    outcome_prices: list[float] = []
    end_date: Optional[str] = None
    image: Optional[str] = None


# ── Referrals ──

class ReferralStats(BaseModel):
    referral_code: str
    tier1: int = 0
    tier2: int = 0
    tier3: int = 0
    total_reach: int = 0
    total_earned: float = 0.0
    claimable: float = 0.0


# ── Demo ──

class DemoModeRequest(BaseModel):
    balance: float = Field(default=1000.0, ge=0, le=100000)
