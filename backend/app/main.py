from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from backend.app.api.v1 import upload, status, download
from backend.app.config import settings, SUPPORTED_CONVERSIONS
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

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# allow_credentials=True is incompatible with allow_origins=["*"].
# We always use an explicit origins list from settings (never a bare wildcard).
# In development the default list is ["http://localhost:3000",
# "http://localhost:8000"]. Override via ALLOWED_ORIGINS env var in production.
_origins = settings.ALLOWED_ORIGINS
if "*" in _origins:
    # Safety-net: if someone accidentally puts "*" in .env alongside
    # credentials, replace it with localhost defaults and warn.
    import warnings
    warnings.warn(
        "ALLOWED_ORIGINS='*' is incompatible with allow_credentials=True. "
        "Falling back to localhost defaults. Set explicit origins in .env.",
        stacklevel=1,
    )
    _origins = ["http://localhost:3000", "http://localhost:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Request-ID"],
    expose_headers=["X-Process-Time", "Content-Disposition"],
    max_age=600,  # preflight cache: 10 minutes
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


app.include_router(upload.router,   prefix="/api/v1", tags=["Upload & Convert"])
app.include_router(status.router,   prefix="/api/v1", tags=["Job Status"])
app.include_router(download.router, prefix="/api/v1", tags=["Download"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/api/v1/formats", tags=["Info"])
async def supported_formats():
    """Return all supported input -> output conversion pairs.
    Derived directly from SUPPORTED_CONVERSIONS so it never goes out of sync.
    """
    return {
        "conversions": [
            {"from": input_fmt, "to": output_fmts}
            for input_fmt, output_fmts in SUPPORTED_CONVERSIONS.items()
        ]
    }
