"""Pydantic request/response models for the PolyX API."""
from pydantic import BaseModel, Field
from typing import Optional


# ── Auth ──
class NonceRequest(BaseModel):
    wallet_address: str

class NonceResponse(BaseModel):
    nonce: str
    user_id: int

class VerifyRequest(BaseModel):
    wallet_address: str
    signature: str

class TokenResponse(BaseModel):
    token: str
    user: dict

class MagicLinkRequest(BaseModel):
    email: str

class MagicVerifyRequest(BaseModel):
    token: str

class RefreshResponse(BaseModel):
    token: str


# ── User / Settings ──
class SettingsUpdate(BaseModel):
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
    demo_mode: Optional[int] = None
    demo_balance: Optional[float] = None


# ── Copy Trading ──
class AddTargetRequest(BaseModel):
    wallet_address: str
    display_name: str = ""
    description: str = ""


# ── Notifications ──
class MarkReadRequest(BaseModel):
    ids: list[int] = Field(default_factory=list)
    all: bool = False
