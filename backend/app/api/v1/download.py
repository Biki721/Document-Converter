from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

from backend.app.db.redis_client import get_job
from backend.app.config import settings

router = APIRouter()

@router.get("/download/{job_id}")
async def download_converted_file(job_id: str):
    """Download the converted file once the job is completed."""
    job = await get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "completed":
        raise HTTPException(400, f"Job not ready. Current status: {job['status']}")
    if not job.get("output_filename"):
        raise HTTPException(500, "Output file path missing in job record")

    file_path = os.path.join(settings.OUTPUT_DIR, job["output_filename"])
    if not os.path.exists(file_path):
        raise HTTPException(404, "Output file not found on disk")

    return FileResponse(
        path=file_path,
        filename=job["output_filename"],
        media_type="application/octet-stream",
    )
