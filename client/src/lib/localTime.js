const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimeString(date = new Date()) {
  return date.toLocaleTimeString('en-PH', { hour12: true });
}

export function getLocalTime24(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getLocalWeekdayLong(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

export function getLocalDateLabel(date = new Date()) {
  const weekday = getLocalWeekdayLong(date);
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday} · ${month} ${day}, ${year}`;
}

export function getLocalDayAbbr(date = new Date()) {
  return DAY_ABBR[date.getDay()];
}

export function getTimezoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local time';
  }
}

export function getScanTimestamp(date = new Date()) {
  return {
    raw_date: getLocalDateString(date),
    time: getLocalTimeString(date),
    day: getLocalDayAbbr(date),
    ts: date.getTime(),
  };
}
