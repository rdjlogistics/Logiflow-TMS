import { useCallback } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { writeExcelFile } from '@/lib/excelUtils';

interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  // Format cell value
  format?: (value: unknown, row: T) => string | number;
  // Width in characters (for Excel)
  width?: number;
}

interface ExportOptions<T> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  // Sheet name for Excel
  sheetName?: string;
  // Include timestamp in filename
  includeTimestamp?: boolean;
}

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

export function useExport() {
  const exportToExcel = useCallback(async <T extends Record<string, unknown>>({
    filename,
    columns,
    data,
    sheetName = 'Data',
    includeTimestamp = true,
  }: ExportOptions<T>) => {
    // Transform data to rows
    const rows = data.map((item) => {
      const row: Record<string, string | number> = {};
      
      columns.forEach((col) => {
        const rawValue = getNestedValue(item, col.key as string);
        
        if (col.format) {
          row[col.header] = col.format(rawValue, item);
        } else if (rawValue instanceof Date) {
          row[col.header] = format(rawValue, 'dd-MM-yyyy HH:mm', { locale: nl });
        } else if (rawValue === null || rawValue === undefined) {
          row[col.header] = '';
        } else {
          row[col.header] = String(rawValue);
        }
      });
      
      return row;
    });

    // Generate filename
    const timestamp = includeTimestamp
      ? `_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`
      : '';
    const fullFilename = `${filename}${timestamp}.xlsx`;

    // Write Excel file
    await writeExcelFile(rows, fullFilename, sheetName);

    return fullFilename;
  }, []);

  const exportToCSV = useCallback(<T extends Record<string, unknown>>({
    filename,
    columns,
    data,
    includeTimestamp = true,
  }: ExportOptions<T>) => {
    // Build CSV content
    const headers = columns.map((col) => `"${col.header}"`).join(',');
    
    const rows = data.map((item) => {
      return columns
        .map((col) => {
          const rawValue = getNestedValue(item, col.key as string);
          let value: string;
          
          if (col.format) {
            value = String(col.format(rawValue, item));
          } else if (rawValue instanceof Date) {
            value = format(rawValue, 'dd-MM-yyyy HH:mm', { locale: nl });
          } else if (rawValue === null || rawValue === undefined) {
            value = '';
          } else {
            value = String(rawValue);
          }
          
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = includeTimestamp
      ? `_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`
      : '';
    const fullFilename = `${filename}${timestamp}.csv`;

    link.href = url;
    link.download = fullFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return fullFilename;
  }, []);

  const exportToJSON = useCallback(<T extends Record<string, unknown>>({
    filename,
    data,
    includeTimestamp = true,
  }: Omit<ExportOptions<T>, 'columns'>) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = includeTimestamp
      ? `_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`
      : '';
    const fullFilename = `${filename}${timestamp}.json`;

    link.href = url;
    link.download = fullFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return fullFilename;
  }, []);

  return {
    exportToExcel,
    exportToCSV,
    exportToJSON,
  };
}

// Preset export configurations
export const ORDER_EXPORT_COLUMNS = [
  { key: 'order_number', header: 'Ordernummer', width: 15 },
  { key: 'status', header: 'Status', width: 12 },
  { key: 'customer_name', header: 'Klant', width: 25 },
  { key: 'pickup_address', header: 'Ophaaladres', width: 40 },
  { key: 'delivery_address', header: 'Afleveradres', width: 40 },
  { key: 'pickup_date', header: 'Ophaaldatum', width: 15 },
  { key: 'delivery_date', header: 'Leverdatum', width: 15 },
  { key: 'price', header: 'Prijs', width: 10, format: (v: unknown) => `€${(v as number)?.toFixed(2) || '0.00'}` },
];

export const INVOICE_EXPORT_COLUMNS = [
  { key: 'invoice_number', header: 'Factuurnummer', width: 15 },
  { key: 'status', header: 'Status', width: 12 },
  { key: 'customer_name', header: 'Klant', width: 25 },
  { key: 'amount', header: 'Bedrag', width: 12, format: (v: unknown) => `€${(v as number)?.toFixed(2) || '0.00'}` },
  { key: 'due_date', header: 'Vervaldatum', width: 15 },
  { key: 'paid_date', header: 'Betaald op', width: 15 },
];

export const TRIP_EXPORT_COLUMNS = [
  { key: 'trip_number', header: 'Ritnummer', width: 15 },
  { key: 'status', header: 'Status', width: 12 },
  { key: 'driver_name', header: 'Chauffeur', width: 20 },
  { key: 'vehicle_plate', header: 'Voertuig', width: 12 },
  { key: 'start_date', header: 'Startdatum', width: 15 },
  { key: 'end_date', header: 'Einddatum', width: 15 },
  { key: 'distance_km', header: 'Afstand (km)', width: 12 },
];