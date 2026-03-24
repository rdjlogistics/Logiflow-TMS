import { useState, useCallback } from 'react';
import type { TripStatus } from "@/types/supabase-helpers";
import { useToast } from '@/hooks/use-toast';
import { writeExcelFile } from '@/lib/excelUtils';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

const parseFile = (file: File): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as Record<string, string>[]),
      error: (err) => reject(err),
    });
  });
};

export const useBulkImport = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const importOrders = useCallback(async (file: File, companyId: string): Promise<ImportResult> => {
    setImporting(true);
    setProgress(0);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast({ title: 'Geen rijen gevonden', variant: 'destructive' });
        return result;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const tripDate = row.trip_date || row.datum;
        const pickupAddress = row.pickup_address || row.ophaal_adres;
        const pickupCity = row.pickup_city || row.ophaal_stad;
        const deliveryAddress = row.delivery_address || row.aflever_adres;
        const deliveryCity = row.delivery_city || row.aflever_stad;

        if (!pickupCity && !deliveryCity) {
          result.errors.push({ row: i + 2, error: 'Ophaal- of afleverstad ontbreekt' });
          result.failed++;
          setProgress(Math.round(((i + 1) / rows.length) * 100));
          continue;
        }

        const { error } = await supabase.from('trips').insert({
          company_id: companyId,
          trip_date: tripDate || new Date().toISOString().split('T')[0],
          pickup_address: pickupAddress || '',
          pickup_city: pickupCity || '',
          pickup_postal_code: row.pickup_postal_code || row.ophaal_postcode || '',
          delivery_address: deliveryAddress || '',
          delivery_city: deliveryCity || '',
          delivery_postal_code: row.delivery_postal_code || row.aflever_postcode || '',
          cargo_description: row.cargo_description || row.beschrijving || '',
          customer_reference: row.reference || row.referentie || '',
          status: 'aanvraag' satisfies TripStatus,
          order_number: '',
        });

        if (error) {
          result.errors.push({ row: i + 2, error: error.message });
          result.failed++;
        } else {
          result.success++;
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      toast({
        title: 'Import voltooid',
        description: `${result.success} orders geïmporteerd, ${result.failed} mislukt`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
    } catch (err: any) {
      toast({ title: 'Import mislukt', description: err.message || 'Onbekende fout', variant: 'destructive' });
    } finally {
      setImporting(false);
      setProgress(0);
    }
    return result;
  }, [toast]);

  const importCustomers = useCallback(async (file: File, companyId: string): Promise<ImportResult> => {
    setImporting(true);
    setProgress(0);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast({ title: 'Geen rijen gevonden', variant: 'destructive' });
        return result;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const companyName = row.company_name || row.bedrijfsnaam;

        if (!companyName) {
          result.errors.push({ row: i + 2, error: 'Bedrijfsnaam ontbreekt' });
          result.failed++;
          setProgress(Math.round(((i + 1) / rows.length) * 100));
          continue;
        }

        const { error } = await supabase.from('customers').insert({
          tenant_id: companyId,
          company_name: companyName,
          contact_name: row.contact_name || row.contactpersoon || '',
          email: row.email || '',
          phone: row.phone || row.telefoon || '',
          city: row.city || row.stad || '',
          address: row.address || row.adres || '',
          postal_code: row.postal_code || row.postcode || '',
          country: row.country || row.land || 'NL',
        });

        if (error) {
          result.errors.push({ row: i + 2, error: error.message });
          result.failed++;
        } else {
          result.success++;
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      toast({
        title: 'Import voltooid',
        description: `${result.success} klanten geïmporteerd, ${result.failed} mislukt`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
    } catch (err: any) {
      toast({ title: 'Import mislukt', description: err.message || 'Onbekende fout', variant: 'destructive' });
    } finally {
      setImporting(false);
      setProgress(0);
    }
    return result;
  }, [toast]);

  const downloadTemplate = useCallback(async (type: 'orders' | 'customers') => {
    const templates = {
      orders: [{ trip_date: '2025-01-15', customer_name: 'Acme B.V.', pickup_address: 'Industrieweg 10', pickup_city: 'Amsterdam', delivery_address: 'Havenstraat 5', delivery_city: 'Rotterdam' }],
      customers: [{ company_name: 'Acme B.V.', contact_name: 'Jan Jansen', email: 'jan@acme.nl', phone: '+31201234567', city: 'Amsterdam' }],
    };
    await writeExcelFile(templates[type], `template_${type}.xlsx`, type);
  }, []);

  return { importing, progress, importOrders, importCustomers, downloadTemplate };
};
