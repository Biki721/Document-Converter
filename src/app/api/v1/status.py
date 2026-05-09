from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import asyncio, json

from src.app.db.redis_client import get_job
from src.app.models.job import ConversionJob

router = APIRouter()

@router.get("/status/{job_id}", response_model=ConversionJob)
async def get_job_status(job_id: str):
    """Get the current status of a conversion job."""
    job = await get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return job

@router.get("/status/{job_id}/stream")
async def stream_job_status(job_id: str):
    """Server-Sent Events stream for real-time job progress."""
    async def event_generator():
        while True:
            job = await get_job(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                break
            yield f"data: {json.dumps(job)}\n\n"
            if job["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
