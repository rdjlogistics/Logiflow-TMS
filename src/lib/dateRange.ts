/**
 * dateRange.ts — Date range utilities for LogiFlow TMS.
 *
 * All functions work with the local timezone.
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Returns the start (Monday 00:00:00) and end (Sunday 23:59:59) of the current ISO week.
 */
export function getThisWeek(): DateRange {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, …

  // ISO week starts on Monday
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Returns the start (1st 00:00:00) and end (last day 23:59:59) of the current calendar month.
 */
export function getThisMonth(): DateRange {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Returns the date range for the last N days, including today.
 * Example: getLastNDays(7) → from 7 days ago 00:00 to now 23:59:59.
 */
export function getLastNDays(n: number): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(end.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

/**
 * Format a date range for display.
 * Same month+year: "1 - 15 jan 2026"
 * Same year, different month: "1 jan - 28 feb 2026"
 * Different year: "1 dec 2025 - 1 jan 2026"
 */
export function formatDateRange(start: Date, end: Date): string {
  const locale = "nl-NL";

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleString(locale, { month: "short" });
  const endMonth = end.toLocaleString(locale, { month: "short" });
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    if (start.getMonth() === end.getMonth()) {
      // Same month: "1 - 15 jan 2026"
      return `${startDay} - ${endDay} ${endMonth} ${endYear}`;
    }
    // Same year, different month: "1 jan - 28 feb 2026"
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
  }

  // Different year: "1 dec 2025 - 1 jan 2026"
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}
