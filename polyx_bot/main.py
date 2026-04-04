"""
PolyX Bot — Multi-user Polymarket copy trading Telegram bot.
"""
import asyncio
import logging
from telegram import Update
from telegram.ext import (
    ApplicationBuilder, CommandHandler, CallbackQueryHandler,
    ConversationHandler, MessageHandler, filters, ContextTypes,
)

from .config import BOT_TOKEN
from .database import Database
from .handlers.start import start_command, send_home
from .handlers.wallet_handler import (
    wallet_command, deposit_command, import_wallet_start,
    import_wallet_receive, import_wallet_cancel, WAITING_PRIVATE_KEY,
)
from .handlers.copy_handler import (
    copy_command, add_copy_start, add_copy_receive, add_copy_cancel,
    add_copy_cancel_cb, custom_wallet_start, smart_wallets_command,
    start_copy_command, stop_copy_command, quick_copy, remove_target,
    WAITING_WALLET_ADDRESS,
)
from .handlers.portfolio_handler import portfolio_command, portfolio_full, portfolio_closed
from .handlers.settings_handler import (
    settings_command, set_trade_mode, set_quickbuy, wallet_security,
    demo_mode_command, demo_set_balance, demo_disable,
    risk_settings_command, set_risk_param,
)
from .handlers.referral_handler import referral_command, copy_referral_link
from .handlers.subscription_handler import subscription_command
from .handlers.help_handler import help_command

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("polyx")


async def button_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Route all inline keyboard button presses."""
    query = update.callback_query
    data = query.data

    try:
        # Home / Navigation
        if data == "home":
            await query.answer()
            await send_home(update, context)
        elif data == "refresh_home":
            await query.answer("Refreshing...")
            await send_home(update, context)

        # Wallet
        elif data == "wallet":
            await query.answer()
            await wallet_command(update, context)
        elif data == "deposit":
            await query.answer()
            await deposit_command(update, context)
        elif data == "refresh_wallet":
            await query.answer("Refreshing...")
            await wallet_command(update, context)
        # import_wallet handled by ConversationHandler — do NOT handle here

        # Copy Trading
        elif data == "copy":
            await query.answer()
            await copy_command(update, context)
        # add_copy handled by ConversationHandler — do NOT handle here
        elif data == "add_copy":
            await query.answer()
            await add_copy_start(update, context)
        elif data.startswith("rm_target_"):
            prefix = data.replace("rm_target_", "")
            await remove_target(update, context, prefix)
        elif data.startswith("quick_copy_"):
            idx = int(data.replace("quick_copy_", ""))
            await quick_copy(update, context, idx)
        elif data == "smart_wallets":
            await query.answer()
            await smart_wallets_command(update, context)
        elif data.startswith("sw_page_"):
            await query.answer()
            page = int(data.split("_")[-1])
            context.args = [str(page)]
            await smart_wallets_command(update, context)
        elif data == "start_copy":
            # start_copy_command calls query.answer() with a status message
            await start_copy_command(update, context)
        elif data == "stop_copy":
            # stop_copy_command calls query.answer() with a status message
            await stop_copy_command(update, context)
        elif data == "copy_activity":
            await query.answer()
            db: Database = context.application.bot_data["db"]
            tid = update.effective_user.id
            open_pos = await db.get_open_positions(tid)
            closed = await db.get_closed_positions(tid, limit=10)
            if not open_pos and not closed:
                text = "📋 <b>Copy Trade Activity</b>\n\nNo activity yet. Start copy trading to see trades here."
            else:
                text = "📋 <b>Copy Trade Activity</b>\n\n"
                if open_pos:
                    text += "<b>🟢 Open Positions:</b>\n"
                    for p in open_pos:
                        entry = p.get("entry_price", 0)
                        bet = p.get("bet_amount", 0)
                        text += f"📈 {p.get('title','?')[:35]}\n   {p.get('outcome','?')} @ {entry*100:.1f}c | ${bet:.2f}\n"
                    text += "\n"
                if closed:
                    text += "<b>📕 Closed:</b>\n"
                    for p in closed:
                        icon = "✅" if (p.get("pnl_usd") or 0) >= 0 else "❌"
                        text += f"{icon} {p.get('title','?')[:35]} | ${p.get('pnl_usd',0):+.2f}\n"
            from .keyboards import back_and_home, respond
            await respond(update, context, text, reply_markup=back_and_home("copy"))

        # Portfolio
        elif data == "portfolio":
            await query.answer()
            await portfolio_command(update, context)
        elif data == "port_full":
            await query.answer()
            await portfolio_full(update, context)
        elif data == "port_open":
            await query.answer()
            await portfolio_command(update, context)
        elif data == "port_close":
            await query.answer()
            await portfolio_closed(update, context)
        elif data == "refresh_portfolio":
            await query.answer("Refreshing...")
            await portfolio_command(update, context)

        # Settings
        elif data == "settings":
            await query.answer()
            await settings_command(update, context)
        elif data.startswith("mode_"):
            # set_trade_mode calls query.answer() with a status message
            mode = data.replace("mode_", "")
            await set_trade_mode(update, context, mode)
        elif data.startswith("qb_"):
            # set_quickbuy calls query.answer() with a status message
            amount = float(data.replace("qb_", ""))
            await set_quickbuy(update, context, amount)
        elif data == "wallet_security":
            # wallet_security calls query.answer() or respond() internally
            await wallet_security(update, context)
        elif data == "risk_settings":
            await risk_settings_command(update, context)
        elif data.startswith("set_maxrisk_"):
            val = float(data.replace("set_maxrisk_", ""))
            await set_risk_param(update, context, "max_risk_pct", val)
        elif data.startswith("set_minbet_"):
            val = float(data.replace("set_minbet_", ""))
            await set_risk_param(update, context, "min_bet", val)
        elif data.startswith("set_maxpos_"):
            val = int(data.replace("set_maxpos_", ""))
            await set_risk_param(update, context, "max_open_positions", val)
        elif data.startswith("set_maxexp_"):
            val = float(data.replace("set_maxexp_", ""))
            await set_risk_param(update, context, "max_exposure_pct", val)
        elif data == "demo_mode":
            # demo_mode_command uses respond() which auto-answers
            await demo_mode_command(update, context)
        elif data.startswith("demo_set_"):
            # demo_set_balance calls query.answer() with a status message
            amount = float(data.replace("demo_set_", ""))
            await demo_set_balance(update, context, amount)
        elif data == "demo_disable":
            # demo_disable calls query.answer() with a status message
            await demo_disable(update, context)
        elif data == "subscription":
            await query.answer()
            await subscription_command(update, context)
        elif data == "trade_threshold":
            await query.answer("Trade threshold settings coming soon")
        elif data == "two_factor":
            await query.answer("2FA coming soon")
        elif data == "american_odds":
            await query.answer("American odds toggle coming soon")

        # Referrals
        elif data == "referrals" or data == "referral_hub":
            await query.answer()
            await referral_command(update, context)
        elif data == "ref_copy":
            await copy_referral_link(update, context)
        elif data == "ref_withdraw":
            await query.answer("Minimum $5 USDC required to withdraw")
        elif data == "refresh_referral":
            await query.answer("Refreshing...")
            await referral_command(update, context)

        # Markets
        elif data == "markets":
            await query.answer()
            from .keyboards import markets_keyboard, respond as _respond
            text = (
                "Market Search — Choose a filter\n\n"
                "Choose a category below or type in a custom\n"
                "search keywords (e.g. \"bitcoin\", \"trump\",\n"
                "\"earnings\")"
            )
            await _respond(update, context, text, reply_markup=markets_keyboard())
        elif data.startswith("mkt_"):
            await query.answer()
            category = data.replace("mkt_", "")
            import aiohttp
            from .api_helpers import browse_markets
            from .keyboards import back_and_home, respond as _respond
            async with aiohttp.ClientSession() as session:
                markets = await browse_markets(session, category, limit=8)
            cat_labels = {
                "politics": "🏛 Politics", "sports": "⚽ Sports",
                "crypto": "🪙 Crypto", "trump": "🇺🇸 Trump",
                "finance": "💹 Finance", "geopolitics": "🌍 Geopolitics",
                "volume": "📊 Top Volume", "trending": "🔥 Trending",
            }
            label = cat_labels.get(category, category.title())
            if not markets:
                text = f"📊 <b>{label}</b>\n\nNo active markets found in this category."
            else:
                text = f"📊 <b>{label}</b>\n\n"
                for i, m in enumerate(markets, 1):
                    vol = m.get("volume", 0)
                    mc = m.get("markets_count", 0)
                    title = m.get("title", "?")[:50]
                    if vol >= 1000000:
                        vol_str = "$%.1fM" % (vol / 1000000)
                    elif vol >= 1000:
                        vol_str = "$%.0fK" % (vol / 1000)
                    else:
                        vol_str = "$%.0f" % vol
                    text += f"{i}. {title}\n   📊 {mc} markets | Vol: {vol_str}\n\n"
            await _respond(update, context, text, reply_markup=back_and_home("markets", "⬅️ Markets"))
        elif data == "limit_orders":
            await query.answer()
            text = (
                "📋 <b>Limit Orders</b>\n\n"
                "You have no active limit orders.\n\n"
                "To place a limit buy order:\n"
                "1. Paste a Polymarket URL or search markets.\n"
                "2. Select 📊 Limit Yes or 📊 Limit No.\n"
                "3. Enter your price and amount.\n\n"
                "To place a limit sell order:\n"
                "1. Open 📈 Portfolio and navigate to an open position.\n"
                "2. Select the Sell option.\n"
                "3. Select 📋 Limit Sell.\n"
                "4. Enter your price and amount."
            )
            from .keyboards import main_menu_button as mm_btn, respond as _respond
            await _respond(update, context, text, reply_markup=mm_btn())

        # Help
        elif data == "help":
            await query.answer()
            await help_command(update, context)

        # Profile
        elif data == "profile":
            await query.answer()
            db: Database = context.application.bot_data["db"]
            tid = update.effective_user.id
            user = await db.get_user(tid)
            settings = await db.get_settings(tid)
            stats = await db.get_portfolio_stats(tid)
            risk = await db.get_daily_risk(tid)
            targets = await db.get_targets(tid)
            demo_mode = bool(settings and settings.get("demo_mode", 0))

            if demo_mode:
                balance = settings.get("demo_balance", 0)
                mode_label = "🎮 Demo"
            else:
                from .wallet import get_usdc_balance
                balance = get_usdc_balance(user["wallet_address"]) if user and user.get("wallet_address") else 0.0
                mode_label = "🟢 Live" if not settings.get("dry_run", 1) else "🔶 Dry Run"

            pos_val = stats.get("positions_value", 0)
            net_worth = balance + pos_val
            daily_pnl = risk.get("daily_pnl", 0)
            trades_today = risk.get("daily_bets_placed", 0)
            copied_today = risk.get("trades_copied", 0)
            is_running = bool(settings and settings.get("copy_trading_active", 0))
            joined = user.get("created_at", "")[:10] if user else "?"

            text = (
                f"👤 <b>Your Profile</b>\n\n"
                f"📛 @{user.get('username', '?')}\n"
                f"📅 Joined: {joined}\n"
                f"⚙️ Mode: {mode_label}\n"
                f"🤖 Copy Trading: {'🟢 Running' if is_running else '🔴 Stopped'}\n\n"
                f"<b>💰 Portfolio</b>\n"
                f"├ Balance: ${balance:,.2f}\n"
                f"├ Positions: ${pos_val:,.2f}\n"
                f"└ Net Worth: <b>${net_worth:,.2f}</b>\n\n"
                f"<b>📊 Today</b>\n"
                f"├ P&L: ${daily_pnl:+.2f}\n"
                f"├ Trades: {trades_today}\n"
                f"└ Copied: {copied_today}\n\n"
                f"<b>🎯 Targets:</b> {len(targets)} active\n"
            )
            if user and user.get("wallet_address"):
                text += f"\n📋 Wallet: <code>{user['wallet_address']}</code>"

            from .keyboards import back_and_home, respond as _respond
            await _respond(update, context, text, reply_markup=back_and_home("home"))

        elif data == "withdraw":
            await query.answer("Withdraw coming soon")

        # Noop (section headers)
        elif data == "noop":
            await query.answer()

        else:
            await query.answer(f"Unknown action: {data}")

    except Exception as e:
        log.error(f"Button handler error for data={data!r}: {e}", exc_info=True)
        try:
            await query.answer("An error occurred")
        except Exception:
            pass


async def post_init(application):
    """Initialize database and copy engine on startup."""
    db = Database()
    await db.init()
    application.bot_data["db"] = db
    log.info("Database initialized")

    # Start copy trade manager
    from .copy_engine import CopyTradeManager
    manager = CopyTradeManager(db, application.bot)
    application.bot_data["copy_manager"] = manager

    # Resume copy trading for active users
    active = await db.get_active_copy_traders()
    for user_id in active:
        await manager.start_user(user_id)
    if active:
        log.info(f"Resumed copy trading for {len(active)} users")

    # Start Stripe webhook server
    from .config import STRIPE_SECRET_KEY
    if STRIPE_SECRET_KEY:
        from .stripe_webhook import start_webhook_server
        webhook_runner = await start_webhook_server(db)
        application.bot_data["webhook_runner"] = webhook_runner


async def post_shutdown(application):
    """Graceful shutdown — stop all copy trading tasks."""
    manager = application.bot_data.get("copy_manager")
    if manager:
        await manager.stop_all()
        log.info("All copy trading tasks stopped")
    webhook_runner = application.bot_data.get("webhook_runner")
    if webhook_runner:
        await webhook_runner.cleanup()
        log.info("Webhook server stopped")


def main():
    if not BOT_TOKEN:
        print("ERROR: Set BOT_TOKEN in .env")
        return

    app = ApplicationBuilder().token(BOT_TOKEN).post_init(post_init).post_shutdown(post_shutdown).build()

    # Import wallet conversation
    import_conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(import_wallet_start, pattern="^import_wallet$"),
        ],
        states={
            WAITING_PRIVATE_KEY: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, import_wallet_receive),
            ],
        },
        fallbacks=[
            CommandHandler("cancel", import_wallet_cancel),
        ],
        per_message=False,
        allow_reentry=True,
    )

    # Custom wallet paste conversation (only triggered by "Enter Custom Wallet")
    add_copy_conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(custom_wallet_start, pattern="^custom_wallet$"),
        ],
        states={
            WAITING_WALLET_ADDRESS: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, add_copy_receive),
                # Allow quick_copy buttons to work even during conversation
                CallbackQueryHandler(
                    lambda u, c: quick_copy(u, c, int(u.callback_query.data.replace("quick_copy_", ""))),
                    pattern="^quick_copy_"),
            ],
        },
        fallbacks=[
            CommandHandler("cancel", add_copy_cancel),
            CallbackQueryHandler(add_copy_cancel_cb, pattern="^(home|copy|back_.*)$"),
        ],
        per_message=False,
        allow_reentry=True,
    )

    # Register handlers (order matters — conversations first)
    app.add_handler(import_conv)
    app.add_handler(add_copy_conv)

    # Commands
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("wallet", wallet_command))
    app.add_handler(CommandHandler("portfolio", portfolio_command))
    app.add_handler(CommandHandler("copy", copy_command))
    app.add_handler(CommandHandler("settings", settings_command))
    app.add_handler(CommandHandler("referral", referral_command))
    app.add_handler(CommandHandler("subscribe", subscription_command))
    app.add_handler(CommandHandler("help", help_command))

    # Callback query router (catch-all for inline buttons)
    app.add_handler(CallbackQueryHandler(button_router))

    log.info("PolyX Bot starting...")
    app.run_polling()


if __name__ == "__main__":
    main()
