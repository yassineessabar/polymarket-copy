"""
CopyTradeManager — per-user copy trading background tasks.
Refactored from polymarket_copy_bot.py fast_poll_loop + slow_poll_loop.
"""
import asyncio
import logging
from datetime import datetime

import aiohttp

from .database import Database
from .wallet import decrypt_key, get_usdc_balance
from .trading import get_user_clob_client, place_buy, place_sell, calculate_fee
from .risk_engine import risk_check, calculate_confidence
from .api_helpers import (
    get_positions, get_recent_activity, get_market_price,
    get_profile_name, check_condition_resolved, make_trade_id,
)
from .config import FEE_RATE
from .fees import distribute_referral_rewards

log = logging.getLogger("polygun")

FAST_INTERVAL = 5   # seconds
SLOW_INTERVAL = 10  # seconds


class CopyTradeManager:
    def __init__(self, db: Database, bot):
        self.db = db
        self.bot = bot  # telegram.Bot for sending notifications
        self.tasks: dict[int, asyncio.Task] = {}
        self._target_portfolio_cache: dict[str, float] = {}

    async def start_user(self, telegram_id: int):
        if telegram_id in self.tasks and not self.tasks[telegram_id].done():
            return
        task = asyncio.create_task(self._run_user(telegram_id))
        self.tasks[telegram_id] = task
        log.info(f"[CopyEngine] Started for user {telegram_id}")

    async def stop_user(self, telegram_id: int):
        task = self.tasks.pop(telegram_id, None)
        if task and not task.done():
            task.cancel()
            log.info(f"[CopyEngine] Stopped for user {telegram_id}")

    async def stop_all(self):
        for tid in list(self.tasks):
            await self.stop_user(tid)

    def get_target_portfolio(self, target: str) -> float:
        return self._target_portfolio_cache.get(target.lower(), 0)

    async def _notify(self, telegram_id: int, text: str):
        """Send Telegram notification to user."""
        try:
            await self.bot.send_message(
                chat_id=telegram_id, text=text,
                parse_mode="HTML", disable_web_page_preview=True)
        except Exception as e:
            log.error(f"[Notify] Failed for {telegram_id}: {e}")

    async def _run_user(self, telegram_id: int):
        """Main loop for a single user's copy trading."""
        try:
            user = await self.db.get_user(telegram_id)
            if not user or not user.get("private_key_enc"):
                log.error(f"[CopyEngine] User {telegram_id} has no wallet")
                return

            settings = await self.db.get_settings(telegram_id)
            dry_run = settings.get("dry_run", 1)
            private_key = decrypt_key(user["private_key_enc"])
            wallet = user["wallet_address"]

            await self._notify(telegram_id,
                f"🤖 <b>Copy Trading Started</b>\n"
                f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")

            cycle = 0
            async with aiohttp.ClientSession() as session:
                while True:
                    cycle += 1
                    try:
                        # Reload settings periodically
                        if cycle % 30 == 1:
                            settings = await self.db.get_settings(telegram_id)
                            dry_run = settings.get("dry_run", 1)

                        targets = await self.db.get_targets(telegram_id)
                        if not targets:
                            await asyncio.sleep(FAST_INTERVAL)
                            continue

                        # Get portfolio value
                        try:
                            usdc_balance = get_usdc_balance(wallet)
                        except Exception:
                            usdc_balance = 0.0
                        open_pos = await self.db.get_open_positions(telegram_id)
                        pos_value = sum(p.get("bet_amount", 0) for p in open_pos)
                        portfolio_value = usdc_balance + pos_value
                        if portfolio_value <= 0:
                            portfolio_value = settings.get("quickbuy_amount", 25.0) * 10

                        risk = await self.db.get_daily_risk(telegram_id)

                        # ── FAST POLL: detect new trades ──
                        for target_info in targets:
                            target = target_info["wallet_addr"]
                            try:
                                activity = await get_recent_activity(session, target, limit=100)
                            except Exception:
                                continue

                            # Cache target portfolio
                            try:
                                tgt_pos = await get_positions(session, target)
                                tpv = sum(float(p.get("currentValue", 0)) for p in tgt_pos)
                                if tpv > 0:
                                    self._target_portfolio_cache[target.lower()] = tpv
                            except Exception:
                                pass

                            for a in activity:
                                if a.get("type") != "TRADE":
                                    continue
                                tid = make_trade_id(a)
                                if await self.db.is_trade_processed(telegram_id, target, tid):
                                    continue

                                side = a.get("side", "")
                                if side == "BUY":
                                    await self._process_buy(
                                        session, telegram_id, a, target, settings,
                                        portfolio_value, risk, dry_run, private_key, wallet)
                                elif side == "SELL":
                                    await self._process_sell(
                                        session, telegram_id, a, target, risk, dry_run,
                                        private_key, wallet)

                                await self.db.mark_trade_processed(telegram_id, target, tid)

                        # ── SLOW POLL: detect closes (every 2 fast cycles = ~10s) ──
                        if cycle % 2 == 0:
                            await self._check_closes(
                                session, telegram_id, targets, settings,
                                risk, dry_run, private_key, wallet)

                    except asyncio.CancelledError:
                        raise
                    except Exception as e:
                        log.error(f"[CopyEngine] User {telegram_id} cycle error: {e}")

                    await asyncio.sleep(FAST_INTERVAL)

        except asyncio.CancelledError:
            log.info(f"[CopyEngine] User {telegram_id} cancelled")
        except Exception as e:
            log.error(f"[CopyEngine] User {telegram_id} fatal: {e}")
            await self._notify(telegram_id, f"❌ Copy trading error: {e}")

    async def _process_buy(self, session, telegram_id, activity, target,
                           settings, portfolio_value, risk, dry_run, private_key, wallet):
        """Process a BUY trade from target — mirror it."""
        title = activity.get("title", "?")[:50]
        outcome = activity.get("outcome", "?")
        usdc_size = float(activity.get("usdcSize", 0) or 0)
        if usdc_size <= 0:
            usdc_size = float(activity.get("size", 0)) * float(activity.get("price", 0))
        price = float(activity.get("price", 0))
        if price <= 0:
            return

        token_id = activity.get("asset", "")
        cid = activity.get("conditionId", "")
        oi = activity.get("outcomeIndex", 0)
        slug = activity.get("eventSlug", "")

        # Count existing positions for risk check
        open_pos = await self.db.get_open_positions(telegram_id)
        total_exp = sum(p.get("bet_amount", 0) for p in open_pos)
        event_count = sum(1 for p in open_pos if p.get("event_slug") == slug)
        target_portfolio = self.get_target_portfolio(target)

        # Get bet history for confidence scoring
        bet_history = await self.db.get_bet_history(target)

        bet, conf, reject = risk_check(
            usdc_size=usdc_size,
            target_portfolio=target_portfolio,
            portfolio_value=portfolio_value,
            daily_pnl=risk.get("daily_pnl", 0),
            open_positions=len(open_pos),
            event_count=event_count,
            total_exposure=total_exp,
            bet_history=bet_history,
            settings=settings,
            halted=bool(risk.get("halted", 0)),
        )

        if reject:
            log.info(f"[Copy:{telegram_id}] BLOCKED {title} | {reject}")
            return

        # Apply fee
        net_bet, fee = calculate_fee(bet)

        cl = "LOW" if conf < 0.3 else "MED" if conf < 0.6 else "HIGH" if conf < 0.85 else "MAX"
        target_pct = (usdc_size / target_portfolio * 100) if target_portfolio > 0 else 0

        log.info(f"[Copy:{telegram_id}] BUY {title} | ${bet:.2f} ({target_pct:.1f}%)")

        # Execute
        if not dry_run:
            try:
                client = get_user_clob_client(telegram_id, private_key, wallet)
                await asyncio.get_event_loop().run_in_executor(
                    None, place_buy, client, token_id, net_bet)
            except Exception as e:
                log.error(f"[Copy:{telegram_id}] Buy failed: {e}")
                return

        # Record position
        pos_id = await self.db.open_position(
            telegram_id=telegram_id, target_wallet=target,
            condition_id=cid, outcome_index=oi, token_id=token_id,
            title=title, outcome=outcome, entry_price=price,
            bet_amount=bet, target_usdc_size=usdc_size, event_slug=slug)

        # Record trade + fee + referral
        trade_id = await self.db.record_trade(
            telegram_id=telegram_id, position_id=pos_id, side="BUY",
            token_id=token_id, amount=bet, price=price, fee=fee,
            is_copy=True, source_wallet=target, dry_run=bool(dry_run))

        if fee > 0 and not dry_run:
            try:
                await distribute_referral_rewards(self.db, telegram_id, trade_id, fee)
            except Exception as e:
                log.error(f"[Copy:{telegram_id}] Referral reward failed: {e}")

        # Record bet history for confidence scoring
        tid = make_trade_id(activity)
        await self.db.add_bet_history(target, tid, usdc_size)

        # Update daily risk
        await self.db.update_daily_risk(
            telegram_id,
            daily_bets_placed=risk.get("daily_bets_placed", 0) + 1,
            daily_amount_wagered=risk.get("daily_amount_wagered", 0) + bet,
            trades_copied=risk.get("trades_copied", 0) + 1)

        # Notify
        mode_tag = " [DRY]" if dry_run else ""
        rpnl = risk.get("daily_pnl", 0)
        await self._notify(telegram_id,
            f"<b>BUY{mode_tag}</b>\n"
            f"{title}\n"
            f"{outcome} @ {price*100:.1f}c\n"
            f"Target: ${usdc_size:.1f} | Conf: {conf:.0%} ({cl})\n"
            f"<b>Bet: ${bet:.2f}</b> (fee: ${fee:.2f})\n\n"
            f"📊 P&L: ${rpnl:+.2f} | Pos: {len(open_pos)+1}")

    async def _process_sell(self, session, telegram_id, activity, target,
                            risk, dry_run, private_key, wallet):
        """Process a SELL trade from target — mirror proportionally."""
        cid = activity.get("conditionId", "")
        oi = activity.get("outcomeIndex", 0)
        sell_price = float(activity.get("price", 0))
        sell_size = float(activity.get("size", 0))

        if sell_price <= 0:
            return

        # Find our matching position
        open_pos = await self.db.get_open_positions(telegram_id)
        our_pos = None
        for p in open_pos:
            if p.get("condition_id") == cid and p.get("outcome_index") == oi:
                our_pos = p
                break

        if not our_pos:
            return

        entry = our_pos.get("entry_price", 0)
        our_bet = our_pos.get("bet_amount", 0)
        target_orig = our_pos.get("target_usdc_size", 0)

        # Proportional sell
        sell_usdc = sell_size * sell_price
        sell_frac = min(sell_usdc / target_orig, 1.0) if target_orig > 0 else 1.0
        close_bet = our_bet * sell_frac
        shares = (our_bet / entry) * sell_frac if entry > 0 else 0
        pnl_usd = shares * (sell_price - entry)

        # Execute
        if not dry_run:
            try:
                client = get_user_clob_client(telegram_id, private_key, wallet)
                sell_amt = shares * sell_price
                await asyncio.get_event_loop().run_in_executor(
                    None, place_sell, client, our_pos.get("token_id", ""), sell_amt)
            except Exception as e:
                log.error(f"[Copy:{telegram_id}] Sell failed: {e}")

        # Update position
        new_bet = our_bet - close_bet
        if new_bet <= 0.01:
            await self.db.close_position(our_pos["id"], sell_price, pnl_usd, "TARGET SOLD")
        else:
            await self.db.update_position(our_pos["id"],
                bet_amount=new_bet,
                target_usdc_size=max(0, target_orig - sell_usdc))

        # Update daily risk P&L (atomic increment)
        await self.db.increment_daily_pnl(telegram_id, pnl_usd)

        # Notify
        mode_tag = " [DRY]" if dry_run else ""
        result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
        pnl_pct = ((sell_price - entry) / entry * 100) if entry > 0 else 0
        await self._notify(telegram_id,
            f"<b>SELL{mode_tag}</b> {result}\n"
            f"{our_pos.get('title', '?')[:50]}\n"
            f"Sold {sell_frac*100:.0f}% @ {sell_price*100:.1f}c\n"
            f"P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})")

    async def _check_closes(self, session, telegram_id, targets, settings,
                            risk, dry_run, private_key, wallet):
        """Check if target exited positions — close ours."""
        open_pos = await self.db.get_open_positions(telegram_id)
        if not open_pos:
            return

        for target_info in targets:
            target = target_info["wallet_addr"]
            try:
                target_positions = await get_positions(session, target)
            except Exception:
                continue

            target_keys = {f"{p['conditionId']}_{p['outcomeIndex']}" for p in target_positions}

            for pos in open_pos:
                if pos.get("target_wallet", "").lower() != target.lower():
                    continue
                pk = f"{pos['condition_id']}_{pos['outcome_index']}"
                if pk in target_keys:
                    continue  # Target still holds

                # Target exited — find exit price
                entry = pos.get("entry_price", 0)
                token_id = pos.get("token_id", "")
                cid = pos["condition_id"]
                oi = str(pos["outcome_index"])
                cur_price = 0.0
                close_reason = ""

                # Step 1: Check resolution
                resolution = await check_condition_resolved(session, cid, token_id, oi)
                if resolution.get("resolved"):
                    wi = resolution.get("winning_index")
                    if wi is not None and str(wi) == oi:
                        cur_price = 1.0
                        close_reason = "RESOLVED WON"
                    elif wi is not None:
                        cur_price = 0.0
                        close_reason = "RESOLVED LOST"
                    else:
                        if token_id:
                            cur_price = await get_market_price(session, token_id)
                        if cur_price <= 0:
                            continue  # No real price — retry
                        close_reason = "RESOLVED (CLOB)"

                # Step 2: Try target activity for sell price
                if not close_reason:
                    try:
                        activity = await get_recent_activity(session, target, limit=50)
                        for a in activity:
                            if (a.get("side") == "SELL" and a.get("conditionId") == cid
                                    and str(a.get("outcomeIndex", -1)) == oi):
                                p = float(a.get("price", 0))
                                if p > 0:
                                    cur_price = p
                                    close_reason = "TARGET SOLD"
                                break
                    except Exception:
                        pass

                # Step 3: CLOB price
                if not close_reason and token_id:
                    clob = await get_market_price(session, token_id)
                    if clob > 0:
                        cur_price = clob
                        close_reason = "TARGET EXITED"

                # No real price — skip
                if not close_reason:
                    continue

                # Calculate P&L
                bet_amt = pos.get("bet_amount", 0)
                shares = bet_amt / entry if entry > 0 else 0
                pnl_usd = shares * (cur_price - entry)
                pnl_pct = ((cur_price - entry) / entry * 100) if entry > 0 else 0

                # Execute sell
                if not dry_run and token_id:
                    try:
                        client = get_user_clob_client(telegram_id, private_key, wallet)
                        sell_amt = shares * cur_price
                        await asyncio.get_event_loop().run_in_executor(
                            None, place_sell, client, token_id, sell_amt)
                    except Exception as e:
                        log.error(f"[Copy:{telegram_id}] Close sell failed: {e}")

                # Close in DB
                await self.db.close_position(pos["id"], cur_price, pnl_usd, close_reason)

                # Update daily P&L (atomic increment)
                await self.db.increment_daily_pnl(telegram_id, pnl_usd)

                # Notify
                mode_tag = " [DRY]" if dry_run else ""
                result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
                await self._notify(telegram_id,
                    f"<b>CLOSE{mode_tag}</b> {result}\n"
                    f"{pos.get('title', '?')[:50]} — {pos.get('outcome', '?')}\n"
                    f"Reason: {close_reason}\n"
                    f"Entry: {entry*100:.1f}c → Exit: {cur_price*100:.1f}c\n"
                    f"Bet: ${bet_amt:.2f} | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f})")
