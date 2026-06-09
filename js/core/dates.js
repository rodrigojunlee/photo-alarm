const WEEKDAY = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

export function parseTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

export function isRepeatDay(repeat, dayOfWeek) {
  switch (repeat) {
    case "daily":
      return true;
    case "weekdays":
      return WEEKDAY.includes(dayOfWeek);
    case "weekends":
      return WEEKEND.includes(dayOfWeek);
    case "once":
    default:
      return true;
  }
}

export function computeNextFireAt(alarm, fromDate = new Date()) {
  if (!alarm?.time) return null;

  const { hours, minutes } = parseTime(alarm.time);
  const base = new Date(fromDate);
  base.setSeconds(0, 0);

  for (let offset = 0; offset < 370; offset += 1) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);

    if (candidate <= fromDate) continue;
    if (!isRepeatDay(alarm.repeat || "daily", candidate.getDay())) continue;
    return candidate.toISOString();
  }

  return null;
}

export function formatFireAt(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function repeatLabel(repeat) {
  switch (repeat) {
    case "once":
      return "Once";
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekends":
      return "Weekends";
    default:
      return repeat;
  }
}

export function alreadyFiredForOccurrence(alarm, fireAtIso) {
  if (!alarm.lastFiredAt || !fireAtIso) return false;
  const fired = new Date(alarm.lastFiredAt).getTime();
  const target = new Date(fireAtIso).getTime();
  return Math.abs(fired - target) < 60_000;
}

export function msUntil(iso) {
  if (!iso) return null;
  return new Date(iso).getTime() - Date.now();
}
