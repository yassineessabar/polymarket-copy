import aiohttp
from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..wallet import get_usdc_balance
from ..portfolio import get_position_with_pnl
from ..keyboards import portfolio_keyboard, respond


async def _get_counts(db: Database, telegram_id: int) -> tuple:
    """Return (open_count, closed_count, total)."""
    open_pos = await db.get_open_positions(telegram_id)
    closed_pos = await db.get_closed_positions(telegram_id, limit=9999)
    open_count = len(open_pos)
    closed_count = len(closed_pos)
    return open_count, closed_count, open_count + closed_count


async def _target_names(db: Database, telegram_id: int) -> dict:
    """Build a map of target_wallet -> display_name."""
    targets = await db.get_targets(telegram_id)
    return {t["wallet_addr"]: (t.get("display_name") or t["wallet_addr"][:10] + "...") for t in targets}


async def portfolio_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show portfolio — open positions with live P&L."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    positions = await db.get_open_positions(telegram_id)
    risk = await db.get_daily_risk(telegram_id)
    realized_pnl = risk.get("daily_pnl", 0)
    names = await _target_names(db, telegram_id)

    settings = await db.get_settings(telegram_id)
    demo_mode = bool(settings and settings.get("demo_mode", 0))
    if demo_mode:
        balance = settings.get("demo_balance", 0)
    else:
        balance = get_usdc_balance(user["wallet_address"]) if user and user.get("wallet_address") else 0.0

    open_count, closed_count, total = await _get_counts(db, telegram_id)

    text = f"📊 <b>Open Positions ({open_count})</b>\n\n"

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
                target_size = pos.get("target_usdc_size", 0) or 0
                target_wallet = pos.get("target_wallet", "")
                trader_name = names.get(target_wallet, target_wallet[:10] + "..." if target_wallet else "?")
                live = enriched.get("live_price", 0)
                upnl = enriched.get("unrealized_pnl", 0)
                pct = enriched.get("pnl_pct", 0)
                unrealized += upnl

                pnl_icon = "🟢" if upnl >= 0 else "🔴"
                text += (
                    f"{i}. {title}\n"
                    f"   {outcome} @ {entry*100:.1f}c | ${bet:.2f} bet\n"
                    f"   👤 {trader_name} (${target_size:.2f})\n"
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

    await respond(update, context, text, reply_markup=portfolio_keyboard(total, open_count, closed_count))


async def portfolio_full(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show full portfolio summary — both open and closed counts."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    open_pos = await db.get_open_positions(telegram_id)
    closed_pos = await db.get_closed_positions(telegram_id, limit=9999)
    open_count = len(open_pos)
    closed_count = len(closed_pos)
    total = open_count + closed_count

    risk = await db.get_daily_risk(telegram_id)
    realized_pnl = risk.get("daily_pnl", 0)

    settings = await db.get_settings(telegram_id)
    demo_mode = bool(settings and settings.get("demo_mode", 0))
    if demo_mode:
        balance = settings.get("demo_balance", 0)
    else:
        balance = get_usdc_balance(user["wallet_address"]) if user and user.get("wallet_address") else 0.0

    exposure = sum(p.get("bet_amount", 0) for p in open_pos)
    total_realized = sum((p.get("pnl_usd", 0) or 0) for p in closed_pos)

    text = (
        f"📊 <b>Portfolio Overview ({total} trades)</b>\n\n"
        f"📈 Open Positions: <b>{open_count}</b>\n"
        f"📕 Closed Positions: <b>{closed_count}</b>\n\n"
        f"💰 Available Balance: ${balance:,.2f}\n"
        f"📊 Current Exposure: ${exposure:.2f}\n"
        f"📈 Realized P&L (today): ${realized_pnl:+.2f}\n"
        f"📈 Total Realized P&L: ${total_realized:+.2f}\n"
        f"💎 Net Worth: ${balance + exposure:,.2f}"
    )

    await respond(update, context, text, reply_markup=portfolio_keyboard(total, open_count, closed_count))


async def portfolio_closed(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show closed positions history."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    positions = await db.get_closed_positions(telegram_id)
    open_count, closed_count, total = await _get_counts(db, telegram_id)
    names = await _target_names(db, telegram_id)

    text = f"📊 <b>Closed Positions ({closed_count})</b>\n\n"

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
            target_size = pos.get("target_usdc_size", 0) or 0
            target_wallet = pos.get("target_wallet", "")
            trader_name = names.get(target_wallet, target_wallet[:10] + "..." if target_wallet else "?")
            result = "✅" if pnl >= 0 else "❌"
            total_pnl += pnl
            text += (
                f"{result} {title}\n"
                f"   {entry*100:.1f}c → {exit_p*100:.1f}c | ${pnl:+.2f} | {reason}\n"
                f"   👤 {trader_name} (${target_size:.2f})\n"
            )

        text += f"\n━━━━━━━━━━━━━━\nTotal Realized P&L: ${total_pnl:+.2f}"

    await respond(update, context, text, reply_markup=portfolio_keyboard(total, open_count, closed_count))
