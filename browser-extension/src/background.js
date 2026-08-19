/* global chrome, importScripts, QuoskaApi */

"use strict";

importScripts("config.js", "api.js");

const REFRESH_ALARM = "quoska-status-refresh";
const STATE_COLORS = {
  running: "#059669",
  paused: "#d97706",
  error: "#dc2626",
};
let connectionPromise = null;
let sourceIconPromise = null;
const renderedIcons = new Map();

async function getSourceIcon() {
  if (!sourceIconPromise) {
    sourceIconPromise = fetch(chrome.runtime.getURL("icons/icon-192.png"))
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob));
  }
  return sourceIconPromise;
}

async function getStateIcon(color) {
  if (renderedIcons.has(color)) return renderedIcons.get(color);
  const sourceIcon = await getSourceIcon();
  const imageData = {};
  for (const size of [16, 32]) {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d");
    context.drawImage(sourceIcon, 36, 36, 120, 120, 0, 0, size, size);
    if (color) {
      const radius = Math.max(2, Math.round(size * 0.125));
      const center = size - radius - 1;
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(center, center, radius + 1, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = color;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();
    }
    imageData[size] = context.getImageData(0, 0, size, size);
  }
  renderedIcons.set(color, imageData);
  return imageData;
}

async function setStateIcon(color) {
  try {
    await chrome.action.setIcon({ imageData: await getStateIcon(color) });
  } catch {
    await chrome.action.setIcon({ path: "icons/icon-192.png" });
  }
}

async function setToolbarState(status) {
  const state = status?.activeEntry?.status ?? "off";
  const toolbar = state === "running"
    ? { color: STATE_COLORS.running, title: "Quoska · Arbeitszeit läuft" }
    : state === "paused"
      ? { color: STATE_COLORS.paused, title: "Quoska · Pause läuft" }
      : { color: null, title: "Quoska · Ausgestempelt" };
  await Promise.all([
    chrome.action.setBadgeText({ text: "" }),
    chrome.action.setTitle({ title: toolbar.title }),
    setStateIcon(toolbar.color),
  ]);
}

async function refreshBadge() {
  try {
    const token = await QuoskaApi.getStoredToken();
    if (!token) return setToolbarState(null);
    return setToolbarState(await QuoskaApi.getStatus());
  } catch (error) {
    if (error?.status === 401) return setToolbarState(null);
    await Promise.all([
      chrome.action.setBadgeText({ text: "" }),
      chrome.action.setTitle({ title: "Quoska · Verbindung fehlgeschlagen" }),
      setStateIcon(STATE_COLORS.error),
    ]);
  }
}

function connectFromBackground() {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await QuoskaApi.connect();
      await refreshBadge();
    })().finally(() => {
      connectionPromise = null;
    });
  }
  return connectionPromise;
}

function connectionErrorMessage(error) {
  return error?.message ?? "Die Verbindung konnte nicht hergestellt werden.";
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 1 });
  void refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 1 });
  void refreshBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) void refreshBadge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "QUOSKA_STATUS_CHANGED") {
    void refreshBadge();
    return false;
  }
  if (message?.type !== "QUOSKA_CONNECT") return false;

  void connectFromBackground().then(
    () => sendResponse({ ok: true }),
    (error) => sendResponse({ ok: false, error: connectionErrorMessage(error) }),
  );
  return true;
});
