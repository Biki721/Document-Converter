/**
 * api.js — All API calls to the Document Converter backend
 * Change BASE_URL to match your deployment
 */
const API_BASE = window.API_BASE || "http://localhost:8000";

const Api = {
  /** GET /health */
  async health() {
    const r = await fetch(`${API_BASE}/health`);
    return r.json();
  },

  /** GET /api/v1/formats */
  async getFormats() {
    const r = await fetch(`${API_BASE}/api/v1/formats`);
    if (!r.ok) throw new Error("Failed to fetch formats");
    return r.json();
  },

  /** POST /api/v1/convert */
  async uploadConvert(file, outputFormat) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("output_format", outputFormat);
    const r = await fetch(`${API_BASE}/api/v1/convert`, { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },

  /** GET /api/v1/status/:jobId */
  async getStatus(jobId) {
    const r = await fetch(`${API_BASE}/api/v1/status/${jobId}`);
    if (!r.ok) throw new Error("Job not found");
    return r.json();
  },

  /** Returns full download URL for a completed job */
  downloadUrl(jobId) {
    return `${API_BASE}/api/v1/download/${jobId}`;
  },
};
