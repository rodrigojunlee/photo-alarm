const LOG_KEY = "photo-alarm-logs";
const MAX_ENTRIES = 500;

export function logEvent(type, message, data = null) {
  const entry = {
    ts: new Date().toISOString(),
    type,
    message,
    data: data ?? undefined,
  };

  try {
    const entries = loadLogs();
    entries.push(entry);
    while (entries.length > MAX_ENTRIES) entries.shift();
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — alarm must still work.
  }

  if (typeof console !== "undefined" && console.debug) {
    console.debug("[PhotoAlarm]", type, message, data ?? "");
  }

  window.dispatchEvent(new CustomEvent("photo-alarm-log", { detail: entry }));
  return entry;
}

export function loadLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearLogs() {
  localStorage.removeItem(LOG_KEY);
  logEvent("debug", "logs_cleared");
}

export function exportLogsText() {
  return loadLogs()
    .map((e) => `${e.ts} [${e.type}] ${e.message}${e.data ? ` ${JSON.stringify(e.data)}` : ""}`)
    .join("\n");
}
