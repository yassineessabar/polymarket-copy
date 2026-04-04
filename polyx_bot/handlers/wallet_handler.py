from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler
from ..database import Database
from ..wallet import get_usdc_balance, is_valid_private_key, address_from_key, encrypt_key
from ..keyboards import (wallet_keyboard, deposit_keyboard, main_menu_button,
                          feature_unavailable_keyboard, back_and_home, respond)

WAITING_PRIVATE_KEY = 1


async def wallet_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show wallet overview."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    if not user or not user.get("wallet_address"):
        text = (
            "⚠️ <b>Feature Currently Unavailable</b>\n"
            "Please fund your wallet and complete your first transaction, "
            "or connect an active wallet to begin trading."
        )
        await respond(update, context, text, reply_markup=feature_unavailable_keyboard())
        return

    address = user["wallet_address"]
    settings = await db.get_settings(telegram_id)
    demo_mode = bool(settings and settings.get("demo_mode", 0))

    if demo_mode:
        usdc = settings.get("demo_balance", 0)
        mode_tag = " 🎮 DEMO"
    else:
        usdc = get_usdc_balance(address)
        mode_tag = ""

    text = (
        f"Your Wallet:{mode_tag}\n"
        f"<code>{address}</code>\n\n"
        f"Balance: ${usdc:,.2f} USDC\n\n"
        f"Tap to copy the address and send USDC to deposit"
    )
    await respond(update, context, text, reply_markup=wallet_keyboard())


async def deposit_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show detailed deposit info."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    if not user or not user.get("wallet_address"):
        return await wallet_command(update, context)

    address = user["wallet_address"]
    usdc = get_usdc_balance(address)

    text = (
        f"💳 <b>Deposit</b>\n\n"
        f"Send <b>USDC on Polygon</b> to:\n"
        f"<code>{address}</code>\n\n"
        f"💰 Current Balance: <b>${usdc:.2f}</b>\n\n"
        f"⚠️ Only send USDC on <b>Polygon network</b>.\n"
        f"Tokens sent on other chains (Ethereum, BNB) will be lost."
    )
    await respond(update, context, text, reply_markup=deposit_keyboard())


async def import_wallet_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start import wallet conversation."""
    text = (
        "🔑 <b>Import Wallet</b>\n\n"
        "Please paste your private key or recovery phrase to import "
        "your existing wallet:\n\n"
        "⚠️ Do not disclose your private key to others.\n\n"
        "Send /cancel to go back."
    )
    await respond(update, context, text, reply_markup=back_and_home("wallet"))
    return WAITING_PRIVATE_KEY


async def import_wallet_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive and validate private key."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    key_input = update.message.text.strip()

    # Delete the message containing the private key for security
    try:
        await update.message.delete()
    except Exception:
        pass

    if not is_valid_private_key(key_input):
        await respond(update, context,
            "❌ Invalid private key. Please try again or send /cancel.",
            reply_markup=back_and_home("wallet"))
        return WAITING_PRIVATE_KEY

    if not key_input.startswith("0x"):
        key_input = "0x" + key_input

    address = address_from_key(key_input)
    enc_key = encrypt_key(key_input)

    await db.update_user_wallet(telegram_id, address, enc_key)

    usdc = get_usdc_balance(address)
    await respond(update, context,
        f"✅ <b>Wallet imported successfully!</b>\n\n"
        f"Address: <code>{address}</code>\n"
        f"Balance: {usdc:.2f} USDC",
        reply_markup=main_menu_button())

    return ConversationHandler.END


async def import_wallet_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await respond(update, context, "Import cancelled.", reply_markup=main_menu_button())
    return ConversationHandler.END
