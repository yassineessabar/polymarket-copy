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

    # Answer callback query to dismiss loading spinner
    if update.callback_query:
        try:
            await update.callback_query.answer()
        except Exception:
            pass

    # Delete user's typed message if any
    if update.message:
        try:
            await update.message.delete()
        except Exception:
            pass

    # Delete the previous bot message (so the new one is always at the bottom)
    if update.callback_query and update.callback_query.message:
        try:
            await update.callback_query.message.delete()
        except Exception:
            pass
    else:
        last_msg_id = context.user_data.get("last_bot_msg_id")
        if last_msg_id:
            try:
                await context.bot.delete_message(chat_id=chat_id, message_id=last_msg_id)
            except Exception:
                pass

    # Always send a fresh message at the bottom
    msg = await context.bot.send_message(chat_id=chat_id, **kwargs)
    context.user_data["last_bot_msg_id"] = msg.message_id

    # Also persist menu msg ID to DB so copy engine can delete it
    try:
        from .database import Database
        db: Database = context.application.bot_data.get("db")
        if db:
            await db.update_setting(update.effective_user.id, "last_menu_msg_id", msg.message_id)
    except Exception:
        pass


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


def portfolio_keyboard(total: int = 0, open_count: int = 0, closed_count: int = 0) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(f"📊 Full ({total})", callback_data="port_full"),
         InlineKeyboardButton(f"📈 Open ({open_count})", callback_data="port_open"),
         InlineKeyboardButton(f"📕 Closed ({closed_count})", callback_data="port_close")],
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


def settings_keyboard(demo_mode: bool = False) -> InlineKeyboardMarkup:
    if demo_mode:
        mode_btn = InlineKeyboardButton("\U0001f534 Switch to Live Mode", callback_data="demo_disable")
    else:
        mode_btn = InlineKeyboardButton("🎮 Switch to Demo Mode", callback_data="demo_mode")
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f4ca Risk & Sizing", callback_data="risk_settings")],
        [mode_btn],
        [InlineKeyboardButton("💎 Subscription", callback_data="subscription")],
        [InlineKeyboardButton("🔑 Export Key", callback_data="wallet_security")],
        [InlineKeyboardButton("👥 Referral Hub", callback_data="referral_hub")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def risk_settings_keyboard(settings: dict) -> InlineKeyboardMarkup:
    max_risk = settings.get("max_risk_pct", 10)
    min_bet = settings.get("min_bet", 1)
    max_pos = settings.get("max_open_positions", 20)
    max_exp = settings.get("max_exposure_pct", 50)
    copy_factor = settings.get("copy_factor", 1.0)
    trade_mode = settings.get("trade_mode", "standard")
    max_per_evt = settings.get("max_per_event", 2)
    daily_loss = settings.get("daily_loss_limit_pct", 15)
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("── Trade Mode ──", callback_data="noop")],
        [InlineKeyboardButton("🐢 Cautious" + (" ✅" if trade_mode == "cautious" else ""), callback_data="set_mode_cautious"),
         InlineKeyboardButton("⚖️ Standard" + (" ✅" if trade_mode == "standard" else ""), callback_data="set_mode_standard"),
         InlineKeyboardButton("🔥 Expert" + (" ✅" if trade_mode == "expert" else ""), callback_data="set_mode_expert")],
        [InlineKeyboardButton("── Copy Factor (multiplier) ──", callback_data="noop")],
        [InlineKeyboardButton("0.5x" + (" ✅" if copy_factor == 0.5 else ""), callback_data="set_factor_0.5"),
         InlineKeyboardButton("1x" + (" ✅" if copy_factor == 1.0 else ""), callback_data="set_factor_1.0"),
         InlineKeyboardButton("2x" + (" ✅" if copy_factor == 2.0 else ""), callback_data="set_factor_2.0"),
         InlineKeyboardButton("3x" + (" ✅" if copy_factor == 3.0 else ""), callback_data="set_factor_3.0"),
         InlineKeyboardButton("5x" + (" ✅" if copy_factor == 5.0 else ""), callback_data="set_factor_5.0"),
         InlineKeyboardButton("10x" + (" ✅" if copy_factor == 10.0 else ""), callback_data="set_factor_10.0")],
        [InlineKeyboardButton("── Max Risk Per Trade ──", callback_data="noop")],
        [InlineKeyboardButton("5%" + (" ✅" if max_risk == 5 else ""), callback_data="set_maxrisk_5"),
         InlineKeyboardButton("10%" + (" ✅" if max_risk == 10 else ""), callback_data="set_maxrisk_10"),
         InlineKeyboardButton("20%" + (" ✅" if max_risk == 20 else ""), callback_data="set_maxrisk_20"),
         InlineKeyboardButton("40%" + (" ✅" if max_risk == 40 else ""), callback_data="set_maxrisk_40")],
        [InlineKeyboardButton("── Min Bet Size ──", callback_data="noop")],
        [InlineKeyboardButton("$0.10" + (" ✅" if min_bet == 0.1 else ""), callback_data="set_minbet_0.1"),
         InlineKeyboardButton("$1" + (" ✅" if min_bet == 1 else ""), callback_data="set_minbet_1"),
         InlineKeyboardButton("$5" + (" ✅" if min_bet == 5 else ""), callback_data="set_minbet_5"),
         InlineKeyboardButton("$10" + (" ✅" if min_bet == 10 else ""), callback_data="set_minbet_10")],
        [InlineKeyboardButton("── Max Positions ──", callback_data="noop")],
        [InlineKeyboardButton("10" + (" ✅" if max_pos == 10 else ""), callback_data="set_maxpos_10"),
         InlineKeyboardButton("20" + (" ✅" if max_pos == 20 else ""), callback_data="set_maxpos_20"),
         InlineKeyboardButton("50" + (" ✅" if max_pos == 50 else ""), callback_data="set_maxpos_50"),
         InlineKeyboardButton("100" + (" ✅" if max_pos == 100 else ""), callback_data="set_maxpos_100")],
        [InlineKeyboardButton("── Max Exposure ──", callback_data="noop")],
        [InlineKeyboardButton("25%" + (" ✅" if max_exp == 25 else ""), callback_data="set_maxexp_25"),
         InlineKeyboardButton("50%" + (" ✅" if max_exp == 50 else ""), callback_data="set_maxexp_50"),
         InlineKeyboardButton("75%" + (" ✅" if max_exp == 75 else ""), callback_data="set_maxexp_75"),
         InlineKeyboardButton("100%" + (" ✅" if max_exp == 100 else ""), callback_data="set_maxexp_100")],
        [InlineKeyboardButton("── Max Per Event ──", callback_data="noop")],
        [InlineKeyboardButton("1" + (" ✅" if max_per_evt == 1 else ""), callback_data="set_maxevt_1"),
         InlineKeyboardButton("2" + (" ✅" if max_per_evt == 2 else ""), callback_data="set_maxevt_2"),
         InlineKeyboardButton("5" + (" ✅" if max_per_evt == 5 else ""), callback_data="set_maxevt_5"),
         InlineKeyboardButton("10" + (" ✅" if max_per_evt == 10 else ""), callback_data="set_maxevt_10")],
        [InlineKeyboardButton("── Daily Loss Limit ──", callback_data="noop")],
        [InlineKeyboardButton("10%" + (" ✅" if daily_loss == 10 else ""), callback_data="set_dloss_10"),
         InlineKeyboardButton("15%" + (" ✅" if daily_loss == 15 else ""), callback_data="set_dloss_15"),
         InlineKeyboardButton("25%" + (" ✅" if daily_loss == 25 else ""), callback_data="set_dloss_25"),
         InlineKeyboardButton("50%" + (" ✅" if daily_loss == 50 else ""), callback_data="set_dloss_50")],
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
