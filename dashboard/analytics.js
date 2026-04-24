const analyticsStats = document.getElementById("analyticsStats");
const analyticsSignals = document.getElementById("analyticsSignals");
const analyticsRows = document.getElementById("analyticsRows");
const analyticsFeedback = document.getElementById("analyticsFeedback");
const analyticsTableMeta = document.getElementById("analyticsTableMeta");
const analyticsModePill = document.getElementById("analyticsModePill");
const analyticsSyncPill = document.getElementById("analyticsSyncPill");
const analyticsFilterPill = document.getElementById("analyticsFilterPill");

const analyticsSearch = document.getElementById("analyticsSearch");
const analyticsCourse = document.getElementById("analyticsCourse");
const analyticsState = document.getElementById("analyticsState");
const analyticsDateFrom = document.getElementById("analyticsDateFrom");
const analyticsDateTo = document.getElementById("analyticsDateTo");
const analyticsWeek = document.getElementById("analyticsWeek");
const analyticsRowLimit = document.getElementById("analyticsRowLimit");
const downloadWeekSelect = document.getElementById("downloadWeekSelect");

const analyticsAdminBtn = document.getElementById("analyticsAdminBtn");
const analyticsLogoutBtn = document.getElementById("analyticsLogoutBtn");
const maskedViewBtn = document.getElementById("maskedViewBtn");
const fullViewBtn = document.getElementById("fullViewBtn");

const presetTodayBtn = document.getElementById("presetTodayBtn");
const presetWeekBtn = document.getElementById("presetWeekBtn");
const presetSevenDaysBtn = document.getElementById("presetSevenDaysBtn");
const clearAnalyticsFiltersBtn = document.getElementById("clearAnalyticsFiltersBtn");
const downloadFilteredBtn = document.getElementById("downloadFilteredBtn");
const downloadTodayBtn = document.getElementById("downloadTodayBtn");
const downloadWeekBtn = document.getElementById("downloadWeekBtn");

const hourlyChart = document.getElementById("hourlyChart");
const dailyChart = document.getElementById("dailyChart");
const weeklyChart = document.getElementById("weeklyChart");
const branchChart = document.getElementById("branchChart");

const analyticsAdminModal = document.getElementById("analyticsAdminModal");
const closeAnalyticsModalBtn = document.getElementById("closeAnalyticsModalBtn");
const analyticsLoginForm = document.getElementById("analyticsLoginForm");
const analyticsUsername = document.getElementById("analyticsUsername");
const analyticsPassword = document.getElementById("analyticsPassword");
const analyticsModalFeedback = document.getElementById("analyticsModalFeedback");

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setFeedback(message, type = "") {
  analyticsFeedback.textContent = message;
  analyticsFeedback.className = `feedback ${type}`.trim();
}

function setModalFeedback(message, type = "") {
  analyticsModalFeedback.textContent = message;
  analyticsModalFeedback.className = `feedback ${type}`.trim();
}

function sectionChanged(key, payload) {
  const hash = JSON.stringify(payload);
  if (state.sectionHashes[key] === hash) {
    return false;
  }
  state.sectionHashes[key] = hash;
  return true;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildActiveFilters() {
  return {
    search: analyticsSearch.value.trim(),
    course: analyticsCourse.value,
    state: analyticsState.value,
    date_from: analyticsDateFrom.value,
    date_to: analyticsDateTo.value,
    week: analyticsWeek.value,
    row_limit: analyticsRowLimit.value,
  };
}

function buildQueryString(options = {}) {
  const params = new URLSearchParams();
  const filters = options.filters || buildActiveFilters();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  params.set("view", state.viewMode);
  if (options.includeToken && state.cacheToken) {
    params.set("if_token", state.cacheToken);
  }
  return params.toString();
}

function updateAuthUi() {
  maskedViewBtn.classList.toggle("active", state.viewMode === "masked");
  fullViewBtn.classList.toggle("active", state.viewMode === "full");
  fullViewBtn.disabled = !state.authenticated;
  analyticsLogoutBtn.classList.toggle("hidden", !state.authenticated);
  analyticsAdminBtn.textContent = state.authenticated ? `Admin: ${state.username}` : "Admin View";
}

function syncPills(payload) {
  const appliedView = payload?.view?.applied || "masked";
  analyticsModePill.textContent = appliedView === "full" ? "Full View Active" : "Masked View Active";
  const syncTimestamp = payload?.generated_at || state.lastGeneratedAt;
  analyticsSyncPill.textContent = syncTimestamp
    ? `Last Sync ${new Date(syncTimestamp).toLocaleTimeString()}`
    : "Waiting for first sync";

  const filters = buildActiveFilters();
  const tokens = [];
  if (filters.search) tokens.push(`Search: ${filters.search}`);
  if (filters.course) tokens.push(filters.course);
  if (filters.state && filters.state !== "all") tokens.push(filters.state);
  if (filters.week) tokens.push(filters.week);
  if (filters.date_from || filters.date_to) tokens.push(`${filters.date_from || "..."} to ${filters.date_to || "..."}`);
  analyticsFilterPill.textContent = tokens.length ? tokens.join(" | ") : "All Visits";
}

function renderStats(summary) {
  const cards = [
    ["Unique Students", summary.unique_students, "Distinct students in the current filtered result."],
    ["Total Visits", summary.total_visits, "All matched visit records in the current filter set."],
    ["Inside Now", summary.inside_count, "Visits still open without exit time."],
    ["Completed", summary.completed_count, "Visits with both entry and exit recorded."],
    ["Avg Stay", summary.avg_duration_label, "Average duration for completed visits only."],
    ["Active Branches", summary.branch_count, "Distinct branches represented in the filtered data."],
  ];

  if (!sectionChanged("stats", cards)) {
    return;
  }

  analyticsStats.innerHTML = cards.map(([label, value, note]) => `
    <article class="stat-card analytics-stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="panel-note">${escapeHtml(note)}</div>
    </article>
  `).join("");
}

function renderSignals(insights) {
  const signalCards = [
    {
      title: "Peak Day",
      value: insights.busiest_day?.label || "-",
      note: insights.busiest_day ? `${insights.busiest_day.value} visits` : "No visit peak available yet.",
    },
    {
      title: "Low Day",
      value: insights.quiet_day?.label || "-",
      note: insights.quiet_day ? `${insights.quiet_day.value} visits` : "No low-traffic day available yet.",
    },
    {
      title: "Peak Hour",
      value: insights.busiest_hour?.label || "-",
      note: insights.busiest_hour ? `${insights.busiest_hour.value} entries` : "No peak hour available yet.",
    },
    {
      title: "Quiet Hour",
      value: insights.quiet_hour?.label || "-",
      note: insights.quiet_hour ? `${insights.quiet_hour.value} entries` : "No quiet hour available yet.",
    },
    {
      title: "Irregular Opens",
      value: insights.irregular_open_visits ?? 0,
      note: "Open visits still hanging outside the current day boundary.",
    },
  ];

  if (!sectionChanged("signals", signalCards)) {
    return;
  }

  analyticsSignals.innerHTML = signalCards.map((item) => `
    <div class="analytics-signal">
      <span>${escapeHtml(item.title)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.note)}</p>
    </div>
  `).join("");
}

function renderBarChart(root, series, options = {}) {
  const safeSeries = Array.isArray(series) ? series : [];
  const trimmed = options.limit ? safeSeries.slice(-options.limit) : safeSeries;
  const maxValue = Math.max(...trimmed.map((item) => item.value), 0);

  const renderPayload = {
    series: trimmed,
    maxValue,
    emptyLabel: options.emptyLabel || "No data available.",
  };

  if (!sectionChanged(root.id, renderPayload)) {
    return;
  }

  if (!trimmed.length || maxValue === 0) {
    root.innerHTML = `<div class="empty-chart">${escapeHtml(options.emptyLabel || "No data available.")}</div>`;
    return;
  }

  root.innerHTML = trimmed.map((item) => {
    const height = maxValue ? Math.max((item.value / maxValue) * 100, 6) : 0;
    return `
      <div class="chart-bar-card" title="${escapeHtml(`${item.label}: ${item.value}`)}">
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="height:${height}%"></div>
        </div>
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>
    `;
  }).join("");
}

function renderTable(table) {
  const rows = table?.rows || [];
  const tablePayload = {
    total_rows: table?.total_rows || 0,
    returned_rows: table?.returned_rows || 0,
    sample: rows,
  };

  if (!sectionChanged("table", tablePayload)) {
    return;
  }

  analyticsTableMeta.textContent = `${table?.returned_rows || 0} of ${table?.total_rows || 0} rows shown in the live table.`;

  if (!rows.length) {
    analyticsRows.innerHTML = `<tr><td colspan="10">No visit rows matched the current filters.</td></tr>`;
    return;
  }

  analyticsRows.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.visit_id)}</td>
      <td>${escapeHtml(row.student_id)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.father_name || "-")}</td>
      <td>${escapeHtml(row.course || "-")}</td>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.entry_time || "-")}</td>
      <td>${escapeHtml(row.exit_time || "Inside")}</td>
      <td><span class="status-pill ${row.status === "inside" ? "status-inside" : "status-complete"}">${escapeHtml(row.status)}</span></td>
      <td>${escapeHtml(row.duration_label || "-")}</td>
    </tr>
  `).join("");
}

function populateSelect(select, options, fallbackLabel) {
  const currentValue = select.value;
  const optionMarkup = [`<option value="">${escapeHtml(fallbackLabel)}</option>`]
    .concat(options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`))
    .join("");
  select.innerHTML = optionMarkup;
  if (options.includes(currentValue)) {
    select.value = currentValue;
  }
}

function renderPayload(payload) {
  syncPills(payload);
  renderStats(payload.summary || {});
  renderSignals(payload.insights || {});
  renderBarChart(hourlyChart, payload.charts?.hourly || [], { emptyLabel: "No hourly pressure data yet." });
  renderBarChart(dailyChart, payload.charts?.daily || [], { emptyLabel: "No daily trend data yet.", limit: 18 });
  renderBarChart(weeklyChart, payload.charts?.weekly || [], { emptyLabel: "No weekly trend data yet.", limit: 12 });
  renderBarChart(branchChart, payload.charts?.branches || [], { emptyLabel: "No branch distribution data yet." });
  renderTable(payload.table || {});

  populateSelect(analyticsCourse, payload.filters?.course_options || [], "All Branches");
  populateSelect(analyticsWeek, payload.filters?.week_options || [], "All Weeks");
  populateSelect(downloadWeekSelect, payload.filters?.week_options || [], "Select Week");

  if (payload.view?.applied && payload.view.applied !== state.viewMode) {
    state.viewMode = payload.view.applied;
  }
  state.authenticated = !!payload.view?.authenticated;
  state.username = state.authenticated ? state.username : "";
  updateAuthUi();
}

async function refreshAuthState() {
  const response = await fetch("/api/auth-state");
  const data = await response.json();
  state.authenticated = !!data.authenticated;
  state.username = data.username || "";
  if (!state.authenticated) {
    state.viewMode = "masked";
  }
  updateAuthUi();
  return data;
}

async function loadAnalytics(options = {}) {
  if (state.refreshInFlight) {
    return;
  }
  state.refreshInFlight = true;

  try {
    const query = buildQueryString({ includeToken: !options.force });
    const response = await fetch(`/api/analytics?${query}`);
    const payload = await response.json();

    if (payload.unchanged) {
      syncPills(payload);
      if (!options.silent) {
        setFeedback("Analytics synced. No new visit changes detected.", "ok");
      }
      return;
    }

    state.cacheToken = payload.cache_token || "";
    state.lastGeneratedAt = payload.generated_at || state.lastGeneratedAt;
    renderPayload(payload);
    if (!options.silent) {
      const viewLabel = payload.view?.applied === "full" ? "full" : "masked";
      setFeedback(`Analytics updated in ${viewLabel} mode.`, "ok");
    }
  } catch (error) {
    setFeedback("Analytics refresh failed. Check the local server.", "error");
  } finally {
    state.refreshInFlight = false;
  }
}

function schedulePolling() {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(() => {
    loadAnalytics({ force: false, silent: true });
  }, 2000);
}

function debouncedReload() {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.cacheToken = "";
    loadAnalytics({ force: true });
  }, 250);
}

function openAdminModal() {
  analyticsAdminModal.classList.remove("hidden");
  setModalFeedback("Enter admin credentials to enable full visibility.");
  analyticsUsername.focus();
}

function closeAdminModal() {
  analyticsAdminModal.classList.add("hidden");
}

function setDateRange(fromDate, toDate) {
  analyticsDateFrom.value = formatLocalDate(fromDate);
  analyticsDateTo.value = formatLocalDate(toDate);
  analyticsWeek.value = "";
  state.cacheToken = "";
  loadAnalytics({ force: true });
}

function downloadAnalytics(filtersOverride = {}) {
  const query = buildQueryString({ filters: { ...buildActiveFilters(), ...filtersOverride }, includeToken: false });
  window.location.href = `/api/analytics-export?${query}`;
}

analyticsSearch.addEventListener("input", debouncedReload);
[analyticsCourse, analyticsState, analyticsDateFrom, analyticsDateTo, analyticsWeek, analyticsRowLimit].forEach((element) => {
  element.addEventListener("change", () => {
    state.cacheToken = "";
    loadAnalytics({ force: true });
  });
});

maskedViewBtn.addEventListener("click", () => {
  state.viewMode = "masked";
  state.cacheToken = "";
  updateAuthUi();
  loadAnalytics({ force: true });
});

fullViewBtn.addEventListener("click", () => {
  if (!state.authenticated) {
    openAdminModal();
    return;
  }
  state.viewMode = "full";
  state.cacheToken = "";
  updateAuthUi();
  loadAnalytics({ force: true });
});

analyticsAdminBtn.addEventListener("click", () => {
  if (state.authenticated) {
    state.viewMode = "full";
    state.cacheToken = "";
    updateAuthUi();
    loadAnalytics({ force: true });
    return;
  }
  openAdminModal();
});

analyticsLogoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  state.authenticated = false;
  state.username = "";
  state.viewMode = "masked";
  state.cacheToken = "";
  updateAuthUi();
  loadAnalytics({ force: true });
  setFeedback("Admin session closed. Dashboard returned to masked mode.", "ok");
});

closeAnalyticsModalBtn.addEventListener("click", closeAdminModal);
analyticsAdminModal.addEventListener("click", (event) => {
  if (event.target === analyticsAdminModal) {
    closeAdminModal();
  }
});

analyticsLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = analyticsUsername.value.trim();
  const password = analyticsPassword.value;

  if (!username || !password) {
    setModalFeedback("Enter both username and password.", "error");
    return;
  }

  setModalFeedback("Unlocking full view...");
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    setModalFeedback(payload.message || "Login failed.", "error");
    return;
  }

  await refreshAuthState();
  state.viewMode = "full";
  state.cacheToken = "";
  closeAdminModal();
  analyticsPassword.value = "";
  loadAnalytics({ force: true });
  setFeedback("Admin mode unlocked. Full view is now available.", "ok");
});

presetTodayBtn.addEventListener("click", () => {
  const today = new Date();
  setDateRange(today, today);
});

presetWeekBtn.addEventListener("click", () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  setDateRange(start, today);
});

presetSevenDaysBtn.addEventListener("click", () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  setDateRange(start, today);
});

clearAnalyticsFiltersBtn.addEventListener("click", () => {
  analyticsSearch.value = "";
  analyticsCourse.value = "";
  analyticsState.value = "all";
  analyticsDateFrom.value = "";
  analyticsDateTo.value = "";
  analyticsWeek.value = "";
  analyticsRowLimit.value = "250";
  state.cacheToken = "";
  loadAnalytics({ force: true });
});

downloadFilteredBtn.addEventListener("click", () => {
  downloadAnalytics();
});

downloadTodayBtn.addEventListener("click", () => {
  const today = formatLocalDate(new Date());
  downloadAnalytics({ date_from: today, date_to: today, week: "" });
});

downloadWeekBtn.addEventListener("click", () => {
  if (!downloadWeekSelect.value) {
    setFeedback("Select a week before downloading a weekly report.", "error");
    return;
  }
  downloadAnalytics({ week: downloadWeekSelect.value, date_from: "", date_to: "" });
});

async function initialize() {
  await refreshAuthState();
  updateAuthUi();
  await loadAnalytics({ force: true });
  schedulePolling();
}

initialize();
