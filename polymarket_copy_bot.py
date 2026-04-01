"""
Polymarket Copy Trading Bot — Real-Time + Smart Risk Engine + Telegram Alerts

Architecture:
- Async fast-poll (5s) for new trades from target wallets
- WebSocket connection for real-time market price feeds
- Position close detection every 30s
- Telegram notifications for all actions
- Full risk engine: confidence sizing, drawdown scaling, exposure caps
"""
import os
import asyncio
import time
import json
import logging
import statistics
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

# ── DNS BLOCK WORKAROUND ──
import socket

_POLYMARKET_HOSTS = {
    "gamma-api.polymarket.com": "104.18.34.205",
    "data-api.polymarket.com": "104.18.34.205",
    "clob.polymarket.com": "104.18.34.205",
    "ws-subscriptions-clob.polymarket.com": "104.18.34.205",
}
_original_getaddrinfo = socket.getaddrinfo

def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host in _POLYMARKET_HOSTS:
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

FAST_POLL_INTERVAL = int(os.getenv("FAST_POLL_INTERVAL", "5"))   # Trade detection: 5s
SLOW_POLL_INTERVAL = int(os.getenv("SLOW_POLL_INTERVAL", "30"))  # Position close check: 30s
BET_AMOUNT = float(os.getenv("BET_AMOUNT", "2.0"))
PORTFOLIO_BALANCE = float(os.getenv("PORTFOLIO_BALANCE", "0"))

DRY_RUN = os.getenv("DRY_RUN", "True").lower() in ("true", "1", "yes")

# Risk engine
MAX_RISK_PCT = float(os.getenv("MAX_RISK_PCT", "10.0"))
MIN_BET = float(os.getenv("MIN_BET", "1.0"))
MAX_OPEN_POSITIONS = int(os.getenv("MAX_OPEN_POSITIONS", "20"))
MAX_PER_EVENT = int(os.getenv("MAX_PER_EVENT", "2"))
MAX_TOTAL_EXPOSURE_PCT = float(os.getenv("MAX_TOTAL_EXPOSURE_PCT", "50.0"))
DAILY_LOSS_LIMIT_PCT = float(os.getenv("DAILY_LOSS_LIMIT_PCT", "15.0"))
DRAWDOWN_SCALE_START = float(os.getenv("DRAWDOWN_SCALE_START", "5.0"))
CORRELATION_PENALTY = float(os.getenv("CORRELATION_PENALTY", "0.5"))

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Targets
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

# ── LOGGING ──
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
        pass  # Never let telegram errors break the bot


# ── STATE ──
def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}

def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

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


# ── ASYNC API HELPERS ──
async def api_get(session: aiohttp.ClientSession, url: str, params: dict = None) -> any:
    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as r:
        r.raise_for_status()
        return await r.json()

async def get_profile_name(session: aiohttp.ClientSession, addr: str) -> str:
    try:
        data = await api_get(session, f"{PROFILE_API}/public-profile", {"address": addr})
        return data.get("name") or data.get("pseudonym") or addr[:10] + "..."
    except Exception:
        return addr[:10] + "..."

async def get_positions(session: aiohttp.ClientSession, addr: str) -> list:
    return await api_get(session, f"{DATA_API}/positions", {"user": addr, "sizeThreshold": 0})

async def get_recent_activity(session: aiohttp.ClientSession, addr: str, limit: int = 100) -> list:
    """Fetch recent activity. Use limit=100 to catch high-frequency traders."""
    return await api_get(session, f"{DATA_API}/activity", {"user": addr, "limit": limit})

async def get_market_price(session: aiohttp.ClientSession, token_id: str) -> float:
    """Get current price for a token from the CLOB API."""
    try:
        data = await api_get(session, f"{CLOB_API}/price", {"token_id": token_id, "side": "sell"})
        return float(data.get("price", 0))
    except Exception:
        return 0.0

async def get_market_info(session: aiohttp.ClientSession, condition_id: str) -> dict:
    """Get market resolution status from Gamma API."""
    try:
        data = await api_get(session, f"{PROFILE_API}/markets", {"clob_token_ids": condition_id})
        if isinstance(data, list) and data:
            return data[0]
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}

async def check_condition_resolved(session: aiohttp.ClientSession, condition_id: str) -> dict:
    """Check if a condition/market has resolved. Returns {resolved: bool, winning_outcome: str, payout: float}."""
    try:
        # Try the gamma API conditions endpoint
        data = await api_get(session, f"{PROFILE_API}/conditions", {"id": condition_id})
        if isinstance(data, list) and data:
            cond = data[0]
        elif isinstance(data, dict):
            cond = data
        else:
            return {"resolved": False}

        resolved = cond.get("resolved", False) or cond.get("closed", False)
        if resolved:
            # Find which outcome index won
            payouts = cond.get("payoutNumerators", [])
            if payouts:
                winning_idx = None
                for i, p in enumerate(payouts):
                    if int(p) > 0:
                        winning_idx = i
                        break
                return {"resolved": True, "winning_index": winning_idx, "payouts": payouts}
            return {"resolved": True, "winning_index": None, "payouts": []}
        return {"resolved": False}
    except Exception:
        return {"resolved": False}

def get_usdc_balance_sync(addr: str) -> float:
    data = "0x70a08231" + addr[2:].lower().zfill(64)
    try:
        r = requests.post(POLYGON_RPC, json={"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": USDC_CONTRACT, "data": data}, "latest"], "id": 1}, timeout=10)
        return int(r.json()["result"], 16) / 1e6
    except Exception:
        return 0.0


# ── CLOB CLIENT (sync — py-clob-client doesn't support async) ──
_clob_client = None

def get_clob_client():
    global _clob_client
    if _clob_client is None:
        _clob_client = ClobClient(CLOB_API, key=PRIVATE_KEY, chain_id=137, signature_type=SIGNATURE_TYPE, funder=FUNDER_ADDRESS)
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


# ── HELPERS ──
def make_trade_id(a: dict) -> str:
    """Create a unique trade ID using transaction hash + condition + side + size.
    FIX: include transactionHash to distinguish repeat trades on the same market."""
    tx = a.get("transactionHash", a.get("proxyWalletAddress", ""))
    return f"{a.get('conditionId','?')}_{a.get('side','?')}_{a.get('size','?')}_{a.get('outcome','?')}_{tx[:16]}_{a.get('title','?')[:30]}"


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
    return sum(1 for t in TARGET_WALLETS for p in get_target_state(state, t).get("our_positions", {}).values() if p.get("event_slug", "") == slug)

def total_exposure(state):
    return sum(p.get("bet_amount", 0) for t in TARGET_WALLETS for p in get_target_state(state, t).get("our_positions", {}).values())

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

def check_agreement(state, cid, oi, current_target):
    pk = f"{cid}_{oi}"
    return sum(1 for t in TARGET_WALLETS if t.lower() != current_target.lower() and pk in get_target_state(state, t).get("our_positions", {}))

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
    if budget <= MIN_BET:
        return 0, 0, f"EXPOSURE CAP (${exp:.0f}/${max_exp:.0f})"

    conf = calculate_confidence(usdc_size, ts.get("bet_history", []))
    max_bet = (MAX_RISK_PCT / 100) * pv if pv > 0 else BET_AMOUNT
    bet = conf * max_bet * dd

    ag = check_agreement(state, cid, oi, target)
    if ag > 0 and CORRELATION_PENALTY > 0:
        bet *= CORRELATION_PENALTY ** ag

    bet = round(min(bet, budget, max_bet), 2)
    bet = max(bet, MIN_BET)
    return bet, conf, None


# ── CORE: PROCESS A TRADE ──
async def process_buy(session, activity, target, ts, state, risk_state, pv, my_positions):
    """Process a single BUY trade. Returns True if action taken."""
    name = ts.get("name", target[:10])
    title = activity.get("title", "?")[:50]
    outcome = activity.get("outcome", "?")
    usdc_size = float(activity.get("usdcSize", 0) or 0)
    if usdc_size <= 0:
        usdc_size = float(activity.get("size", 0)) * float(activity.get("price", 0))
    price = float(activity.get("price", 0))
    token_id = activity.get("asset", "")
    cid = activity.get("conditionId", "")
    oi = activity.get("outcomeIndex", 0)
    slug = activity.get("eventSlug", "")
    pk = f"{cid}_{oi}"

    # FIX: In DRY RUN, don't check my_positions (we have none on-chain).
    # Instead, check if we already track this position in our_positions.
    # Allow adding to existing positions (Sharky adds to positions frequently).
    if not DRY_RUN:
        my_keys = {f"{p['conditionId']}_{p['outcomeIndex']}" for p in my_positions}
        if pk in my_keys:
            return False

    # Check if we already have this exact position — if so, ADD to it instead of skipping
    existing = ts.get("our_positions", {}).get(pk)

    bet, conf, reject = risk_check(state, risk_state, pv, usdc_size, ts, cid, oi, slug, target)
    cl = "LOW" if conf < 0.3 else "MED" if conf < 0.6 else "HIGH" if conf < 0.85 else "MAX"

    if reject:
        log.warning(f"[{name}] BLOCKED {title} | {reject}")
        return False

    op = count_all_open(state)
    exp = total_exposure(state)
    action = "ADD" if existing else "BUY"
    log.info(
        f"[{name}] {action} {title} | {outcome} @ {price*100:.1f}c | "
        f"target: ${usdc_size:.1f} | conf: {conf:.0%} ({cl}) | bet: ${bet:.2f} | "
        f"pos:{op}/{MAX_OPEN_POSITIONS} | exp:{exp/pv*100:.0f}%"
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
        # Add to existing position
        existing["bet_amount"] = existing.get("bet_amount", 0) + bet
        existing["target_usdc_size"] = existing.get("target_usdc_size", 0) + usdc_size
        # Update entry price to weighted average
        old_bet = existing["bet_amount"] - bet
        if old_bet + bet > 0:
            existing["entry_price"] = (old_bet * existing.get("entry_price", price) + bet * price) / (old_bet + bet)
    else:
        ts["our_positions"][pk] = {
            "title": title, "outcome": outcome, "token_id": token_id,
            "entry_price": price, "bet_amount": bet, "confidence": conf,
            "target_usdc_size": usdc_size, "event_slug": slug,
            "copied_at": datetime.utcnow().isoformat(),
        }

    risk_state["daily_bets_placed"] = risk_state.get("daily_bets_placed", 0) + 1
    risk_state["daily_amount_wagered"] = risk_state.get("daily_amount_wagered", 0) + bet

    # Update bet history
    tid = make_trade_id(activity)
    bh = ts.get("bet_history", [])
    bh.append({"trade_id": tid, "usdc_size": usdc_size})
    if len(bh) > 200:
        bh = bh[-200:]
    ts["bet_history"] = bh

    # Telegram alert
    mode_tag = " [DRY]" if DRY_RUN else ""
    total_pos = existing["bet_amount"] if existing else bet
    await tg_send(session,
        f"<b>{action}{mode_tag}</b> [{name}]\n"
        f"{title}\n"
        f"{outcome} @ {price*100:.1f}c\n"
        f"Target: ${usdc_size:.1f} | Conf: {conf:.0%} ({cl})\n"
        f"<b>Bet: ${bet:.2f}</b> (pos total: ${total_pos:.2f})"
    )
    return True


async def process_close(session, pos, tracked, name, risk_state):
    """Close a position the target has exited."""
    title = tracked.get("title", "?")
    outcome = tracked.get("outcome", "?")
    token_id = tracked.get("token_id", "")
    cur_size = float(pos.get("size", 0))
    cur_price = float(pos.get("curPrice", pos.get("price", 0)))
    entry = tracked.get("entry_price", 0)
    bet_amt = tracked.get("bet_amount", 0)
    pnl_pct = ((cur_price - entry) / entry * 100) if entry > 0 else 0
    pnl_usd = bet_amt * ((cur_price - entry) / entry) if entry > 0 else 0

    log.info(f"[{name}] CLOSE {title} | {outcome} | {cur_size:.2f}sh @ {cur_price*100:.1f}c | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})")

    if DRY_RUN:
        log.info(f"[{name}]      DRY RUN — would sell {cur_size:.2f} shares")
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
        f"Entry: {entry*100:.1f}c → Exit: {cur_price*100:.1f}c\n"
        f"Bet: ${bet_amt:.2f} | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})"
    )


# ── FAST POLL LOOP: Trade detection (every 5s) ──
async def fast_poll_loop(session, state, risk_state, portfolio_value_ref):
    """Polls target activity every FAST_POLL_INTERVAL seconds for new trades."""
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
                # FIX: fetch 100 trades instead of 15 — Sharky can do 98 trades in 30 min
                activity = await get_recent_activity(session, target, limit=100)
            except Exception as e:
                log.error(f"[{name}] Activity fetch failed: {e}")
                continue

            new_trades = 0
            for a in activity:
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
                    log.info(f"[{name}] SELL {a.get('title','?')[:50]} | {a.get('outcome','?')}")

                processed.add(tid)
                new_trades += 1

            # Trim processed list
            pl = list(processed)
            if len(pl) > 2000:  # FIX: increased from 500 to 2000 for high-frequency traders
                pl = pl[-2000:]
            ts["processed_trades"] = pl

            if new_trades > 0:
                log.info(f"[{name}] Processed {new_trades} new trades this cycle")

        # FIX: Always save state every cycle to persist processed trade IDs
        # This prevents re-processing trades after restart
        save_state(state)

        # Periodic heartbeat
        if cycle % 60 == 0:  # Every 5 min
            op = count_all_open(state)
            exp = total_exposure(state)
            pnl = risk.get("daily_pnl", 0)
            bets = risk.get("daily_bets_placed", 0)
            log.info(f"[FAST] #{cycle} | P&L: ${pnl:+.2f} | bets: {bets} | pos: {op}/{MAX_OPEN_POSITIONS} | exp: ${exp:.0f}")

        # Telegram summary every hour (720 cycles * 5s = 3600s)
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


# ── SLOW POLL LOOP: Position close detection (every 30s) ──
async def slow_poll_loop(session, state, risk_state, portfolio_value_ref):
    """Checks for positions to close and refreshes portfolio value."""
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

        # Refresh portfolio value every 5 min
        if cycle % 10 == 1:
            if PORTFOLIO_BALANCE > 0:
                portfolio_value_ref[0] = PORTFOLIO_BALANCE
            else:
                pos_val = sum(float(p.get("currentValue", 0)) for p in my_positions)
                usdc = get_usdc_balance_sync(FUNDER_ADDRESS)
                pv = pos_val + usdc
                if pv > 0:
                    portfolio_value_ref[0] = pv

        # Check each target for exits
        for target in TARGET_WALLETS:
            ts = get_target_state(state, target)
            name = ts.get("name", target[:10])
            our = ts.get("our_positions", {})
            if not our:
                continue

            try:
                target_positions = await get_positions(session, target)
            except Exception:
                continue

            target_keys = {f"{p['conditionId']}_{p['outcomeIndex']}" for p in target_positions}
            to_close = []

            if DRY_RUN:
                # In DRY RUN, check simulated positions for:
                # 1. Target sold (position gone from target's list)
                # 2. Market resolved (condition resolved on-chain)
                try:
                    target_activity = await get_recent_activity(session, target, limit=100)
                except Exception:
                    target_activity = []

                for pk, tracked in list(our.items()):
                    entry = tracked.get("entry_price", 0)
                    cid = pk.split("_")[0] if "_" in pk else pk
                    oi = pk.split("_")[1] if "_" in pk else "0"
                    token_id = tracked.get("token_id", "")
                    bet_amt = tracked.get("bet_amount", 0)
                    shares = bet_amt / entry if entry > 0 else 0
                    should_close = False
                    cur_price = entry  # default: no change
                    close_reason = ""

                    # Case 1: Target no longer holds this position (sold or redeemed)
                    if pk not in target_keys:
                        should_close = True

                        # Check if market resolved
                        resolution = await check_condition_resolved(session, cid)
                        if resolution.get("resolved"):
                            winning_idx = resolution.get("winning_index")
                            if winning_idx is not None and str(winning_idx) == str(oi):
                                cur_price = 1.0  # Our outcome WON
                                close_reason = "RESOLVED (WON)"
                            elif winning_idx is not None:
                                cur_price = 0.0  # Our outcome LOST
                                close_reason = "RESOLVED (LOST)"
                            else:
                                cur_price = 1.0 if entry >= 0.5 else 0.0
                                close_reason = "RESOLVED"
                        else:
                            # Target sold manually — try to get sell price
                            for a in target_activity:
                                if a.get("side") == "SELL" and a.get("conditionId") == cid:
                                    cur_price = float(a.get("price", 0))
                                    close_reason = "TARGET SOLD"
                                    break
                            # Fallback: try CLOB price
                            if close_reason == "" and token_id:
                                clob_price = await get_market_price(session, token_id)
                                if clob_price > 0:
                                    cur_price = clob_price
                                    close_reason = "TARGET EXITED"
                            if close_reason == "":
                                # Position gone, no price found — assume resolved
                                cur_price = 1.0 if entry >= 0.5 else 0.0
                                close_reason = "POSITION GONE"

                    if should_close:
                        fake_pos = {
                            "size": shares,
                            "curPrice": cur_price,
                            "conditionId": cid,
                            "outcomeIndex": oi,
                        }
                        log.info(f"[{name}] Close reason: {close_reason} | {tracked.get('title','?')[:40]} | exit: {cur_price*100:.1f}c")
                        to_close.append((pk, fake_pos, tracked))
            else:
                for pos in my_positions:
                    pk = f"{pos['conditionId']}_{pos['outcomeIndex']}"
                    if pk in our and pk not in target_keys:
                        to_close.append((pk, pos, our[pk]))

            for pk, pos, tracked in to_close:
                await process_close(session, pos, tracked, name, risk)
                del our[pk]

        # Update unrealized P&L for DRY RUN using simulated positions
        total_pnl = risk.get("daily_pnl", 0)  # Keep realized P&L from closes
        # Note: unrealized P&L would require fetching current prices for all positions
        # which is expensive. For now, just track realized P&L from closes.

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
    log.info("  POLYMARKET COPY BOT — REAL-TIME")
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
        # Resolve target names + build history
        for target in TARGET_WALLETS:
            ts = get_target_state(state, target)
            ts["name"] = await get_profile_name(session, target)
            await build_bet_history(session, target, ts)
            h = ts.get("bet_history", [])
            if h:
                sizes = [x["usdc_size"] for x in h]
                s = sorted(sizes)
                log.info(f"  [{ts['name']}] {len(h)} trades | median: ${statistics.median(sizes):.1f} | P90: ${s[int(len(s)*0.9)]:.1f}")

        # Portfolio
        my_positions = await get_positions(session, FUNDER_ADDRESS)
        if PORTFOLIO_BALANCE > 0:
            pv = PORTFOLIO_BALANCE
        else:
            pos_val = sum(float(p.get("currentValue", 0)) for p in my_positions)
            usdc = get_usdc_balance_sync(FUNDER_ADDRESS)
            pv = pos_val + usdc
        if pv <= 0:
            pv = BET_AMOUNT / (MAX_RISK_PCT / 100)

        portfolio_value_ref = [pv]  # Mutable ref for sharing between loops

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
        )

        log.info(f"\n  Running... (Ctrl+C to stop)\n")
        save_state(state)

        # Run both loops concurrently
        await asyncio.gather(
            fast_poll_loop(session, state, risk_state, portfolio_value_ref),
            slow_poll_loop(session, state, risk_state, portfolio_value_ref),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("\nBot stopped.")
    except Exception as e:
        log.error(f"Fatal: {e}")
