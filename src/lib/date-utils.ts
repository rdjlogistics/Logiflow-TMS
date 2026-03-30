// Dutch date/time utilities for LogiFlow TMS

const NL_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

const NL_MONTHS_SHORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
];

const NL_DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const NL_DAYS_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Format: 12-03-2026 */
export function formatShortDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format: 12 maart 2026 */
export function formatLongDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format: wo 12 mrt */
export function formatCompactDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${NL_DAYS_SHORT[d.getDay()]} ${d.getDate()} ${NL_MONTHS_SHORT[d.getMonth()]}`;
}

/** Format: 12:34 */
export function formatTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
}

/** Format: 12-03-2026 14:30 */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  });
}

/** Relative: "2 uur geleden", "over 3 dagen", etc. */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return diffSec < 0 ? 'zojuist' : 'zo meteen';
  if (absSec < 3600) {
    const mins = Math.round(absSec / 60);
    return diffSec < 0 ? `${mins} min geleden` : `over ${mins} min`;
  }
  if (absSec < 86400) {
    const hrs = Math.round(absSec / 3600);
    return diffSec < 0 ? `${hrs} uur geleden` : `over ${hrs} uur`;
  }
  if (absSec < 2592000) {
    const days = Math.round(absSec / 86400);
    return diffSec < 0 ? `${days} dag${days !== 1 ? 'en' : ''} geleden` : `over ${days} dag${days !== 1 ? 'en' : ''}`;
  }
  return formatShortDate(d);
}

/** Number of calendar days until date (negative = past) */
export function daysUntil(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Is the date today? */
export function isToday(value: string | Date | null | undefined): boolean {
  const d = toDate(value);
  if (!d) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/** Is the date in the past? */
export function isPast(value: string | Date | null | undefined): boolean {
  const d = toDate(value);
  if (!d) return false;
  return d.getTime() < Date.now();
}

/** ISO date string (YYYY-MM-DD) for Supabase queries */
export function toIsoDate(value: string | Date | null | undefined): string | null {
  const d = toDate(value);
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

/** Add days to a date */
export function addDays(value: string | Date, days: number): Date {
  const d = toDate(value) ?? new Date();
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/** Get start of current month */
export function startOfMonth(date?: Date): Date {
  const d = date ?? new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Get end of current month */
export function endOfMonth(date?: Date): Date {
  const d = date ?? new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

/** Week number (ISO 8601) */
export function getWeekNumber(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  if (!d) return null;
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - startOfWeek1.getTime();
  return Math.floor(diff / (7 * 86400000)) + 1;
}

/** Format day name: "woensdag 12 maart" */
export function formatDayName(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${NL_DAYS[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]}`;
}

/** Dutch quarter: "Q1 2026" */
export function formatQuarter(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
}

/** Get today at midnight */
export function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today as YYYY-MM-DD string (for <input type="date" min=...>) */
export function getTodayISO(): string {
  return getToday().toISOString().split('T')[0];
}

/** 7 days ago as YYYY-MM-DD (minimum invoice date) */
export function getMinInvoiceDate(): string {
  const d = getToday();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

/** Is date valid for delivery (>= today)? */
export function isValidDeliveryDate(value: string | Date | null | undefined): boolean {
  const d = toDate(value);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d >= getToday();
}

/** Is date range valid (end >= start)? */
export function isValidDateRange(start: string | Date | null | undefined, end: string | Date | null | undefined): boolean {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return true; // allow if either is empty
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return e >= s;
}

/** Capitalize city name: "zaandam" → "Zaandam", "DEN HAAG" → "Den Haag", "'s-hertogenbosch" → "'s-Hertogenbosch" */
export function capitalizeCity(name: string): string {
  if (!name) return name;
  let result = name
    .toLowerCase()
    .replace(/(^|\s|-)(\w)/g, (_, sep, char) => sep + char.toUpperCase());
  // Fix Dutch prefixes: 's-Hertogenbosch, 't Goy, etc.
  result = result.replace(/^'S-/g, "'s-").replace(/^'T-/g, "'t-").replace(/^'T /g, "'t ");
  result = result.replace(/\s'S-/g, " 's-").replace(/\s'T-/g, " 't-").replace(/\s'T /g, " 't ");
  return result;
}
