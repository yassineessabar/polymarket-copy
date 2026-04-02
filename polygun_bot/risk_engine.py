"""
Per-user risk engine — refactored from polymarket_copy_bot.py.
All checks read from database instead of global state.
"""
import statistics
import logging

log = logging.getLogger("polygun")


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


def drawdown_mult(daily_pnl: float, portfolio_value: float,
                  drawdown_start: float, loss_limit: float) -> float:
    if portfolio_value <= 0:
        return 1.0
    if daily_pnl >= 0:
        return 1.0
    loss = abs(daily_pnl) / portfolio_value * 100
    if loss < drawdown_start:
        return 1.0
    if loss >= loss_limit:
        return 0.0
    rng = loss_limit - drawdown_start
    return max(0.25, 1.0 - 0.75 * ((loss - drawdown_start) / rng)) if rng > 0 else 0.25


def risk_check(
    usdc_size: float,
    target_portfolio: float,
    portfolio_value: float,
    daily_pnl: float,
    open_positions: int,
    event_count: int,
    total_exposure: float,
    bet_history: list,
    settings: dict,
    halted: bool = False,
) -> tuple[float, float, str | None]:
    """
    Returns (bet_amount, confidence, reject_reason_or_None).
    Pure function — all state passed in, no global access.
    """
    max_risk_pct = settings.get("max_risk_pct", 10.0)
    min_bet = settings.get("min_bet", 1.0)
    max_positions = settings.get("max_open_positions", 20)
    max_per_event = settings.get("max_per_event", 2)
    max_exposure_pct = settings.get("max_exposure_pct", 50.0)
    loss_limit = settings.get("daily_loss_limit_pct", 15.0)
    drawdown_start = settings.get("drawdown_scale_start", 5.0)

    if halted:
        return 0, 0, "DAILY LOSS LIMIT — halted"

    dd = drawdown_mult(daily_pnl, portfolio_value, drawdown_start, loss_limit)
    if dd <= 0:
        return 0, 0, f"DAILY LOSS {loss_limit}% — halting"

    if open_positions >= max_positions:
        return 0, 0, f"MAX POSITIONS ({max_positions})"

    if event_count >= max_per_event:
        return 0, 0, f"EVENT LIMIT ({max_per_event})"

    max_exp = (max_exposure_pct / 100) * portfolio_value
    budget = max_exp - total_exposure
    if budget < min_bet:
        return 0, 0, f"EXPOSURE CAP (${total_exposure:.0f}/${max_exp:.0f})"

    conf = calculate_confidence(usdc_size, bet_history)
    max_bet = (max_risk_pct / 100) * portfolio_value if portfolio_value > 0 else settings.get("quickbuy_amount", 2.0)

    # Proportional mimic: bet same % of our portfolio as target bets of theirs
    if target_portfolio > 0:
        target_pct = usdc_size / target_portfolio
        bet = target_pct * portfolio_value * dd
    else:
        bet = settings.get("quickbuy_amount", 2.0) * dd

    bet = round(min(bet, budget, max_bet), 2)
    if bet < min_bet:
        return 0, 0, f"BET TOO SMALL (${bet:.2f})"

    return bet, conf, None
