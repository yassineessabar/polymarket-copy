"""
Performance fee collection — 25% of realized profit on winning positions.
"""
import logging
from .config import PERFORMANCE_FEE_RATE

log = logging.getLogger("polyx")


async def collect_performance_fee(db, telegram_id: int, position_id: int,
                                   pnl_usd: float, demo_mode: bool = False) -> float:
    """Collect 25% performance fee on profitable closes.

    Returns the fee amount collected (0 if position was not profitable).
    Only charges on realized profit > 0. Demo mode tracks but doesn't collect.
    """
    if demo_mode or pnl_usd <= 0:
        return 0.0

    fee = round(pnl_usd * PERFORMANCE_FEE_RATE, 2)
    if fee < 0.01:
        return 0.0

    await db.record_performance_fee(telegram_id, position_id, pnl_usd, fee, demo=False)
    log.info(f"[PerfFee:{telegram_id}] pos={position_id} profit=${pnl_usd:.2f} fee=${fee:.2f}")

    return fee
