"""
Lightweight Stripe webhook server.
Runs alongside the Telegram bot on a separate port.

Usage:
    python -m polyx_bot.stripe_webhook
    # or started automatically by the bot via start_webhook_server()
"""
import asyncio
import logging

import stripe
from aiohttp import web

from .config import STRIPE_WEBHOOK_SECRET
from .database import Database
from .subscription import handle_webhook_event

log = logging.getLogger("polyx")

WEBHOOK_PORT = 8001


async def stripe_webhook_handler(request: web.Request) -> web.Response:
    """Handle POST /stripe/webhook."""
    payload = await request.read()
    sig_header = request.headers.get("Stripe-Signature", "")

    if not STRIPE_WEBHOOK_SECRET:
        log.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured")
        return web.Response(status=500, text="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        log.warning("[Webhook] Invalid signature")
        return web.Response(status=400, text="Invalid signature")
    except Exception as e:
        log.error(f"[Webhook] Error parsing event: {e}")
        return web.Response(status=400, text="Bad request")

    db: Database = request.app["db"]
    await handle_webhook_event(db, event)

    return web.Response(status=200, text="ok")


async def health_handler(request: web.Request) -> web.Response:
    return web.Response(status=200, text="ok")


def create_webhook_app(db: Database) -> web.Application:
    app = web.Application()
    app["db"] = db
    app.router.add_post("/stripe/webhook", stripe_webhook_handler)
    app.router.add_get("/health", health_handler)
    return app


async def start_webhook_server(db: Database, port: int = WEBHOOK_PORT):
    """Start the webhook server in the background (non-blocking)."""
    app = create_webhook_app(db)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    log.info(f"[Webhook] Stripe webhook server started on port {port}")
    return runner


# Allow running standalone
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    async def main():
        db = Database()
        await db.init()
        runner = await start_webhook_server(db)
        log.info(f"Webhook server running on port {WEBHOOK_PORT}")
        try:
            await asyncio.Event().wait()
        finally:
            await runner.cleanup()

    asyncio.run(main())
