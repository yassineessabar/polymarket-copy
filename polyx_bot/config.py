import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")
FEE_WALLET = os.getenv("FEE_WALLET", "")
PERFORMANCE_FEE_RATE = 0.25  # 25% of realized profit

# Polymarket APIs
DATA_API = "https://data-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"
GAMMA_API = "https://gamma-api.polymarket.com"
POLYGON_RPC = os.getenv("POLYGON_RPC", "https://polygon-bor-rpc.publicnode.com")
USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# Bot name (for referral links)
BOT_USERNAME = os.getenv("BOT_USERNAME", "PolyXBot")

# Stripe subscription
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")  # Stripe Price ID for $39/month plan
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Web API
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Copy trading defaults
DEFAULT_SETTINGS = {
    "trade_mode": "expert",         # cautious / standard / expert
    "quickbuy_amount": 50.0,
    "max_risk_pct": 40.0,
    "min_bet": 0.10,
    "max_open_positions": 50,
    "max_per_event": 5,
    "max_exposure_pct": 100.0,
    "daily_loss_limit_pct": 25.0,
    "drawdown_scale_start": 10.0,
    "correlation_penalty": 0.3,
    "copy_factor": 3.0,            # 3x the target trader proportional bet
    "dry_run": 1,
    "notifications_on": 1,
    "copy_trading_active": 0,
}
