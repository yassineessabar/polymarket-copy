import re
from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler
from ..database import Database
from ..keyboards import (copy_trading_keyboard, copy_trading_with_targets_keyboard,
                          smart_wallets_keyboard, main_menu_button, back_and_home)

WAITING_WALLET_ADDRESS = 1

# Curated smart wallets
SMART_WALLETS = [
    {
        "name": "🏒 Gretzky",
        "address": "0x1234...example",
        "copiers": 336,
        "description": "Multi-Sport wallet with a focus on NHL",
        "weekly_pnl": "+29.28%",
    },
    {
        "name": "🎮 E-Sports Guru",
        "address": "0x5678...example",
        "copiers": 376,
        "description": "All Esports, high probability wallet 69.2% win rate",
        "weekly_pnl": "+31.48%",
    },
    {
        "name": "🍺 Barstool",
        "address": "0x9abc...example",
        "copiers": 280,
        "description": "Trades all Sports",
        "weekly_pnl": "+27.15%",
    },
]


async def copy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show copy trading screen."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    targets = await db.get_targets(telegram_id)
    settings = await db.get_settings(telegram_id)
    is_running = bool(settings and settings.get("copy_trading_active", 0))

    if not targets:
        text = (
            "🎯 <b>Copy Trading</b>\n\n"
            "You don't have any active copytrades yet.\n"
            "Start by choosing a trader you want to follow."
        )
        kb = copy_trading_keyboard()
    else:
        status = "🟢 Running" if is_running else "🔴 Stopped"
        text = f"🎯 <b>Copy Trading</b> — {status}\n\n<b>Active Targets:</b>\n"
        for i, t in enumerate(targets, 1):
            name = t.get("display_name") or t["wallet_addr"][:10] + "..."
            text += f"\n{i}. {name}\n   <code>{t['wallet_addr']}</code>\n"
        text += f"\nTotal: {len(targets)} active copytrades"
        kb = copy_trading_with_targets_keyboard(is_running)

    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(text=text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await update.callback_query.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")


async def add_copy_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start add copy trade flow."""
    text = (
        "🎯 <b>Add Copy Trade</b>\n\n"
        "Please paste the wallet address of the trader you want to copy:\n\n"
        "💡 You can find top traders at polymarketanalytics.com\n\n"
        "Send /cancel to go back."
    )
    kb = back_and_home("copy")
    if update.callback_query:
        await update.callback_query.answer()
        try:
            await update.callback_query.edit_message_text(text=text, parse_mode="HTML", reply_markup=kb)
        except Exception:
            await update.callback_query.message.reply_text(text=text, parse_mode="HTML", reply_markup=kb)
    else:
        await update.message.reply_text(text=text, parse_mode="HTML", reply_markup=kb)
    return WAITING_WALLET_ADDRESS


async def add_copy_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive wallet address and add as copy target."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    address = update.message.text.strip()

    # Validate Ethereum address
    if not re.match(r"^0x[a-fA-F0-9]{40}$", address):
        await update.message.reply_text(
            "❌ Invalid wallet address. Must be a 0x... Ethereum address.\n"
            "Try again or send /cancel.",
            reply_markup=back_and_home("copy"))
        return WAITING_WALLET_ADDRESS

    # Check if already following
    targets = await db.get_targets(telegram_id)
    existing = [t for t in targets if t["wallet_addr"] == address.lower()]
    if existing:
        await update.message.reply_text(
            "⚠️ You're already following this wallet.",
            reply_markup=main_menu_button())
        return ConversationHandler.END

    await db.add_target(telegram_id, address, display_name="")

    await update.message.reply_text(
        f"✅ <b>Copy trade added!</b>\n\n"
        f"Wallet: <code>{address}</code>\n\n"
        f"Go to 🎯 Copy Trade to start copying.",
        parse_mode="HTML",
        reply_markup=back_and_home("copy", "🎯 Copy Trade"))

    return ConversationHandler.END


async def add_copy_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Cancelled.", reply_markup=main_menu_button())
    return ConversationHandler.END


async def smart_wallets_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show curated smart wallets."""
    page = 0
    if context.args:
        try:
            page = int(context.args[0])
        except ValueError:
            pass

    total_pages = max(1, (len(SMART_WALLETS) + 2) // 3)

    text = (
        "<b>Smart Wallet Research (DYOR)</b>\n\n"
        "These are the three most-copied wallets on PolySync currently.\n"
        "Use the research tools below to analyze performance and risk, then "
        "choose the wallet you want to copy and enable it in Settings.\n"
    )

    start = page * 3
    wallets = SMART_WALLETS[start:start + 3]
    for w in wallets:
        text += (
            f"\n{w['name']} — Tap To Copy Trade\n"
            f"├ 👥 {w['copiers']} People Copying\n"
            f"├ 📈 {w['description']}\n"
            f"├ 💰 Weekly P&L: {w['weekly_pnl']}\n"
            f"└ 🔍 View on Polymarket\n"
        )

    text += f"\n📄 Page {page + 1}/{total_pages}"

    kb = smart_wallets_keyboard(page, total_pages)
    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(text=text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await update.callback_query.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(text=text, reply_markup=kb, parse_mode="HTML")


async def start_copy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start copy trading for this user."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    targets = await db.get_targets(telegram_id)
    if not targets:
        await update.callback_query.answer("Add a target wallet first!")
        return

    await db.update_setting(telegram_id, "copy_trading_active", 1)

    manager = context.application.bot_data.get("copy_manager")
    if manager:
        await manager.start_user(telegram_id)

    await update.callback_query.answer("Copy trading started! ✅")
    await copy_command(update, context)


async def stop_copy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Stop all copy trading."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    await db.update_setting(telegram_id, "copy_trading_active", 0)

    manager = context.application.bot_data.get("copy_manager")
    if manager:
        await manager.stop_user(telegram_id)

    await update.callback_query.answer("Copy trading stopped ⏹")
    await copy_command(update, context)
