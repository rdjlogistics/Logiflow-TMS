// Number and unit formatting utilities for LogiFlow TMS (Dutch locale)

const NL_CURRENCY = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const NL_CURRENCY_COMPACT = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const NL_NUMBER = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const NL_NUMBER_INT = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 });
const NL_PERCENT = new Intl.NumberFormat('nl-NL', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

// --- Currency ---

/** "€ 1.234,56" */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount as number)) return '—';
  return NL_CURRENCY.format(amount);
}

/** "€ 12K" or "€ 1,2M" */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount as number)) return '—';
  return NL_CURRENCY_COMPACT.format(amount);
}

/** "1.234,56" (no symbol) */
export function formatAmount(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || isNaN(amount as number)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// --- Percentages ---

/** "12,5%" */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value as number)) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/** "+3,2%" or "-1,5%" with sign */
export function formatPercentChange(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value as number)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercent(value)}`;
}

// --- Distance ---

/** "234 km" */
export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${NL_NUMBER_INT.format(Math.round(km))} km`;
}

/** "234,5 km" */
export function formatKmDecimal(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${NL_NUMBER.format(km)} km`;
}

// --- Weight / Volume ---

/** "1.234 kg" or "1,2 t" when >= 1000 kg */
export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return '—';
  if (kg >= 1000) {
    return `${NL_NUMBER.format(kg / 1000)} t`;
  }
  return `${NL_NUMBER_INT.format(kg)} kg`;
}

/** "3,50 m³" */
export function formatVolume(m3: number | null | undefined): string {
  if (m3 === null || m3 === undefined) return '—';
  return `${NL_NUMBER.format(m3)} m³`;
}

// --- Time / Duration ---

/** Minutes → "2u 15m" or "45m" */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
}

/** Seconds → "2:15:30" */
export function formatHms(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

// --- Generic number ---

/** "1.234" */
export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return NL_NUMBER_INT.format(value);
}

/** "1.234,56" */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// --- Truncation ---

/** Truncate text to maxLength, adding "..." */
export function truncate(text: string | null | undefined, maxLength = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/** Initials from a name: "Jan de Vries" → "JV" */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .filter((_, i) => i === 0 || i === parts.length - 1)
    .map(p => p[0].toUpperCase())
    .join('')
    .slice(0, max);
}

// --- License plate ---

/** Format Dutch license plate with hyphens: "AB123C" → "AB-123-C" */
export function formatKenteken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[-\s]/g, '')
    .toUpperCase()
    .replace(/^([A-Z]{2})(\d{3})([A-Z])$/, '$1-$2-$3')
    .replace(/^(\d{2})([A-Z]{3})(\d{2})$/, '$1-$2-$3')
    .replace(/^([A-Z]{2})(\d{2})([A-Z]{2})$/, '$1-$2-$3');
}
