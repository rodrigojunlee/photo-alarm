import { clearLogs, exportLogsText, loadLogs } from "../core/logger.js";

export function createDebugLogUI({ container, els }) {
  function render() {
    const logs = loadLogs().slice().reverse();
    container.innerHTML = "";

    if (!logs.length) {
      container.innerHTML = '<p class="log-empty">No events yet. Arm an alarm and watch this feed.</p>';
      return;
    }

    logs.forEach((entry) => {
      const row = document.createElement("div");
      row.className = `log-row log-${entry.type}`;
      const time = new Date(entry.ts).toLocaleTimeString();
      const data = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
      row.textContent = `${time} · ${entry.type} · ${entry.message}${data}`;
      container.appendChild(row);
    });
  }

  els.clearLogsButton?.addEventListener("click", () => {
    clearLogs();
    render();
  });

  els.exportLogsButton?.addEventListener("click", () => {
    const blob = new Blob([exportLogsText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `photo-alarm-log-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("photo-alarm-log", () => render());

  return { render };
}
