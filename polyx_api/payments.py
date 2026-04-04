"""Stripe payment endpoints."""
import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from polyx_bot.config import STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
from polyx_bot.database import Database
from .deps import get_db, get_current_user

log = logging.getLogger("polyx")
router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


@router.post("/checkout")
async def create_checkout(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Create Stripe checkout session for $39/month subscription."""
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        raise HTTPException(503, "Payment system is not configured")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url="https://app.polyx.io/settings?payment=success",
            cancel_url="https://app.polyx.io/settings?payment=cancel",
            metadata={"user_id": str(user["user_id"]), "telegram_id": str(user["telegram_id"])},
        )
        return {"checkout_url": session.url}
    except Exception as e:
        log.error(f"Stripe checkout error: {e}")
        raise HTTPException(500, "Payment processing failed. Please try again.")


@router.get("/status")
async def payment_status(
    user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Get current subscription status."""
    sub = await db.get_subscription(user["telegram_id"])

    if not sub:
        return {"status": "none", "plan": "demo"}

    return {
        "status": sub.get("status", "none"),
        "plan": "live" if sub.get("status") in ("active", "trialing") else "demo",
        "current_period_end": sub.get("current_period_end"),
        "trial_ends_at": sub.get("trial_ends_at"),
    }


# Stripe webhook (unauthenticated)
webhook_router = APIRouter(tags=["stripe-webhook"])


@webhook_router.post("/api/stripe/webhook")
async def stripe_webhook(request: Request, db: Database = Depends(get_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid webhook signature")

    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        metadata = data.get("metadata", {})
        telegram_id = int(metadata.get("telegram_id", 0))
        if telegram_id and telegram_id != 0:
            await db.upsert_subscription(
                telegram_id,
                stripe_customer_id=data.get("customer", ""),
                stripe_subscription_id=data.get("subscription", ""),
                status="active",
            )

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        sub_status = data.get("status", "canceled")
        stripe_customer_id = data.get("customer", "")
        if stripe_customer_id:
            await db.update_subscription_status(stripe_customer_id, sub_status)

    return {"received": True}
