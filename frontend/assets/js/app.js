/**
 * app.js - Router, state, and page renderers
 */
const DEFAULT_CONVERSIONS = [
  { from: "docx", to: ["pdf", "txt", "html"] },
  { from: "pdf", to: ["docx", "txt", "png", "jpg"] },
  { from: "pptx", to: ["pdf"] },
  { from: "ppt", to: ["pdf"] },
  { from: "xlsx", to: ["csv", "pdf"] },
  { from: "xls", to: ["csv", "pdf"] },
  { from: "csv", to: ["xlsx"] },
  { from: "txt", to: ["pdf", "docx"] },
  { from: "html", to: ["pdf"] },
  { from: "png", to: ["pdf"] },
  { from: "jpg", to: ["pdf"] },
  { from: "jpeg", to: ["pdf"] },
  { from: "bmp", to: ["pdf"] },
];

const State = {
  jobs: [],
  formats: { conversions: DEFAULT_CONVERSIONS },
  pollers: {},
};

const conversionMap = {};
DEFAULT_CONVERSIONS.forEach(c => {
  conversionMap[c.from] = c.to;
});

const Router = {
  routes: {
    "/": renderUploadPage,
    "/jobs": renderJobsPage,
    "/formats": renderFormatsPage,
  },
  current: null,
  navigate(path) {
    window.location.hash = "#" + path;
  },
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

function applyConversions(data) {
  if (!data?.conversions?.length) return;
  State.formats = data;
  data.conversions.forEach(c => {
    conversionMap[c.from] = c.to;
  });
}

async function checkApiStatus() {
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  try {
    const data = await Api.health();
    dot.className = "status-dot online";
    text.textContent = `API v${data.version || "live"}`;
  } catch {
    dot.className = "status-dot offline";
    text.textContent = "API offline";
  }
}

function updateBadge() {
  const active = State.jobs.filter(j => j.status === "pending" || j.status === "processing").length;
  const badge = document.getElementById("active-jobs-badge");
  if (!badge) return;
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
        if (job.status === "completed") showToast(`Done: ${job.output_filename}`, "success");
        else showToast(`Failed: ${job.error || "Unknown error"}`, "error");
      }
      if (Router.current === "/jobs") renderJobsPage();
      const resultEl = document.getElementById("job-result-" + jobId);
      if (resultEl) renderJobResult(job);
    } catch {
      clearInterval(State.pollers[jobId]);
      delete State.pollers[jobId];
      showToast("Could not refresh job status. Check the API connection.", "error");
      checkApiStatus();
    }
  }, 2000);
}

function renderJobResult(job) {
  const el = document.getElementById("job-result-" + job.job_id);
  if (!el) return;
  const inputName = escapeHtml(job.input_filename || "Uploaded file");
  const outputName = escapeHtml(job.output_filename || "");
  const error = escapeHtml(job.error || "Unknown error");
  el.innerHTML = `
    <div class="job-result-header">
      <div class="flex items-center gap-2">${StatusBadge(job.status)}</div>
      ${job.status === "completed"
        ? `<a href="${Api.downloadUrl(job.job_id)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>`
        : job.status === "failed" ? `<span class="text-muted">${error}</span>` : ""}
    </div>
    <div class="job-result-info">${inputName} to ${escapeHtml(job.output_format?.toUpperCase() || "")}${outputName ? ` · ${outputName}` : ""}</div>
    ${job.status !== "completed" && job.status !== "failed" ? ProgressBar(job.progress || 0) : ""}
  `;
}

// ====================================================
// PAGE: Upload & Convert
// ====================================================
async function renderUploadPage() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <section class="page-header">
      <div>
        <span class="eyebrow">DocConvert Studio</span>
        <h1 class="page-title">Convert client files cleanly.</h1>
        <p class="page-subtitle">A polished workspace for PDF, Office, spreadsheet, image, and text conversion with live job progress and a monetization-ready layout.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Start Conversion
          </a>
          <a class="btn btn-secondary" href="#/formats">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Formats
          </a>
        </div>
      </div>
      <div class="hero-metrics" aria-label="Conversion highlights">
        <div class="metric"><strong>15+</strong><span>Format routes</span></div>
        <div class="metric"><strong>50MB</strong><span>Upload limit</span></div>
        <div class="metric"><strong>Live</strong><span>Job tracking</span></div>
      </div>
    </section>

    <section class="upload-layout">
      <div class="conversion-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-kicker">Convert</span>
            <h2>New file</h2>
            <p>Drop a document, choose the output, and keep moving.</p>
          </div>
          <span class="security-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
            Session based
          </span>
        </div>

        <div class="upload-zone" id="upload-zone" tabindex="0" role="button" aria-label="Click or drag to upload a file">
          <input type="file" id="file-input" accept="*/*" aria-hidden="true" tabindex="-1" />
          <div class="upload-content">
            <div class="upload-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p class="upload-title">Drop your file here</p>
            <p class="upload-subtitle">or <strong>browse</strong> to upload</p>
            <div class="upload-specs" aria-label="Upload details">
              <span class="spec-pill">PDF</span>
              <span class="spec-pill">DOCX</span>
              <span class="spec-pill">XLSX</span>
              <span class="spec-pill">Images</span>
            </div>
          </div>
        </div>

        <div id="file-preview-wrap"></div>
        <div id="format-picker-wrap"></div>
        <div id="convert-btn-wrap"></div>
        <div id="job-result-wrap"></div>
      </div>

      <aside class="side-rail" aria-label="Workspace details">
        <div class="rail-panel">
          <div>
            <span class="panel-kicker">Workflow</span>
            <h2>Conversion desk</h2>
            <p>Designed for repeat work, fast scans, and future paid tiers.</p>
          </div>
          <ul class="rail-list">
            <li>
              <span class="rail-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20V10"/><path d="m18 14-6 6-6-6"/><path d="M20 4H4"/></svg></span>
              <span><strong>Queue feedback</strong><span>Progress stays visible after upload.</span></span>
            </li>
            <li>
              <span class="rail-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 12l2 2 4-4"/><path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-1V4c0-.552-.448-1-1-1h-3V2c0-.552-.448-1-1-1h-3c-.552 0-1 .448-1 1v1H8c-.552 0-1 .448-1 1v3H6c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1"/></svg></span>
              <span><strong>Format guardrails</strong><span>Only valid targets are offered.</span></span>
            </li>
            <li>
              <span class="rail-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></span>
              <span><strong>Growth surface</strong><span>Rail supports ads, upsells, and tips.</span></span>
            </li>
          </ul>
        </div>
        <div class="sponsor-slot">
          <span class="panel-kicker">Partner space</span>
          <strong>Reserved monetization slot</strong>
          <span>Ready for sponsored tools, credit packs, or contextual offers without crowding conversion.</span>
        </div>
      </aside>
    </section>`;

  let selectedFile = null;
  let selectedFormat = null;

  const zone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  zone.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    selectedFile = file;
    selectedFormat = null;
    const ext = getFileExtension(file.name);
    renderFilePreview(file, ext);
    renderFormatPicker(ext);
    renderConvertBtn();
    document.getElementById("job-result-wrap").innerHTML = "";
  }

  function renderFilePreview(file, ext) {
    document.getElementById("file-preview-wrap").innerHTML = `
      <div class="file-preview">
        <span class="file-icon" aria-hidden="true">${getEmoji(ext)}</span>
        <div class="file-info">
          <div class="file-name">${escapeHtml(file.name)}</div>
          <div class="file-size">${fmtSize(file.size)} · .${escapeHtml(ext.toUpperCase())}</div>
        </div>
        <button class="file-remove btn btn-icon" id="remove-file-btn" aria-label="Remove file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
    document.getElementById("remove-file-btn").addEventListener("click", () => {
      selectedFile = null;
      selectedFormat = null;
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
      wrap.innerHTML = `<p class="text-muted mt-4">No supported outputs for <strong>.${escapeHtml(ext)}</strong>. See <a href="#/formats" style="color:var(--color-primary);font-weight:800">Formats</a>.</p>`;
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      ${selectedFormat ? `Convert to .${escapeHtml(selectedFormat.toUpperCase())}` : "Choose an output format"}
    </button>`;
    if (ready) document.getElementById("convert-btn").addEventListener("click", doConvert);
  }

  async function doConvert() {
    const btn = document.getElementById("convert-btn");
    btn.disabled = true;
    btn.innerHTML = spinnerIcon() + "Uploading";
    try {
      const result = await Api.uploadConvert(selectedFile, selectedFormat);
      const job = {
        job_id: result.job_id,
        status: result.status,
        input_filename: selectedFile.name,
        input_format: getFileExtension(selectedFile.name),
        output_format: selectedFormat,
        progress: 0,
        created_at: new Date().toISOString(),
      };
      State.jobs.unshift(job);
      updateBadge();
      const rw = document.getElementById("job-result-wrap");
      rw.innerHTML = `<div id="job-result-${job.job_id}" class="job-result"></div>`;
      renderJobResult(job);
      startPolling(job.job_id);
      showToast("Job queued. Conversion started.", "info");
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Convert another file`;
      btn.onclick = () => Router.resolve();
    } catch (err) {
      showToast(err.message, "error");
      btn.disabled = false;
      btn.innerHTML = "Retry conversion";
      btn.onclick = doConvert;
    }
  }
}

// ====================================================
// PAGE: Jobs
// ====================================================
function renderJobsPage() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <section class="page-header">
      <div>
        <span class="eyebrow">Jobs</span>
        <h1 class="page-title">Conversion queue.</h1>
        <p class="page-subtitle">Track in-session work, download completed files, and keep active conversions visible.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="refresh-jobs-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>
    </section>
    <div id="jobs-list"></div>`;
  document.getElementById("refresh-jobs-btn").addEventListener("click", renderJobsPage);

  const list = document.getElementById("jobs-list");
  if (!State.jobs.length) {
    list.innerHTML = EmptyState({
      icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>`,
      title: "No jobs yet",
      body: "Upload a file to start converting. Finished files will appear here during this session.",
    });
    return;
  }

  const container = document.createElement("div");
  container.className = "jobs-container";
  State.jobs.forEach(job => {
    const row = document.createElement("div");
    row.className = "job-row";
    row.id = `job-row-${job.job_id}`;
    row.innerHTML = `
      <div class="job-main">
        <div class="job-filename">${getEmoji(job.input_format)} ${escapeHtml(job.input_filename || job.job_id)}</div>
        <div class="job-meta">${escapeHtml(job.input_format?.toUpperCase() || "")} to ${escapeHtml(job.output_format?.toUpperCase() || "")} · ${fmtDate(job.created_at)}</div>
      </div>
      <div class="job-progress-wrap">
        ${StatusBadge(job.status)}
        ${(job.status === "processing" || job.status === "pending") ? ProgressBar(job.progress || 0) : ""}
      </div>
      <div class="job-percent">${job.progress || 0}%</div>
      <div class="job-actions">
        ${job.status === "completed"
          ? `<a href="${Api.downloadUrl(job.job_id)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>` : ""}
      </div>`;
    container.appendChild(row);
  });
  list.innerHTML = "";
  list.appendChild(container);
}

// ====================================================
// PAGE: Formats
// ====================================================
async function renderFormatsPage() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <section class="page-header">
      <div>
        <span class="eyebrow">Formats</span>
        <h1 class="page-title">Supported routes.</h1>
        <p class="page-subtitle">Conversion options are grouped by input type so customers can scan capability before uploading.</p>
      </div>
      <div class="header-actions">
        <a class="btn btn-primary" href="#/">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          New Conversion
        </a>
      </div>
    </section>
    <div id="formats-content">
      <div class="formats-grid">${[1, 2, 3, 4, 5, 6].map(() =>
        `<div class="format-card">
          <div class="skeleton" style="height:1.7rem;width:78px;margin-bottom:var(--space-3)"></div>
          <div class="flex gap-2">
            <div class="skeleton" style="height:1.5rem;width:52px;border-radius:var(--radius-full)"></div>
            <div class="skeleton" style="height:1.5rem;width:52px;border-radius:var(--radius-full)"></div>
          </div>
        </div>`).join("")}
      </div>
    </div>`;

  try {
    const data = await Api.getFormats();
    applyConversions(data);
    renderFormatsGrid(data);
  } catch {
    renderFormatsGrid(State.formats, true);
  }
}

function renderFormatsGrid(data, offline = false) {
  const grid = document.createElement("div");
  grid.className = "formats-grid";
  data.conversions.forEach(c => {
    const card = document.createElement("div");
    card.className = "format-card";
    card.innerHTML = `
      <div>
        <span class="format-card-from">${getEmoji(c.from)} .${escapeHtml(c.from)}</span>
        <div class="format-meta">${c.to.length} target${c.to.length === 1 ? "" : "s"} available</div>
      </div>
      <div class="format-targets">${c.to.map(t => `<span class="format-target">.${escapeHtml(t)}</span>`).join("")}</div>`;
    grid.appendChild(card);
  });
  const fc = document.getElementById("formats-content");
  fc.innerHTML = "";
  if (offline) {
    const note = document.createElement("p");
    note.className = "text-muted";
    note.style.marginBottom = "var(--space-4)";
    note.textContent = "Showing built-in routes while the API is offline.";
    fc.appendChild(note);
  }
  fc.appendChild(grid);
}

// ====================================================
// Theme Toggle
// ====================================================
(function () {
  const btn = document.querySelector("[data-theme-toggle]");
  const html = document.documentElement;
  let theme = localStorage.getItem("docconvert-theme") ||
    html.getAttribute("data-theme") ||
    (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
  html.setAttribute("data-theme", theme);
  function updateIcon() {
    if (!btn) return;
    btn.innerHTML = theme === "dark"
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
  updateIcon();
  if (btn) btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", theme);
    localStorage.setItem("docconvert-theme", theme);
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
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
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
    applyConversions(data);
  } catch {}
  checkApiStatus();
  setInterval(checkApiStatus, 30000);
  Router.resolve();
}

init();
