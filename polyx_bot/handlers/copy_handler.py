import re
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from ..database import Database
from ..keyboards import (copy_trading_keyboard, copy_trading_with_targets_keyboard,
                          smart_wallets_keyboard, main_menu_button, back_and_home, respond)

WAITING_WALLET_ADDRESS = 1

# Curated smart wallets — suggested traders
SMART_WALLETS = [
    {
        "name": "🐋 Theo4",
        "address": "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
        "copiers": 1240,
        "description": "$22M+ PnL, top Polymarket whale, diverse bets",
        "weekly_pnl": "+12.5% weekly",
        "win_rate": "67%",
        "total_trades": "4,200+",
        "total_profit": "$22.4M",
        "positions": 85,
        "stats_url": "https://polymarketanalytics.com/traders/0x56687bf447db6ffa42ffe2204a05edaa20f55839",
    },
    {
        "name": "🏀 Sports-Whale",
        "address": "0x0c154c190E293B7e5F8D453b5F690C4dC9599A45",
        "copiers": 336,
        "description": "Sports whale — NBA, NHL, large $44K+ bets",
        "weekly_pnl": "+29.28% weekly",
        "win_rate": "72%",
        "total_trades": "1,850+",
        "total_profit": "$2.1M",
        "positions": 42,
        "stats_url": "https://polymarketanalytics.com/traders/0x0c154c190E293B7e5F8D453b5F690C4dC9599A45",
    },
    {
        "name": "⚡ Spread-Master",
        "address": "0x492442eab586f242b53bda933fd5de859c8a3782",
        "copiers": 376,
        "description": "High-volume spread trader, $117K positions",
        "weekly_pnl": "+31.48% weekly",
        "win_rate": "74%",
        "total_trades": "3,100+",
        "total_profit": "$4.8M",
        "positions": 63,
        "stats_url": "https://polymarketanalytics.com/traders/0x492442eab586f242b53bda933fd5de859c8a3782",
    },
    {
        "name": "🌍 Geopolitics-Pro",
        "address": "0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
        "copiers": 280,
        "description": "Politics & Geopolitics, steady conviction bets",
        "weekly_pnl": "+27.15% weekly",
        "win_rate": "69%",
        "total_trades": "920+",
        "total_profit": "$1.5M",
        "positions": 28,
        "stats_url": "https://polymarketanalytics.com/traders/0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
    },
    {
        "name": "🦈 Sharky6999",
        "address": "0x751a2b86cab503496efd325c8344e10159349ea1",
        "copiers": 150,
        "description": "High-frequency crypto & BTC/XRP 5-min markets",
        "weekly_pnl": "+18.5% weekly",
        "win_rate": "81%",
        "total_trades": "5,600+",
        "total_profit": "$890K",
        "positions": 120,
        "stats_url": "https://polymarketanalytics.com/traders/0x751a2b86cab503496efd325c8344e10159349ea1",
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
            "<b>🔥 Top Traders — tap to copy:</b>\n"
        )
        for w in SMART_WALLETS:
            text += (
                f"\n{w['name']}\n"
                f"├ 🏆 Win Rate: {w['win_rate']} | {w['total_trades']} trades\n"
                f"├ 💰 Profit: {w['total_profit']} | {w['weekly_pnl']}\n"
                f"├ 📊 {w['positions']} positions | 👥 {w['copiers']} copying\n"
                f"└ 📈 {w['description']}\n"
            )
        text += "\nOr enter a custom wallet address."
        kb = copy_trading_keyboard(SMART_WALLETS)
    else:
        status = "🟢 Running" if is_running else "🔴 Stopped"
        text = f"🎯 <b>Copy Trading</b> — {status}\n\n<b>Active Targets:</b>\n"
        for i, t in enumerate(targets, 1):
            name = t.get("display_name") or t["wallet_addr"][:10] + "..."
            stats_url = f"https://polymarketanalytics.com/traders/{t['wallet_addr']}#trades"
            text += f"\n{i}. {name}\n   <a href=\"{stats_url}\">{t['wallet_addr'][:10]}...{t['wallet_addr'][-6:]}</a>\n"
        text += f"\nTotal: {len(targets)} active copytrades"
        kb = copy_trading_with_targets_keyboard(is_running, targets)

    await respond(update, context, text, reply_markup=kb)


async def quick_copy(update: Update, context: ContextTypes.DEFAULT_TYPE, index: int):
    """One-tap copy a suggested trader."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    if index < 0 or index >= len(SMART_WALLETS):
        await update.callback_query.answer("Invalid trader")
        return

    w = SMART_WALLETS[index]
    address = w["address"]
    name = w["name"]

    targets = await db.get_targets(telegram_id)
    existing = [t for t in targets if t["wallet_addr"] == address.lower()]
    if existing:
        await update.callback_query.answer("Already copying this trader!")
        return

    await db.add_target(telegram_id, address, display_name=name)
    await update.callback_query.answer(f"✅ Now copying {name}!")
    await copy_command(update, context)


async def add_copy_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show suggested traders + current targets — one-tap to add."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    targets = await db.get_targets(telegram_id)
    following_addrs = {t["wallet_addr"] for t in targets}

    text = "🎯 <b>Add Copy Trade</b>\n\n"

    if targets:
        text += "<b>✅ Currently Copying:</b>\n"
        for t in targets:
            name = t.get("display_name") or t["wallet_addr"][:10] + "..."
            text += f"  • {name}\n"
        text += "\n"

    text += "<b>🔥 Suggested Traders:</b>\n"
    for w in SMART_WALLETS:
        already = " ✅" if w["address"].lower() in following_addrs else ""
        text += (
            f"\n{w['name']}{already}\n"
            f"├ 🏆 Win Rate: {w['win_rate']} | {w['total_trades']} trades\n"
            f"├ 💰 Profit: {w['total_profit']} | {w['weekly_pnl']}\n"
            f"├ 📊 {w['positions']} positions | 👥 {w['copiers']} copying\n"
            f"└ 📈 {w['description']}\n"
        )

    text += "\nTap a trader to copy, or enter a custom wallet."

    buttons = []
    for i, w in enumerate(SMART_WALLETS):
        if w["address"].lower() in following_addrs:
            buttons.append([
                InlineKeyboardButton(f"✅ {w['name']} (copying)", callback_data="noop"),
                InlineKeyboardButton("📊", url=w.get("stats_url", "#")),
            ])
        else:
            buttons.append([
                InlineKeyboardButton(f"📋 Copy {w['name']}", callback_data=f"quick_copy_{i}"),
                InlineKeyboardButton("📊", url=w.get("stats_url", "#")),
            ])
    buttons.append([InlineKeyboardButton("✏️ Enter Custom Wallet", callback_data="custom_wallet")])
    buttons.append([
        InlineKeyboardButton("⬅️ Back", callback_data="copy"),
        InlineKeyboardButton("🏠 Home", callback_data="home"),
    ])
    kb = InlineKeyboardMarkup(buttons)

    await respond(update, context, text, reply_markup=kb)
    return ConversationHandler.END


async def custom_wallet_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Prompt user to paste a custom wallet address."""
    text = (
        "✏️ <b>Custom Wallet</b>\n\n"
        "Paste the 0x wallet address:\n\n"
        "Send /cancel to go back."
    )
    await respond(update, context, text, reply_markup=back_and_home("add_copy"))
    return WAITING_WALLET_ADDRESS


async def add_copy_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive wallet address and add as copy target."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    address = update.message.text.strip()

    if not re.match(r"^0x[a-fA-F0-9]{40}$", address):
        await respond(update, context,
            "❌ Invalid wallet address. Must be a 0x... Ethereum address.\n"
            "Try again or send /cancel.",
            reply_markup=back_and_home("add_copy"))
        return WAITING_WALLET_ADDRESS

    targets = await db.get_targets(telegram_id)
    existing = [t for t in targets if t["wallet_addr"] == address.lower()]
    if existing:
        await respond(update, context,
            "⚠️ You're already following this wallet.",
            reply_markup=back_and_home("copy"))
        return ConversationHandler.END

    await db.add_target(telegram_id, address, display_name="")

    await respond(update, context,
        f"✅ <b>Copy trade added!</b>\n\n"
        f"Wallet: <code>{address}</code>\n\n"
        f"Go to 🎯 Copy Trade to start copying.",
        reply_markup=back_and_home("copy", "🎯 Copy Trade"))

    return ConversationHandler.END


async def add_copy_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await respond(update, context, "Cancelled.", reply_markup=main_menu_button())
    return ConversationHandler.END


async def add_copy_cancel_cb(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel conversation when any button is pressed."""
    return ConversationHandler.END


async def remove_target(update: Update, context: ContextTypes.DEFAULT_TYPE, addr_prefix: str):
    """Remove a copy target — stops new copies but keeps monitoring open positions."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    targets = await db.get_targets(telegram_id)

    matched = [t for t in targets if t["wallet_addr"].startswith(addr_prefix.lower())]
    if not matched:
        await update.callback_query.answer("Target not found")
        return

    t = matched[0]
    name = t.get("display_name") or t["wallet_addr"][:10] + "..."
    wallet_addr = t["wallet_addr"]

    # Check for open positions from this target
    open_pos = await db.get_open_positions(telegram_id)
    target_positions = [p for p in open_pos if p.get("target_wallet", "").lower() == wallet_addr.lower()]

    await db.remove_target(telegram_id, wallet_addr)

    if target_positions:
        text = (
            f"⚠️ <b>Trader Removed</b>\n\n"
            f"❌ Stopped copying <b>{name}</b>\n\n"
            f"📊 You have <b>{len(target_positions)} open position(s)</b> from this trader.\n"
            f"These will stay open and be monitored until they resolve.\n"
            f"No new trades will be copied.\n\n"
            f"Open positions:\n"
        )
        for p in target_positions:
            text += f"  • {p.get('title', '?')[:40]} (${p.get('bet_amount', 0):.2f})\n"

        await respond(update, context, text,
            reply_markup=back_and_home("copy", "🎯 Copy Trade"))
    else:
        await update.callback_query.answer(f"Removed {name}")
        await copy_command(update, context)


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
        "Top-performing wallets on Polymarket.\n"
        "Tap Copy to start following, or View Stats to research first.\n"
    )

    start = page * 3
    wallets = SMART_WALLETS[start:start + 3]
    for w in wallets:
        text += (
            f"\n{w['name']}\n"
            f"├ 🏆 Win Rate: {w['win_rate']} | {w['total_trades']} trades\n"
            f"├ 💰 Profit: {w['total_profit']} | {w['weekly_pnl']}\n"
            f"├ 📊 {w['positions']} positions | 👥 {w['copiers']} copying\n"
            f"├ 📈 {w['description']}\n"
            f"└ 📋 <code>{w['address']}</code>\n"
        )

    text += f"\n📄 Page {page + 1}/{total_pages}"

    await respond(update, context, text, reply_markup=smart_wallets_keyboard(page, total_pages))


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
