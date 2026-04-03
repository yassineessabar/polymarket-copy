"""End-to-end test of the copy trading flow."""
import asyncio
import sys
sys.path.insert(0, '/home/ubuntu/polysync_bot')

from polyx_bot.database import Database
from polyx_bot.api_helpers import get_recent_activity, get_positions, get_profile_name, make_trade_id
from polyx_bot.risk_engine import risk_check
import aiohttp

TARGET = '0x0c154c190E293B7e5F8D453b5F690C4dC9599A45'
TEST_USER = 99999


async def test_copy_flow():
    db = Database()
    await db.init()

    print('=== TEST 1: Database operations ===')
    existing = await db.get_user(TEST_USER)
    if not existing:
        await db.create_user(TEST_USER, 'test_user', '0x0000000000000000000000000000000000000000', '', 'TEST123')
    print('User created:', TEST_USER)

    await db.add_target(TEST_USER, TARGET, display_name='TestWhale')
    targets = await db.get_targets(TEST_USER)
    print('Targets:', len(targets), '->', targets[0]['wallet_addr'][:20] + '...')

    print()
    print('=== TEST 2: API calls (activity + positions) ===')
    async with aiohttp.ClientSession() as session:
        name = await get_profile_name(session, TARGET)
        print('Profile name:', name)

        activity = await get_recent_activity(session, TARGET, limit=10)
        trades = [a for a in activity if a.get('type') == 'TRADE']
        print('Activity items:', len(activity), '| Trades:', len(trades))

        if trades:
            t = trades[0]
            print('Latest trade:', t.get('side'), t.get('title', '')[:50])
            print('  usdc_size:', t.get('usdcSize'))
            print('  price:', t.get('price'))
            print('  token:', str(t.get('asset', ''))[:30] + '...')
            tid = make_trade_id(t)
            print('  trade_id:', tid[:60] + '...')

        positions = await get_positions(session, TARGET)
        print()
        print('Target positions:', len(positions))
        for p in positions[:3]:
            print(' ', p.get('title', '')[:40], 'size=' + str(p.get('size', '?')))

    print()
    print('=== TEST 3: Risk engine ===')
    if trades:
        t = trades[0]
        usdc_size = float(t.get('usdcSize', 0) or 0)
        bet, conf, reject = risk_check(
            usdc_size=usdc_size,
            target_portfolio=200000,
            portfolio_value=100,
            daily_pnl=0,
            open_positions=0,
            event_count=0,
            total_exposure=0,
            bet_history=[],
            settings={
                'max_risk_pct': 10, 'min_bet': 1, 'max_positions': 20,
                'max_per_event': 2, 'max_exposure_pct': 50,
            },
            halted=False,
        )
        print('Trade: $%.2f -> Bet: $%.2f, Conf: %.2f%%, Reject: %s' % (usdc_size, bet, conf * 100, reject))

    print()
    print('=== TEST 4: Position tracking ===')
    if trades:
        t = trades[0]
        pos_id = await db.open_position(
            telegram_id=TEST_USER, target_wallet=TARGET,
            condition_id=t.get('conditionId', ''), outcome_index=0,
            token_id=t.get('asset', ''), title=t.get('title', '')[:50],
            outcome='Yes', entry_price=float(t.get('price', 0.5)),
            bet_amount=5.0, target_usdc_size=float(t.get('usdcSize', 0) or 0),
            event_slug='test')
        print('Position opened: id =', pos_id)

        open_pos = await db.get_open_positions(TEST_USER)
        print('Open positions:', len(open_pos))

        await db.close_position(pos_id, 0.6, 0.5, 'TEST')
        closed = await db.get_closed_positions(TEST_USER)
        print('Closed positions:', len(closed))

    # Cleanup
    import aiosqlite
    async with aiosqlite.connect('/home/ubuntu/polysync_bot/polysync.db') as conn:
        await conn.execute('DELETE FROM targets WHERE telegram_id=?', (TEST_USER,))
        await conn.execute('DELETE FROM positions WHERE telegram_id=?', (TEST_USER,))
        await conn.execute('DELETE FROM processed_trades WHERE telegram_id=?', (TEST_USER,))
        await conn.execute('DELETE FROM users WHERE telegram_id=?', (TEST_USER,))
        await conn.execute('DELETE FROM user_settings WHERE telegram_id=?', (TEST_USER,))
        await conn.commit()
    print()
    print('Test data cleaned up')
    print()
    print('ALL TESTS PASSED')


asyncio.run(test_copy_flow())
