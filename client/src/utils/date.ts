// Appointment date/time is a wall-clock string: "YYYY-MM-DDTHH:mm". Day keys are "YYYY-MM-DD".
import type { Appointment } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const keyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const todayKey = (now = new Date()) => keyOf(now);

export function addDays(key: string, n: number) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
/** Monday of the week containing `key`. */
export function weekStart(key: string) {
  const d = parseDay(key);
  const offset = (d.getDay() + 6) % 7;
  return addDays(key, -offset);
}
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export function formatTime(dt: string) {
  const [h, m] = dt.slice(11, 16).split(':').map(Number);
  return { clock: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, suffix: h >= 12 ? 'PM' : 'AM' };
}
export const formatTimeShort = (dt: string) => {
  const t = formatTime(dt);
  return `${t.clock} ${t.suffix}`;
};

export function formatDay(key: string, now = new Date()) {
  const d = parseDay(key);
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  const label = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
  let relative = '';
  if (key === keyOf(now)) relative = 'Today';
  else if (key === addDays(keyOf(now), 1)) relative = 'Tomorrow';
  return { label, relative };
}

export function formatWeekRange(start: string) {
  const a = parseDay(start);
  const b = parseDay(addDays(start, 6));
  const left = `${a.getDate()} ${MONTHS[a.getMonth()]}`;
  const right = `${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  return `${left} – ${right}`;
}

export const dayName = (key: string) => DAYS[parseDay(key).getDay()];
export const dayNumber = (key: string) => parseDay(key).getDate();

export function groupByDay(items: Appointment[]) {
  const groups: { key: string; items: Appointment[] }[] = [];
  for (const item of items) {
    const key = item.dateTime.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

export function todayHeading(now = new Date()) {
  return `${LONG_DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

/** Splits text so the part matching the query can be highlighted. */
export function highlightParts(text: string, query: string) {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, i), match: false },
    { text: text.slice(i, i + q.length), match: true },
    { text: text.slice(i + q.length), match: false },
  ].filter((p) => p.text);
}
