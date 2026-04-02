from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..keyboards import portfolio_keyboard, main_menu_button


async def portfolio_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show portfolio with open positions and P&L."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    positions = await db.get_open_positions(telegram_id)

    text = "📊 <b>Open Positions</b>\n\n"

    if not positions:
        text += "✅ You have no open positions.\n\nPaste a Polymarket link to open your first trade."
    else:
        for i, pos in enumerate(positions, 1):
            title = pos.get("title", "Unknown")[:40]
            outcome = pos.get("outcome", "?")
            entry = pos.get("entry_price", 0)
            bet = pos.get("bet_amount", 0)
            text += (
                f"{i}. {title}\n"
                f"   {outcome} @ {entry*100:.1f}c | ${bet:.2f} bet\n\n"
            )

    count = len(positions)
    kb = portfolio_keyboard()

    if update.callback_query:
        await update.callback_query.edit_message_text(
            text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(
            text=text, reply_markup=kb, parse_mode="HTML")


async def portfolio_closed(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show closed positions."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    positions = await db.get_closed_positions(telegram_id)

    text = "📊 <b>Closed Positions</b>\n\n"

    if not positions:
        text += "No closed positions yet."
    else:
        total_pnl = 0
        for i, pos in enumerate(positions, 1):
            title = pos.get("title", "Unknown")[:35]
            pnl = pos.get("pnl_usd", 0)
            reason = pos.get("close_reason", "")
            result = "✅" if pnl >= 0 else "❌"
            total_pnl += pnl
            text += f"{result} {title} | ${pnl:+.2f}\n"

        text += f"\n━━━━━━━━━━━━━━\nTotal P&L: ${total_pnl:+.2f}"

    kb = portfolio_keyboard()
    if update.callback_query:
        await update.callback_query.edit_message_text(
            text=text, reply_markup=kb, parse_mode="HTML")
    else:
        await update.message.reply_text(
            text=text, reply_markup=kb, parse_mode="HTML")
