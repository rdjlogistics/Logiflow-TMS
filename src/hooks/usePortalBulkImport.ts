import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from './usePortalAuth';

interface ImportRow {
  pickupCompany?: string;
  pickupAddress?: string;
  pickupPostalCode?: string;
  pickupCity?: string;
  pickupHouseNumber?: string;
  pickupDate?: string;
  deliveryCompany?: string;
  deliveryAddress?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryHouseNumber?: string;
  deliveryDate?: string;
  quantity?: number;
  weightKg?: number;
  description?: string;
  reference?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const NUMERIC_FIELDS = new Set(['quantity', 'weightKg']);

export function usePortalBulkImport() {
  const { customerId } = usePortalAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateRow = (row: ImportRow, index: number): string | null => {
    if (!row.pickupAddress) return `Rij ${index + 1}: Ophaaladres ontbreekt`;
    if (!row.pickupPostalCode) return `Rij ${index + 1}: Ophaal postcode ontbreekt`;
    if (!row.pickupCity) return `Rij ${index + 1}: Ophaal stad ontbreekt`;
    if (!row.pickupDate) return `Rij ${index + 1}: Ophaal datum ontbreekt`;
    if (!row.deliveryAddress) return `Rij ${index + 1}: Afleveradres ontbreekt`;
    if (!row.deliveryPostalCode) return `Rij ${index + 1}: Aflever postcode ontbreekt`;
    if (!row.deliveryCity) return `Rij ${index + 1}: Aflever stad ontbreekt`;
    return null;
  };

  const importShipmentsWithMapping = async (
    csvContent: string,
    mapping: Record<string, string> // sourceHeader → targetKey
  ): Promise<ImportResult> => {
    if (!customerId) {
      return { success: 0, failed: 0, errors: ['Geen klant gekoppeld'] };
    }

    setImporting(true);
    setProgress(0);

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return { success: 0, failed: 0, errors: ['Geen geldige rijen gevonden'] };
      }

      const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));

      // Build index: headerIndex → targetKey
      const headerIndexMap: { index: number; targetKey: string }[] = [];
      headers.forEach((header, index) => {
        const targetKey = mapping[header];
        if (targetKey) {
          headerIndexMap.push({ index, targetKey });
        }
      });

      const rows: ImportRow[] = lines.slice(1).map(line => {
        const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Partial<ImportRow> = {};

        for (const { index, targetKey } of headerIndexMap) {
          const val = values[index];
          if (!val) continue;
          if (NUMERIC_FIELDS.has(targetKey)) {
            (row as any)[targetKey] = parseFloat(val) || undefined;
          } else {
            (row as any)[targetKey] = val;
          }
        }

        return row as ImportRow;
      }).filter(row => row.pickupAddress || row.deliveryAddress);

      if (rows.length === 0) {
        return { success: 0, failed: 0, errors: ['Geen geldige rijen gevonden'] };
      }

      const errors: string[] = [];
      let success = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const validationError = validateRow(row, i);

        if (validationError) {
          errors.push(validationError);
          failed++;
          continue;
        }

        try {
          const { error: insertError } = await (supabase as any)
            .from('customer_submissions')
            .insert({
              customer_id: customerId!,
              pickup_company: row.pickupCompany || 'Ophaaladres',
              pickup_address: row.pickupAddress,
              pickup_postal_code: row.pickupPostalCode,
              pickup_city: row.pickupCity,
              house_number_pickup: row.pickupHouseNumber,
              pickup_date: row.pickupDate,
              delivery_company: row.deliveryCompany || 'Afleveradres',
              delivery_address: row.deliveryAddress,
              delivery_postal_code: row.deliveryPostalCode,
              delivery_city: row.deliveryCity,
              house_number_delivery: row.deliveryHouseNumber,
              delivery_date: row.deliveryDate,
              quantity: row.quantity || 1,
              weight_kg: row.weightKg,
              product_description: row.description,
              reference_number: row.reference,
              status: 'pending',
              service_type: 'standard',
            } as any);

          if (insertError) {
            errors.push(`Rij ${i + 1}: ${insertError.message}`);
            failed++;
          } else {
            success++;
          }
        } catch {
          errors.push(`Rij ${i + 1}: Onbekende fout`);
          failed++;
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      return { success, failed, errors: errors.slice(0, 10) };
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = `ophaal_adres;ophaal_postcode;ophaal_stad;ophaal_huisnummer;ophaal_bedrijf;ophaal_datum;aflever_adres;aflever_postcode;aflever_stad;aflever_huisnummer;aflever_bedrijf;aflever_datum;aantal;gewicht;beschrijving;referentie
Keizersgracht 123;1015CJ;Amsterdam;123;Bedrijf A;2025-01-15;Coolsingel 456;3012AD;Rotterdam;456;Bedrijf B;2025-01-16;2;15.5;Elektronische apparatuur;REF-001
Herengracht 789;1017BS;Amsterdam;789;Bedrijf C;2025-01-15;Lijnbaan 321;3012EJ;Rotterdam;321;Bedrijf D;2025-01-16;1;8.0;Documenten;REF-002`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return {
    importShipmentsWithMapping,
    downloadTemplate,
    importing,
    progress,
  };
}
