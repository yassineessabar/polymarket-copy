"""FastAPI application for PolyX web dashboard."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from polyx_bot.database import Database
from .routes import (
    auth_routes,
    user_routes,
    wallet_routes,
    copy_routes,
    portfolio_routes,
    market_routes,
    referral_routes,
)
from .ws import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = Database()
    await db.init()
    app.state.db = db
    yield


app = FastAPI(
    title="PolyX API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(wallet_routes.router)
app.include_router(copy_routes.router)
app.include_router(portfolio_routes.router)
app.include_router(market_routes.router)
app.include_router(referral_routes.router)
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "polyx-api"}
