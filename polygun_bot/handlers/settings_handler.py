from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..keyboards import settings_keyboard, main_menu_button
from ..wallet import decrypt_key


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show settings screen."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    settings = await db.get_settings(telegram_id)

    trade_mode = settings.get("trade_mode", "standard") if settings else "standard"

    text = (
        "⚙️ <b>Settings</b>\n"
        "Fine tune how PolyGun behaves when you trade.\n\n"
        "🔧 <b>Trading Modes</b>\n"
        "• Cautious, requires confirmation for every market order\n"
        "• Standard, only orders above $100 need confirmation\n"
        "• Expert, executes orders instantly with zero confirmation\n\n"
        "🛒 <b>Quickbuy Presets</b>\n"
        "Tap any preset amount to adjust your default quickbuy values.\n\n"
        "📊 <b>American Odds</b> (Sports events only)\n"
        "Display odds in American format for sports markets (e.g., +150, -200).\n\n"
        "🔑 <b>Wallet Security</b>\n"
        "Export your smart wallet private key. Handle with care.\n\n"
        "🔐 <b>Two-Factor Authentication</b> (Disabled)\n"
        "Protect withdrawals and key exports with a TOTP code from your authenticator app.\n\n"
        "👥 <b>Referrals</b>\n"
        "Invite friends to PolyGun and earn rewards from their activity.\n\n"
        "Select an option below to manage its settings."
    )

    kb = settings_keyboard(trade_mode)
    if update.callback_query:
        await update.callback_query.edit_message_text(text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")


async def set_trade_mode(update: Update, context: ContextTypes.DEFAULT_TYPE, mode: str):
    """Change trade mode."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    await db.update_setting(telegram_id, "trade_mode", mode)
    await update.callback_query.answer(f"Trade mode set to {mode.title()}")
    await settings_command(update, context)


async def set_quickbuy(update: Update, context: ContextTypes.DEFAULT_TYPE, amount: float):
    """Set quickbuy preset amount."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    await db.update_setting(telegram_id, "quickbuy_amount", amount)
    await update.callback_query.answer(f"Quickbuy set to ${amount:.0f}")
    await settings_command(update, context)


async def wallet_security(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Export private key."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    if not user or not user.get("private_key_enc"):
        await update.callback_query.answer("No wallet found.")
        return

    try:
        key = decrypt_key(user["private_key_enc"])
        text = (
            "🔑 <b>Your Private Key</b>\n\n"
            f"<tg-spoiler>{key}</tg-spoiler>\n\n"
            "⚠️ Never share this with anyone!\n"
            "This message will not be stored."
        )
        # Send as a new message (not edit) so it's separate
        await update.callback_query.message.reply_text(text=text, parse_mode="HTML")
        await update.callback_query.answer()
    except Exception:
        await update.callback_query.answer("Failed to decrypt key.")
