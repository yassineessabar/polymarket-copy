"""PolyX API — FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from polyx_bot.config import CORS_ORIGINS
from .deps import init_db
from .auth import router as auth_router
from .users import router as users_router
from .portfolio import router as portfolio_router
from .copy_trading import router as copy_router
from .payments import router as payments_router, webhook_router
from .notifications import router as notifications_router
from .markets import router as markets_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="PolyX API",
    description="Copy trading for Polymarket",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes (no auth)
app.include_router(auth_router)
app.include_router(markets_router)
app.include_router(webhook_router)

# Authenticated routes
app.include_router(users_router)
app.include_router(portfolio_router)
app.include_router(copy_router)
app.include_router(payments_router)
app.include_router(notifications_router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "polyx-api"}
