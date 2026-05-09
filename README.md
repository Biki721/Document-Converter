# 📄 Document Converter

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

**High-performance multi-format document conversion API.**  
Convert between 15+ formats with real-time progress tracking, async job processing, automatic retries, and horizontal scalability — powered by FastAPI, Celery, Redis, and LibreOffice.

---

## ✨ Features

- 🔄 **15+ format conversions** — Office docs, PDFs, images, spreadsheets, and more
- ⚡ **Async processing** — Non-blocking job queue via Celery + Redis
- 📡 **Real-time progress** — Server-Sent Events (SSE) stream per job
- 🔁 **Auto-retry** — Celery tasks retry up to 3 times on failure
- 📈 **Horizontal scaling** — Scale workers independently with Docker Compose
- 🖥️ **Flower monitoring** — Live Celery worker dashboard at `:5555`
- 🧹 **Auto cleanup** — Input files deleted after conversion; jobs expire in 1 hour
- 📝 **Structured logging** — Request timing via `X-Process-Time` header
- 🩺 **Health check** — `/health` endpoint for uptime monitoring

---

## 📦 Supported Conversions

| Input Format | Output Formats |
|---|---|
| `DOCX` | `PDF`, `TXT`, `HTML` |
| `PDF` | `DOCX`, `TXT`, `PNG`, `JPG` |
| `PPTX` / `PPT` | `PDF` |
| `XLSX` / `XLS` | `CSV`, `PDF` |
| `CSV` | `XLSX` |
| `TXT` | `PDF`, `DOCX` |
| `HTML` | `PDF` |
| `PNG` / `JPG` / `JPEG` / `BMP` | `PDF` |

> **Note:** Multi-page PDF → image conversions are automatically zipped into a `.zip` archive.

---

## 🏗️ Architecture

```
Client
  │
  ▼
FastAPI (API Server)          ← src/app/main.py
  │  - File validation
  │  - Job creation (UUID)
  │  - SSE streaming
  │
  ▼
Redis (Broker + State Store)  ← job:{job_id} keys with TTL
  │
  ▼
Celery Worker(s)              ← src/worker/tasks.py
  │  - convert_document task
  │  - max_retries=3, countdown=5s
  │
  ▼
Converter Service             ← src/app/services/converter.py
  │  - LibreOffice (headless)
  │  - pdf2docx, pdf2image, pdfminer
  │  - Pillow, openpyxl, python-docx
  │
  ▼
Output File → Redis (status updated) → Client downloads
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)

### 1. Clone & Configure

```bash
git clone https://github.com/Biki721/Document-Converter.git
cd Document-Converter
cp .env.sample .env
```

### 2. Start All Services

```bash
docker-compose up --build
```

This starts:

| Service | Port | Description |
|---|---|---|
| `api` | `8000` | FastAPI application |
| `worker` | — | Celery conversion worker |
| `redis` | `6379` | Message broker & job store |
| `flower` | `5555` | Celery monitoring dashboard |

### 3. Explore

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Flower Dashboard:** http://localhost:5555
- **Health Check:** http://localhost:8000/health

---

## 📡 API Reference

### `POST /api/v1/convert` — Upload & Queue Conversion

Upload a file and specify the desired output format. Returns a `job_id` immediately (HTTP 202).

```bash
curl -X POST http://localhost:8000/api/v1/convert \
  -F "file=@report.docx" \
  -F "output_format=pdf"
```

**Response:**
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "pending",
  "message": "Conversion queued",
  "poll_url": "/api/v1/status/f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "download_url": null
}
```

---

### `GET /api/v1/status/{job_id}` — Poll Job Status

```bash
curl http://localhost:8000/api/v1/status/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Response:**
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "input_filename": "report.docx",
  "input_format": "docx",
  "output_format": "pdf",
  "output_filename": "f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf",
  "progress": 100,
  "error": null,
  "created_at": "2026-05-09T14:30:00Z",
  "updated_at": "2026-05-09T14:30:05Z"
}
```

**Job Status Values:**

| Status | Meaning |
|---|---|
| `pending` | Queued, waiting for a worker |
| `processing` | Worker actively converting |
| `completed` | File ready to download |
| `failed` | Conversion failed (see `error` field) |

---

### `GET /api/v1/status/{job_id}/stream` — Real-time SSE Stream

Stream live job progress updates via Server-Sent Events.

```bash
curl -N http://localhost:8000/api/v1/status/f47ac10b-58cc-4372-a567-0e02b2c3d479/stream
```

The stream sends a JSON event every second until the job reaches `completed` or `failed`.

---

### `GET /api/v1/download/{job_id}` — Download Converted File

```bash
curl -O http://localhost:8000/api/v1/download/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

Only available when `status == "completed"`. Returns the file as `application/octet-stream`.

---

### `GET /api/v1/formats` — List Supported Formats

```bash
curl http://localhost:8000/api/v1/formats
```

---

### `GET /health` — Health Check

```bash
curl http://localhost:8000/health
# {"status": "healthy", "version": "2.0.0"}
```

---

## ⚙️ Environment Variables

Copy `.env.sample` to `.env` and customize as needed:

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | Environment mode (`development` / `production`) |
| `SECRET_KEY` | `change-me-in-production` | App secret key |
| `ALLOWED_ORIGINS` | `["*"]` | CORS allowed origins |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL |
| `UPLOAD_DIR` | `/tmp/doc_converter/uploads` | Temp directory for uploaded files |
| `OUTPUT_DIR` | `/tmp/doc_converter/outputs` | Directory for converted output files |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload file size in MB |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery broker URL |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/0` | Celery result backend URL |
| `JOB_TTL_SECONDS` | `3600` | Job data expiry time (seconds) |
| `MAX_CONCURRENT_JOBS` | `10` | Maximum concurrent jobs |
| `LIBREOFFICE_PATH` | `/usr/bin/libreoffice` | Path to LibreOffice binary |

---

## 📂 Project Structure

```
Document-Converter/
├── docker-compose.yml          # Orchestrates api, worker, redis, flower
├── Dockerfile.worker           # Docker image for Celery worker
├── requirements.txt            # Python dependencies
├── .env.sample                 # Environment variable template
│
└── src/
    ├── app/
    │   ├── main.py             # FastAPI app setup, middleware, routers
    │   ├── config.py           # Settings (pydantic-settings), SUPPORTED_CONVERSIONS
    │   ├── logging.py          # Structured logging setup
    │   ├── api/
    │   │   └── v1/
    │   │       ├── upload.py   # POST /convert — file upload & job dispatch
    │   │       ├── status.py   # GET /status/{id} & SSE stream
    │   │       └── download.py # GET /download/{id} — file response
    │   ├── db/
    │   │   └── redis_client.py # Async Redis helpers (get_job, set_job)
    │   ├── models/
    │   │   └── job.py          # Pydantic models: JobStatus, JobResponse, ConversionJob
    │   └── services/
    │       └── converter.py    # Core conversion logic (dispatch to correct library)
    │
    └── worker/
        ├── celery_app.py       # Celery app instance configuration
        └── tasks.py            # convert_document task (max_retries=3)
```

---

## 📦 Dependencies

| Library | Purpose |
|---|---|
| `fastapi` | Async web framework |
| `uvicorn` | ASGI server |
| `celery` | Distributed task queue |
| `redis` / `aioredis` | Broker, result backend, job state |
| `pydantic-settings` | Environment config management |
| `LibreOffice` (headless) | DOCX/PPTX/XLSX/HTML/TXT → PDF, DOCX → HTML/TXT |
| `pdf2docx` | PDF → DOCX |
| `pdfminer.six` | PDF → TXT |
| `pdf2image` | PDF → PNG / JPG |
| `Pillow` | Image → PDF |
| `openpyxl` | XLSX ↔ CSV |
| `python-docx` | TXT → DOCX |
| `flower` | Celery worker monitoring UI |

---

## 📈 Scaling Workers

Scale Celery workers horizontally to handle higher load:

```bash
docker-compose up --scale worker=5
```

Monitor all workers live at http://localhost:5555.

---

## 🛠️ Development Notes

- API version: **2.0.0**
- All jobs use **UUID v4** as `job_id` — no collisions
- Failed tasks **auto-retry up to 3×** with a 5-second delay between attempts
- Input files are **deleted from disk** immediately after a successful conversion
- Job records in Redis **expire after 1 hour** (`JOB_TTL_SECONDS`)
- Every HTTP response includes an **`X-Process-Time`** header for latency tracking

---

## 📜 License

This project is open source. Feel free to use, modify, and distribute.
