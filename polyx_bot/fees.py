"""
Fee collection and referral reward calculation.
"""
import aiosqlite
from .config import FEE_RATE

# Referral tier rates
TIER1_RATE = 0.25  # 25% of fee
TIER2_RATE = 0.05  # 5% of fee
TIER3_RATE = 0.03  # 3% of fee


def calculate_trade_fee(amount: float) -> tuple[float, float]:
    """Returns (net_amount_for_market, fee_amount)."""
    fee = round(amount * FEE_RATE, 6)
    return amount - fee, fee


async def distribute_referral_rewards(db, telegram_id: int, trade_id: int, fee: float):
    """Distribute referral rewards up 3 tiers."""
    if fee <= 0:
        return

    user = await db.get_user(telegram_id)
    if not user or not user.get("referred_by"):
        return

    referrer_id = user["referred_by"]
    async with aiosqlite.connect(db.path) as conn:
        # Tier 1: direct referrer gets 25%
        reward1 = round(fee * TIER1_RATE, 6)
        if reward1 > 0:
            await conn.execute(
                "INSERT INTO referral_rewards (referrer_id, referee_id, trade_id, tier, reward_usdc) "
                "VALUES (?,?,?,1,?)", (referrer_id, telegram_id, trade_id, reward1))

        # Tier 2: referrer's referrer gets 5%
        referrer2 = await db.get_user(referrer_id)
        if referrer2 and referrer2.get("referred_by"):
            t2_id = referrer2["referred_by"]
            reward2 = round(fee * TIER2_RATE, 6)
            if reward2 > 0:
                await conn.execute(
                    "INSERT INTO referral_rewards (referrer_id, referee_id, trade_id, tier, reward_usdc) "
                    "VALUES (?,?,?,2,?)", (t2_id, telegram_id, trade_id, reward2))

                # Tier 3: 3 levels up gets 3%
                referrer3 = await db.get_user(t2_id)
                if referrer3 and referrer3.get("referred_by"):
                    reward3 = round(fee * TIER3_RATE, 6)
                    if reward3 > 0:
                        await conn.execute(
                            "INSERT INTO referral_rewards (referrer_id, referee_id, trade_id, tier, reward_usdc) "
                            "VALUES (?,?,?,3,?)", (referrer3["referred_by"], telegram_id, trade_id, reward3))

        await conn.commit()
