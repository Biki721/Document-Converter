from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from backend.app.api.v1 import upload, status, download
from backend.app.config import settings
from backend.app.db.redis_client import init_redis, close_redis
from backend.app.logging import setup_logging

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield
    await close_redis()

app = FastAPI(
    title="Document Converter API",
    description="High-performance multi-format document conversion API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.include_router(upload.router, prefix="/api/v1", tags=["Upload & Convert"])
app.include_router(status.router, prefix="/api/v1", tags=["Job Status"])
app.include_router(download.router, prefix="/api/v1", tags=["Download"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

@app.get("/api/v1/formats", tags=["Info"])
async def supported_formats():
    """Returns all supported conversion pairs."""
    return {
        "conversions": [
            {"from": "docx", "to": ["pdf", "txt", "html"]},
            {"from": "pdf",  "to": ["docx", "txt", "png", "jpg"]},
            {"from": "pptx", "to": ["pdf"]},
            {"from": "xlsx", "to": ["csv", "pdf"]},
            {"from": "csv",  "to": ["xlsx"]},
            {"from": "txt",  "to": ["pdf", "docx"]},
            {"from": "html", "to": ["pdf"]},
            {"from": "png",  "to": ["pdf"]},
            {"from": "jpg",  "to": ["pdf"]},
        ]
    }
