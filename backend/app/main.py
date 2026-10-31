import os
import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import (
    health, auth, domains, profile, discoveries,
    roadmaps, skills, admin
)
from app.models import Base
from app.core.database import engine, SessionLocal
from app.services.ingestion.runner import IngestionManager

logger = logging.getLogger("skillradar.auto_ingest")

def run_scheduled_ingestion():
    db = SessionLocal()
    try:
        manager = IngestionManager(db)
        logger.info("[Auto-Ingestion] Starting periodic telemetry scrape across all sources...")
        runs = manager.run_all(source_filter="all")
        total = sum(r.items_fetched for r in runs)
        logger.info(f"[Auto-Ingestion] Completed scrape: {total} items processed across {len(runs)} sources.")
    except Exception as e:
        logger.error(f"[Auto-Ingestion] Background scraping error: {e}")
    finally:
        db.close()

async def periodic_ingestion_loop():
    # Warm-up delay so server boot completes smoothly
    await asyncio.sleep(20)
    while True:
        try:
            await asyncio.to_thread(run_scheduled_ingestion)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[Auto-Ingestion] Loop exception: {e}")
        
        await asyncio.sleep(settings.INGESTION_INTERVAL_MINUTES * 60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    Base.metadata.create_all(bind=engine)
    is_testing = bool(os.environ.get("PYTEST_CURRENT_TEST")) or settings.ENVIRONMENT == "test"
    bg_task = None
    if settings.ENABLE_AUTO_INGESTION and not is_testing:
        bg_task = asyncio.create_task(periodic_ingestion_loop())
    
    yield
    
    # Shutdown: Cleanly cancel background worker
    if bg_task and not bg_task.done():
        bg_task.cancel()
        try:
            await bg_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan
)

# CORS middleware for mobile client & emulator access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all v1 routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(domains.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(roadmaps.router, prefix=settings.API_V1_STR)
app.include_router(skills.router, prefix=settings.API_V1_STR)
app.include_router(discoveries.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "2.0.0",
        "api_v1": settings.API_V1_STR,
        "docs": f"{settings.API_V1_STR}/docs"
    }
