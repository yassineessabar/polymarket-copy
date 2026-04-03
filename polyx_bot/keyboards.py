from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes


async def respond(update: Update, context: ContextTypes.DEFAULT_TYPE,
                  text: str, reply_markup=None, parse_mode: str = "HTML",
                  disable_web_page_preview: bool = True):
    """Always edit the current message. Never start a new chat bubble.

    Also answers the callback query if it hasn't been answered yet,
    so callers don't need to remember query.answer() separately.
    """
    import logging
    _log = logging.getLogger("polyx.respond")

    kwargs = {"text": text, "reply_markup": reply_markup,
              "parse_mode": parse_mode, "disable_web_page_preview": disable_web_page_preview}

    chat_id = update.effective_chat.id

    # If triggered by a button press, answer the query and edit that message
    if update.callback_query:
        # Always answer the callback query to dismiss the loading spinner
        try:
            await update.callback_query.answer()
        except Exception:
            pass  # already answered

        try:
            await update.callback_query.edit_message_text(**kwargs)
            return
        except Exception as e:
            err_msg = str(e).lower()
            # "message is not modified" is harmless — just means same content
            if "message is not modified" in err_msg:
                return
            # Edit failed (e.g. photo message) — delete old and send new at bottom
            _log.warning(f"edit_message_text failed: {e}, sending new message")
            try:
                await update.callback_query.message.delete()
            except Exception:
                pass

    # If triggered by a text message (conversation), delete user msg
    if update.message:
        try:
            await update.message.delete()
        except Exception:
            pass

    # Delete the previous bot message so the new one is always at the bottom
    last_msg_id = context.user_data.get("last_bot_msg_id")
    if last_msg_id:
        try:
            await context.bot.delete_message(chat_id=chat_id, message_id=last_msg_id)
        except Exception:
            pass

    # Send a new message at the bottom and store its ID
    msg = await context.bot.send_message(chat_id=chat_id, **kwargs)
    context.user_data["last_bot_msg_id"] = msg.message_id


def welcome_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Start", callback_data="home")],
    ])


def home_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🎯 Copy Trade", callback_data="copy")],
        [InlineKeyboardButton("📊 Markets", callback_data="markets"),
         InlineKeyboardButton("📈 Portfolio", callback_data="portfolio")],
        [InlineKeyboardButton("💰 Wallet", callback_data="wallet"),
         InlineKeyboardButton("👤 Profile", callback_data="profile")],
        [InlineKeyboardButton("⚙️ Settings", callback_data="settings"),
         InlineKeyboardButton("👥 Referrals", callback_data="referrals")],
        [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_home"),
         InlineKeyboardButton("❓ Help", callback_data="help")],
    ])


def wallet_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💰 Deposit", callback_data="deposit"),
         InlineKeyboardButton("🔧 Import Wallet", callback_data="import_wallet")],
        [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_wallet")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def deposit_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("👤 Profile ↗", callback_data="profile"),
         InlineKeyboardButton("📈 Portfolio", callback_data="portfolio"),
         InlineKeyboardButton("💸 Withdraw", callback_data="withdraw")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def copy_trading_keyboard(suggested_wallets: list = None) -> InlineKeyboardMarkup:
    buttons = []
    if suggested_wallets:
        for i, w in enumerate(suggested_wallets):
            buttons.append([
                InlineKeyboardButton(f"📋 Copy {w['name']}", callback_data=f"quick_copy_{i}"),
                InlineKeyboardButton("📊 Stats", url=w.get("stats_url", "#")),
            ])
    buttons.append([InlineKeyboardButton("✏️ Enter Custom Wallet", callback_data="add_copy")])
    buttons.append([
        InlineKeyboardButton("📋 Activity", callback_data="copy_activity"),
        InlineKeyboardButton("🏠 Main Menu", callback_data="home"),
    ])
    return InlineKeyboardMarkup(buttons)


def copy_trading_with_targets_keyboard(is_running: bool, targets: list = None) -> InlineKeyboardMarkup:
    buttons = []
    # Add remove buttons for each target
    if targets:
        for t in targets:
            name = t.get("display_name") or t["wallet_addr"][:10] + "..."
            buttons.append([
                InlineKeyboardButton(f"❌ Remove {name}", callback_data=f"rm_target_{t['wallet_addr'][:16]}"),
            ])
    buttons.append([InlineKeyboardButton("➕ Add Another Trader", callback_data="add_copy")])
    if is_running:
        buttons.append([InlineKeyboardButton("⏹ Stop Copy Trading", callback_data="stop_copy")])
    else:
        buttons.append([InlineKeyboardButton("▶️ Start Copy Trading", callback_data="start_copy")])
    buttons.append([
        InlineKeyboardButton("📋 Activity", callback_data="copy_activity"),
        InlineKeyboardButton("🏠 Main Menu", callback_data="home"),
    ])
    return InlineKeyboardMarkup(buttons)


def portfolio_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📊 Full", callback_data="port_full"),
         InlineKeyboardButton("📈 Open", callback_data="port_open"),
         InlineKeyboardButton("📕 Closed", callback_data="port_close")],
        [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_portfolio")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def demo_mode_keyboard(is_active: bool, balance: float = 0) -> InlineKeyboardMarkup:
    if is_active:
        return InlineKeyboardMarkup([
            [InlineKeyboardButton(f"💰 Demo Balance: ${balance:,.2f}", callback_data="noop")],
            [InlineKeyboardButton("🔄 Reset $1K", callback_data="demo_set_1000"),
             InlineKeyboardButton("🔄 Reset $5K", callback_data="demo_set_5000")],
            [InlineKeyboardButton("🔄 Reset $10K", callback_data="demo_set_10000"),
             InlineKeyboardButton("🔄 Reset $50K", callback_data="demo_set_50000")],
            [InlineKeyboardButton("🔴 Disable Demo Mode", callback_data="demo_disable")],
            [InlineKeyboardButton("⬅️ Settings", callback_data="settings"),
             InlineKeyboardButton("🏠 Home", callback_data="home")],
        ])
    else:
        return InlineKeyboardMarkup([
            [InlineKeyboardButton("📝 Choose starting balance:", callback_data="noop")],
            [InlineKeyboardButton("$1,000", callback_data="demo_set_1000"),
             InlineKeyboardButton("$5,000", callback_data="demo_set_5000")],
            [InlineKeyboardButton("$10,000", callback_data="demo_set_10000"),
             InlineKeyboardButton("$50,000", callback_data="demo_set_50000")],
            [InlineKeyboardButton("⬅️ Settings", callback_data="settings"),
             InlineKeyboardButton("🏠 Home", callback_data="home")],
        ])


def settings_keyboard(trade_mode: str = "standard") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📊 Risk & Sizing", callback_data="risk_settings")],
        [InlineKeyboardButton("🎮 Demo Mode", callback_data="demo_mode"),
         InlineKeyboardButton("🔑 Export Key", callback_data="wallet_security")],
        [InlineKeyboardButton("👥 Referral Hub", callback_data="referral_hub")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def risk_settings_keyboard(settings: dict) -> InlineKeyboardMarkup:
    max_risk = settings.get("max_risk_pct", 10)
    min_bet = settings.get("min_bet", 1)
    max_pos = settings.get("max_open_positions", 20)
    max_exp = settings.get("max_exposure_pct", 50)
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("── Max Risk Per Trade ──", callback_data="noop")],
        [InlineKeyboardButton("5%" + (" ✅" if max_risk == 5 else ""), callback_data="set_maxrisk_5"),
         InlineKeyboardButton("10%" + (" ✅" if max_risk == 10 else ""), callback_data="set_maxrisk_10"),
         InlineKeyboardButton("20%" + (" ✅" if max_risk == 20 else ""), callback_data="set_maxrisk_20")],
        [InlineKeyboardButton("── Min Bet Size ──", callback_data="noop")],
        [InlineKeyboardButton("$1" + (" ✅" if min_bet == 1 else ""), callback_data="set_minbet_1"),
         InlineKeyboardButton("$5" + (" ✅" if min_bet == 5 else ""), callback_data="set_minbet_5"),
         InlineKeyboardButton("$10" + (" ✅" if min_bet == 10 else ""), callback_data="set_minbet_10")],
        [InlineKeyboardButton("── Max Positions ──", callback_data="noop")],
        [InlineKeyboardButton("10" + (" ✅" if max_pos == 10 else ""), callback_data="set_maxpos_10"),
         InlineKeyboardButton("20" + (" ✅" if max_pos == 20 else ""), callback_data="set_maxpos_20"),
         InlineKeyboardButton("50" + (" ✅" if max_pos == 50 else ""), callback_data="set_maxpos_50")],
        [InlineKeyboardButton("── Max Exposure ──", callback_data="noop")],
        [InlineKeyboardButton("25%" + (" ✅" if max_exp == 25 else ""), callback_data="set_maxexp_25"),
         InlineKeyboardButton("50%" + (" ✅" if max_exp == 50 else ""), callback_data="set_maxexp_50"),
         InlineKeyboardButton("75%" + (" ✅" if max_exp == 75 else ""), callback_data="set_maxexp_75")],
        [InlineKeyboardButton("⬅️ Settings", callback_data="settings"),
         InlineKeyboardButton("🏠 Home", callback_data="home")],
    ])


def referral_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💸 Withdraw (Min $5)", callback_data="ref_withdraw")],
        [InlineKeyboardButton("📋 Copy Link", callback_data="ref_copy"),
         InlineKeyboardButton("🔄 Refresh", callback_data="refresh_referral")],
        [InlineKeyboardButton("🏠 Home", callback_data="home")],
    ])


def smart_wallets_keyboard(page: int = 0, total_pages: int = 1) -> InlineKeyboardMarkup:
    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton("⬅️ Prev", callback_data=f"sw_page_{page-1}"))
    if page < total_pages - 1:
        nav.append(InlineKeyboardButton("Next ➡️", callback_data=f"sw_page_{page+1}"))
    buttons = []
    if nav:
        buttons.append(nav)
    buttons.append([InlineKeyboardButton("🔍 Find Wallets: PolymarketAnalytics", url="https://polymarketanalytics.com")])
    buttons.append([InlineKeyboardButton("🏠 Home", callback_data="home")])
    return InlineKeyboardMarkup(buttons)


def feature_unavailable_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💰 Wallet", callback_data="wallet")],
        [InlineKeyboardButton("🔑 Import Wallet", callback_data="import_wallet")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def main_menu_button() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def back_and_home(back_to: str, back_label: str = "⬅️ Back") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(back_label, callback_data=back_to),
         InlineKeyboardButton("🏠 Home", callback_data="home")],
    ])


def markets_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🏛 Politics", callback_data="mkt_politics"),
         InlineKeyboardButton("⚽ Sports", callback_data="mkt_sports")],
        [InlineKeyboardButton("🪙 Crypto", callback_data="mkt_crypto"),
         InlineKeyboardButton("🇺🇸 Trump", callback_data="mkt_trump")],
        [InlineKeyboardButton("💹 Finance", callback_data="mkt_finance"),
         InlineKeyboardButton("🌍 Geopolitics", callback_data="mkt_geopolitics")],
        [InlineKeyboardButton("📊 Volume", callback_data="mkt_volume"),
         InlineKeyboardButton("🔥 Trending", callback_data="mkt_trending")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])
