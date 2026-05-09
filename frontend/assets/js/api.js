/**
 * api.js — All API calls to the Document Converter backend
 * Change API_BASE to match your deployment environment.
 */
const API_BASE = window.API_BASE || "http://localhost:8000";

const Api = {
  async health() {
    const r = await fetch(`${API_BASE}/health`);
    return r.json();
  },

  async getFormats() {
    const r = await fetch(`${API_BASE}/api/v1/formats`);
    if (!r.ok) throw new Error("Failed to fetch formats");
    return r.json();
  },

  async uploadConvert(file, outputFormat) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("output_format", outputFormat);
    const r = await fetch(`${API_BASE}/api/v1/convert`, { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },

  async getStatus(jobId) {
    const r = await fetch(`${API_BASE}/api/v1/status/${jobId}`);
    if (!r.ok) throw new Error("Job not found");
    return r.json();
  },

  downloadUrl(jobId) {
    return `${API_BASE}/api/v1/download/${jobId}`;
  },
};
