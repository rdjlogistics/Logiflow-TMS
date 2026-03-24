// CSV export utilities with Dutch formatting and Excel BOM support

export interface CsvColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string;
}

export interface CsvExportOptions<T = Record<string, unknown>> {
  filename: string;
  columns: CsvColumn<T>[];
  data: T[];
  /** Include UTF-8 BOM for Excel compatibility (default: true) */
  bom?: boolean;
  /** Column separator (default: ;) — semicolon is standard in NL Excel */
  separator?: ',' | ';' | '\t';
}

// --- Formatters ---

export function formatDutchDate(value: unknown): string {
  if (!value) return '';
  try {
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(value);
  }
}

export function formatDutchDateTime(value: unknown): string {
  if (!value) return '';
  try {
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Amsterdam',
    });
  } catch {
    return String(value);
  }
}

export function formatEuro(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

export function formatBoolean(value: unknown): string {
  if (value === true || value === 'true' || value === 1) return 'Ja';
  if (value === false || value === 'false' || value === 0) return 'Nee';
  return '';
}

// --- Core export function ---

function escapeCsvCell(value: string, separator: string): string {
  // Wrap in quotes if value contains separator, newline, or quotes
  if (value.includes(separator) || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function generateCsv<T extends Record<string, unknown>>(options: CsvExportOptions<T>): string {
  const { columns, data, separator = ';', bom = true } = options;

  const headerRow = columns.map(c => escapeCsvCell(c.label, separator)).join(separator);

  const dataRows = data.map(row => {
    return columns.map(col => {
      const raw = getNestedValue(row as Record<string, unknown>, col.key as string);
      const formatted = col.format ? col.format(raw, row) : (raw === null || raw === undefined ? '' : String(raw));
      return escapeCsvCell(formatted, separator);
    }).join(separator);
  });

  const content = [headerRow, ...dataRows].join('\r\n');
  return bom ? '\uFEFF' + content : content;
}

export function downloadCsv<T extends Record<string, unknown>>(options: CsvExportOptions<T>): void {
  const csv = generateCsv(options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename.endsWith('.csv') ? options.filename : `${options.filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Preset column configs per entity ---

export type TripCsvRow = {
  order_number: string;
  trip_date: string;
  status: string;
  customer_company_name?: string;
  driver_name?: string;
  vehicle_license_plate?: string;
  pickup_city: string;
  delivery_city: string;
  distance_km: number;
  sales_total: number;
  purchase_total: number;
  gross_profit: number;
  profit_margin_pct: number;
  cargo_description: string;
  invoice_number?: string;
};

export const TRIP_CSV_COLUMNS: CsvColumn<TripCsvRow>[] = [
  { key: 'order_number', label: 'Ordernummer' },
  { key: 'trip_date', label: 'Rijtdatum', format: formatDutchDate },
  { key: 'status', label: 'Status' },
  { key: 'customer_company_name', label: 'Klant' },
  { key: 'driver_name', label: 'Chauffeur' },
  { key: 'vehicle_license_plate', label: 'Kenteken' },
  { key: 'pickup_city', label: 'Ophaalplaats' },
  { key: 'delivery_city', label: 'Afleverplaats' },
  { key: 'distance_km', label: 'Afstand (km)', format: v => v ? Number(v).toFixed(0) : '' },
  { key: 'sales_total', label: 'Verkoopprijs (€)', format: formatEuro },
  { key: 'purchase_total', label: 'Inkoopprijs (€)', format: formatEuro },
  { key: 'gross_profit', label: 'Brutowinst (€)', format: formatEuro },
  { key: 'profit_margin_pct', label: 'Marge (%)', format: v => v ? Number(v).toFixed(1) : '' },
  { key: 'cargo_description', label: 'Lading' },
  { key: 'invoice_number', label: 'Factuurnummer' },
];

export type InvoiceCsvRow = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  customer_company_name?: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  sent_at?: string;
  paid_at?: string;
};

export const INVOICE_CSV_COLUMNS: CsvColumn<InvoiceCsvRow>[] = [
  { key: 'invoice_number', label: 'Factuurnummer' },
  { key: 'invoice_date', label: 'Factuurdatum', format: formatDutchDate },
  { key: 'due_date', label: 'Vervaldatum', format: formatDutchDate },
  { key: 'status', label: 'Status' },
  { key: 'customer_company_name', label: 'Klant' },
  { key: 'subtotal', label: 'Subtotaal (€)', format: formatEuro },
  { key: 'vat_amount', label: 'BTW (€)', format: formatEuro },
  { key: 'total_amount', label: 'Totaal (€)', format: formatEuro },
  { key: 'amount_paid', label: 'Betaald (€)', format: formatEuro },
  { key: 'sent_at', label: 'Verzonden op', format: formatDutchDateTime },
  { key: 'paid_at', label: 'Betaald op', format: formatDutchDateTime },
];

export type CustomerCsvRow = {
  customer_number: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  vat_number: string;
  payment_terms_days: number;
  credit_limit: number;
  credit_blocked: boolean;
  is_active: boolean;
};

export const CUSTOMER_CSV_COLUMNS: CsvColumn<CustomerCsvRow>[] = [
  { key: 'customer_number', label: 'Klantnummer' },
  { key: 'company_name', label: 'Bedrijfsnaam' },
  { key: 'contact_name', label: 'Contactpersoon' },
  { key: 'email', label: 'E-mailadres' },
  { key: 'phone', label: 'Telefoonnummer' },
  { key: 'city', label: 'Stad' },
  { key: 'country', label: 'Land' },
  { key: 'vat_number', label: 'BTW-nummer' },
  { key: 'payment_terms_days', label: 'Betaaltermijn (dagen)' },
  { key: 'credit_limit', label: 'Kredietlimiet (€)', format: formatEuro },
  { key: 'credit_blocked', label: 'Geblokkeerd', format: formatBoolean },
  { key: 'is_active', label: 'Actief', format: formatBoolean },
];

export type DriverCsvRow = {
  name: string;
  email: string;
  phone: string;
  status: string;
  driver_category: string;
  is_zzp: boolean;
  license_number: string;
  license_expiry: string;
  adr_expiry: string;
  cpc_expiry: string;
  rating: number;
  on_time_percentage: number;
  total_trips: number;
};

export const DRIVER_CSV_COLUMNS: CsvColumn<DriverCsvRow>[] = [
  { key: 'name', label: 'Naam' },
  { key: 'email', label: 'E-mailadres' },
  { key: 'phone', label: 'Telefoonnummer' },
  { key: 'status', label: 'Status' },
  { key: 'driver_category', label: 'Categorie' },
  { key: 'is_zzp', label: 'ZZP', format: formatBoolean },
  { key: 'license_number', label: 'Rijbewijsnummer' },
  { key: 'license_expiry', label: 'Rijbewijs geldig tot', format: formatDutchDate },
  { key: 'adr_expiry', label: 'ADR geldig tot', format: formatDutchDate },
  { key: 'cpc_expiry', label: 'CPC geldig tot', format: formatDutchDate },
  { key: 'rating', label: 'Beoordeling', format: v => v ? Number(v).toFixed(1) : '' },
  { key: 'on_time_percentage', label: 'Op tijd (%)', format: v => v ? Number(v).toFixed(0) : '' },
  { key: 'total_trips', label: 'Totaal ritten' },
];
