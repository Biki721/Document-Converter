from pydantic import BaseModel
from typing import Optional
from enum import Enum

class JobStatus(str, Enum):
    PENDING   = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED    = "failed"

class ConversionJob(BaseModel):
    job_id: str
    status: JobStatus
    input_filename: str
    input_format: str
    output_format: str
    output_filename: Optional[str] = None
    error: Optional[str] = None
    progress: int = 0
    created_at: str
    updated_at: Optional[str] = None

class ConversionRequest(BaseModel):
    output_format: str

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str
    poll_url: str
    download_url: Optional[str] = None
