from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..keyboards import settings_keyboard, main_menu_button, demo_mode_keyboard, risk_settings_keyboard, back_and_home, respond
from ..wallet import decrypt_key


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show settings screen."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    settings = await db.get_settings(telegram_id)

    demo_mode = bool(settings and settings.get("demo_mode", 0))
    demo_bal = settings.get("demo_balance", 0) if settings else 0
    copy_active = bool(settings and settings.get("copy_trading_active", 0))

    mode_label = f"🎮 DEMO (${demo_bal:,.0f})" if demo_mode else "🟢 LIVE"

    text = (
        "⚙️ <b>Settings</b>\n\n"
        f"📍 Mode: <b>{mode_label}</b>\n"
        f"Copy Trading: <b>{'🟢 Running' if copy_active else '🔴 Stopped'}</b>\n\n"
        "📊 <b>Risk & Sizing</b> — Adjust risk parameters\n"
        "🔑 <b>Export Key</b> — Export your wallet private key\n"
        "👥 <b>Referral Hub</b> — Invite friends & earn rewards"
    )

    await respond(update, context, text, reply_markup=settings_keyboard(demo_mode))


async def set_trade_mode(update: Update, context: ContextTypes.DEFAULT_TYPE, mode: str):
    db: Database = context.application.bot_data["db"]
    await db.update_setting(update.effective_user.id, "trade_mode", mode)
    await update.callback_query.answer(f"Trade mode set to {mode.title()}")
    await settings_command(update, context)


async def set_quickbuy(update: Update, context: ContextTypes.DEFAULT_TYPE, amount: float):
    db: Database = context.application.bot_data["db"]
    await db.update_setting(update.effective_user.id, "quickbuy_amount", amount)
    await update.callback_query.answer(f"Quickbuy set to ${amount:.0f}")
    await settings_command(update, context)


async def risk_settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show risk & sizing settings."""
    db: Database = context.application.bot_data["db"]
    settings = await db.get_settings(update.effective_user.id)

    max_risk = settings.get("max_risk_pct", 10)
    min_bet = settings.get("min_bet", 1)
    max_pos = settings.get("max_open_positions", 20)
    max_exp = settings.get("max_exposure_pct", 50)

    text = (
        "📊 <b>Risk & Position Sizing</b>\n\n"
        "Bets are sized <b>proportionally</b> — if the target bets 1% of their portfolio, "
        "you bet 1% of yours.\n\n"
        f"📈 <b>Max Risk Per Trade:</b> {max_risk}%\n"
        f"  Max % of your portfolio on a single trade\n\n"
        f"💵 <b>Min Bet Size:</b> ${min_bet}\n"
        f"  Trades below this are skipped\n\n"
        f"📋 <b>Max Open Positions:</b> {max_pos}\n"
        f"  Hard cap on simultaneous positions\n\n"
        f"🛡 <b>Max Exposure:</b> {max_exp}%\n"
        f"  Total $ at risk as % of portfolio"
    )

    await respond(update, context, text, reply_markup=risk_settings_keyboard(settings))


async def set_risk_param(update: Update, context: ContextTypes.DEFAULT_TYPE, key: str, value):
    """Update a risk setting."""
    db: Database = context.application.bot_data["db"]
    await db.update_setting(update.effective_user.id, key, value)
    await update.callback_query.answer("Updated!")
    await risk_settings_command(update, context)


async def demo_mode_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db: Database = context.application.bot_data["db"]
    settings = await db.get_settings(update.effective_user.id)

    is_active = bool(settings and settings.get("demo_mode", 0))
    balance = settings.get("demo_balance", 0) if settings else 0

    if is_active:
        text = (
            "🎮 <b>Demo Mode</b> — <b>ACTIVE</b>\n\n"
            f"💰 Demo Balance: <b>${balance:,.2f}</b>\n\n"
            "You're trading with simulated funds.\n"
            "Same markets, same logic, zero risk.\n\n"
            "Reset your balance or disable demo mode below."
        )
    else:
        text = (
            "🎮 <b>Demo Mode</b>\n\n"
            "Practice copy trading with simulated funds.\n\n"
            "✅ Real market data & prices\n"
            "✅ Same risk engine & confidence scoring\n"
            "✅ Full position tracking & P&L\n"
            "❌ No real money at risk\n\n"
            "Choose a starting balance to begin:"
        )

    await respond(update, context, text, reply_markup=demo_mode_keyboard(is_active, balance))


async def demo_set_balance(update: Update, context: ContextTypes.DEFAULT_TYPE, amount: float):
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    # Full reset: close all positions, clear processed trades, reset daily risk
    await db.reset_demo(telegram_id, amount)

    # Restart copy engine so it starts fresh (marks current trades as seen)
    copy_mgr = context.application.bot_data.get("copy_manager")
    if copy_mgr:
        settings = await db.get_settings(telegram_id)
        if settings and settings.get("copy_trading_active"):
            await copy_mgr.stop_user(telegram_id)
            await copy_mgr.start_user(telegram_id)

    await update.callback_query.answer(f"Demo reset — ${amount:,.0f} fresh start!")
    await demo_mode_command(update, context)


async def demo_disable(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    # Check subscription before allowing live mode
    from ..subscription import check_subscription_status, create_checkout_session
    sub_info = await check_subscription_status(db, telegram_id)

    if not sub_info["allowed"]:
        # User needs to subscribe — create Stripe checkout
        checkout_url = await create_checkout_session(db, telegram_id)
        if checkout_url:
            from telegram import InlineKeyboardButton, InlineKeyboardMarkup
            text = (
                "💎 <b>Live Trading Requires a Subscription</b>\n\n"
                "Subscribe for <b>$39/month</b> to trade with real money.\n\n"
                "✅ Unlimited copy trading\n"
                "✅ Real-time trade execution\n"
                "✅ All risk management features\n\n"
                "Demo mode remains free — no subscription needed."
            )
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton("Subscribe — $39/mo", url=checkout_url)],
                [InlineKeyboardButton("⬅️ Back to Settings", callback_data="settings")],
            ])
            await respond(update, context, text, reply_markup=kb)
        else:
            await update.callback_query.answer("Subscription service unavailable. Try again later.")
        return

    # Subscription active — proceed with switch to live
    await db.reset_demo(telegram_id, 0)
    await db.update_setting(telegram_id, "demo_mode", 0)

    # Stop copy engine if running
    copy_mgr = context.application.bot_data.get("copy_manager")
    if copy_mgr:
        await copy_mgr.stop_user(telegram_id)

    await update.callback_query.answer("Switched to Live Mode")
    await settings_command(update, context)


async def wallet_security(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db: Database = context.application.bot_data["db"]
    user = await db.get_user(update.effective_user.id)

    if not user or not user.get("private_key_enc"):
        await update.callback_query.answer("No wallet found.")
        return

    try:
        key = decrypt_key(user["private_key_enc"])
        text = (
            "🔑 <b>Your Private Key</b>\n\n"
            f"<tg-spoiler>{key}</tg-spoiler>\n\n"
            "⚠️ Never share this with anyone!"
        )
        await respond(update, context, text, reply_markup=back_and_home("settings"))
    except Exception:
        await update.callback_query.answer("Failed to decrypt key.")
