/* global chrome, QuoskaApi */

"use strict";

const elements = {
  loading: document.querySelector("#loading-view"),
  disconnected: document.querySelector("#disconnected-view"),
  connected: document.querySelector("#connected-view"),
  refresh: document.querySelector("#refresh-button"),
  connect: document.querySelector("#connect-button"),
  connectError: document.querySelector("#connect-error"),
  statusCard: document.querySelector("#status-card"),
  statusDot: document.querySelector("#status-dot"),
  statusLabel: document.querySelector("#status-label"),
  employeeName: document.querySelector("#employee-name"),
  timer: document.querySelector("#timer"),
  timerCaption: document.querySelector("#timer-caption"),
  progressLabel: document.querySelector("#progress-label"),
  progressTrack: document.querySelector("#progress-track"),
  progressFill: document.querySelector("#progress-fill"),
  fields: document.querySelector("#clock-in-fields"),
  project: document.querySelector("#project-select"),
  notes: document.querySelector("#notes-input"),
  actionButtons: document.querySelector("#action-buttons"),
  primary: document.querySelector("#primary-action"),
  secondary: document.querySelector("#secondary-action"),
  actionError: document.querySelector("#action-error"),
  timesLink: document.querySelector("#times-link"),
  dashboardLink: document.querySelector("#dashboard-link"),
  disconnect: document.querySelector("#disconnect-button"),
};

let currentStatus = null;
let timerInterval = null;
let serverOffsetMs = 0;

function showOnly(view) {
  for (const element of [elements.loading, elements.disconnected, elements.connected]) {
    element.classList.toggle("hidden", element !== view);
  }
  elements.refresh.classList.toggle("hidden", view !== elements.connected);
}

function showError(element, message) {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function setBusy(busy) {
  elements.connect.disabled = busy;
  elements.primary.disabled = busy;
  elements.secondary.disabled = busy;
  elements.refresh.disabled = busy;
  elements.disconnect.disabled = busy;
}

function handleAuthenticatedError(error) {
  if (error?.status === 401) {
    currentStatus = null;
    clearInterval(timerInterval);
    showOnly(elements.disconnected);
    return;
  }
  showError(elements.actionError, error.message);
}

function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatHoursMinutes(totalSeconds) {
  const safeMinutes = Math.max(0, Math.floor(totalSeconds / 60));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = String(safeMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function currentTodayWorkedSeconds() {
  const recorded = currentStatus?.todayWorkedSeconds ?? 0;
  if (currentStatus?.activeEntry?.status !== "running") return recorded;
  const now = Date.now() + serverOffsetMs;
  return recorded + Math.max(0, (now - Date.parse(currentStatus.serverNow)) / 1000);
}

function updateProgress() {
  const workedSeconds = currentTodayWorkedSeconds();
  const targetMinutes = currentStatus?.todayTargetMinutes ?? 0;
  const targetSeconds = targetMinutes * 60;
  const percent = targetSeconds > 0
    ? Math.min(100, (workedSeconds / targetSeconds) * 100)
    : 0;
  elements.progressLabel.textContent = targetSeconds > 0
    ? `${formatHoursMinutes(workedSeconds)} / ${formatHoursMinutes(targetSeconds)} Std.`
    : `${formatHoursMinutes(workedSeconds)} Std. heute`;
  elements.progressTrack.classList.toggle("hidden", targetSeconds === 0);
  elements.progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
  elements.progressFill.style.width = `${percent}%`;
  elements.progressFill.classList.toggle("complete", targetSeconds > 0 && workedSeconds >= targetSeconds);
}

function updateTimer() {
  const entry = currentStatus?.activeEntry;
  if (!entry) {
    elements.timer.textContent = "00:00:00";
    return;
  }
  const now = Date.now() + serverOffsetMs;
  const completedBreakMs = (entry.breakMinutes ?? 0) * 60_000;
  const activeBreakMs = currentStatus.activeBreak
    ? Math.max(0, now - Date.parse(currentStatus.activeBreak.breakStart))
    : 0;
  elements.timer.textContent = formatElapsed(
    now - Date.parse(entry.clockIn) - completedBreakMs - activeBreakMs,
  );
  updateProgress();
}

function renderProjects(projects, selectedProjectId) {
  const priorValue = selectedProjectId ?? elements.project.value;
  elements.project.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Ohne Projekt";
  elements.project.append(empty);
  for (const project of projects) {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    elements.project.append(option);
  }
  if ([...elements.project.options].some((option) => option.value === priorValue)) {
    elements.project.value = priorValue;
  }
}

function renderStatus(status) {
  currentStatus = status;
  serverOffsetMs = Date.parse(status.serverNow) - Date.now();
  const state = status.activeEntry?.status ?? "off";
  const isOff = state === "off";
  const isPaused = state === "paused";
  const activeProject = status.projects.find(
    (project) => project.id === status.activeEntry?.projectId,
  );
  elements.statusCard.className = `status-card ${state}`;
  elements.statusDot.className = `status-dot ${state}`;
  elements.statusLabel.textContent = isOff
    ? "Ausgestempelt"
    : isPaused ? "Pause läuft" : "Arbeitszeit läuft";
  elements.employeeName.textContent = status.employeeName;
  elements.timerCaption.textContent = isOff
    ? "Bereit zum Einstempeln"
    : activeProject?.name ?? (isPaused ? "Arbeitszeit pausiert" : "Laufende Arbeitszeit");
  elements.timer.classList.remove("hidden");
  elements.actionButtons.classList.remove("hidden");
  elements.fields.classList.toggle("hidden", !isOff);
  elements.primary.textContent = isOff
    ? "Einstempeln"
    : isPaused ? "Pause beenden" : "Ausstempeln";
  elements.secondary.classList.toggle("hidden", state !== "running");
  elements.actionButtons.dataset.state = state;
  renderProjects(status.projects, status.activeEntry?.projectId);
  updateTimer();
  updateProgress();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  showOnly(elements.connected);
  void chrome.runtime.sendMessage({ type: "QUOSKA_STATUS_CHANGED" });
}

async function loadStatus() {
  showError(elements.actionError, "");
  try {
    renderStatus(await QuoskaApi.getStatus());
  } catch (error) {
    if (error?.status === 401) {
      currentStatus = null;
      clearInterval(timerInterval);
      showOnly(elements.disconnected);
    } else {
      showOnly(elements.connected);
      if (!currentStatus) {
        elements.statusCard.className = "status-card off";
        elements.statusDot.className = "status-dot off";
        elements.statusLabel.textContent = "Status nicht verfügbar";
        elements.employeeName.textContent = "Bitte Verbindung prüfen";
        elements.timerCaption.textContent = "Quoska konnte nicht erreicht werden";
        elements.timer.classList.add("hidden");
        elements.fields.classList.add("hidden");
        elements.actionButtons.classList.add("hidden");
      }
      showError(elements.actionError, error.message);
    }
  }
}

elements.connect.addEventListener("click", async () => {
  setBusy(true);
  showError(elements.connectError, "");
  try {
    const result = await chrome.runtime.sendMessage({ type: "QUOSKA_CONNECT" });
    if (!result?.ok) {
      throw new QuoskaApi.ApiError(
        result?.error ?? "Die Verbindung konnte nicht hergestellt werden.",
      );
    }
    await loadStatus();
  } catch (error) {
    showOnly(elements.disconnected);
    showError(elements.connectError, error.message);
  } finally {
    setBusy(false);
  }
});

elements.primary.addEventListener("click", async () => {
  const state = currentStatus?.activeEntry?.status ?? "off";
  const body = state === "off"
    ? {
        action: "clock-in",
        projectId: elements.project.value || null,
        notes: elements.notes.value.trim() || undefined,
      }
    : { action: state === "paused" ? "resume" : "clock-out" };
  setBusy(true);
  showError(elements.actionError, "");
  try {
    renderStatus(await QuoskaApi.performAction(body));
    if (body.action === "clock-in") elements.notes.value = "";
  } catch (error) {
    handleAuthenticatedError(error);
  } finally {
    setBusy(false);
  }
});

elements.secondary.addEventListener("click", async () => {
  setBusy(true);
  showError(elements.actionError, "");
  try {
    renderStatus(await QuoskaApi.performAction({ action: "pause" }));
  } catch (error) {
    handleAuthenticatedError(error);
  } finally {
    setBusy(false);
  }
});

elements.refresh.addEventListener("click", () => void loadStatus());
elements.disconnect.addEventListener("click", async () => {
  setBusy(true);
  showError(elements.actionError, "");
  try {
    await QuoskaApi.disconnect();
    currentStatus = null;
    clearInterval(timerInterval);
    showOnly(elements.disconnected);
    void chrome.runtime.sendMessage({ type: "QUOSKA_STATUS_CHANGED" });
  } catch (error) {
    handleAuthenticatedError(error);
  } finally {
    setBusy(false);
  }
});

elements.timesLink.href = `${QuoskaApi.appUrl}/app/my-times`;
elements.dashboardLink.href = `${QuoskaApi.appUrl}/app/dashboard`;

void (async () => {
  const token = await QuoskaApi.getStoredToken();
  if (!token) return showOnly(elements.disconnected);
  await loadStatus();
})();
