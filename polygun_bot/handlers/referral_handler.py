from telegram import Update
from telegram.ext import ContextTypes
from ..database import Database
from ..keyboards import referral_keyboard, main_menu_button, respond
from ..config import BOT_USERNAME


async def referral_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show referral hub."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    if not user:
        return

    stats = await db.get_referral_stats(telegram_id)
    code = user["referral_code"]
    link = f"https://t.me/{BOT_USERNAME}?start=REF_{code}"

    text = (
        "👥 <b>Referral Hub</b>\n"
        "Earn commissions when your referrals trade!\n\n"
        f"🎫 Your Code: <b>{code}</b>\n"
        f"📨 Invite Link:\n<code>{link}</code>\n\n"
        "📊 <b>Network Metrics</b>\n"
        f"• Tier 1 Direct: {stats['tier1']} users (25%)\n"
        f"• Tier 2: {stats['tier2']} users (5%)\n"
        f"• Tier 3: {stats['tier3']} users (3%)\n"
        f"• Total Reach: {stats['total_reach']} users\n\n"
        "💰 <b>Earnings Dashboard</b>\n"
        f"• Claimable: ${stats['claimable']:.4f} USDC\n"
        f"• Total Earned: ${stats['total_earned']:.2f} USDC\n"
        "⚠️ Minimum withdrawal: $5 USDC"
    )

    await respond(update, context, text, reply_markup=referral_keyboard())


async def copy_referral_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show referral link as copyable text in the same message."""
    db: Database = context.application.bot_data["db"]
    telegram_id = update.effective_user.id
    user = await db.get_user(telegram_id)

    if not user:
        return

    code = user["referral_code"]
    link = f"https://t.me/{BOT_USERNAME}?start=REF_{code}"

    text = (
        "📋 <b>Your Referral Link</b>\n\n"
        f"<code>{link}</code>\n\n"
        "Tap the link above to copy it!"
    )
    from ..keyboards import back_and_home
    await respond(update, context, text, reply_markup=back_and_home("referrals", "⬅️ Back"))
