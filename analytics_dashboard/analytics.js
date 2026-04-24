// ── DOM refs ──────────────────────────────────────────────────
const analyticsStats        = document.getElementById("analyticsStats");
const analyticsSignals      = document.getElementById("analyticsSignals");
const analyticsRows         = document.getElementById("analyticsRows");
const analyticsFeedback     = document.getElementById("analyticsFeedback");
const analyticsTableMeta    = document.getElementById("analyticsTableMeta");
const analyticsModePill     = document.getElementById("analyticsModePill");
const analyticsSyncPill     = document.getElementById("analyticsSyncPill");
const analyticsFilterPill   = document.getElementById("analyticsFilterPill");

const analyticsSearch       = document.getElementById("analyticsSearch");
const analyticsCourse       = document.getElementById("analyticsCourse");
const analyticsState        = document.getElementById("analyticsState");
const analyticsDateFrom     = document.getElementById("analyticsDateFrom");
const analyticsDateTo       = document.getElementById("analyticsDateTo");
const analyticsWeek         = document.getElementById("analyticsWeek");
const analyticsRowLimit     = document.getElementById("analyticsRowLimit");
const downloadWeekSelect    = document.getElementById("downloadWeekSelect");

const analyticsAdminBtn     = document.getElementById("analyticsAdminBtn");
const analyticsLogoutBtn    = document.getElementById("analyticsLogoutBtn");
const maskedViewBtn         = document.getElementById("maskedViewBtn");
const fullViewBtn           = document.getElementById("fullViewBtn");
const modeDot               = document.getElementById("modeDot");
const modeLabel             = document.getElementById("modeLabel");

const presetTodayBtn        = document.getElementById("presetTodayBtn");
const presetWeekBtn         = document.getElementById("presetWeekBtn");
const presetSevenDaysBtn    = document.getElementById("presetSevenDaysBtn");
const clearAnalyticsFiltersBtn = document.getElementById("clearAnalyticsFiltersBtn");
const downloadFilteredBtn   = document.getElementById("downloadFilteredBtn");
const downloadTodayBtn      = document.getElementById("downloadTodayBtn");
const downloadWeekBtn       = document.getElementById("downloadWeekBtn");

const hourlyChart   = document.getElementById("hourlyChart");
const dailyChart    = document.getElementById("dailyChart");
const weeklyChart   = document.getElementById("weeklyChart");
const branchChart   = document.getElementById("branchChart");

const analyticsAdminModal     = document.getElementById("analyticsAdminModal");
const closeAnalyticsModalBtn  = document.getElementById("closeAnalyticsModalBtn");
const analyticsLoginForm      = document.getElementById("analyticsLoginForm");
const analyticsUsername       = document.getElementById("analyticsUsername");
const analyticsPassword       = document.getElementById("analyticsPassword");
const analyticsModalFeedback  = document.getElementById("analyticsModalFeedback");

// ── State ─────────────────────────────────────────────────────
const state = {
  authenticated: false,
  username: "",
  viewMode: "masked",
  cacheToken: "",
  pollTimer: null,
  refreshInFlight: false,
  searchTimer: null,
  sectionHashes: {},
  lastGeneratedAt: "",
};

// ── Helpers ───────────────────────────────────────────────────
function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setFeedback(msg, type = "") {
  analyticsFeedback.textContent = msg;
  analyticsFeedback.className = `inline-feedback ${type}`.trim();
}

function setModalFeedback(msg, type = "") {
  analyticsModalFeedback.textContent = msg;
  analyticsModalFeedback.className = `modal-feedback ${type}`.trim();
}

function changed(key, payload) {
  const h = JSON.stringify(payload);
  if (state.sectionHashes[key] === h) return false;
  state.sectionHashes[key] = h;
  return true;
}

function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function buildFilters() {
  return {
    search:    analyticsSearch.value.trim(),
    course:    analyticsCourse.value,
    state:     analyticsState.value,
    date_from: analyticsDateFrom.value,
    date_to:   analyticsDateTo.value,
    week:      analyticsWeek.value,
    row_limit: analyticsRowLimit.value,
  };
}

function buildQuery(opts = {}) {
  const p = new URLSearchParams();
  const f = opts.filters || buildFilters();
  Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
  p.set("view", state.viewMode);
  if (opts.includeToken && state.cacheToken) p.set("if_token", state.cacheToken);
  return p.toString();
}

// ── Auth UI ───────────────────────────────────────────────────
function updateAuthUi() {
  maskedViewBtn.classList.toggle("active", state.viewMode === "masked");
  fullViewBtn.classList.toggle("active", state.viewMode === "full");
  fullViewBtn.disabled = !state.authenticated;
  analyticsLogoutBtn.classList.toggle("hidden", !state.authenticated);

  const isFull = state.viewMode === "full" && state.authenticated;
  modeDot.className = "mode-dot" + (isFull ? " full" : "");
  modeLabel.textContent = isFull ? "Full View" : "Masked View";
  analyticsAdminBtn.textContent = state.authenticated ? `Admin: ${state.username}` : "Unlock Full View";
}

// ── Pills ─────────────────────────────────────────────────────
function syncPills(payload) {
  const view = payload?.view?.applied || "masked";
  analyticsModePill.textContent = view === "full" ? "Full" : "Masked";
  analyticsModePill.className = `status-chip mode-chip${view === "full" ? " full-mode" : ""}`;

  const ts = payload?.generated_at || state.lastGeneratedAt;
  analyticsSyncPill.textContent = ts
    ? `Synced ${new Date(ts).toLocaleTimeString()}`
    : "Syncing…";

  const f = buildFilters();
  const tokens = [];
  if (f.search)  tokens.push(`"${f.search}"`);
  if (f.course)  tokens.push(f.course);
  if (f.state && f.state !== "all") tokens.push(f.state);
  if (f.week)    tokens.push(f.week);
  if (f.date_from || f.date_to) tokens.push(`${f.date_from || "…"} → ${f.date_to || "…"}`);
  analyticsFilterPill.textContent = tokens.length ? tokens.join(" · ") : "All Visits";
}

// ── Stat cards ────────────────────────────────────────────────
function renderStats(summary) {
  const cards = [
    ["Unique Students", summary.unique_students,   "Students in filtered result"],
    ["Total Visits",    summary.total_visits,      "Matched visit records"],
    ["Inside Now",      summary.inside_count,      "Open visits without exit"],
    ["Completed",       summary.completed_count,   "Visits with entry & exit"],
    ["Avg Stay",        summary.avg_duration_label,"Avg duration, completed only"],
    ["Branches",        summary.branch_count,      "Distinct branches in filter"],
  ];
  if (!changed("stats", cards)) return;
  analyticsStats.innerHTML = cards.map(([label, value, note]) => `
    <div class="stat-card">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${esc(value ?? "—")}</div>
      <div class="stat-note">${esc(note)}</div>
    </div>
  `).join("");
}

// ── Bar charts ────────────────────────────────────────────────
function renderBarChart(root, series, opts = {}) {
  const safe = Array.isArray(series) ? series : [];
  const trimmed = opts.limit ? safe.slice(-opts.limit) : safe;
  const max = Math.max(...trimmed.map(i => i.value), 0);
  const payload = { trimmed, max, empty: opts.emptyLabel || "No data yet." };
  if (!changed(root.id, payload)) return;

  if (!trimmed.length || max === 0) {
    root.innerHTML = `<div class="chart-empty">${esc(opts.emptyLabel || "No data yet.")}</div>`;
    return;
  }

  root.innerHTML = trimmed.map(item => {
    const pct = max ? Math.max((item.value / max) * 100, 4) : 0;
    return `
      <div class="bar-col" title="${esc(item.label)}: ${esc(item.value)}">
        <div class="bar-track">
          <div class="bar-fill" style="height:${pct}%"></div>
        </div>
        <div class="bar-val">${esc(item.value)}</div>
        <div class="bar-lbl">${esc(item.label)}</div>
      </div>
    `;
  }).join("");
}

// ── Signals ───────────────────────────────────────────────────
function renderSignals(insights) {
  const rows = [
    { name: "Peak Day",       val: insights.busiest_day?.label  || "—", note: insights.busiest_day  ? `${insights.busiest_day.value} visits`  : "No data" },
    { name: "Quiet Day",      val: insights.quiet_day?.label    || "—", note: insights.quiet_day    ? `${insights.quiet_day.value} visits`    : "No data" },
    { name: "Peak Hour",      val: insights.busiest_hour?.label || "—", note: insights.busiest_hour ? `${insights.busiest_hour.value} entries` : "No data" },
    { name: "Quiet Hour",     val: insights.quiet_hour?.label   || "—", note: insights.quiet_hour   ? `${insights.quiet_hour.value} entries`   : "No data" },
    { name: "Open (hanging)", val: insights.irregular_open_visits ?? 0, note: "Visits open past day boundary" },
  ];
  if (!changed("signals", rows)) return;
  analyticsSignals.innerHTML = rows.map(r => `
    <div class="signal-row">
      <span class="signal-name">${esc(r.name)}</span>
      <div>
        <div class="signal-val">${esc(r.val)}</div>
        <div class="signal-note">${esc(r.note)}</div>
      </div>
    </div>
  `).join("");
}

// ── Table ─────────────────────────────────────────────────────
function renderTable(table) {
  const rows = table?.rows || [];
  const payload = { total: table?.total_rows || 0, returned: table?.returned_rows || 0, sample: rows };
  if (!changed("table", payload)) return;

  analyticsTableMeta.textContent = `${payload.returned} of ${payload.total} rows`;

  if (!rows.length) {
    analyticsRows.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:28px">No rows matched the current filters.</td></tr>`;
    return;
  }

  analyticsRows.innerHTML = rows.map(row => `
    <tr>
      <td>${esc(row.visit_id)}</td>
      <td>${esc(row.student_id)}</td>
      <td>${esc(row.name)}</td>
      <td>${esc(row.father_name || "—")}</td>
      <td>${esc(row.course || "—")}</td>
      <td>${esc(row.date)}</td>
      <td>${esc(row.entry_time || "—")}</td>
      <td>${esc(row.exit_time || "Inside")}</td>
      <td>${row.status === "inside"
          ? `<span class="pill-inside">Inside</span>`
          : `<span class="pill-done">Done</span>`}</td>
      <td>${esc(row.duration_label || "—")}</td>
    </tr>
  `).join("");
}

// ── Select helpers ────────────────────────────────────────────
function fillSelect(el, options, fallback) {
  const cur = el.value;
  el.innerHTML = [`<option value="">${esc(fallback)}</option>`]
    .concat(options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`))
    .join("");
  if (options.includes(cur)) el.value = cur;
}

// ── Main render ───────────────────────────────────────────────
function renderPayload(payload) {
  syncPills(payload);
  renderStats(payload.summary || {});
  renderSignals(payload.insights || {});
  renderBarChart(hourlyChart, payload.charts?.hourly  || [], { emptyLabel: "No hourly data yet." });
  renderBarChart(dailyChart,  payload.charts?.daily   || [], { emptyLabel: "No daily data yet.",  limit: 20 });
  renderBarChart(weeklyChart, payload.charts?.weekly  || [], { emptyLabel: "No weekly data yet.", limit: 12 });
  renderBarChart(branchChart, payload.charts?.branches|| [], { emptyLabel: "No branch data yet." });
  renderTable(payload.table || {});

  fillSelect(analyticsCourse,  payload.filters?.course_options || [], "All Branches");
  fillSelect(analyticsWeek,    payload.filters?.week_options   || [], "All Weeks");
  fillSelect(downloadWeekSelect, payload.filters?.week_options || [], "Select Week");

  if (payload.view?.applied && payload.view.applied !== state.viewMode) {
    state.viewMode = payload.view.applied;
  }
  state.authenticated = !!payload.view?.authenticated;
  if (!state.authenticated) state.username = "";
  updateAuthUi();
}

// ── Data loading ──────────────────────────────────────────────
async function refreshAuthState() {
  const res  = await fetch("/api/auth-state");
  const data = await res.json();
  state.authenticated = !!data.authenticated;
  state.username = data.username || "";
  if (!state.authenticated) state.viewMode = "masked";
  updateAuthUi();
  return data;
}

async function loadAnalytics(opts = {}) {
  if (state.refreshInFlight) return;
  state.refreshInFlight = true;
  try {
    const q   = buildQuery({ includeToken: !opts.force });
    const res = await fetch(`/api/analytics?${q}`);
    const p   = await res.json();

    if (p.unchanged) {
      syncPills(p);
      if (!opts.silent) setFeedback("Up to date. No new changes.", "ok");
      return;
    }

    state.cacheToken = p.cache_token || "";
    state.lastGeneratedAt = p.generated_at || state.lastGeneratedAt;
    renderPayload(p);
    if (!opts.silent) {
      setFeedback(`Updated · ${p.view?.applied === "full" ? "Full" : "Masked"} view`, "ok");
    }
  } catch {
    setFeedback("Refresh failed. Check the server.", "error");
  } finally {
    state.refreshInFlight = false;
  }
}

function startPolling() {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(() => loadAnalytics({ force: false, silent: true }), 2000);
}

function debouncedReload() {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.cacheToken = "";
    loadAnalytics({ force: true });
  }, 250);
}

function setDateRange(from, to) {
  analyticsDateFrom.value = localDate(from);
  analyticsDateTo.value   = localDate(to);
  analyticsWeek.value     = "";
  state.cacheToken = "";
  loadAnalytics({ force: true });
}

function downloadAnalytics(override = {}) {
  const q = buildQuery({ filters: { ...buildFilters(), ...override }, includeToken: false });
  window.location.href = `/api/analytics-export?${q}`;
}

// ── Modal ─────────────────────────────────────────────────────
function openModal() {
  analyticsAdminModal.classList.remove("hidden");
  setModalFeedback("Enter admin credentials to enable full visibility.");
  analyticsUsername.focus();
}

function closeModal() {
  analyticsAdminModal.classList.add("hidden");
}

// ── Event listeners ───────────────────────────────────────────
analyticsSearch.addEventListener("input", debouncedReload);
[analyticsCourse, analyticsState, analyticsDateFrom, analyticsDateTo, analyticsWeek, analyticsRowLimit].forEach(el => {
  el.addEventListener("change", () => { state.cacheToken = ""; loadAnalytics({ force: true }); });
});

maskedViewBtn.addEventListener("click", () => {
  state.viewMode = "masked"; state.cacheToken = "";
  updateAuthUi(); loadAnalytics({ force: true });
});

fullViewBtn.addEventListener("click", () => {
  if (!state.authenticated) { openModal(); return; }
  state.viewMode = "full"; state.cacheToken = "";
  updateAuthUi(); loadAnalytics({ force: true });
});

analyticsAdminBtn.addEventListener("click", () => {
  if (state.authenticated) {
    state.viewMode = "full"; state.cacheToken = "";
    updateAuthUi(); loadAnalytics({ force: true });
    return;
  }
  openModal();
});

analyticsLogoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  state.authenticated = false; state.username = "";
  state.viewMode = "masked"; state.cacheToken = "";
  updateAuthUi(); loadAnalytics({ force: true });
  setFeedback("Signed out. Returned to masked view.", "ok");
});

closeAnalyticsModalBtn.addEventListener("click", closeModal);
analyticsAdminModal.addEventListener("click", e => { if (e.target === analyticsAdminModal) closeModal(); });

analyticsLoginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const username = analyticsUsername.value.trim();
  const password = analyticsPassword.value;
  if (!username || !password) { setModalFeedback("Enter both username and password.", "error"); return; }
  setModalFeedback("Verifying…");
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const p = await res.json();
  if (!res.ok || !p.ok) { setModalFeedback(p.message || "Login failed.", "error"); return; }
  await refreshAuthState();
  state.viewMode = "full"; state.cacheToken = "";
  closeModal(); analyticsPassword.value = "";
  loadAnalytics({ force: true });
  setFeedback("Full view unlocked.", "ok");
});

presetTodayBtn.addEventListener("click", () => { const t = new Date(); setDateRange(t, t); });
presetWeekBtn.addEventListener("click",  () => {
  const t = new Date(); const s = new Date(t);
  s.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  setDateRange(s, t);
});
presetSevenDaysBtn.addEventListener("click", () => {
  const t = new Date(); const s = new Date(t);
  s.setDate(t.getDate() - 6);
  setDateRange(s, t);
});

clearAnalyticsFiltersBtn.addEventListener("click", () => {
  analyticsSearch.value = ""; analyticsCourse.value = "";
  analyticsState.value = "all"; analyticsDateFrom.value = "";
  analyticsDateTo.value = ""; analyticsWeek.value = "";
  analyticsRowLimit.value = "250";
  state.cacheToken = ""; loadAnalytics({ force: true });
});

downloadFilteredBtn.addEventListener("click",  () => downloadAnalytics());
downloadTodayBtn.addEventListener("click", () => {
  const t = localDate(new Date());
  downloadAnalytics({ date_from: t, date_to: t, week: "" });
});
downloadWeekBtn.addEventListener("click", () => {
  if (!downloadWeekSelect.value) { setFeedback("Select a week first.", "error"); return; }
  downloadAnalytics({ week: downloadWeekSelect.value, date_from: "", date_to: "" });
});

// ── Init ──────────────────────────────────────────────────────
async function initialize() {
  await refreshAuthState();
  updateAuthUi();
  await loadAnalytics({ force: true });
  startPolling();
}

initialize();
