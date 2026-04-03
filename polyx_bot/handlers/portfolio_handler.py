import aiohttp
from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..wallet import get_usdc_balance
from ..portfolio import get_position_with_pnl
from ..keyboards import portfolio_keyboard, respond


async def portfolio_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show portfolio — open positions with live P&L."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    positions = await db.get_open_positions(telegram_id)
    risk = await db.get_daily_risk(telegram_id)
    realized_pnl = risk.get("daily_pnl", 0)

    settings = await db.get_settings(telegram_id)
    demo_mode = bool(settings and settings.get("demo_mode", 0))
    if demo_mode:
        balance = settings.get("demo_balance", 0)
    else:
        balance = get_usdc_balance(user["wallet_address"]) if user and user.get("wallet_address") else 0.0

    text = "📊 <b>Open Positions</b>\n\n"

    if not positions:
        text += (
            "✅ You have no open positions.\n\n"
            "Go to 🎯 Copy Trade to start copying traders."
        )
        unrealized = 0.0
    else:
        unrealized = 0.0
        async with aiohttp.ClientSession() as session:
            for i, pos in enumerate(positions, 1):
                enriched = await get_position_with_pnl(session, pos)
                title = pos.get("title", "Unknown")[:40]
                outcome = pos.get("outcome", "?")
                entry = pos.get("entry_price", 0)
                bet = pos.get("bet_amount", 0)
                live = enriched.get("live_price", 0)
                upnl = enriched.get("unrealized_pnl", 0)
                pct = enriched.get("pnl_pct", 0)
                unrealized += upnl

                pnl_icon = "🟢" if upnl >= 0 else "🔴"
                text += (
                    f"{i}. {title}\n"
                    f"   {outcome} @ {entry*100:.1f}c | ${bet:.2f} bet\n"
                )
                if live > 0:
                    text += f"   Current: {live*100:.1f}c | {pnl_icon} {pct:+.1f}% (${upnl:+.2f})\n"
                text += "\n"

    total_pnl = realized_pnl + unrealized
    exposure = sum(p.get("bet_amount", 0) for p in positions)
    net_worth = balance + exposure + unrealized

    if positions:
        text += (
            f"━━━━━━━━━━━━━━\n"
            f"Unrealized P&L: ${unrealized:+.2f}\n"
            f"Realized P&L (today): ${realized_pnl:+.2f}\n"
            f"Total P&L: ${total_pnl:+.2f}\n"
            f"Exposure: ${exposure:.2f}\n"
            f"💰 Net Worth: ${net_worth:,.2f}"
        )

    await respond(update, context, text, reply_markup=portfolio_keyboard())


async def portfolio_closed(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show closed positions history."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    positions = await db.get_closed_positions(telegram_id)

    text = "📊 <b>Closed Positions</b>\n\n"

    if not positions:
        text += "No closed positions yet."
    else:
        total_pnl = 0
        for pos in positions:
            title = pos.get("title", "Unknown")[:35]
            pnl = pos.get("pnl_usd", 0) or 0
            entry = pos.get("entry_price", 0)
            exit_p = pos.get("exit_price", 0)
            reason = pos.get("close_reason", "")
            result = "✅" if pnl >= 0 else "❌"
            total_pnl += pnl
            text += (
                f"{result} {title}\n"
                f"   {entry*100:.1f}c → {exit_p*100:.1f}c | ${pnl:+.2f} | {reason}\n"
            )

        text += f"\n━━━━━━━━━━━━━━\nTotal Realized P&L: ${total_pnl:+.2f}"

    await respond(update, context, text, reply_markup=portfolio_keyboard())
