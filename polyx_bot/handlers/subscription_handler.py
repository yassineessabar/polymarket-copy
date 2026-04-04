"""Subscription management Telegram handler."""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from ..database import Database
from ..subscription import check_subscription_status, create_checkout_session, create_billing_portal_url
from ..keyboards import respond, back_and_home


async def subscription_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show subscription status and management options."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id

    sub_info = await check_subscription_status(db, telegram_id)
    sub = await db.get_subscription(telegram_id)
    status = sub_info["status"]

    if status in ("trialing", "active"):
        # Active subscription
        if status == "trialing":
            emoji = "🆓"
            label = "Free Trial"
        else:
            emoji = "✅"
            label = "Active"

        text = (
            f"💎 <b>Subscription</b> — {emoji} {label}\n\n"
            f"{sub_info['message']}\n\n"
            f"Plan: <b>$39/month</b>\n"
        )

        buttons = []
        portal_url = await create_billing_portal_url(db, telegram_id)
        if portal_url:
            buttons.append([InlineKeyboardButton("Manage Subscription", url=portal_url)])
        buttons.append([InlineKeyboardButton("⬅️ Settings", callback_data="settings"),
                        InlineKeyboardButton("🏠 Home", callback_data="home")])
        kb = InlineKeyboardMarkup(buttons)

    elif status == "past_due":
        text = (
            "💎 <b>Subscription</b> — ⚠️ Payment Failed\n\n"
            "Your payment failed. Live trading is paused.\n"
            "Open positions will continue to be monitored.\n\n"
            "Update your payment method to resume."
        )
        buttons = []
        portal_url = await create_billing_portal_url(db, telegram_id)
        if portal_url:
            buttons.append([InlineKeyboardButton("Update Payment", url=portal_url)])
        buttons.append([InlineKeyboardButton("⬅️ Settings", callback_data="settings"),
                        InlineKeyboardButton("🏠 Home", callback_data="home")])
        kb = InlineKeyboardMarkup(buttons)

    else:
        # No subscription or canceled
        checkout_url = await create_checkout_session(db, telegram_id)
        text = (
            "💎 <b>Subscription</b>\n\n"
            "Trade live with PolyX for <b>$39/month</b>.\n\n"
            "✅ 7-day free trial\n"
            "✅ Unlimited copy trading\n"
            "✅ Real-time trade execution\n"
            "✅ All risk management features\n\n"
            "Demo mode is always free."
        )
        buttons = []
        if checkout_url:
            buttons.append([InlineKeyboardButton("Start 7-Day Free Trial", url=checkout_url)])
        buttons.append([InlineKeyboardButton("⬅️ Settings", callback_data="settings"),
                        InlineKeyboardButton("🏠 Home", callback_data="home")])
        kb = InlineKeyboardMarkup(buttons)

    await respond(update, context, text, reply_markup=kb)
