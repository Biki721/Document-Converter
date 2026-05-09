/**
 * app.js — Router, State, Page renderers
 */
const State = {
  jobs: [],
  formats: null,
  pollers: {},
};

const conversionMap = {};

const Router = {
  routes: {
    "/":        renderUploadPage,
    "/jobs":    renderJobsPage,
    "/formats": renderFormatsPage,
  },
  current: null,
  navigate(path) { window.location.hash = "#" + path; },
  resolve() {
    const hash = window.location.hash.replace("#", "") || "/";
    const path = hash.split("?")[0];
    Router.current = path;
    document.querySelectorAll(".nav-item").forEach(a => {
      const route = a.dataset.route;
      a.classList.toggle("active", route === path);
      a.setAttribute("aria-current", route === path ? "page" : "false");
    });
    const fn = Router.routes[path] || renderUploadPage;
    fn();
  },
};

window.addEventListener("hashchange", () => Router.resolve());

async function checkApiStatus() {
  const dot  = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  try {
    const data = await Api.health();
    dot.className   = "status-dot online";
    text.textContent = `API v${data.version}`;
  } catch {
    dot.className   = "status-dot offline";
    text.textContent = "Offline";
  }
}

function updateBadge() {
  const active = State.jobs.filter(j => j.status === "pending" || j.status === "processing").length;
  const badge = document.getElementById("active-jobs-badge");
  badge.textContent = active;
  badge.style.display = active > 0 ? "inline-block" : "none";
}

function startPolling(jobId) {
  if (State.pollers[jobId]) return;
  State.pollers[jobId] = setInterval(async () => {
    try {
      const job = await Api.getStatus(jobId);
      const idx = State.jobs.findIndex(j => j.job_id === jobId);
      if (idx >= 0) State.jobs[idx] = job;
      else State.jobs.unshift(job);
      updateBadge();
      if (job.status === "completed" || job.status === "failed") {
        clearInterval(State.pollers[jobId]);
        delete State.pollers[jobId];
        if (job.status === "completed") showToast(`✓ Done: ${job.output_filename}`, "success");
        else showToast(`✗ Failed: ${job.error || "Unknown error"}`, "error");
      }
      if (Router.current === "/jobs") renderJobsPage();
      const resultEl = document.getElementById("job-result-" + jobId);
      if (resultEl) renderJobResult(job);
    } catch {}
  }, 2000);
}

function renderJobResult(job) {
  const el = document.getElementById("job-result-" + job.job_id);
  if (!el) return;
  el.innerHTML = `
    <div class="job-result-header">
      <div class="flex items-center gap-2">${StatusBadge(job.status)}</div>
      ${job.status === "completed"
        ? `<a href="${Api.downloadUrl(job.job_id)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>`
        : job.status === "failed" ? `<span class="text-muted">${job.error || "Unknown error"}</span>` : ""}
    </div>
    <div class="job-result-info">${job.input_filename} → ${job.output_format?.toUpperCase()}${job.output_filename ? ` · ${job.output_filename}` : ""}</div>
    ${job.status !== "completed" && job.status !== "failed" ? ProgressBar(job.progress || 0) : ""}
  `;
}

// ====================================================
// PAGE: Upload & Convert
// ====================================================
async function renderUploadPage() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Upload &amp; Convert</h1>
      <p class="page-subtitle">Drag a file, pick a target format, and convert instantly.</p>
    </div>
    <div class="card" style="max-width:640px">
      <div class="upload-zone" id="upload-zone" tabindex="0" role="button" aria-label="Click or drag to upload a file">
        <input type="file" id="file-input" accept="*/*" aria-hidden="true" tabindex="-1" />
        <div class="upload-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <p class="upload-title">Drop your file here</p>
        <p class="upload-subtitle">or <strong>browse</strong> to upload &nbsp;&middot;&nbsp; Max 50 MB</p>
      </div>
      <div id="file-preview-wrap"></div>
      <div id="format-picker-wrap"></div>
      <div id="convert-btn-wrap" style="margin-top:var(--space-6)"></div>
      <div id="job-result-wrap"></div>
    </div>`;

  let selectedFile = null;
  let selectedFormat = null;

  const zone      = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");

  zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", e => {
    e.preventDefault(); zone.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  zone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });
  fileInput.addEventListener("change", e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  function handleFile(file) {
    selectedFile = file; selectedFormat = null;
    const ext = file.name.split(".").pop().toLowerCase();
    renderFilePreview(file, ext);
    renderFormatPicker(ext);
    renderConvertBtn();
    document.getElementById("job-result-wrap").innerHTML = "";
  }

  function renderFilePreview(file, ext) {
    document.getElementById("file-preview-wrap").innerHTML = `
      <div class="file-preview">
        <span class="file-icon">${getEmoji(ext)}</span>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${fmtSize(file.size)} &middot; .${ext.toUpperCase()}</div>
        </div>
        <button class="file-remove btn btn-icon" id="remove-file-btn" aria-label="Remove file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
    document.getElementById("remove-file-btn").addEventListener("click", () => {
      selectedFile = null; selectedFormat = null;
      document.getElementById("file-preview-wrap").innerHTML = "";
      document.getElementById("format-picker-wrap").innerHTML = "";
      document.getElementById("convert-btn-wrap").innerHTML = "";
      document.getElementById("job-result-wrap").innerHTML = "";
      fileInput.value = "";
    });
  }

  function renderFormatPicker(ext) {
    const targets = conversionMap[ext] || [];
    const wrap = document.getElementById("format-picker-wrap");
    if (!targets.length) {
      wrap.innerHTML = `<p class="text-muted mt-4">⚠️ No supported outputs for <strong>.${ext}</strong>. See <a href="#/formats" style="color:var(--color-primary)">Formats</a>.</p>`;
      return;
    }
    wrap.innerHTML = `<div class="format-section"><div class="format-label">Convert to</div><div id="pills-container"></div></div>`;
    document.getElementById("pills-container").appendChild(
      FormatPills(targets, selectedFormat, fmt => {
        selectedFormat = fmt;
        document.querySelectorAll(".format-pill").forEach(p => {
          const match = p.textContent.trim().toLowerCase() === fmt;
          p.classList.toggle("selected", match);
          p.setAttribute("aria-pressed", match);
        });
        renderConvertBtn();
      })
    );
  }

  function renderConvertBtn() {
    const wrap = document.getElementById("convert-btn-wrap");
    const ready = selectedFile && selectedFormat;
    wrap.innerHTML = `<button class="btn btn-primary w-full" id="convert-btn" ${ready ? "" : "disabled"}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Convert${selectedFormat ? " to ." + selectedFormat.toUpperCase() : ""}
    </button>`;
    if (ready) document.getElementById("convert-btn").addEventListener("click", doConvert);
  }

  async function doConvert() {
    const btn = document.getElementById("convert-btn");
    btn.disabled = true; btn.textContent = "Uploading…";
    try {
      const result = await Api.uploadConvert(selectedFile, selectedFormat);
      const job = {
        job_id: result.job_id, status: result.status,
        input_filename: selectedFile.name,
        input_format: selectedFile.name.split(".").pop().toLowerCase(),
        output_format: selectedFormat,
        progress: 0, created_at: new Date().toISOString(),
      };
      State.jobs.unshift(job); updateBadge();
      const rw = document.getElementById("job-result-wrap");
      rw.innerHTML = `<div id="job-result-${job.job_id}" class="job-result"></div>`;
      renderJobResult(job);
      startPolling(job.job_id);
      showToast("Job queued — conversion started!", "info");
      btn.disabled = false; btn.textContent = "Convert another file";
      btn.onclick = () => Router.resolve();
    } catch (err) {
      showToast(err.message, "error");
      btn.disabled = false; btn.textContent = "Retry";
      btn.onclick = doConvert;
    }
  }
}

// ====================================================
// PAGE: Jobs
// ====================================================
function renderJobsPage() {
  const root = document.getElementById("app-root");
  if (!document.getElementById("jobs-list")) {
    root.innerHTML = `
      <div class="page-header flex justify-between items-center">
        <div>
          <h1 class="page-title">Jobs</h1>
          <p class="page-subtitle">All conversion jobs this session.</p>
        </div>
        <button class="btn btn-secondary btn-sm" id="refresh-jobs-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>
      <div id="jobs-list"></div>`;
    document.getElementById("refresh-jobs-btn").addEventListener("click", renderJobsPage);
  }

  const list = document.getElementById("jobs-list");
  if (!State.jobs.length) {
    list.innerHTML = EmptyState({
      icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>`,
      title: "No jobs yet",
      body: "Upload a file to start converting — your jobs will appear here.",
    });
    return;
  }

  list.innerHTML = "";
  const container = document.createElement("div");
  container.className = "jobs-container";

  State.jobs.forEach(job => {
    const row = document.createElement("div");
    row.className = "job-row";
    row.id = `job-row-${job.job_id}`;
    row.innerHTML = `
      <div class="job-main">
        <div class="job-filename">${getEmoji(job.input_format)} ${job.input_filename || job.job_id}</div>
        <div class="job-meta">${job.input_format?.toUpperCase()} → ${job.output_format?.toUpperCase()} &middot; ${fmtDate(job.created_at)}</div>
      </div>
      <div class="job-progress-wrap">
        ${StatusBadge(job.status)}
        ${(job.status === "processing" || job.status === "pending") ? ProgressBar(job.progress || 0) : ""}
      </div>
      <div class="job-meta" style="font-family:var(--font-mono)">${job.progress || 0}%</div>
      <div class="job-actions">
        ${job.status === "completed"
          ? `<a href="${Api.downloadUrl(job.job_id)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>` : ""}
      </div>`;
    container.appendChild(row);
  });
  list.appendChild(container);
}

// ====================================================
// PAGE: Formats
// ====================================================
async function renderFormatsPage() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Supported Formats</h1>
      <p class="page-subtitle">All available input → output conversion pairs.</p>
    </div>
    <div id="formats-content">
      <div class="formats-grid">${[1,2,3,4,5,6].map(() =>
        `<div class="format-card">
          <div class="skeleton" style="height:1.5rem;width:60px;margin-bottom:var(--space-3)"></div>
          <div class="flex gap-2">
            <div class="skeleton" style="height:1.2rem;width:40px;border-radius:var(--radius-full)"></div>
            <div class="skeleton" style="height:1.2rem;width:40px;border-radius:var(--radius-full)"></div>
          </div>
        </div>`).join("")}
      </div>
    </div>`;

  try {
    const data = State.formats || await Api.getFormats();
    State.formats = data;
    data.conversions.forEach(c => { conversionMap[c.from] = c.to; });
    const grid = document.createElement("div");
    grid.className = "formats-grid";
    data.conversions.forEach(c => {
      const card = document.createElement("div");
      card.className = "format-card";
      card.innerHTML = `
        <span class="format-card-from">${getEmoji(c.from)} .${c.from}</span>
        <div class="text-muted" style="font-size:var(--text-xs)">converts to</div>
        <div class="format-targets">${c.to.map(t => `<span class="format-target">.${t}</span>`).join("")}</div>`;
      grid.appendChild(card);
    });
    const fc = document.getElementById("formats-content");
    fc.innerHTML = ""; fc.appendChild(grid);
  } catch {
    document.getElementById("formats-content").innerHTML = EmptyState({
      icon: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      title: "Could not load formats",
      body: "Make sure the backend API is running on localhost:8000.",
    });
  }
}

// ====================================================
// Theme Toggle
// ====================================================
(function () {
  const btn  = document.querySelector("[data-theme-toggle]");
  const html = document.documentElement;
  let theme  = html.getAttribute("data-theme") ||
    (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
  html.setAttribute("data-theme", theme);
  function updateIcon() {
    if (!btn) return;
    btn.innerHTML = theme === "dark"
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
  updateIcon();
  if (btn) btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", theme);
    updateIcon();
  });
})();

// ====================================================
// Mobile Sidebar
// ====================================================
(function () {
  const menuBtn = document.getElementById("menu-btn");
  const sidebar = document.getElementById("sidebar");
  if (!menuBtn || !sidebar) return;
  menuBtn.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  sidebar.querySelectorAll(".nav-item").forEach(a => a.addEventListener("click", () => {
    sidebar.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));
  document.addEventListener("click", e => {
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
})();

// ====================================================
// Bootstrap
// ====================================================
async function init() {
  try {
    const data = await Api.getFormats();
    State.formats = data;
    data.conversions.forEach(c => { conversionMap[c.from] = c.to; });
  } catch {}
  checkApiStatus();
  setInterval(checkApiStatus, 30000);
  Router.resolve();
}

init();
