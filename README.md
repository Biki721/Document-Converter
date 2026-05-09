# Document Converter

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)

**High-performance multi-format document conversion API.** Convert between 15+ formats with real-time progress tracking, async processing, and horizontal scalability.

---

## Supported Conversions

| Input | Output Formats |
|-------|---------------|
| DOCX  | PDF, TXT, HTML |
| PDF   | DOCX, TXT, PNG, JPG |
| PPTX/PPT | PDF |
| XLSX/XLS | CSV, PDF |
| CSV   | XLSX |
| TXT   | PDF, DOCX |
| HTML  | PDF |
| PNG/JPG/BMP | PDF |

---

## Quick Start

```bash
# 1. Clone and configure
cp .env.sample .env

# 2. Start all services
docker-compose up --build

# 3. Open API docs
open http://localhost:8000/docs

# 4. Monitor Celery workers
open http://localhost:5555
```

---

## API Usage

### Convert a Document
```bash
curl -X POST http://localhost:8000/api/v1/convert \
  -F "file=@document.docx" \
  -F "output_format=pdf"
```
**Response:**
```json
{
  "job_id": "abc-123",
  "status": "pending",
  "message": "Conversion queued",
  "poll_url": "/api/v1/status/abc-123"
}
```

### Check Status
```bash
curl http://localhost:8000/api/v1/status/abc-123
```

### Download Result
```bash
curl -O http://localhost:8000/api/v1/download/abc-123
```

### Real-time Progress (SSE)
```bash
curl -N http://localhost:8000/api/v1/status/abc-123/stream
```

### List Supported Formats
```bash
curl http://localhost:8000/api/v1/formats
```

---

## Architecture

```
Client → FastAPI (API) → Redis (Queue) → Celery Worker(s)
                                              ↓
                                     LibreOffice / Python libs
                                              ↓
                                     Output File → Redis (Status)
```

- **API**: FastAPI with async endpoints, file validation, SSE streaming
- **Worker**: Celery workers (scale horizontally with `docker-compose up --scale worker=N`)
- **Broker**: Redis for task queuing and job state
- **Converters**: LibreOffice (headless) + pdf2docx + pdf2image + Pillow + openpyxl
- **Monitoring**: Flower dashboard at `:5555`

---

## Scale Workers

```bash
docker-compose up --scale worker=5
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Environment mode |
| `MAX_FILE_SIZE_MB` | `50` | Upload size limit |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection |
| `JOB_TTL_SECONDS` | `3600` | Job data expiry |
| `LIBREOFFICE_PATH` | `/usr/bin/libreoffice` | LibreOffice binary |
