import secrets
from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..wallet import generate_wallet, encrypt_key, get_usdc_balance
from ..keyboards import home_keyboard, welcome_keyboard
from ..config import BOT_USERNAME


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command — onboarding + home screen."""
    db: Database = context.application.bot_data["db"]
    user = update.effective_user
    telegram_id = user.id

    # Check for referral code in /start payload
    referred_by = None
    if context.args and context.args[0].startswith("REF_"):
        ref_code = context.args[0][4:]
        referrer = await db.get_user_by_referral(ref_code)
        if referrer and referrer["telegram_id"] != telegram_id:
            referred_by = referrer["telegram_id"]

    # Check if user exists
    existing = await db.get_user(telegram_id)
    if not existing:
        # Generate wallet and create user
        address, private_key = generate_wallet()
        enc_key = encrypt_key(private_key)
        referral_code = secrets.token_urlsafe(6)[:8]

        await db.create_user(
            telegram_id=telegram_id,
            username=user.username or "",
            wallet_address=address,
            private_key_enc=enc_key,
            referral_code=referral_code,
            referred_by=referred_by,
        )
        existing = await db.get_user(telegram_id)

        # Show welcome screen for new users
        welcome_text = (
            "PolyGun is a Telegram-native trading\n"
            "bot for Polymarket\n\n"
            "Trade on Polymarket directly from\n"
            "Telegram\n\n"
            "Copy trades from selected wallets\n\n"
            "Manage positions inside Telegram\n\n"
            "Built for users who want fast, seamless\n"
            "Polymarket trading without leaving\n"
            "Telegram."
        )
        await update.message.reply_text(
            text=welcome_text, reply_markup=welcome_keyboard())
        return

    # Existing user — show home
    await send_home(update, context, existing)


async def send_home(update: Update, context: ContextTypes.DEFAULT_TYPE, user: dict = None):
    """Send the home screen with portfolio stats — matches PolyGun exactly."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    if not user:
        user = await db.get_user(telegram_id)

    balance = get_usdc_balance(user["wallet_address"]) if user.get("wallet_address") else 0.0
    stats = await db.get_portfolio_stats(telegram_id)

    positions_val = stats["positions_value"]
    net_worth = balance + positions_val

    text = (
        f"Welcome to PolyGun 🏠\n"
        f"Your secure companion for rapid Polymarket trades.\n\n"
        f"📊 Current Positions: ${positions_val:.2f}\n"
        f"💰 Available Balance: ${balance:.2f}\n"
        f"📋 Active Orders: $0.00\n"
        f"💎 Total Net Worth: ${net_worth:.2f}\n\n"
        f"You have 0 Ammo. What's this?\n\n"
        f"If bot is slow, use backup bots:\n"
        f"Alpha · Beta · Sigma · Delta\n\n"
        f"Copy top traders, snipe odds, and trade like a\n"
        f"pro."
    )

    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(
                text=text, reply_markup=home_keyboard())
        except Exception:
            await update.callback_query.message.reply_text(
                text=text, reply_markup=home_keyboard())
    else:
        await update.message.reply_text(
            text=text, reply_markup=home_keyboard())
