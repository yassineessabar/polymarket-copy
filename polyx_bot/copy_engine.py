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
from .trading import get_user_clob_client, place_buy, place_sell
from .risk_engine import risk_check, calculate_confidence
from .api_helpers import (
    get_positions, get_recent_activity, get_market_price,
    get_profile_name, check_condition_resolved, make_trade_id,
)
from .fees import collect_performance_fee

log = logging.getLogger("polyx")

FAST_INTERVAL = 5   # seconds
SLOW_INTERVAL = 10  # seconds


class CopyTradeManager:
    def __init__(self, db: Database, bot):
        self.db = db
        self.bot = bot  # telegram.Bot for sending notifications
        self.tasks: dict[int, asyncio.Task] = {}
        self._target_portfolio_cache: dict[str, float] = {}
        # NotificationWriter for web users (negative telegram_ids)
        from .worker import NotificationWriter
        self._web_notifier = NotificationWriter(db)

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
        """Send notification — Telegram for real users, DB for web users."""
        try:
            # Web users have negative telegram_ids — write to DB instead of Telegram
            if telegram_id < 0:
                await self._web_notifier.send_message(chat_id=telegram_id, text=text)
                return

            # Telegram users: delete old menu, send notification, re-send menu
            settings = await self.db.get_settings(telegram_id)
            old_menu_id = settings.get("last_menu_msg_id") if settings else None
            if old_menu_id:
                try:
                    await self.bot.delete_message(chat_id=telegram_id, message_id=old_menu_id)
                except Exception:
                    pass

            # Send the notification
            await self.bot.send_message(
                chat_id=telegram_id, text=text,
                parse_mode="HTML", disable_web_page_preview=True)

            # Re-send the home menu at the bottom
            from .keyboards import home_keyboard
            from .wallet import get_usdc_balance

            demo_mode = bool(settings and settings.get("demo_mode", 0))
            stats = await self.db.get_portfolio_stats(telegram_id)
            positions_val = stats["positions_value"]
            open_count = stats.get("position_count", 0)

            if demo_mode:
                balance = settings.get("demo_balance", 0)
            else:
                user = await self.db.get_user(telegram_id)
                balance = get_usdc_balance(user["wallet_address"]) if user and user.get("wallet_address") else 0.0

            net_worth = balance + positions_val
            mode_badge = f"<b>🎮 DEMO MODE</b>\n" if demo_mode else ""

            targets = await self.db.get_targets(telegram_id)
            if targets:
                copy_section = "\n🎯 <b>Copying:</b>\n"
                for t in targets:
                    name = t.get("display_name") or t["wallet_addr"][:10] + "..."
                    copy_section += f"  • {name}\n"
            else:
                copy_section = "\n🎯 No traders copied yet — tap Copy Trade to start!\n"

            menu_text = (
                f"Welcome to PolyX 🏠\n{mode_badge}"
                f"Your secure companion for rapid Polymarket trades.\n\n"
                f"📊 Current Positions: ${positions_val:.2f} ({open_count} open)\n"
                f"💰 Available Balance: ${balance:,.2f}\n"
                f"💎 Total Net Worth: ${net_worth:,.2f}\n"
                f"{copy_section}\n"
                f"Copy top traders, snipe odds, and trade like a pro."
            )
            menu_msg = await self.bot.send_message(
                chat_id=telegram_id, text=menu_text,
                parse_mode="HTML", reply_markup=home_keyboard(),
                disable_web_page_preview=True)
            await self.db.update_setting(telegram_id, "last_menu_msg_id", menu_msg.message_id)

        except Exception as e:
            log.error(f"[Notify] Failed for {telegram_id}: {e}")

    async def _run_user(self, telegram_id: int):
        """Main loop for a single user's copy trading."""
        try:
            user = await self.db.get_user(telegram_id)
            settings = await self.db.get_settings(telegram_id)
            demo_mode = settings.get("demo_mode", 0)
            demo_balance = settings.get("demo_balance", 0)
            dry_run = settings.get("dry_run", 1)

            if not demo_mode and (not user or not user.get("private_key_enc")):
                log.error(f"[CopyEngine] User {telegram_id} has no wallet")
                return

            if demo_mode:
                private_key = ""
                wallet = user.get("wallet_address", "") if user else ""
            else:
                private_key = decrypt_key(user["private_key_enc"])
                wallet = user["wallet_address"]

            demo_mode = settings.get("demo_mode", 0)
            demo_balance = settings.get("demo_balance", 0)

            if demo_mode:
                mode_label = f"DEMO (${demo_balance:,.2f})"
            elif dry_run:
                mode_label = "DRY RUN"
            else:
                mode_label = "LIVE"

            await self._notify(telegram_id,
                f"<b>Copy Trading Started</b>\n"
                f"Mode: {mode_label}")

            cycle = 0
            api_fail_count = 0
            first_run = True
            async with aiohttp.ClientSession() as session:
                while True:
                    cycle += 1
                    try:
                        # Reload settings periodically
                        if cycle % 30 == 1:
                            settings = await self.db.get_settings(telegram_id)
                            dry_run = settings.get("dry_run", 1)
                            demo_mode = settings.get("demo_mode", 0)
                            demo_balance = settings.get("demo_balance", 0)

                        targets = await self.db.get_targets(telegram_id)
                        if not targets:
                            await asyncio.sleep(FAST_INTERVAL)
                            continue

                        # Get portfolio value
                        open_pos = await self.db.get_open_positions(telegram_id)
                        pos_value = sum(p.get("bet_amount", 0) for p in open_pos)

                        if demo_mode:
                            portfolio_value = demo_balance + pos_value
                        else:
                            try:
                                usdc_balance = get_usdc_balance(wallet)
                            except Exception:
                                usdc_balance = 0.0
                            portfolio_value = usdc_balance + pos_value

                        if portfolio_value <= 0:
                            portfolio_value = settings.get("quickbuy_amount", 25.0) * 10

                        risk = await self.db.get_daily_risk(telegram_id)

                        # ── FAST POLL: detect new trades ──
                        for target_info in targets:
                            target = target_info["wallet_addr"]
                            try:
                                activity = await get_recent_activity(session, target, limit=100)
                                api_fail_count = 0  # reset on success
                            except Exception as e:
                                api_fail_count += 1
                                log.warning(f"[Copy:{telegram_id}] API fail #{api_fail_count} for {target[:10]}: {e}")
                                if api_fail_count == 30:  # ~2.5 min of failures
                                    await self._notify(telegram_id,
                                        "⚠️ <b>Warning:</b> Unable to reach Polymarket API.\n"
                                        "Copy trading is still running but cannot detect new trades.\n"
                                        "Will keep retrying...")
                                continue

                            # Cache target portfolio
                            try:
                                tgt_pos = await get_positions(session, target)
                                tpv = sum(float(p.get("currentValue", 0)) for p in tgt_pos)
                                if tpv > 0:
                                    self._target_portfolio_cache[target.lower()] = tpv
                            except Exception as e:
                                log.warning(f"[Copy:{telegram_id}] get_positions failed for {target[:10]}: {e}")

                            # On first run, mark existing trades as processed (don't copy history)
                            if first_run:
                                trades_in_batch = [a for a in activity if a.get("type") == "TRADE"]
                                for a in trades_in_batch:
                                    tid = make_trade_id(a)
                                    await self.db.mark_trade_processed(telegram_id, target, tid)
                                log.info(f"[Copy:{telegram_id}] First run: marked {len(trades_in_batch)} existing trades for {target[:10]}")
                                continue  # skip to next target, will copy new trades next cycle

                            for a in activity:
                                if a.get("type") != "TRADE":
                                    continue
                                tid = make_trade_id(a)
                                if await self.db.is_trade_processed(telegram_id, target, tid):
                                    continue

                                side = a.get("side", "")
                                log.info(f"[Copy:{telegram_id}] New trade detected: {side} {a.get('title', '?')[:40]}")

                                if side == "BUY":
                                    await self._process_buy(
                                        session, telegram_id, a, target, settings,
                                        portfolio_value, risk, dry_run, private_key, wallet,
                                        demo_mode=demo_mode)
                                elif side == "SELL":
                                    await self._process_sell(
                                        session, telegram_id, a, target, risk, dry_run,
                                        private_key, wallet, demo_mode=demo_mode)

                                await self.db.mark_trade_processed(telegram_id, target, tid)

                        first_run = False

                        # ── SLOW POLL: detect closes (every 2 fast cycles = ~10s) ──
                        if cycle % 2 == 0:
                            await self._check_closes(
                                session, telegram_id, targets, settings,
                                risk, dry_run, private_key, wallet,
                                demo_mode=demo_mode)

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
                           settings, portfolio_value, risk, dry_run, private_key, wallet,
                           demo_mode=False):
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

        # Count how many OTHER targets also have this market (for correlation penalty)
        all_targets = await self.db.get_targets(telegram_id)
        overlap_count = 0
        for t in all_targets:
            if t["wallet_addr"].lower() != target.lower():
                other_pos = await self.db.get_open_positions(telegram_id)
                if any(p.get("condition_id") == cid and p.get("target_wallet", "").lower() == t["wallet_addr"].lower() for p in other_pos):
                    overlap_count += 1

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
            overlapping_targets=overlap_count,
        )

        if reject:
            log.info(f"[Copy:{telegram_id}] BLOCKED {title} | {reject}")
            return

        log.info(f"[Copy:{telegram_id}] SIZING: target_portfolio=${target_portfolio:.0f} "
                 f"our_portfolio=${portfolio_value:.0f} target_bet=${usdc_size:.2f} "
                 f"our_bet=${bet:.2f} conf={conf:.0%}")

        cl = "LOW" if conf < 0.3 else "MED" if conf < 0.6 else "HIGH" if conf < 0.85 else "MAX"
        target_pct = (usdc_size / target_portfolio * 100) if target_portfolio > 0 else 0

        log.info(f"[Copy:{telegram_id}] BUY {title} | ${bet:.2f} ({target_pct:.1f}%)")

        # Execute (skip for demo and dry_run)
        if demo_mode:
            # Deduct from demo balance
            await self.db.adjust_demo_balance(telegram_id, -bet)
        elif not dry_run:
            # Subscription gate — block live buys if subscription inactive
            if not await self.db.is_subscription_active(telegram_id):
                log.info(f"[Copy:{telegram_id}] BLOCKED {title} | No active subscription")
                await self._notify(telegram_id,
                    "Your subscription is inactive. Live trading is paused.\n"
                    "Use /subscribe to reactivate.")
                return
            try:
                client = get_user_clob_client(telegram_id, private_key, wallet)
                await asyncio.get_event_loop().run_in_executor(
                    None, place_buy, client, token_id, bet)
            except Exception as e:
                log.error(f"[Copy:{telegram_id}] Buy failed: {e}")
                return

        # Record position
        source_ts = activity.get("createdAt") or activity.get("timestamp") or None
        pos_id = await self.db.open_position(
            telegram_id=telegram_id, target_wallet=target,
            condition_id=cid, outcome_index=oi, token_id=token_id,
            title=title, outcome=outcome, entry_price=price,
            bet_amount=bet, target_usdc_size=usdc_size, event_slug=slug,
            source_timestamp=source_ts)

        # Record trade
        trade_id = await self.db.record_trade(
            telegram_id=telegram_id, position_id=pos_id, side="BUY",
            token_id=token_id, amount=bet, price=price, fee=0,
            is_copy=True, source_wallet=target, dry_run=bool(dry_run))

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
        if demo_mode:
            mode_tag = " [DEMO]"
        elif dry_run:
            mode_tag = " [DRY]"
        else:
            mode_tag = ""
        rpnl = risk.get("daily_pnl", 0)
        demo_bal_text = ""
        if demo_mode:
            cur_demo = await self.db.get_demo_balance(telegram_id)
            demo_bal_text = f"\n💰 Demo Balance: ${cur_demo:,.2f}"
        await self._notify(telegram_id,
            f"<b>BUY{mode_tag}</b>\n"
            f"{title}\n"
            f"{outcome} @ {price*100:.1f}c\n"
            f"Target: ${usdc_size:.1f} | Conf: {conf:.0%} ({cl})\n"
            f"<b>Bet: ${bet:.2f}</b>\n\n"
            f"📊 P&L: ${rpnl:+.2f} | Pos: {len(open_pos)+1}{demo_bal_text}")

    async def _process_sell(self, session, telegram_id, activity, target,
                            risk, dry_run, private_key, wallet, demo_mode=False):
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

        # Execute (skip for demo and dry_run)
        proceeds = shares * sell_price
        if demo_mode:
            await self.db.adjust_demo_balance(telegram_id, proceeds)
        elif not dry_run:
            try:
                client = get_user_clob_client(telegram_id, private_key, wallet)
                await asyncio.get_event_loop().run_in_executor(
                    None, place_sell, client, our_pos.get("token_id", ""), proceeds)
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

        # Performance fee on profit
        perf_fee = await collect_performance_fee(
            self.db, telegram_id, our_pos["id"], pnl_usd,
            demo_mode=demo_mode, private_key=private_key)

        # Update daily risk P&L (atomic increment)
        await self.db.increment_daily_pnl(telegram_id, pnl_usd)

        # Notify
        if demo_mode:
            mode_tag = " [DEMO]"
        elif dry_run:
            mode_tag = " [DRY]"
        else:
            mode_tag = ""
        result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
        pnl_pct = ((sell_price - entry) / entry * 100) if entry > 0 else 0
        fee_text = f"\n💎 Perf Fee: ${perf_fee:.2f}" if perf_fee > 0 else ""
        demo_bal_text = ""
        if demo_mode:
            cur_demo = await self.db.get_demo_balance(telegram_id)
            demo_bal_text = f"\n💰 Demo Balance: ${cur_demo:,.2f}"
        await self._notify(telegram_id,
            f"<b>SELL{mode_tag}</b> {result}\n"
            f"{our_pos.get('title', '?')[:50]}\n"
            f"Sold {sell_frac*100:.0f}% @ {sell_price*100:.1f}c\n"
            f"P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f}){fee_text}{demo_bal_text}")

    async def _check_closes(self, session, telegram_id, targets, settings,
                            risk, dry_run, private_key, wallet, demo_mode=False):
        """Check if target exited positions — close ours.
        Also monitors positions from removed targets until they resolve."""
        open_pos = await self.db.get_open_positions(telegram_id)
        if not open_pos:
            return

        # Build list of wallets to check: active targets + any wallets with open positions
        active_addrs = {t["wallet_addr"].lower() for t in targets}
        orphan_addrs = {p["target_wallet"].lower() for p in open_pos
                        if p.get("target_wallet", "").lower() not in active_addrs}

        all_targets = list(targets)
        for addr in orphan_addrs:
            all_targets.append({"wallet_addr": addr})

        # Step A: Check ALL open positions for resolution (regardless of target holding)
        # This catches resolved markets where target still shows the position (unclaimed)
        checked_resolved = set()  # pos IDs already closed via resolution
        for pos in open_pos:
            cid = pos["condition_id"]
            oi = str(pos["outcome_index"])
            token_id = pos.get("token_id", "")
            entry = pos.get("entry_price", 0)

            resolution = await check_condition_resolved(session, cid, token_id, oi)
            if not resolution.get("resolved"):
                continue

            wi = resolution.get("winning_index")
            if wi is not None and str(wi) == oi:
                cur_price = 1.0
                close_reason = "RESOLVED WON"
            elif wi is not None:
                cur_price = 0.0
                close_reason = "RESOLVED LOST"
            else:
                # Resolved but winner unknown — try CLOB for residual price
                cur_price = await get_market_price(session, token_id) if token_id else 0.0
                if cur_price <= 0:
                    # Resolved with no price info — likely fully settled, use 0
                    # (if we won, price would be ~1.0; if lost, ~0.0)
                    continue  # retry next cycle when winner is known
                close_reason = "RESOLVED (CLOB)"

            # Close the position
            bet_amt = pos.get("bet_amount", 0)
            shares = bet_amt / entry if entry > 0 else 0
            pnl_usd = shares * (cur_price - entry)
            pnl_pct = ((cur_price - entry) / entry * 100) if entry > 0 else 0

            close_proceeds = shares * cur_price
            if demo_mode:
                await self.db.adjust_demo_balance(telegram_id, close_proceeds)
            elif not dry_run and token_id:
                try:
                    client = get_user_clob_client(telegram_id, private_key, wallet)
                    await asyncio.get_event_loop().run_in_executor(
                        None, place_sell, client, token_id, close_proceeds)
                except Exception as e:
                    log.error(f"[Copy:{telegram_id}] Resolution close sell failed: {e}")

            await self.db.close_position(pos["id"], cur_price, pnl_usd, close_reason)

            # Performance fee on profit
            perf_fee = await collect_performance_fee(
                self.db, telegram_id, pos["id"], pnl_usd,
                demo_mode=demo_mode, private_key=private_key)

            await self.db.increment_daily_pnl(telegram_id, pnl_usd)

            if demo_mode:
                mode_tag = " [DEMO]"
            elif dry_run:
                mode_tag = " [DRY]"
            else:
                mode_tag = ""
            result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
            fee_text = f"\n💎 Perf Fee: ${perf_fee:.2f}" if perf_fee > 0 else ""
            demo_bal_text = ""
            if demo_mode:
                cur_demo = await self.db.get_demo_balance(telegram_id)
                demo_bal_text = f"\n💰 Demo Balance: ${cur_demo:,.2f}"
            await self._notify(telegram_id,
                f"<b>CLOSE{mode_tag}</b> {result}\n"
                f"{pos.get('title', '?')[:50]} — {pos.get('outcome', '?')}\n"
                f"Reason: {close_reason}\n"
                f"Entry: {entry*100:.1f}c → Exit: {cur_price*100:.1f}c\n"
                f"Bet: ${bet_amt:.2f} | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f}){fee_text}{demo_bal_text}")

            checked_resolved.add(pos["id"])

        # Step A.5: Auto-close stale short-term positions (>30 min old)
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        for pos in open_pos:
            if pos["id"] in checked_resolved:
                continue
            title = (pos.get("title") or "").lower()
            # Only auto-close known short-term markets
            is_short_term = any(x in title for x in ["up or down", "o/u", "above", "below"])
            if not is_short_term:
                continue
            try:
                opened = datetime.strptime(pos["opened_at"], "%Y-%m-%d %H:%M:%S")
            except Exception:
                continue
            age_minutes = (now - opened).total_seconds() / 60
            if age_minutes < 30:
                continue

            # Stale short-term market — check entry price to determine outcome
            entry = pos.get("entry_price", 0)
            bet_amt = pos.get("bet_amount", 0)
            # Only assume won if entry was 95c+ (high-confidence resolved markets)
            # For lower entries, use entry price (flat close, no P&L)
            if entry >= 0.95:
                cur_price = 1.0
            else:
                cur_price = entry  # flat close — no gain, no loss
            shares = bet_amt / entry if entry > 0 else 0
            pnl_usd = shares * (cur_price - entry)

            if demo_mode:
                await self.db.adjust_demo_balance(telegram_id, shares * cur_price)

            await self.db.close_position(pos["id"], cur_price, pnl_usd, "AUTO-CLOSED (stale)")
            await self.db.increment_daily_pnl(telegram_id, pnl_usd)
            checked_resolved.add(pos["id"])

            mode_tag = " [DEMO]" if demo_mode else (" [DRY]" if dry_run else "")
            demo_bal_text = ""
            if demo_mode:
                cur_demo = await self.db.get_demo_balance(telegram_id)
                demo_bal_text = f"\n\U0001f4b0 Demo Balance: ${cur_demo:,.2f}"
            await self._notify(telegram_id,
                f"<b>CLOSE{mode_tag}</b> WIN\n"
                f"{pos.get('title', '?')[:50]} — {pos.get('outcome', '?')}\n"
                f"Reason: AUTO-CLOSED (expired)\n"
                f"Entry: {entry*100:.1f}c → Exit: 100.0c\n"
                f"Bet: ${bet_amt:.2f} | P&L: ${pnl_usd:+.2f}{demo_bal_text}")

            log.info(f"[Copy:{telegram_id}] Auto-closed stale position #{pos['id']}: {pos.get('title','?')[:40]}")

        # Step B: Check if target exited non-resolved positions
        for target_info in all_targets:
            target = target_info["wallet_addr"]
            try:
                target_positions = await get_positions(session, target)
            except Exception:
                continue

            target_keys = {f"{p['conditionId']}_{p['outcomeIndex']}" for p in target_positions}

            for pos in open_pos:
                if pos["id"] in checked_resolved:
                    continue  # Already closed via resolution above
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

                # Step 1: Try target activity for sell price
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

                # Step 2: CLOB price
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

                # Execute sell (skip for demo and dry_run)
                close_proceeds = shares * cur_price
                if demo_mode:
                    await self.db.adjust_demo_balance(telegram_id, close_proceeds)
                elif not dry_run and token_id:
                    try:
                        client = get_user_clob_client(telegram_id, private_key, wallet)
                        await asyncio.get_event_loop().run_in_executor(
                            None, place_sell, client, token_id, close_proceeds)
                    except Exception as e:
                        log.error(f"[Copy:{telegram_id}] Close sell failed: {e}")

                # Close in DB
                await self.db.close_position(pos["id"], cur_price, pnl_usd, close_reason)

                # Performance fee on profit
                perf_fee = await collect_performance_fee(
                    self.db, telegram_id, pos["id"], pnl_usd,
                    demo_mode=demo_mode, private_key=private_key)

                # Update daily P&L (atomic increment)
                await self.db.increment_daily_pnl(telegram_id, pnl_usd)

                # Notify
                if demo_mode:
                    mode_tag = " [DEMO]"
                elif dry_run:
                    mode_tag = " [DRY]"
                else:
                    mode_tag = ""
                result = "WIN" if pnl_usd > 0 else "LOSS" if pnl_usd < 0 else "FLAT"
                fee_text = f"\n💎 Perf Fee: ${perf_fee:.2f}" if perf_fee > 0 else ""
                demo_bal_text = ""
                if demo_mode:
                    cur_demo = await self.db.get_demo_balance(telegram_id)
                    demo_bal_text = f"\n💰 Demo Balance: ${cur_demo:,.2f}"
                await self._notify(telegram_id,
                    f"<b>CLOSE{mode_tag}</b> {result}\n"
                    f"{pos.get('title', '?')[:50]} — {pos.get('outcome', '?')}\n"
                    f"Reason: {close_reason}\n"
                    f"Entry: {entry*100:.1f}c → Exit: {cur_price*100:.1f}c\n"
                    f"Bet: ${bet_amt:.2f} | P&L: {pnl_pct:+.1f}% (${pnl_usd:+.2f}){fee_text}{demo_bal_text}")
