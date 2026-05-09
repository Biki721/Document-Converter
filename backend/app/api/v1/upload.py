from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from datetime import datetime, timezone
import uuid, os, shutil

from backend.app.config import settings, SUPPORTED_CONVERSIONS
from backend.app.db.redis_client import set_job
from backend.app.models.job import JobStatus, JobResponse
from backend.worker.celery_app import celery_app
from backend.app.logging import logger

router = APIRouter()

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

@router.post("/convert", response_model=JobResponse, status_code=202)
async def convert_document(
    file: UploadFile = File(...),
    output_format: str = Form(...),
):
    """Upload a document and queue it for conversion."""
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in SUPPORTED_CONVERSIONS:
        raise HTTPException(400, f"Unsupported input format: .{ext}")
    if output_format.lower() not in SUPPORTED_CONVERSIONS.get(ext, []):
        raise HTTPException(
            400,
            f"Cannot convert .{ext} to .{output_format}. "
            f"Supported targets: {SUPPORTED_CONVERSIONS[ext]}"
        )

    job_id = str(uuid.uuid4())
    dest_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}.{ext}")
    total = 0
    with open(dest_path, "wb") as f:
        while chunk := await file.read(1024 * 64):
            total += len(chunk)
            if total > MAX_BYTES:
                os.remove(dest_path)
                raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")
            f.write(chunk)

    now = datetime.now(timezone.utc).isoformat()
    job_data = {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "input_filename": file.filename,
        "input_format": ext,
        "output_format": output_format.lower(),
        "output_filename": None,
        "error": None,
        "progress": 0,
        "created_at": now,
        "updated_at": now,
    }
    await set_job(job_id, job_data)

    celery_app.send_task(
        "backend.worker.tasks.convert_document",
        args=[job_id, dest_path, ext, output_format.lower()],
    )
    logger.info(f"Queued job {job_id}: {ext} -> {output_format}")

    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        message="Conversion queued",
        poll_url=f"/api/v1/status/{job_id}",
        download_url=None,
    )
