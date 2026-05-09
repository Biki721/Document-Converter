import aioredis
import json
from src.app.config import settings

_redis = None

async def init_redis():
    global _redis
    _redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)

async def close_redis():
    global _redis
    if _redis:
        await _redis.close()

async def get_redis():
    return _redis

async def set_job(job_id: str, data: dict, ttl: int = None):
    r = await get_redis()
    ttl = ttl or settings.JOB_TTL_SECONDS
    await r.setex(f"job:{job_id}", ttl, json.dumps(data))

async def get_job(job_id: str) -> dict | None:
    r = await get_redis()
    raw = await r.get(f"job:{job_id}")
    return json.loads(raw) if raw else None

async def update_job_status(job_id: str, **kwargs):
    job = await get_job(job_id)
    if job:
        job.update(kwargs)
        await set_job(job_id, job)
