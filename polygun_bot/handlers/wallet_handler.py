from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from ..database import Database
from ..wallet import get_usdc_balance, is_valid_private_key, address_from_key, encrypt_key
from ..keyboards import wallet_keyboard, deposit_keyboard, main_menu_button, feature_unavailable_keyboard, back_and_home

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
        kb = feature_unavailable_keyboard()
        if update.callback_query:
            try:
                await update.callback_query.edit_message_text(text=text, reply_markup=kb, parse_mode="HTML")
            except Exception:
                await update.callback_query.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")
        else:
            await update.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")
        return

    address = user["wallet_address"]
    usdc = get_usdc_balance(address)

    text = (
        f"Your Wallet: <code>{address}</code>\n\n"
        f"Balance: {usdc:.2f} USDC (Pnl $0)\n\n"
        f"Tap to copy the address and send USDC to deposit"
    )

    kb = wallet_keyboard()
    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(text=text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await update.callback_query.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")


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
        f"💳 <b>Deposit Wallets</b>\n\n"
        f"🟢 Polygon (POL, USDC, USDC.e):\n"
        f"<code>{address}</code>\n\n"
        f"🔵 Ethereum (ETH, USDT, USDC):\n"
        f"<code>{address}</code>\n\n"
        f"🟡 BNB (BNB, USDT, USDC):\n"
        f"<code>{address}</code>\n\n"
        f"✅ Polymarket Wallet: (Don't Deposit Here)\n"
        f"<code>{address}</code>\n\n"
        f"💰 Current Trading Balance: ${usdc:.2f}\n"
        f"⚠️ Minimum deposit amount is $100 worth of tokens."
    )

    kb = deposit_keyboard()
    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(text=text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await update.callback_query.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")


async def import_wallet_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start import wallet conversation."""
    text = (
        "🔑 <b>Import Wallet</b>\n\n"
        "Please paste your private key or recovery phrase to import "
        "your existing wallet:\n\n"
        "⚠️ Do not disclose your private key to others.\n\n"
        "Send /cancel to go back."
    )
    kb = back_and_home("wallet")
    if update.callback_query:
        await update.callback_query.answer()
        try:
            await update.callback_query.edit_message_text(text=text, parse_mode="HTML", reply_markup=kb)
        except Exception:
            await update.callback_query.message.reply_text(text=text, parse_mode="HTML", reply_markup=kb)
    else:
        await update.message.reply_text(text=text, parse_mode="HTML", reply_markup=kb)
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
        await update.effective_chat.send_message(
            "❌ Invalid private key. Please try again or send /cancel.",
            reply_markup=back_and_home("wallet"))
        return WAITING_PRIVATE_KEY

    if not key_input.startswith("0x"):
        key_input = "0x" + key_input

    address = address_from_key(key_input)
    enc_key = encrypt_key(key_input)

    await db.update_user_wallet(telegram_id, address, enc_key)

    usdc = get_usdc_balance(address)
    await update.effective_chat.send_message(
        f"✅ <b>Wallet imported successfully!</b>\n\n"
        f"Address: <code>{address}</code>\n"
        f"Balance: {usdc:.2f} USDC",
        parse_mode="HTML",
        reply_markup=main_menu_button())

    return ConversationHandler.END


async def import_wallet_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Import cancelled.", reply_markup=main_menu_button())
    return ConversationHandler.END
