from backend.worker.celery_app import celery_app
from backend.app.services.converter import convert
from backend.app.config import settings
from backend.app.logging import logger
from datetime import datetime, timezone
import redis, json, os

_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

def _update(job_id, **kwargs):
    key = f"job:{job_id}"
    raw = _redis.get(key)
    if raw:
        data = json.loads(raw)
        data.update(kwargs)
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        _redis.setex(key, settings.JOB_TTL_SECONDS, json.dumps(data))

@celery_app.task(name="backend.worker.tasks.convert_document", bind=True, max_retries=3)
def convert_document(self, job_id: str, input_path: str, input_fmt: str, output_fmt: str):
    try:
        _update(job_id, status="processing", progress=10)
        logger.info(f"[Task] Starting job={job_id}")

        output_filename = convert(job_id, input_path, input_fmt, output_fmt)

        _update(job_id, status="completed", progress=100, output_filename=output_filename)
        logger.info(f"[Task] Completed job={job_id} -> {output_filename}")

        if os.path.exists(input_path):
            os.remove(input_path)

        return {"job_id": job_id, "output_filename": output_filename}

    except Exception as exc:
        logger.error(f"[Task] Failed job={job_id}: {exc}")
        _update(job_id, status="failed", error=str(exc), progress=0)
        raise self.retry(exc=exc, countdown=5)
