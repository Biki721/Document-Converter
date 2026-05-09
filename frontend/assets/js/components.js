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
  return `<span class="status-badge status-${status}">${dot}${labels[status] || status}</span>`;
}

function ProgressBar(pct) {
  return `<div class="progress-bar-wrap" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-bar" style="width:${pct}%"></div>
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
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
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
