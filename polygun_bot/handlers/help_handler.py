from telegram import Update
from telegram.ext import ContextTypes
from ..keyboards import main_menu_button, respond


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "❓ <b>Help — PolySync Bot</b>\n\n"
        "<b>Commands:</b>\n"
        "/start — Launch the bot\n"
        "/wallet — View wallet & balance\n"
        "/portfolio — View positions & P&L\n"
        "/copy — Manage copy trading\n"
        "/settings — Adjust risk & preferences\n"
        "/referral — Referral program\n"
        "/help — This message\n\n"
        "<b>How Copy Trading Works:</b>\n"
        "1. Add a wallet address to copy\n"
        "2. Fund your wallet with USDC on Polygon\n"
        "3. The bot mirrors trades proportionally\n"
        "4. Monitor P&L in your portfolio\n\n"
        "<b>Support:</b>\n"
        "Contact @support for help"
    )
    await respond(update, context, text, reply_markup=main_menu_button())
