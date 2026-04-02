"""
PolyGun Bot — Multi-user Polymarket copy trading Telegram bot.
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
    smart_wallets_command, start_copy_command, stop_copy_command, WAITING_WALLET_ADDRESS,
)
from .handlers.portfolio_handler import portfolio_command, portfolio_closed
from .handlers.settings_handler import (
    settings_command, set_trade_mode, set_quickbuy, wallet_security,
)
from .handlers.referral_handler import referral_command, copy_referral_link
from .handlers.help_handler import help_command

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("polygun")


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
        elif data == "import_wallet":
            await query.answer()
            await import_wallet_start(update, context)

        # Copy Trading
        elif data == "copy":
            await query.answer()
            await copy_command(update, context)
        elif data == "add_copy":
            await query.answer()
            await add_copy_start(update, context)
        elif data == "smart_wallets":
            await query.answer()
            await smart_wallets_command(update, context)
        elif data.startswith("sw_page_"):
            await query.answer()
            page = int(data.split("_")[-1])
            context.args = [str(page)]
            await smart_wallets_command(update, context)
        elif data == "start_copy":
            await start_copy_command(update, context)
        elif data == "stop_copy":
            await stop_copy_command(update, context)
        elif data == "copy_activity":
            await query.answer("Activity coming soon")

        # Portfolio
        elif data == "portfolio":
            await query.answer()
            await portfolio_command(update, context)
        elif data == "port_full" or data == "port_open":
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
            mode = data.replace("mode_", "")
            await set_trade_mode(update, context, mode)
        elif data.startswith("qb_"):
            amount = float(data.replace("qb_", ""))
            await set_quickbuy(update, context, amount)
        elif data == "wallet_security":
            await wallet_security(update, context)
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

        # Markets & Limit Orders (placeholders)
        elif data == "markets":
            await query.answer("Markets browser coming soon")
        elif data == "limit_orders":
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
            from ..keyboards import main_menu_button
            await query.edit_message_text(text=text, parse_mode="HTML",
                                          reply_markup=main_menu_button())

        # Help
        elif data == "help":
            await query.answer()
            await help_command(update, context)

        # Profile / Withdraw placeholders
        elif data == "profile":
            await query.answer("Profile coming soon")
        elif data == "withdraw":
            await query.answer("Withdraw coming soon")

        # Noop (section headers)
        elif data == "noop":
            await query.answer()

        else:
            await query.answer(f"Unknown action: {data}")

    except Exception as e:
        log.error(f"Button handler error: {e}")
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


def main():
    if not BOT_TOKEN:
        print("ERROR: Set BOT_TOKEN in .env")
        return

    app = ApplicationBuilder().token(BOT_TOKEN).post_init(post_init).build()

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
    )

    # Add copy trade conversation
    add_copy_conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(add_copy_start, pattern="^add_copy$"),
        ],
        states={
            WAITING_WALLET_ADDRESS: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, add_copy_receive),
            ],
        },
        fallbacks=[
            CommandHandler("cancel", add_copy_cancel),
        ],
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
    app.add_handler(CommandHandler("help", help_command))

    # Callback query router (catch-all for inline buttons)
    app.add_handler(CallbackQueryHandler(button_router))

    log.info("PolyGun Bot starting...")
    app.run_polling()


if __name__ == "__main__":
    main()
