from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: List[str] = ["*"]

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # File Storage
    UPLOAD_DIR: str = "/tmp/doc_converter/uploads"
    OUTPUT_DIR: str = "/tmp/doc_converter/outputs"
    MAX_FILE_SIZE_MB: int = 50

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # Job
    JOB_TTL_SECONDS: int = 3600  # 1 hour
    MAX_CONCURRENT_JOBS: int = 10

    # LibreOffice
    LIBREOFFICE_PATH: str = "/usr/bin/libreoffice"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

SUPPORTED_CONVERSIONS = {
    "docx": ["pdf", "txt", "html"],
    "pdf":  ["docx", "txt", "png", "jpg"],
    "pptx": ["pdf"],
    "ppt":  ["pdf"],
    "xlsx": ["csv", "pdf"],
    "xls":  ["csv", "pdf"],
    "csv":  ["xlsx"],
    "txt":  ["pdf", "docx"],
    "html": ["pdf"],
    "png":  ["pdf"],
    "jpg":  ["pdf"],
    "jpeg": ["pdf"],
    "bmp":  ["pdf"],
}
