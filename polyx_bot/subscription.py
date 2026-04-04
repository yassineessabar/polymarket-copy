"""
Subscription management — Stripe integration for PolyX Bot.

Trial starts when user first switches to live mode.
After 7 days, Stripe auto-charges $39/month.
"""
import logging
from datetime import datetime, timedelta

import stripe

from .config import STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
from .database import Database

log = logging.getLogger("polyx")

stripe.api_key = STRIPE_SECRET_KEY

TRIAL_DAYS = 7
MONTHLY_PRICE = 39  # USD


async def check_subscription_status(db: Database, telegram_id: int) -> dict:
    """Return subscription info for a user.

    Returns dict with:
        allowed: bool — can user trade live?
        status: str — none / trialing / active / past_due / canceled
        message: str — human-readable status
        checkout_url: str | None — Stripe checkout URL if needed
    """
    sub = await db.get_subscription(telegram_id)

    if not sub or sub.get("status") == "none":
        return {
            "allowed": False,
            "status": "none",
            "message": "No subscription. Subscribe to trade live.",
            "checkout_url": None,
        }

    status = sub.get("status", "none")

    if status in ("trialing", "active"):
        period_end = sub.get("current_period_end", "")
        msg = f"Active subscription (renews {period_end[:10]})" if period_end else "Active subscription"
        return {"allowed": True, "status": status, "message": msg, "checkout_url": None}

    if status == "past_due":
        return {
            "allowed": False,
            "status": "past_due",
            "message": "Payment failed. Update your payment method to continue.",
            "checkout_url": None,
        }

    # canceled or anything else
    return {
        "allowed": False,
        "status": status,
        "message": "Subscription inactive. Subscribe to resume live trading.",
        "checkout_url": None,
    }


async def create_checkout_session(db: Database, telegram_id: int) -> str | None:
    """Create a Stripe Checkout Session with 7-day trial.

    Returns the checkout URL, or None on failure.
    """
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        log.error("[Subscription] STRIPE_SECRET_KEY or STRIPE_PRICE_ID not configured")
        return None

    try:
        # Check if user already has a Stripe customer
        sub = await db.get_subscription(telegram_id)
        customer_id = sub.get("stripe_customer_id") if sub else None

        params = {
            "mode": "subscription",
            "line_items": [{"price": STRIPE_PRICE_ID, "quantity": 1}],
            "success_url": f"https://t.me/{_bot_username()}?start=sub_success",
            "cancel_url": f"https://t.me/{_bot_username()}?start=sub_cancel",
            "metadata": {"telegram_id": str(telegram_id)},
        }

        if customer_id:
            params["customer"] = customer_id

        session = stripe.checkout.Session.create(**params)

        log.info(f"[Subscription] Checkout session created for {telegram_id}: {session.id}")
        return session.url

    except Exception as e:
        log.error(f"[Subscription] Failed to create checkout: {e}")
        return None


async def create_billing_portal_url(db: Database, telegram_id: int) -> str | None:
    """Create a Stripe Billing Portal session for managing subscription."""
    sub = await db.get_subscription(telegram_id)
    if not sub or not sub.get("stripe_customer_id"):
        return None

    try:
        session = stripe.billing_portal.Session.create(
            customer=sub["stripe_customer_id"],
            return_url=f"https://t.me/{_bot_username()}",
        )
        return session.url
    except Exception as e:
        log.error(f"[Subscription] Failed to create portal: {e}")
        return None


async def handle_webhook_event(db: Database, event: dict):
    """Process a Stripe webhook event and update subscription status."""
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    log.info(f"[Stripe Webhook] {event_type}")

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data)
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(db, data)


async def _handle_checkout_completed(db: Database, session: dict):
    """User completed checkout — record subscription."""
    telegram_id_str = session.get("metadata", {}).get("telegram_id")
    if not telegram_id_str:
        log.warning("[Webhook] checkout.session.completed missing telegram_id in metadata")
        return

    telegram_id = int(telegram_id_str)
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    # Fetch subscription details from Stripe
    try:
        sub = stripe.Subscription.retrieve(subscription_id)
        status = sub.get("status", "trialing")
        trial_end = sub.get("trial_end")
        current_period_end = sub.get("current_period_end")

        trial_ends_at = datetime.utcfromtimestamp(trial_end).isoformat() if trial_end else None
        period_end = datetime.utcfromtimestamp(current_period_end).isoformat() if current_period_end else None

    except Exception as e:
        log.error(f"[Webhook] Failed to fetch subscription {subscription_id}: {e}")
        status = "trialing"
        trial_ends_at = (datetime.utcnow() + timedelta(days=TRIAL_DAYS)).isoformat()
        period_end = None

    await db.upsert_subscription(
        telegram_id,
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        status=status,
        trial_started_at=datetime.utcnow().isoformat(),
        trial_ends_at=trial_ends_at,
        current_period_end=period_end,
    )
    log.info(f"[Webhook] Subscription created for {telegram_id}: {status}")


async def _handle_subscription_updated(db: Database, subscription: dict):
    """Subscription status changed (trial → active, etc.)."""
    customer_id = subscription.get("customer")
    telegram_id = await db.get_telegram_id_by_stripe_customer(customer_id)
    if not telegram_id:
        log.warning(f"[Webhook] Unknown customer {customer_id}")
        return

    status = subscription.get("status", "active")
    current_period_end = subscription.get("current_period_end")
    period_end = datetime.utcfromtimestamp(current_period_end).isoformat() if current_period_end else None

    await db.upsert_subscription(
        telegram_id,
        status=status,
        current_period_end=period_end,
    )
    log.info(f"[Webhook] Subscription updated for {telegram_id}: {status}")


async def _handle_subscription_deleted(db: Database, subscription: dict):
    """Subscription canceled."""
    customer_id = subscription.get("customer")
    telegram_id = await db.get_telegram_id_by_stripe_customer(customer_id)
    if not telegram_id:
        return

    await db.upsert_subscription(telegram_id, status="canceled")
    log.info(f"[Webhook] Subscription canceled for {telegram_id}")


async def _handle_payment_failed(db: Database, invoice: dict):
    """Payment failed — mark as past_due."""
    customer_id = invoice.get("customer")
    telegram_id = await db.get_telegram_id_by_stripe_customer(customer_id)
    if not telegram_id:
        return

    await db.upsert_subscription(telegram_id, status="past_due")
    log.info(f"[Webhook] Payment failed for {telegram_id}")


async def _handle_invoice_paid(db: Database, invoice: dict):
    """Payment succeeded — ensure active status."""
    customer_id = invoice.get("customer")
    telegram_id = await db.get_telegram_id_by_stripe_customer(customer_id)
    if not telegram_id:
        return

    await db.upsert_subscription(telegram_id, status="active")
    log.info(f"[Webhook] Invoice paid for {telegram_id}")


def _bot_username():
    from .config import BOT_USERNAME
    return BOT_USERNAME
