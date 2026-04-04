"""
Performance fee collection — 25% of realized profit on winning positions.
Deducts fee from trade proceeds and transfers USDC to FEE_WALLET.
"""
import logging
from .config import PERFORMANCE_FEE_RATE, FEE_WALLET

log = logging.getLogger("polyx")


async def collect_performance_fee(db, telegram_id: int, position_id: int,
                                   pnl_usd: float, demo_mode: bool = False,
                                   private_key: str = "") -> float:
    """Collect 25% performance fee on profitable live closes.

    Returns the fee amount collected (0 if not applicable).
    Transfers USDC from user wallet to FEE_WALLET on-chain.
    """
    if demo_mode or pnl_usd <= 0:
        return 0.0

    fee = round(pnl_usd * PERFORMANCE_FEE_RATE, 2)
    if fee < 0.01:
        return 0.0

    # Transfer USDC to fee wallet on-chain
    tx_hash = None
    if private_key and FEE_WALLET:
        import asyncio
        from .wallet import transfer_usdc
        try:
            tx_hash = await asyncio.get_event_loop().run_in_executor(
                None, transfer_usdc, private_key, FEE_WALLET, fee)
            if tx_hash:
                log.info(f"[PerfFee:{telegram_id}] ${fee:.2f} sent to {FEE_WALLET[:10]}... tx={tx_hash[:16]}...")
            else:
                log.warning(f"[PerfFee:{telegram_id}] Transfer failed for ${fee:.2f} — will retry later")
        except Exception as e:
            log.error(f"[PerfFee:{telegram_id}] Transfer error: {e}")

    await db.record_performance_fee(telegram_id, position_id, pnl_usd, fee, demo=False)
    log.info(f"[PerfFee:{telegram_id}] pos={position_id} profit=${pnl_usd:.2f} fee=${fee:.2f}")

    return fee
