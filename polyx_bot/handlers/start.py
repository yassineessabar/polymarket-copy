import os
import secrets
from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..wallet import generate_wallet, encrypt_key, get_usdc_balance
from ..keyboards import home_keyboard, respond
from ..config import BOT_USERNAME

WELCOME_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "welcome.png")


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command — always show welcome banner + home menu."""
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

    # Create user if new
    existing = await db.get_user(telegram_id)
    if not existing:
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

    # Delete old messages
    if update.message:
        try:
            await update.message.delete()
        except Exception:
            pass
    last_msg_id = context.user_data.get("last_bot_msg_id")
    if last_msg_id:
        try:
            await context.bot.delete_message(chat_id=telegram_id, message_id=last_msg_id)
        except Exception:
            pass

    # Always show welcome banner image
    welcome_text = "Copy Trade Polymarket on Telegram\n\nTrade Smarter. Automatically."
    if os.path.exists(WELCOME_IMAGE):
        with open(WELCOME_IMAGE, "rb") as img:
            msg = await context.bot.send_photo(
                chat_id=telegram_id, photo=img, caption=welcome_text,
                reply_markup=home_keyboard())
    else:
        msg = await context.bot.send_message(
            chat_id=telegram_id, text=welcome_text,
            reply_markup=home_keyboard())
    context.user_data["last_bot_msg_id"] = msg.message_id


async def send_home(update: Update, context: ContextTypes.DEFAULT_TYPE, user: dict = None):
    """Send the home screen with portfolio stats."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    if not user:
        user = await db.get_user(telegram_id)

    settings = await db.get_settings(telegram_id)
    demo_mode = bool(settings and settings.get("demo_mode", 0))
    stats = await db.get_portfolio_stats(telegram_id)
    positions_val = stats["positions_value"]
    open_count = stats.get("position_count", 0)

    if demo_mode:
        balance = settings.get("demo_balance", 0)
        net_worth = balance + positions_val
        mode_badge = "🎮 DEMO MODE"
    else:
        balance = get_usdc_balance(user["wallet_address"]) if user.get("wallet_address") else 0.0
        net_worth = balance + positions_val
        mode_badge = ""

    header = f"Welcome to PolyX 🏠\n"
    if mode_badge:
        header += f"<b>{mode_badge}</b>\n"
    header += "Your secure companion for rapid Polymarket trades.\n"

    # Show who we're copying
    targets = await db.get_targets(telegram_id)
    if targets:
        copy_section = "\n🎯 <b>Copying:</b>\n"
        for t in targets:
            name = t.get("display_name") or t["wallet_addr"][:10] + "..."
            copy_section += f"  • {name}\n"
    else:
        copy_section = "\n🎯 No traders copied yet — tap Copy Trade to start!\n"

    text = (
        f"{header}\n"
        f"📊 Current Positions: ${positions_val:.2f} ({open_count} open)\n"
        f"💰 Available Balance: ${balance:,.2f}\n"
        f"💎 Total Net Worth: ${net_worth:,.2f}\n"
        f"{copy_section}\n"
        f"Copy top traders, snipe odds, and trade like a pro."
    )

    await respond(update, context, text, reply_markup=home_keyboard())
