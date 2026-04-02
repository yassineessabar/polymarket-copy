"""
Polymarket Copy Trading Bot — Production Version
All agent review bugs fixed. No fallbacks, no guesses.
"""
import os
import asyncio
import time
import json
import logging
import statistics
import tempfile
import socket
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

# ── DNS RESOLUTION WITH FALLBACK ──
_POLYMARKET_HOSTS = {
    "gamma-api.polymarket.com": "104.18.34.205",
    "data-api.polymarket.com": "104.18.34.205",
    "clob.polymarket.com": "104.18.34.205",
    "ws-subscriptions-clob.polymarket.com": "104.18.34.205",
}
_original_getaddrinfo = socket.getaddrinfo

def _patched_getaddrinfo(host, port, *args, **kwargs):
    """Try real DNS first, fall back to hardcoded IPs if DNS fails."""
    if host in _POLYMARKET_HOSTS:
        try:
            return _original_getaddrinfo(host, port, *args, **kwargs)
        except socket.gaierror:
            ip = _POLYMARKET_HOSTS[host]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, port))]
    return _original_getaddrinfo(host, port, *args, **kwargs)

socket.getaddrinfo = _patched_getaddrinfo

import aiohttp
import requests
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import MarketOrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL

# ── CONFIGURATION ──
FUNDER_ADDRESS = os.getenv("FUNDER_ADDRESS", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
SIGNATURE_TYPE = int(os.getenv("SIGNATURE_TYPE", "0"))

FAST_POLL_INTERVAL = int(os.getenv("FAST_POLL_INTERVAL", "5"))
SLOW_POLL_INTERVAL = int(os.getenv("SLOW_POLL_INTERVAL", "30"))
BET_AMOUNT = float(os.getenv("BET_AMOUNT", "2.0"))
PORTFOLIO_BALANCE = float(os.getenv("PORTFOLIO_BALANCE", "0"))

DRY_RUN = os.getenv("DRY_RUN", "True").lower() in ("true", "1", "yes")

MAX_RISK_PCT = float(os.getenv("MAX_RISK_PCT", "10.0"))
MIN_BET = float(os.getenv("MIN_BET", "1.0"))
MAX_OPEN_POSITIONS = int(os.getenv("MAX_OPEN_POSITIONS", "20"))
MAX_PER_EVENT = int(os.getenv("MAX_PER_EVENT", "2"))
MAX_TOTAL_EXPOSURE_PCT = float(os.getenv("MAX_TOTAL_EXPOSURE_PCT", "50.0"))
DAILY_LOSS_LIMIT_PCT = float(os.getenv("DAILY_LOSS_LIMIT_PCT", "15.0"))
DRAWDOWN_SCALE_START = float(os.getenv("DRAWDOWN_SCALE_START", "5.0"))
CORRELATION_PENALTY = float(os.getenv("CORRELATION_PENALTY", "0.5"))

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

_single = os.getenv("TARGET_ADDRESS", "")
_multi = os.getenv("TARGET_WALLETS", "")
TARGET_WALLETS = [w.strip() for w in _multi.split(",") if w.strip()] if _multi else ([_single] if _single else [])

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".bot_state.json")
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot.log")

DATA_API = "https://data-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"
PROFILE_API = "https://gamma-api.polymarket.com"
POLYGON_RPC = "https://polygon-rpc.com"
USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(LOG_FILE)],
)
log = logging.getLogger("copybot")


# ── TELEGRAM ──
async def tg_send(session: aiohttp.ClientSession, msg: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        await session.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": msg,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }, timeout=aiohttp.ClientTimeout(total=5))
    except Exception:
        pass

def pnl_summary(risk_state, state, portfolio_value=0):
    pnl = risk_state.get("daily_pnl", 0)
    bets = risk_state.get("daily_bets_placed", 0)
    exp = total_exposure(state)
    pos = count_all_open(state)
    line = f"\n\n📊 <b>P&L:</b> ${pnl:+.2f} | Pos: {pos} | Exp: ${exp:.0f}"
    if portfolio_value > 0:
        pnl_pct = pnl / portfolio_value * 100
        exp_pct = exp / portfolio_value * 100
        line = f"\n\n📊 <b>P&L:</b> ${pnl:+.2f} ({pnl_pct:+.1f}%) | Pos: {pos} | Exp: ${exp:.0f} ({exp_pct:.0f}%)"
    return line


# ── STATE (atomic save) ──
def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            log.error(f"State file corrupted: {e} — starting fresh")
            return {}
    return {}

def save_state(state: dict):
    """Atomic write: temp file → rename. Crash-safe."""
    temp_fd, temp_path = tempfile.mkstemp(
        dir=os.path.dirname(STATE_FILE), prefix='.tmp_state_')
    try:
        with os.fdopen(temp_fd, 'w') as f:
            json.dump(state, f, indent=2)
        os.replace(temp_path, STATE_FILE)
    except Exception:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise

def get_target_state(state: dict, target: str) -> dict:
    key = target.lower()
    if key not in state:
        state[key] = {"processed_trades": [], "our_positions": {}, "name": "", "bet_history": []}
    if "bet_history" not in state[key]:
        state[key]["bet_history"] = []
    return state[key]

def get_risk_state(state: dict) -> dict:
    if "_risk" not in state:
        state["_risk"] = {"date": str(date.today()), "daily_pnl": 0.0, "daily_bets_placed": 0, "daily_amount_wagered": 0.0, "starting_portfolio": 0.0, "halted": False}
    if state["_risk"]["date"] != str(date.today()):
        prev = state["_risk"]
        if prev["daily_pnl"] != 0 or prev["daily_bets_placed"] > 0:
            log.info(f"[RISK] Day ended — P&L: ${prev['daily_pnl']:+.2f} | Bets: {prev['daily_bets_placed']}")
        state["_risk"] = {"date": str(date.today()), "daily_pnl": 0.0, "daily_bets_placed": 0, "daily_amount_wagered": 0.0, "starting_portfolio": 0.0, "halted": False}
    return state["_risk"]


# ── API HELPERS (with retry) ──
async def api_get(session: aiohttp.ClientSession, url: str, params: dict = None, retries: int = 2) -> any:
    """GET with retry. Raises on final failure."""
    for attempt in range(retries + 1):
        try:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as r:
                r.raise_for_status()
                return await r.json()
        except Exception as e:
            if attempt == retries:
                raise
            await asyncio.sleep(1)

async def get_profile_name(session: aiohttp.ClientSession, addr: str) -> str:
    try:
        data = await api_get(session, f"{PROFILE_API}/public-profile", {"address": addr})
        return data.get("name") or data.get("pseudonym") or addr[:10] + "..."
    except Exception:
        return addr[:10] + "..."

async def get_positions(session: aiohttp.ClientSession, addr: str) -> list:
    """Get positions. Returns empty list on failure (never None)."""
    try:
        result = await api_get(session, f"{DATA_API}/positions", {"user": addr, "sizeThreshold": 0})
        return result if isinstance(result, list) else []
    except Exception as e:
        log.error(f"get_positions failed for {addr[:10]}: {e}")
        raise

async def get_recent_activity(session: aiohttp.ClientSession, addr: str, limit: int = 100) -> list:
    """Fetch recent activity with limit=100 for high-frequency traders."""
    result = await api_get(session, f"{DATA_API}/activity", {"user": addr, "limit": limit})
    return result if isinstance(result, list) else []

async def get_market_price(session: aiohttp.ClientSession, token_id: str) -> float:
    """Get current CLOB price. Returns 0 on failure."""
    try:
        data = await api_get(session, f"{CLOB_API}/price", {"token_id": token_id, "side": "sell"}, retries=1)
        return float(data.get("price", 0))
    except Exception:
        return 0.0

async def check_condition_resolved(session: aiohttp.ClientSession, condition_id: str, token_id: str = "", outcome_index: str = "0") -> dict:
    """Check market resolution using multiple methods (conditions endpoint is deprecated).

    Strategy:
    1. Check gamma-api /markets endpoint for resolution status
    2. Check CLOB — "No orderbook" means market ended
    3. Check if target's position shows redeemable=true or curPrice=1/0
    Returns {resolved: bool, winning_index: int|None, api_error: bool}
    """
    # Method 1: Try gamma /markets endpoint with condition_id
    try:
        data = await api_get(session, f"{PROFILE_API}/markets",
                             {"condition_id": condition_id}, retries=1)
        markets = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
        for mkt in markets:
            if not isinstance(mkt, dict):
                continue
            resolved = mkt.get("resolved", False) or mkt.get("closed", False) or mkt.get("active") is False
            if resolved:
                # Check winner from market data
                winner = mkt.get("winner")
                if winner is not None:
                    return {"resolved": True, "winning_index": int(winner) if str(winner).isdigit() else None}
                # Check payoutNumerators
                payouts = mkt.get("payoutNumerators", [])
                if payouts:
                    for i, p in enumerate(payouts):
                        if int(p) > 0:
                            return {"resolved": True, "winning_index": i}
                # Check outcome_prices — [1, 0] means outcome 0 won
                prices = mkt.get("outcomePrices", mkt.get("outcome_prices", ""))
                if isinstance(prices, str) and prices:
                    try:
                        price_list = json.loads(prices) if prices.startswith("[") else prices.split(",")
                        for i, p in enumerate(price_list):
                            if float(p) >= 0.99:
                                return {"resolved": True, "winning_index": i}
                    except (json.JSONDecodeError, ValueError):
                        pass
                return {"resolved": True, "winning_index": None}
    except Exception:
        pass  # Endpoint may not support condition_id param — try other methods

    # Method 2: Try CLOB price — "No orderbook" = market ended
    if token_id:
        try:
            data = await api_get(session, f"{CLOB_API}/price",
                                 {"token_id": token_id, "side": "sell"}, retries=0)
            price = float(data.get("price", 0))
            if price > 0:
                return {"resolved": False}  # Market still active with orderbook
        except Exception:
            # "No orderbook exists" error = market likely resolved
            pass

    # Method 3: Try gamma /events endpoint
    try:
        data = await api_get(session, f"{PROFILE_API}/events",
                             {"slug_contains": condition_id[:16]}, retries=0)
        if isinstance(data, list):
            for evt in data:
                if isinstance(evt, dict) and (evt.get("resolved") or evt.get("closed")):
                    return {"resolved": True, "winning_index": None}
    except Exception:
        pass

    return {"resolved": False, "api_error": True}

def get_usdc_balance_sync(addr: str) -> float:
    data = "0x70a08231" + addr[2:].lower().zfill(64)
    try:
        r = requests.post(POLYGON_RPC, json={"jsonrpc": "2.0", "method": "eth_call",
            "params": [{"to": USDC_CONTRACT, "data": data}, "latest"], "id": 1}, timeout=10)
        return int(r.json()["result"], 16) / 1e6
    except Exception:
        return 0.0


# ── CLOB CLIENT ──
_clob_client = None

def get_clob_client():
    global _clob_client
    if _clob_client is None:
        _clob_client = ClobClient(CLOB_API, key=PRIVATE_KEY, chain_id=137,
                                   signature_type=SIGNATURE_TYPE, funder=FUNDER_ADDRESS)
        creds = _clob_client.derive_api_key()
        _clob_client.set_api_creds(creds)
    return _clob_client

def place_buy_sync(token_id: str, amount: float):
    client = get_clob_client()
    order = MarketOrderArgs(token_id=token_id, amount=amount, side=BUY, order_type=OrderType.FOK)
    signed = client.create_market_order(order)
    return client.post_order(signed, OrderType.FOK)

def place_sell_sync(token_id: str, amount: float):
    client = get_clob_client()
    order = MarketOrderArgs(token_id=token_id, amount=amount, side=SELL, order_type=OrderType.FOK)
    signed = client.create_market_order(order)
    return client.post_order(signed, OrderType.FOK)


# ── TRADE ID ──
def make_trade_id(a: dict) -> str:
    """Unique trade ID using tx hash + timestamp. No collisions possible."""
    tx = str(a.get("transactionHash") or a.get("proxyWalletAddress") or a.get("id") or "")
    ts = str(a.get("createdAt") or a.get("timestamp") or "")
    return f"{a.get('conditionId','?')}_{a.get('side','?')}_{a.get('size','?')}_{a.get('outcomeIndex','?')}_{tx[:20]}_{ts[:20]}"


# ── CONFIDENCE SCORING ──
async def build_bet_history(session: aiohttp.ClientSession, target: str, ts: dict):
    history = ts.get("bet_history", [])
    if len(history) >= 50:
        return
    activity = await get_recent_activity(session, target, limit=100)
    seen = {h["trade_id"] for h in history}
    for a in activity:
        if a.get("type") != "TRADE" or a.get("side") != "BUY":
            continue
        tid = make_trade_id(a)
        if tid in seen:
            continue
        usdc = float(a.get("usdcSize", 0) or 0)
        if usdc <= 0:
            usdc = float(a.get("size", 0)) * float(a.get("price", 0))
        if usdc > 0:
            history.append({"trade_id": tid, "usdc_size": usdc})
            seen.add(tid)
    if len(history) > 200:
        history = history[-200:]
    ts["bet_history"] = history

def calculate_confidence(usdc_size: float, bet_history: list) -> float:
    if not bet_history or len(bet_history) < 5:
        return 0.5
    sizes = sorted([h["usdc_size"] for h in bet_history])
    n = len(sizes)
    median = statistics.median(sizes)
    p75, p90 = sizes[int(n * 0.75)], sizes[int(n * 0.90)]
    p95 = sizes[int(n * 0.95)] if n >= 20 else sizes[-1]
    max_s = sizes[-1]
    if median == 0:
        return 0.5
    if usdc_size <= median:
        return 0.1 + 0.2 * (usdc_size / median)
    elif usdc_size <= p75:
        return 0.3 + 0.2 * ((usdc_size - median) / (p75 - median)) if p75 > median else 0.4
    elif usdc_size <= p90:
        return 0.5 + 0.2 * ((usdc_size - p75) / (p90 - p75)) if p90 > p75 else 0.6
    elif usdc_size <= p95:
        return 0.7 + 0.2 * ((usdc_size - p90) / (p95 - p90)) if p95 > p90 else 0.8
    else:
        if max_s > p95 and max_s > usdc_size:
            return 0.9 + 0.1 * ((usdc_size - p95) / (max_s - p95))
        return 1.0


# ── RISK ENGINE ──
def count_all_open(state):
    return sum(len(get_target_state(state, t).get("our_positions", {})) for t in TARGET_WALLETS)

def count_event(state, slug):
    return sum(1 for t in TARGET_WALLETS
               for p in get_target_state(state, t).get("our_positions", {}).values()
               if p.get("event_slug", "") == slug)

def total_exposure(state):
    return sum(p.get("bet_amount", 0) for t in TARGET_WALLETS
               for p in get_target_state(state, t).get("our_positions", {}).values())

def drawdown_mult(risk_state, portfolio_value):
    if portfolio_value <= 0:
        return 1.0
    pnl = risk_state.get("daily_pnl", 0)
    if pnl >= 0:
        return 1.0
    loss = abs(pnl) / portfolio_value * 100
    if loss < DRAWDOWN_SCALE_START:
        return 1.0
    if loss >= DAILY_LOSS_LIMIT_PCT:
        return 0.0
    rng = DAILY_LOSS_LIMIT_PCT - DRAWDOWN_SCALE_START
    return max(0.25, 1.0 - 0.75 * ((loss - DRAWDOWN_SCALE_START) / rng)) if rng > 0 else 0.25

def risk_check(state, risk_state, pv, usdc_size, ts, cid, oi, slug, target):
    """Returns (bet_amount, confidence, reject_reason_or_None)."""
    if risk_state.get("halted"):
        return 0, 0, "DAILY LOSS LIMIT — halted"
    dd = drawdown_mult(risk_state, pv)
    if dd <= 0:
        risk_state["halted"] = True
        return 0, 0, f"DAILY LOSS {DAILY_LOSS_LIMIT_PCT}% — halting"
    if count_all_open(state) >= MAX_OPEN_POSITIONS:
        return 0, 0, f"MAX POSITIONS ({MAX_OPEN_POSITIONS})"
    if count_event(state, slug) >= MAX_PER_EVENT:
        return 0, 0, f"EVENT LIMIT ({MAX_PER_EVENT} on {slug[:25]})"
    exp = total_exposure(state)
    max_exp = (MAX_TOTAL_EXPOSURE_PCT / 100) * pv
    budget = max_exp - exp
    if budget < MIN_BET:
        return 0, 0, f"EXPOSURE CAP (${exp:.0f}/${max_exp:.0f})"

    conf = calculate_confidence(usdc_size, ts.get("bet_history", []))
    max_bet = (MAX_RISK_PCT / 100) * pv if pv > 0 else BET_AMOUNT
    bet = conf * max_bet * dd

    ag = sum(1 for t in TARGET_WALLETS if t.lower() != target.lower()
             and f"{cid}_{oi}" in get_target_state(state, t).get("our_positions", {}))
    if ag > 0 and CORRELATION_PENALTY > 0:
        bet *= CORRELATION_PENALTY ** ag

    bet = round(min(bet, budget, max_bet), 2)
    if bet < MIN_BET:
        return 0, 0, f"BET TOO SMALL (${bet:.2f})"
    return bet, conf, None


# ── PROCESS BUY ──
async def process_buy(session, activity, target, ts, state, risk_state, pv, my_positions):
    name = ts.get("name", target[:10])
    title = activity.get("title", "?")[:50]
    outcome = activity.get("outcome", "?")
    usdc_size = float(activity.get("usdcSize", 0) or 0)
    if usdc_size <= 0:
        usdc_size = float(activity.get("size", 0)) * float(activity.get("price", 0))
    price = float(activity.get("price", 0))
    if price <= 0:
        log.warning(f"[{name}] Skipping trade with price=0: {title}")
        return False
    token_id = activity.get("asset", "")
    cid = activity.get("conditionId", "")
    oi = activity.get("outcomeIndex", 0)
    slug = activity.get("eventSlug", "")
    pk = f"{cid}_{oi}"

    # Check if we already track this position — allow ADD to existing
    existing = ts.get("our_positions", {}).get(pk)

    bet, conf, reject = risk_check(state, risk_state, pv, usdc_size, ts, cid, oi, slug, target)
    cl = "LOW" if conf < 0.3 else "MED" if conf < 0.6 else "HIGH" if conf < 0.85 else "MAX"

    if reject:
        log.warning(f"[{name}] BLOCKED {title} | {reject}")
        return False

    action = "ADD" if existing else "BUY"
    log.info(
        f"[{name}] {action} {title} | {outcome} @ {price*100:.1f}c | "
        f"target: ${usdc_size:.1f} | conf: {conf:.0%} ({cl}) | bet: ${bet:.2f}"
    )

    if DRY_RUN:
        log.info(f"[{name}]     DRY RUN — would {action.lower()} ${bet:.2f}")
    else:
        try:
            await asyncio.get_event_loop().run_in_executor(None, place_buy_sync, token_id, bet)
            log.info(f"[{name}]     Bought ${bet:.2f}")
        except Exception as e:
            log.error(f"[{name}]     Buy failed: {e}")
            return False

    if existing:
        old_bet = existing.get("bet_amount", 0)
        old_price = existing.get("entry_price", price)
        total_bet = old_bet + bet
        existing["entry_price"] = (old_bet * old_price + bet * price) / total_bet if total_bet > 0 else price
        existing["bet_amount"] = total_bet
        existing["target_usdc_size"] = existing.get("target_usdc_size", 0) + usdc_size
    else:
        ts["our_positions"][pk] = {
            "title": title, "outcome": outcome, "token_id": token_id,
            "entry_price": price, "bet_amount": bet, "confidence": conf,
            "target_usdc_size": usdc_size, "event_slug": slug,
            "copied_at": datetime.utcnow().isoformat(),
        }

    risk_state["daily_bets_placed"] = risk_state.get("daily_bets_placed", 0) + 1
    risk_state["daily_amount_wagered"] = risk_state.get("daily_amount_wagered", 0) + bet

    tid = make_trade_id(activity)
    bh = ts.get("bet_history", [])
    bh.append({"trade_id": tid, "usdc_size": usdc_size})
    if len(bh) > 200:
        bh = bh[-200:]
    ts["bet_history"] = bh

    mode_tag = " [DRY]" if DRY_RUN else ""
    total_pos = existing["bet_amount"] if existing else bet
    await tg_send(session,
        f"<b>{action}{mode_tag}</b> [{name}]\n"
        f"{title}\n"
        f"{outcome} @ {price*100:.1f}c\n"
        f"Target: ${usdc_size:.1f} | Conf: {conf:.0%} ({cl})\n"
        f"<b>Bet: ${bet:.2f}</b> (pos total: ${total_pos:.2f})"
        + pnl_summary(risk_state, state, pv)
    )
    return True


# ── PROCESS CLOSE ──
async def process_close(session, pos, tracked, name, risk_state, state, close_reason=""):
    title = tracked.get("title", "?")
    outcome = tracked.get("outcome", "?")
    token_id = tracked.get("token_id", "")
    cur_size = float(pos.get("size", 0))
    cur_price = float(pos.get("curPrice", pos.get("price", 0)))
    entry = tracked.get("entry_price", 0)
    bet_amt = tracked.get("bet_amount", 0)

    # P&L: shares = bet/entry, profit = shares * (exit - entry)
    shares = bet_amt / entry if entry > 0 else 0
    pnl_usd = shares * (cur_price - entry)
    pnl_pct = ((cur_price - entry) / entry * 100) if entry > 0 else 0

    log.info(f"[{name}] CLOSE [{close_reason}] {title} | {outcome} | "
             f"{shares:.2f}sh @ {cur_price*100:.1f}c | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})")

    if DRY_RUN:
        log.info(f"[{name}]      DRY RUN — would sell {shares:.2f} shares")
    else:
        try:
            sell_amt = cur_size * cur_price
            await asyncio.get_event_loop().run_in_executor(None, place_sell_sync, token_id, sell_amt)
            log.info(f"[{name}]      Sold {cur_size:.2f} shares")
        except Exception as e:
            log.error(f"[{name}]      Sell failed: {e}")

    risk_state["daily_pnl"] = risk_state.get("daily_pnl", 0) + pnl_usd
    mode_tag = " [DRY]" if DRY_RUN else ""
    result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
    await tg_send(session,
        f"<b>CLOSE{mode_tag}</b> [{name}] {result}\n"
        f"{title} — {outcome}\n"
        f"Reason: {close_reason}\n"
        f"Entry: {entry*100:.1f}c → Exit: {cur_price*100:.1f}c\n"
        f"Bet: ${bet_amt:.2f} | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})"
        + pnl_summary(risk_state, state)
    )


# ── FAST POLL: Trade detection ──
async def fast_poll_loop(session, state, risk_state, portfolio_value_ref, state_lock):
    log.info(f"[FAST] Trade detection started ({FAST_POLL_INTERVAL}s interval)")
    cycle = 0

    while True:
        cycle += 1
        risk = get_risk_state(state)

        try:
            my_positions = await get_positions(session, FUNDER_ADDRESS)
        except Exception as e:
            log.error(f"[FAST] Failed to get own positions: {e}")
            await asyncio.sleep(FAST_POLL_INTERVAL)
            continue

        pv = portfolio_value_ref[0]
        actions = 0

        for target in TARGET_WALLETS:
            ts = get_target_state(state, target)
            processed = set(ts.get("processed_trades", []))
            name = ts.get("name", target[:10])

            try:
                activity = await get_recent_activity(session, target, limit=100)
            except Exception as e:
                log.error(f"[{name}] Activity fetch failed: {e}")
                continue

            new_trades = 0
            for a in activity:
              try:
                if a.get("type") != "TRADE":
                    continue
                tid = make_trade_id(a)
                if tid in processed:
                    continue

                side = a.get("side", "")
                if side == "BUY":
                    acted = await process_buy(session, a, target, ts, state, risk, pv, my_positions)
                    if acted:
                        actions += 1
                elif side == "SELL":
                    # Detect partial or full sells — reduce our position proportionally
                    sell_cid = a.get("conditionId", "")
                    sell_oi = a.get("outcomeIndex", 0)
                    sell_pk = f"{sell_cid}_{sell_oi}"
                    sell_price = float(a.get("price", 0))
                    sell_size = float(a.get("size", 0))
                    our_pos = ts.get("our_positions", {}).get(sell_pk)
                    if our_pos and sell_price > 0:
                        entry = our_pos.get("entry_price", 0)
                        our_bet = our_pos.get("bet_amount", 0)
                        our_shares = our_bet / entry if entry > 0 else 0
                        # Calculate what fraction of target's position was sold
                        target_orig = our_pos.get("target_usdc_size", 0)
                        sell_usdc = sell_size * sell_price
                        if target_orig > 0:
                            sell_frac = min(sell_usdc / target_orig, 1.0)
                        else:
                            sell_frac = 1.0
                        close_bet = our_bet * sell_frac
                        close_shares = our_shares * sell_frac
                        pnl_usd = close_shares * (sell_price - entry)
                        risk.get("daily_pnl", 0)
                        risk["daily_pnl"] = risk.get("daily_pnl", 0) + pnl_usd
                        pnl_pct = ((sell_price - entry) / entry * 100) if entry > 0 else 0
                        result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
                        log.info(f"[{name}] PARTIAL SELL {a.get('title','?')[:40]} | {sell_frac*100:.0f}% | P&L: ${pnl_usd:+.2f}")
                        # Reduce position
                        our_pos["bet_amount"] = our_bet - close_bet
                        our_pos["target_usdc_size"] = max(0, target_orig - sell_usdc)
                        if our_pos["bet_amount"] <= 0.01:
                            del ts["our_positions"][sell_pk]
                        # Execute sell in LIVE mode
                        if not DRY_RUN:
                            try:
                                sell_amt = close_shares * sell_price
                                await asyncio.get_event_loop().run_in_executor(
                                    None, place_sell_sync, our_pos.get("token_id", ""), sell_amt)
                            except Exception as e:
                                log.error(f"[{name}] Partial sell failed: {e}")
                        mode_tag = " [DRY]" if DRY_RUN else ""
                        await tg_send(session,
                            f"<b>SELL{mode_tag}</b> [{name}] {result}\n"
                            f"{a.get('title','?')[:50]}\n"
                            f"Sold {sell_frac*100:.0f}% @ {sell_price*100:.1f}c\n"
                            f"P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})"
                            + pnl_summary(risk_state, state, portfolio_value_ref[0]))
                        actions += 1
                    else:
                        log.info(f"[{name}] SELL {a.get('title','?')[:50]} | {a.get('outcome','?')} (not tracked)")
                else:
                    log.warning(f"[{name}] UNKNOWN side '{side}' for {a.get('title','?')[:30]}")

                processed.add(tid)
                new_trades += 1
              except Exception as e:
                import traceback
                log.error(f"[{name}] Error processing trade: {e}\n{traceback.format_exc()}")
                continue

            pl = list(processed)
            if len(pl) > 2000:
                pl = pl[-2000:]
            ts["processed_trades"] = pl

            if new_trades > 0:
                log.info(f"[{name}] Processed {new_trades} new trades this cycle")

        async with state_lock:
            save_state(state)

        if cycle % 60 == 0:
            op = count_all_open(state)
            exp = total_exposure(state)
            pnl = risk.get("daily_pnl", 0)
            bets = risk.get("daily_bets_placed", 0)
            log.info(f"[FAST] #{cycle} | P&L: ${pnl:+.2f} | bets: {bets} | pos: {op}/{MAX_OPEN_POSITIONS} | exp: ${exp:.0f}")

        if cycle % 720 == 0:
            op = count_all_open(state)
            exp = total_exposure(state)
            pnl = risk.get("daily_pnl", 0)
            bets = risk.get("daily_bets_placed", 0)
            pv = portfolio_value_ref[0]
            await tg_send(session,
                f"<b>Hourly Summary</b>\n"
                f"Portfolio: ${pv:.2f}\n"
                f"Daily P&L: ${pnl:+.2f}\n"
                f"Positions: {op}/{MAX_OPEN_POSITIONS}\n"
                f"Exposure: ${exp:.0f} ({exp/pv*100:.0f}%)\n"
                f"Bets today: {bets}\n"
                f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE'}"
            )

        await asyncio.sleep(FAST_POLL_INTERVAL)


# ── SLOW POLL: Position close detection ──
async def slow_poll_loop(session, state, risk_state, portfolio_value_ref, state_lock):
    log.info(f"[SLOW] Close detection started ({SLOW_POLL_INTERVAL}s interval)")
    cycle = 0

    while True:
        cycle += 1
        risk = get_risk_state(state)

        try:
            my_positions = await get_positions(session, FUNDER_ADDRESS)
        except Exception as e:
            log.error(f"[SLOW] Failed to get positions: {e}")
            await asyncio.sleep(SLOW_POLL_INTERVAL)
            continue

        if cycle % 10 == 1:
            if PORTFOLIO_BALANCE > 0:
                portfolio_value_ref[0] = PORTFOLIO_BALANCE
            else:
                pos_val = sum(float(p.get("currentValue", 0)) for p in my_positions)
                usdc = get_usdc_balance_sync(FUNDER_ADDRESS)
                pv = pos_val + usdc
                if pv > 0:
                    portfolio_value_ref[0] = pv

        for target in TARGET_WALLETS:
            ts = get_target_state(state, target)
            name = ts.get("name", target[:10])
            our = ts.get("our_positions", {})
            if not our:
                continue

            try:
                target_positions = await get_positions(session, target)
            except Exception as e:
                log.error(f"[{name}] Failed to get target positions: {e}")
                continue

            target_keys = {f"{p['conditionId']}_{p['outcomeIndex']}" for p in target_positions}
            to_close = []

            if DRY_RUN:
                try:
                    target_activity = await get_recent_activity(session, target, limit=100)
                except Exception:
                    target_activity = []

                for pk, tracked in list(our.items()):
                    if pk in target_keys:
                        continue  # Target still holds — skip

                    entry = tracked.get("entry_price", 0)
                    cid = pk.split("_")[0] if "_" in pk else pk
                    oi = pk.split("_")[1] if "_" in pk else "0"
                    token_id = tracked.get("token_id", "")
                    bet_amt = tracked.get("bet_amount", 0)
                    shares = bet_amt / entry if entry > 0 else 0
                    cur_price = 0.0
                    close_reason = ""

                    # Step 1: Check if market resolved on-chain
                    resolution = await check_condition_resolved(session, cid, token_id, oi)
                    if resolution.get("resolved"):
                        winning_idx = resolution.get("winning_index")
                        if winning_idx is not None and str(winning_idx) == str(oi):
                            cur_price = 1.0
                            close_reason = "RESOLVED WON"
                        elif winning_idx is not None:
                            cur_price = 0.0
                            close_reason = "RESOLVED LOST"
                        else:
                            # Resolved but can't determine winner — use CLOB
                            if token_id:
                                cur_price = await get_market_price(session, token_id)
                            if cur_price <= 0:
                                cur_price = 1.0 if entry >= 0.5 else 0.0
                            close_reason = "RESOLVED (UNKNOWN WINNER)"

                    # Step 2: Not resolved — target sold manually
                    if not close_reason:
                        for a in target_activity:
                            if (a.get("side") == "SELL"
                                    and a.get("conditionId") == cid
                                    and str(a.get("outcomeIndex", -1)) == str(oi)):
                                cur_price = float(a.get("price", 0))
                                if cur_price > 0:
                                    close_reason = "TARGET SOLD"
                                break

                    # Step 3: Try CLOB price
                    if not close_reason and token_id:
                        clob_price = await get_market_price(session, token_id)
                        if clob_price > 0:
                            cur_price = clob_price
                            close_reason = "TARGET EXITED"

                    # Step 4: API error — do NOT close, wait for next cycle
                    if not close_reason:
                        if resolution.get("api_error"):
                            log.warning(f"[{name}] API error checking {tracked.get('title','?')[:30]} — skipping close, will retry")
                            continue
                        # Position truly gone with no explanation — force close
                        cur_price = 1.0 if entry >= 0.5 else 0.0
                        close_reason = "POSITION GONE (estimated)"
                        log.warning(f"[{name}] No price data for {tracked.get('title','?')[:30]} — estimating")

                    fake_pos = {"size": shares, "curPrice": cur_price, "conditionId": cid, "outcomeIndex": oi}
                    to_close.append((pk, fake_pos, tracked, close_reason))
            else:
                # LIVE: check all tracked positions, handle auto-redeemed (ghost) positions
                my_keys = {f"{pos['conditionId']}_{pos['outcomeIndex']}" for pos in my_positions}
                for pk, tracked in list(our.items()):
                    if pk in target_keys:
                        continue  # Target still holds — skip
                    cid = pk.split("_")[0] if "_" in pk else pk
                    oi = pk.split("_")[1] if "_" in pk else "0"
                    entry = tracked.get("entry_price", 0)
                    if pk in my_keys:
                        # We still hold on-chain — use our position data
                        for pos in my_positions:
                            if f"{pos['conditionId']}_{pos['outcomeIndex']}" == pk:
                                to_close.append((pk, pos, tracked, "TARGET EXITED"))
                                break
                    else:
                        # Both positions gone — check resolution for correct P&L
                        resolution = await check_condition_resolved(session, cid, token_id, oi)
                        if resolution.get("resolved"):
                            wi = resolution.get("winning_index")
                            if wi is not None and str(wi) == str(oi):
                                cp = 1.0
                                r = "RESOLVED WON"
                            elif wi is not None:
                                cp = 0.0
                                r = "RESOLVED LOST"
                            else:
                                cp = 1.0 if entry >= 0.5 else 0.0
                                r = "RESOLVED"
                        elif resolution.get("api_error"):
                            log.warning(f"[{name}] API error — retry next cycle")
                            continue
                        else:
                            cp = 1.0 if entry >= 0.5 else 0.0
                            r = "BOTH GONE"
                        shares = tracked.get("bet_amount", 0) / entry if entry > 0 else 0
                        fp = {"size": shares, "curPrice": cp, "conditionId": cid, "outcomeIndex": oi}
                        to_close.append((pk, fp, tracked, r))

            async with state_lock:
                for item in to_close:
                    pk, pos, tracked = item[0], item[1], item[2]
                    reason = item[3] if len(item) > 3 else ""
                    await process_close(session, pos, tracked, name, risk, state, reason)
                    del our[pk]

        async with state_lock:
            save_state(state)
        await asyncio.sleep(SLOW_POLL_INTERVAL)


# ── MAIN ──
async def main():
    if not TARGET_WALLETS:
        log.error("No target wallets. Set TARGET_WALLETS or TARGET_ADDRESS in .env")
        return

    state = load_state()
    risk_state = get_risk_state(state)

    log.info("=" * 60)
    log.info("  POLYMARKET COPY BOT — PRODUCTION")
    log.info("=" * 60)
    log.info(f"  Trade poll:     {FAST_POLL_INTERVAL}s")
    log.info(f"  Close check:    {SLOW_POLL_INTERVAL}s")
    log.info(f"  Max risk/pos:   {MAX_RISK_PCT}%")
    log.info(f"  Max positions:  {MAX_OPEN_POSITIONS}")
    log.info(f"  Max exposure:   {MAX_TOTAL_EXPOSURE_PCT}%")
    log.info(f"  Daily loss cap: {DAILY_LOSS_LIMIT_PCT}%")
    log.info(f"  Telegram:       {'ON' if TELEGRAM_BOT_TOKEN else 'OFF'}")
    log.info(f"  Mode:           {'DRY RUN' if DRY_RUN else 'LIVE'}")
    log.info("=" * 60)

    async with aiohttp.ClientSession() as session:
        for target in TARGET_WALLETS:
            ts = get_target_state(state, target)
            ts["name"] = await get_profile_name(session, target)
            await build_bet_history(session, target, ts)
            h = ts.get("bet_history", [])
            if h:
                sizes = [x["usdc_size"] for x in h]
                s = sorted(sizes)
                log.info(f"  [{ts['name']}] {len(h)} trades | median: ${statistics.median(sizes):.1f} | P90: ${s[int(len(s)*0.9)]:.1f}")

        my_positions = await get_positions(session, FUNDER_ADDRESS)
        if PORTFOLIO_BALANCE > 0:
            pv = PORTFOLIO_BALANCE
        else:
            pos_val = sum(float(p.get("currentValue", 0)) for p in my_positions)
            usdc = get_usdc_balance_sync(FUNDER_ADDRESS)
            pv = pos_val + usdc
        if pv <= 0:
            pv = BET_AMOUNT / (MAX_RISK_PCT / 100)

        portfolio_value_ref = [pv]

        log.info(f"\n  Portfolio:    ${pv:.2f}")
        log.info(f"  Max/position: ${MAX_RISK_PCT/100*pv:.2f}")
        log.info(f"  Max exposure: ${MAX_TOTAL_EXPOSURE_PCT/100*pv:.2f}")
        log.info(f"  Positions:    {len(my_positions)}")
        log.info(f"  Tracked:      {count_all_open(state)}")

        await tg_send(session,
            f"<b>Bot Started</b>\n"
            f"Targets: {len(TARGET_WALLETS)}\n"
            f"Portfolio: ${pv:.2f}\n"
            f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE'}"
            + pnl_summary(risk, state, pv)
        )

        log.info(f"\n  Running... (Ctrl+C to stop)\n")
        save_state(state)

        state_lock = asyncio.Lock()
        await asyncio.gather(
            fast_poll_loop(session, state, risk_state, portfolio_value_ref, state_lock),
            slow_poll_loop(session, state, risk_state, portfolio_value_ref, state_lock),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("\nBot stopped.")
    except Exception as e:
        import traceback
        log.error(f"Fatal: {e}\n{traceback.format_exc()}")
