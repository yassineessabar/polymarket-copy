from telegram import InlineKeyboardButton, InlineKeyboardMarkup


def welcome_keyboard() -> InlineKeyboardMarkup:
    """Welcome screen — single Start button."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Start", callback_data="home")],
    ])


def home_keyboard() -> InlineKeyboardMarkup:
    """Home screen — exact PolyGun 5x2 grid layout."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📊 Markets", callback_data="markets"),
         InlineKeyboardButton("🎯 Copy Trade", callback_data="copy")],
        [InlineKeyboardButton("📈 Portfolio", callback_data="portfolio"),
         InlineKeyboardButton("💰 Wallet", callback_data="wallet")],
        [InlineKeyboardButton("🔑 Smart Wallets", callback_data="smart_wallets"),
         InlineKeyboardButton("🔄 Refresh", callback_data="refresh_home")],
        [InlineKeyboardButton("📋 Limit Orders", callback_data="limit_orders"),
         InlineKeyboardButton("👥 Referrals", callback_data="referrals")],
        [InlineKeyboardButton("⚙️ Settings", callback_data="settings"),
         InlineKeyboardButton("❓ Help", callback_data="help")],
    ])


def wallet_keyboard() -> InlineKeyboardMarkup:
    """Wallet overview — matches PolyGun deposit screen."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💰 Deposit SOL", callback_data="deposit"),
         InlineKeyboardButton("🔧 Import Wallet", callback_data="import_wallet")],
        [InlineKeyboardButton("📋 Refresh", callback_data="refresh_wallet")],
    ])


def deposit_keyboard() -> InlineKeyboardMarkup:
    """Deposit detail — matches PolyGun wallet detail screen."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("👤 Profile ↗", callback_data="profile"),
         InlineKeyboardButton("📈 Portfolio", callback_data="portfolio"),
         InlineKeyboardButton("💸 Withdraw", callback_data="withdraw")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def copy_trading_keyboard() -> InlineKeyboardMarkup:
    """Copy trading — no targets yet. Matches PolyGun exactly."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Add Copy Trade", callback_data="add_copy")],
        [InlineKeyboardButton("📋 Activity", callback_data="copy_activity"),
         InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def copy_trading_with_targets_keyboard(is_running: bool) -> InlineKeyboardMarkup:
    """Copy trading — has targets, can start/stop."""
    buttons = [[InlineKeyboardButton("➕ Add Copy Trade", callback_data="add_copy")]]
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
    """Portfolio — matches PolyGun exactly with Full/Op..osition/Close tabs."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Full [0]", callback_data="port_full"),
         InlineKeyboardButton("Op..osition", callback_data="port_open"),
         InlineKeyboardButton("Close", callback_data="port_close")],
        [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_portfolio")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def settings_keyboard(trade_mode: str = "standard") -> InlineKeyboardMarkup:
    """Settings — matches PolyGun exactly with all sections."""
    modes = {"cautious": "Cautious", "standard": "Standard", "expert": "Expert"}
    mode_buttons = []
    for key, label in modes.items():
        if key == trade_mode:
            mode_buttons.append(InlineKeyboardButton(f"✅ {label}", callback_data=f"mode_{key}"))
        else:
            mode_buttons.append(InlineKeyboardButton(label, callback_data=f"mode_{key}"))

    return InlineKeyboardMarkup([
        [InlineKeyboardButton("- - - TRADE MODE - - -", callback_data="noop")],
        mode_buttons,
        [InlineKeyboardButton("- - - TRADE THRESHOLD - - -", callback_data="trade_threshold")],
        [InlineKeyboardButton("- - - QUICKBUY PRESETS - - -", callback_data="noop")],
        [InlineKeyboardButton("$10", callback_data="qb_10"),
         InlineKeyboardButton("$25", callback_data="qb_25"),
         InlineKeyboardButton("$50", callback_data="qb_50")],
        [InlineKeyboardButton("American Odds:", callback_data="american_odds")],
        [InlineKeyboardButton("- - - WALLET SECURITY - - -", callback_data="wallet_security")],
        [InlineKeyboardButton("- - - TWO-FACTOR AUTH - - -", callback_data="two_factor")],
        [InlineKeyboardButton("- - - REFERRALS - - -", callback_data="noop")],
        [InlineKeyboardButton("- - - Referral Hub", callback_data="referral_hub")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def referral_keyboard() -> InlineKeyboardMarkup:
    """Referral Hub — matches PolyGun exactly."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💸 Withdraw (Min $5)", callback_data="ref_withdraw")],
        [InlineKeyboardButton("📋 Copy Link", callback_data="ref_copy"),
         InlineKeyboardButton("🔄 Refresh", callback_data="refresh_referral")],
        [InlineKeyboardButton("🏠 Home", callback_data="home")],
    ])


def smart_wallets_keyboard(page: int = 0) -> InlineKeyboardMarkup:
    """Smart Wallets — paginated with Next button."""
    buttons = []
    if page > 0:
        buttons.append([InlineKeyboardButton("⬅️ Prev", callback_data=f"sw_page_{page-1}")])
    buttons.append([InlineKeyboardButton("Next ➡️", callback_data=f"sw_page_{page+1}")])
    buttons.append([InlineKeyboardButton("🔍 Find Wallets: PolymarketAnalytics", url="https://polymarketanalytics.com")])
    buttons.append([InlineKeyboardButton("🏠 Home", callback_data="home")])
    return InlineKeyboardMarkup(buttons)


def feature_unavailable_keyboard() -> InlineKeyboardMarkup:
    """Feature gate — no wallet funded yet."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💰 Wallet", callback_data="wallet")],
        [InlineKeyboardButton("🔑 Import Wallet", callback_data="import_wallet")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def main_menu_button() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])


def markets_keyboard() -> InlineKeyboardMarkup:
    """Markets — category filter. Matches PolyGun exactly."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Politics", callback_data="mkt_politics"),
         InlineKeyboardButton("Sports", callback_data="mkt_sports")],
        [InlineKeyboardButton("Crypto", callback_data="mkt_crypto"),
         InlineKeyboardButton("Trump", callback_data="mkt_trump")],
        [InlineKeyboardButton("Finance", callback_data="mkt_finance"),
         InlineKeyboardButton("Geopolitics", callback_data="mkt_geopolitics")],
        [InlineKeyboardButton("Volume", callback_data="mkt_volume"),
         InlineKeyboardButton("Trending", callback_data="mkt_trending")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
    ])
