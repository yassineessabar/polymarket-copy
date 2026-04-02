# Polymarket Copy Trading Bot

## What This Bot Does

This is a **copy trading bot for Polymarket** (a prediction market on Polygon). It watches one or more "whale" wallets and automatically mirrors their bets with intelligent position sizing, risk management, and P&L tracking.

**In plain English:** You pick smart traders on Polymarket, the bot watches them 24/7, and when they buy or sell a prediction, the bot does the same with your money — scaled by how confident the trade looks.

## Architecture

```
TARGET WALLETS (whale traders)
    │
    │  polled every 5s via Polymarket Data API
    ▼
┌──────────────────────────────────────────────┐
│         polymarket_copy_bot.py                │
│                                              │
│  FAST LOOP (5s) ─── detect new trades        │
│    ├── fetch /activity for each target        │
│    ├── deduplicate (trade IDs in state)       │
│    ├── run risk engine                        │
│    ├── calculate confidence & bet size        │
│    └── execute BUY/SELL via CLOB              │
│                                              │
│  SLOW LOOP (30s) ─── detect position closes   │
│    ├── fetch /positions for target + self     │
│    ├── compare: target exited? resolved?      │
│    ├── calculate P&L                          │
│    └── execute SELL or mark closed            │
│                                              │
│  STATE ─── .bot_state.json (atomic writes)    │
│  ALERTS ── Telegram notifications             │
└──────────────────────────────────────────────┘
    │
    │  orders placed via py_clob_client (Polygon chain)
    ▼
POLYMARKET CLOB (on-chain order book)
```

## Two Main Loops

### Fast Poll Loop (every 5 seconds)
**Purpose:** Detect new trades from target wallets as quickly as possible.

1. Calls `GET /activity?user={target}&limit=100` for each target wallet
2. Filters for `type=TRADE` entries not yet in `processed_trades`
3. For **BUY** trades:
   - Runs the full risk engine (see below)
   - Calculates confidence score based on the target's historical bet sizes
   - Sizes the bet proportionally
   - Executes via CLOB `MarketOrder(FOK)` — Fill-or-Kill market order
   - Supports **ADD** to existing positions (weighted average entry price)
4. For **SELL** trades:
   - Calculates what fraction of the target's position was sold
   - Sells the same fraction of our position proportionally
   - Tracks P&L per trade

### Slow Poll Loop (every 30 seconds)
**Purpose:** Detect when target wallets exit positions or markets resolve.

1. Calls `GET /positions?user={target}` to get current holdings
2. Compares against our tracked positions — if target no longer holds a position:
   - **Check resolution:** queries gamma-api `/markets` and CLOB for market status
   - **Check activity:** looks for SELL entries in target's recent activity
   - **Determine exit price:** from resolution (1.0/0.0), SELL activity, or CLOB
   - Executes the close and logs P&L
3. Also refreshes portfolio value every ~5 minutes (position values + USDC balance)

## Confidence Scoring System

The bot doesn't bet the same amount on every trade. It scores each trade's **confidence** (0.0 to 1.0) based on how large the target's bet is compared to their historical pattern:

```
Target's bet size vs their history:
  ≤ median          → 0.1 – 0.3  (LOW)   — routine small bet
  median – P75      → 0.3 – 0.5  (MED)   — normal bet
  P75 – P90         → 0.5 – 0.7  (HIGH)  — above-average conviction
  P90 – P95         → 0.7 – 0.9  (HIGH)  — strong conviction
  > P95             → 0.9 – 1.0  (MAX)   — whale-sized, all-in signal
```

The bet amount formula:
```
bet = confidence × max_risk_per_position × drawdown_multiplier × correlation_penalty
```

This means: a whale dropping 10x their usual bet size triggers a MAX confidence copy, while a routine small trade gets a minimal copy.

## Risk Engine

The risk engine has **6 layers of protection**:

| Check | Config Variable | Default | What It Does |
|---|---|---|---|
| **Daily loss halt** | `DAILY_LOSS_LIMIT_PCT` | 15% | Stops ALL trading if daily P&L drops below -15% of portfolio |
| **Drawdown scaling** | `DRAWDOWN_SCALE_START` | 5% | Starts reducing bet sizes after -5% daily loss, linearly to 25% at limit |
| **Max positions** | `MAX_OPEN_POSITIONS` | 20 | Hard cap on total simultaneous positions across all targets |
| **Per-event limit** | `MAX_PER_EVENT` | 2 | Max 2 positions on the same event (prevents over-concentration) |
| **Exposure cap** | `MAX_TOTAL_EXPOSURE_PCT` | 50% | Total $ at risk cannot exceed 50% of portfolio |
| **Correlation penalty** | `CORRELATION_PENALTY` | 0.5 | If multiple targets buy the same market, halves bet for each overlap |

### Drawdown Scaling in Detail
```
Daily P&L:     0%  to -5%    → bet at 100% (normal)
              -5%  to -15%   → linearly scales from 100% down to 25%
              -15%           → HALT all trading for the day
```

## State Management

The bot persists all state to `.bot_state.json` using **atomic writes** (write to temp file, then `os.replace`). This is crash-safe — if the bot dies mid-write, the state file is never corrupted.

State structure:
```json
{
  "0xabc...": {                          // per target wallet (lowercase)
    "name": "SomeWhale",                 // display name from Polymarket profile
    "processed_trades": ["trade_id_1"],  // dedup list (max 2000)
    "our_positions": {
      "conditionId_outcomeIndex": {      // position key
        "title": "Will X happen?",
        "outcome": "Yes",
        "token_id": "0x...",
        "entry_price": 0.65,
        "bet_amount": 5.50,
        "confidence": 0.72,
        "target_usdc_size": 150.0,
        "event_slug": "will-x-happen",
        "copied_at": "2025-01-15T12:00:00"
      }
    },
    "bet_history": [                     // last 200 trades for confidence scoring
      {"trade_id": "...", "usdc_size": 50.0}
    ]
  },
  "_risk": {                             // daily risk tracking (resets at midnight)
    "date": "2025-01-15",
    "daily_pnl": -12.50,
    "daily_bets_placed": 7,
    "daily_amount_wagered": 45.00,
    "halted": false
  }
}
```

## Order Execution

- Uses **`py_clob_client`** (official Polymarket Python SDK)
- All orders are **Fill-or-Kill (FOK) market orders** — they execute immediately at market price or fail entirely
- Connects to Polymarket CLOB at `clob.polymarket.com` on **Polygon (chain ID 137)**
- Uses the wallet's private key + optional funder address for gasless transactions
- Buy/sell calls run in a thread executor (`run_in_executor`) to avoid blocking the async loop

## DNS Fallback

The bot patches `socket.getaddrinfo` to handle DNS failures gracefully. If DNS resolution fails for Polymarket domains, it falls back to hardcoded IPs (`104.18.34.205`). This prevents the bot from dying during temporary DNS outages.

## Telegram Notifications

When configured (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`), the bot sends alerts for:
- **BUY/ADD** — new position copied, with confidence level and bet size
- **SELL** — partial or full sell, with P&L
- **CLOSE** — position closed (target exited or market resolved), with P&L
- **Hourly summary** — portfolio value, daily P&L, position count, exposure %
- **Bot started** — confirmation with target count and mode

## Configuration (.env)

| Variable | Default | Description |
|---|---|---|
| `PRIVATE_KEY` | — | Your wallet private key (Polygon) |
| `FUNDER_ADDRESS` | — | Your wallet address (for gasless txns) |
| `SIGNATURE_TYPE` | 0 | Polymarket signature type (0 = EOA) |
| `TARGET_WALLETS` | — | Comma-separated whale addresses to copy |
| `FAST_POLL_INTERVAL` | 5 | Seconds between trade detection polls |
| `SLOW_POLL_INTERVAL` | 30 | Seconds between close detection polls |
| `MAX_RISK_PCT` | 10.0 | Max % of portfolio per single position |
| `MIN_BET` | 1.0 | Minimum bet size in USDC |
| `MAX_OPEN_POSITIONS` | 20 | Max simultaneous positions |
| `MAX_PER_EVENT` | 2 | Max positions per event |
| `MAX_TOTAL_EXPOSURE_PCT` | 50.0 | Max total $ exposure as % of portfolio |
| `DAILY_LOSS_LIMIT_PCT` | 15.0 | Daily loss % that halts trading |
| `DRAWDOWN_SCALE_START` | 5.0 | Daily loss % where bet scaling begins |
| `CORRELATION_PENALTY` | 0.5 | Multiplier per overlapping target on same market |
| `PORTFOLIO_BALANCE` | 0 | Manual portfolio value (0 = auto-detect from chain) |
| `BET_AMOUNT` | 2.0 | Fallback bet amount if portfolio unknown |
| `DRY_RUN` | True | If true, logs trades but doesn't execute |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token for alerts |
| `TELEGRAM_CHAT_ID` | — | Telegram chat ID for alerts |

## APIs Used

| API | Base URL | Purpose |
|---|---|---|
| **Data API** | `data-api.polymarket.com` | Positions, activity history |
| **CLOB API** | `clob.polymarket.com` | Prices, order placement |
| **Gamma API** | `gamma-api.polymarket.com` | Profiles, market resolution status |
| **Polygon RPC** | `polygon-rpc.com` | USDC balance check (on-chain) |
| **Telegram API** | `api.telegram.org` | Alert notifications |

## Market Resolution Detection

When checking if a market has resolved (to close positions correctly), the bot uses a **3-method cascade**:

1. **Gamma `/markets`** — checks `resolved`, `closed`, `active`, `winner`, `payoutNumerators`, `outcomePrices`
2. **CLOB price** — if no orderbook exists, market has likely ended
3. **Gamma `/events`** — fallback check via event slug

If all methods fail (API error), the bot **does NOT close** — it waits and retries next cycle. This prevents false closes from temporary API outages.

## Running the Bot

```bash
# Install dependencies
pip install aiohttp requests python-dotenv py-clob-client

# Configure .env (see above)

# Dry run (safe — no real trades)
DRY_RUN=True python polymarket_copy_bot.py

# Live trading
DRY_RUN=False python polymarket_copy_bot.py
```

## File Structure

```
polymarket-copy/
├── polymarket_copy_bot.py   ← the bot (single file, ~900 lines)
├── .env                     ← configuration (private keys, targets, risk params)
├── .bot_state.json          ← persisted state (auto-created, crash-safe)
├── bot.log                  ← log file (auto-created)
└── CLAUDE.md                ← this file
```
