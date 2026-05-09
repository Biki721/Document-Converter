/**
 * components.js — Reusable UI helpers
 */
const FORMAT_EMOJI = {
  pdf: "📄", docx: "📝", xlsx: "📊", csv: "📋",
  pptx: "📑", txt: "📃", html: "🌐",
  png: "🖼️", jpg: "🖼️", jpeg: "🖼️", bmp: "🖼️", zip: "🗄️",
};
const getEmoji = ext => FORMAT_EMOJI[ext?.toLowerCase()] || "📄";

function StatusBadge(status) {
  const labels = { pending: "Pending", processing: "Processing", completed: "Completed", failed: "Failed" };
  const dot = status === "processing"
    ? `<span class="status-dot-live" aria-hidden="true"></span> `
    : "";
  const safeStatus = Object.prototype.hasOwnProperty.call(labels, status) ? status : "pending";
  return `<span class="status-badge status-${safeStatus}">${dot}${escapeHtml(labels[status] || status || "Pending")}</span>`;
}

function ProgressBar(pct) {
  const value = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<div class="progress-bar-wrap" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-bar" style="width:${value}%"></div>
  </div>`;
}

function FormatPills(formats, selected, onSelect) {
  const container = document.createElement("div");
  container.className = "format-pills";
  formats.forEach(fmt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `format-pill ${fmt === selected ? "selected" : ""}`;
    btn.textContent = fmt.toUpperCase();
    btn.setAttribute("aria-pressed", fmt === selected);
    btn.addEventListener("click", () => onSelect(fmt));
    container.appendChild(btn);
  });
  return container;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getFileExtension(filename) {
  const ext = filename.split(".").pop();
  return ext && ext !== filename ? ext.toLowerCase() : "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function spinnerIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>`;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const safeType = ["success", "error", "info"].includes(type) ? type : "info";
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const el = document.createElement("div");
  el.className = `toast toast-${safeType}`;
  el.innerHTML = `<span class="toast-icon">${icons[safeType] || icons.info}</span>`;
  const text = document.createElement("span");
  text.textContent = message;
  el.appendChild(text);
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function EmptyState({ icon, title, body }) {
  return `<div class="empty-state">
    ${icon}
    <h3>${title}</h3>
    <p>${body}</p>
  </div>`;
}
