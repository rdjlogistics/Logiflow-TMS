/**
 * Batch T4: Format utilities
 * formatCurrency, formatDate, formatPhone, formatKvK, formatPostcode
 * Uses date-fns (already in dependencies) and Intl for locale-aware formatting.
 */
import { format as dateFnsFormat, parseISO, isValid } from 'date-fns';
import { nl } from 'date-fns/locale';

// ── Currency ─────────────────────────────────────────────────────────────────

const EUR_FORMATTER = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
});

/**
 * Format a number as a currency string.
 * @param amount  Numeric amount
 * @param currency  ISO 4217 code (default 'EUR')
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'EUR'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  if (currency === 'EUR') return EUR_FORMATTER.format(amount);
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(
    amount
  );
}

// ── Date ──────────────────────────────────────────────────────────────────────

/**
 * Format a date value.
 * @param date   Date | string | null
 * @param fmt    date-fns format string (default: 'dd-MM-yyyy')
 */
export function formatDate(
  date: Date | string | null | undefined,
  fmt = 'dd-MM-yyyy'
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return dateFnsFormat(d, fmt, { locale: nl });
  } catch {
    return '—';
  }
}

/**
 * Format as short datetime: "12-03-2026 14:35"
 */
export function formatDateTime(
  date: Date | string | null | undefined
): string {
  return formatDate(date, 'dd-MM-yyyy HH:mm');
}

// ── Phone ─────────────────────────────────────────────────────────────────────

/**
 * Format a Dutch phone number for display.
 * "0612345678"  → "06-1234 5678"
 * "+31612345678" → "+31 6 1234 5678"
 * Unknown formats are returned as-is.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');

  // International +31
  if (phone.startsWith('+31') || digits.startsWith('31')) {
    const national = digits.startsWith('31') ? digits.slice(2) : digits;
    if (national.length === 9) {
      return `+31 ${national[0]} ${national.slice(1, 5)} ${national.slice(5)}`;
    }
  }

  // 06 mobile
  if (digits.startsWith('06') && digits.length === 10) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  // 0xx landline (10 digits)
  if (digits.startsWith('0') && digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  return phone;
}

// ── KvK Number ───────────────────────────────────────────────────────────────

/**
 * Format a Dutch Chamber of Commerce (KvK) number.
 * "12345678" → "1234.5678"
 */
export function formatKvK(kvk: string | number | null | undefined): string {
  if (kvk === null || kvk === undefined) return '—';
  const digits = String(kvk).replace(/\D/g, '').padStart(8, '0').slice(0, 8);
  if (digits.length !== 8) return String(kvk);
  return `${digits.slice(0, 4)}.${digits.slice(4)}`;
}

// ── Postcode ─────────────────────────────────────────────────────────────────

/**
 * Format a Dutch postcode.
 * "1234AB" → "1234 AB"
 * "1234 ab" → "1234 AB"
 */
export function formatPostcode(
  postcode: string | null | undefined
): string {
  if (!postcode) return '—';
  const clean = postcode.replace(/\s/g, '').toUpperCase();
  const match = clean.match(/^(\d{4})([A-Z]{2})$/);
  if (match) return `${match[1]} ${match[2]}`;
  return postcode;
}

// ── IBAN ─────────────────────────────────────────────────────────────────────

/**
 * Format IBAN with spaces every 4 chars.
 * "NL91ABNA0417164300" → "NL91 ABNA 0417 1643 00"
 */
export function formatIBAN(iban: string | null | undefined): string {
  if (!iban) return '—';
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

// ── General number ────────────────────────────────────────────────────────────

/**
 * Format a number with Dutch locale thousands separator and optional decimals.
 * formatNumber(1234567.89)      → "1.234.568"
 * formatNumber(1234567.89, 2)   → "1.234.567,89"
 */
export function formatNumber(n: number, decimals?: number): string {
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  }).format(n);
}

// ── Percentage ────────────────────────────────────────────────────────────────

/**
 * Format a decimal or whole-number value as a percentage string.
 * formatPercent(23.5)  → "23,5%"
 * formatPercent(0.235) → "0,2%"   (pass 23.5, not 0.235 — value is treated as-is)
 */
export function formatPercent(n: number): string {
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n) + '%';
}

// ── File size ─────────────────────────────────────────────────────────────────

/**
 * Format a byte count as a human-readable file size string.
 * formatFileSize(0)             → "0 B"
 * formatFileSize(1500)          → "1,5 KB"
 * formatFileSize(1_200_000)     → "1,2 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes) || bytes < 0) return '—';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1);
  const value = bytes / Math.pow(1024, exp);

  return (
    new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value) +
    ' ' +
    units[exp]
  );
}

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Format a duration in minutes as a human-readable string.
 * formatDuration(0)    → "0 min"
 * formatDuration(45)   → "45 min"
 * formatDuration(90)   → "1u 30min"
 * formatDuration(120)  → "2u"
 */
export function formatDuration(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return '—';
  if (minutes === 0) return '0 min';

  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);

  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}min`;
}
