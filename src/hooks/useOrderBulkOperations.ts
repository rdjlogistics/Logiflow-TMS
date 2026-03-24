import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { readExcelFile, writeExcelFile, writeExcelFromArrays } from "@/lib/excelUtils";
import Papa from "papaparse";
import { format } from "date-fns";

export interface OrderImportRow {
  order_number?: string;
  trip_date: string;
  customer_name?: string;
  pickup_address: string;
  pickup_postal_code?: string;
  pickup_city?: string;
  delivery_address: string;
  delivery_postal_code?: string;
  delivery_city?: string;
  cargo_description?: string;
  weight_kg?: number;
  price?: number;
  notes?: string;
  reference?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export interface ExportOptions {
  format: "csv" | "xlsx";
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  includeCompleted?: boolean;
}

// Template fields for import
export const IMPORT_TEMPLATE_FIELDS = [
  { key: "trip_date", label: "Datum (YYYY-MM-DD)", required: true, example: "2024-01-15" },
  { key: "pickup_address", label: "Ophaaladres", required: true, example: "Hoofdstraat 1" },
  { key: "pickup_postal_code", label: "Ophaal Postcode", required: false, example: "1234 AB" },
  { key: "pickup_city", label: "Ophaal Plaats", required: false, example: "Amsterdam" },
  { key: "delivery_address", label: "Afleveradres", required: true, example: "Kerkstraat 10" },
  { key: "delivery_postal_code", label: "Aflever Postcode", required: false, example: "5678 CD" },
  { key: "delivery_city", label: "Aflever Plaats", required: false, example: "Rotterdam" },
  { key: "cargo_description", label: "Lading Omschrijving", required: false, example: "Pallets" },
  { key: "weight_kg", label: "Gewicht (kg)", required: false, example: "500" },
  { key: "price", label: "Prijs (€)", required: false, example: "150.00" },
  { key: "notes", label: "Notities", required: false, example: "Bellen bij aankomst" },
  { key: "reference", label: "Referentie", required: false, example: "REF-12345" },
];

export function useOrderBulkOperations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { isActive } = useSubscriptionPlan();

  // Helper to get company_id for current user
  const getCompanyId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.rpc('get_user_company_cached', { p_user_id: user.id });
    return data || null;
  };

  // Download import template
  const downloadTemplate = async (format: "csv" | "xlsx") => {
    const headers = IMPORT_TEMPLATE_FIELDS.map((f) => f.label);
    const exampleRow = IMPORT_TEMPLATE_FIELDS.map((f) => f.example);

    if (format === "csv") {
      const csvContent = [headers.join(";"), exampleRow.join(";")].join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `import-template-orders.csv`);
    } else {
      await writeExcelFromArrays([headers, exampleRow], "import-template-orders.xlsx", "Orders");
    }

    toast({ title: "Template gedownload" });
  };

  // Parse uploaded file
  const parseFile = async (file: File): Promise<OrderImportRow[]> => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const mapped = mapImportData(results.data as Record<string, string>[]);
              resolve(mapped);
            } catch (err) {
              reject(err);
            }
          },
          error: (err) => reject(err),
        });
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const { rows } = await readExcelFile(file);
      return mapImportData(rows as Record<string, string>[]);
    } else {
      throw new Error("Ongeldig bestandsformaat. Gebruik CSV of Excel (.xlsx)");
    }
  };

  // Map raw data to OrderImportRow
  const mapImportData = (rawData: Record<string, string>[]): OrderImportRow[] => {
    const fieldMap: Record<string, string> = {};
    IMPORT_TEMPLATE_FIELDS.forEach((f) => {
      fieldMap[f.label.toLowerCase()] = f.key;
      fieldMap[f.key.toLowerCase()] = f.key;
    });

    return rawData.map((row) => {
      const mapped: Partial<OrderImportRow> = {};

      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase().trim();
        const fieldKey = fieldMap[normalizedKey];
        
        if (fieldKey && value) {
          if (fieldKey === "weight_kg" || fieldKey === "price") {
            const numValue = parseFloat(String(value).replace(",", "."));
            if (!isNaN(numValue)) {
              (mapped as Record<string, unknown>)[fieldKey] = numValue;
            }
          } else {
            (mapped as Record<string, unknown>)[fieldKey] = String(value).trim();
          }
        }
      });

      return mapped as OrderImportRow;
    });
  };

  // Validate import data
  const validateImportData = (rows: OrderImportRow[]): { valid: OrderImportRow[]; errors: Array<{ row: number; error: string }> } => {
    const valid: OrderImportRow[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 for header row and 0-indexing

      if (!row.trip_date) {
        errors.push({ row: rowNum, error: "Datum is verplicht" });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.trip_date)) {
        // Try to parse Dutch date format
        const dutchDate = parseDutchDate(row.trip_date);
        if (dutchDate) {
          row.trip_date = dutchDate;
        } else {
          errors.push({ row: rowNum, error: "Ongeldige datum formaat (gebruik YYYY-MM-DD)" });
          return;
        }
      }

      if (!row.pickup_address) {
        errors.push({ row: rowNum, error: "Ophaaladres is verplicht" });
        return;
      }

      if (!row.delivery_address) {
        errors.push({ row: rowNum, error: "Afleveradres is verplicht" });
        return;
      }

      valid.push(row);
    });

    return { valid, errors };
  };

  // Parse Dutch date formats
  const parseDutchDate = (dateStr: string): string | null => {
    // Try DD-MM-YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day.length <= 2 && month.length <= 2 && year.length === 4) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    return null;
  };

  // Import orders
  const importOrders = async (rows: OrderImportRow[]): Promise<ImportResult> => {
    setImporting(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      // Get company_id for tenant isolation
      const companyId = await getCompanyId();
      if (!companyId) {
        toast({ title: "Niet ingelogd", description: "Log opnieuw in om orders te importeren.", variant: "destructive" });
        return { success: 0, failed: rows.length, errors: [{ row: 0, error: "Niet ingelogd of geen bedrijf gekoppeld" }] };
      }

      // Fetch customers for name matching
      const { data: customers } = await supabase
        .from("customers")
        .select("id, company_name")
        .order("company_name");

      const customerMap = new Map(
        customers?.map((c) => [c.company_name.toLowerCase(), c.id]) || []
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          // Find customer by name if provided
          let customer_id: string | null = null;
          if (row.customer_name) {
            customer_id = customerMap.get(row.customer_name.toLowerCase()) || null;
          }

          // Generate order number
          const { data: orderNumber } = await supabase.rpc('generate_order_number') as { data: string | null };

          const orderData = {
            trip_date: row.trip_date,
            pickup_address: row.pickup_address,
            pickup_postal_code: row.pickup_postal_code || null,
            pickup_city: row.pickup_city || null,
            delivery_address: row.delivery_address,
            delivery_postal_code: row.delivery_postal_code || null,
            delivery_city: row.delivery_city || null,
            cargo_description: row.cargo_description || null,
            weight_kg: row.weight_kg || null,
            price: row.price || null,
            notes: row.notes || null,
            reference: row.reference || null,
            customer_id,
            company_id: companyId,
            order_number: orderNumber || undefined,
            status: "gepland" as const,
          };

          const { error } = await supabase.from("trips").insert(orderData);

          if (error) {
            result.failed++;
            result.errors.push({ row: rowNum, error: error.message });
          } else {
            result.success++;
          }
        } catch (err: unknown) {
          result.failed++;
          const message = err instanceof Error ? err.message : "Onbekende fout";
          result.errors.push({ row: rowNum, error: message });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });

      return result;
    } finally {
      setImporting(false);
    }
  };

  // Export orders
  const exportOrders = async (options: ExportOptions) => {
    if (!isActive) {
      toast({ title: "Upgrade je pakket om te exporteren", variant: "destructive" });
      return;
    }
    setExporting(true);

    try {
      let query = supabase
        .from("trips")
        .select(`
          *,
          customer:customers(company_name),
          vehicle:vehicles(license_plate)
        `)
        .order("trip_date", { ascending: false });

      if (options.dateFrom) {
        query = query.gte("trip_date", options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte("trip_date", options.dateTo);
      }
      if (options.status && options.status !== "all") {
        query = query.eq("status", options.status as "gepland" | "onderweg" | "afgerond" | "geannuleerd");
      }
      if (!options.includeCompleted) {
        query = query.in("status", ["draft", "aanvraag", "offerte", "gepland", "geladen", "onderweg"] as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      const exportData = data?.map((order) => ({
        "Order Nummer": order.order_number || "",
        "Datum": order.trip_date,
        "Status": translateStatus(order.status),
        "Klant": order.customer?.company_name || "",
        "Ophaaladres": order.pickup_address,
        "Ophaal Postcode": order.pickup_postal_code || "",
        "Ophaal Plaats": order.pickup_city || "",
        "Afleveradres": order.delivery_address,
        "Aflever Postcode": order.delivery_postal_code || "",
        "Aflever Plaats": order.delivery_city || "",
        "Lading": order.cargo_description || "",
        "Gewicht (kg)": order.weight_kg || "",
        "Afstand (km)": order.distance_km || "",
        "Prijs (€)": order.price || "",
        "Voertuig": order.vehicle?.license_plate || "",
        "Notities": order.notes || "",
        "Aangemaakt": format(new Date(order.created_at), "dd-MM-yyyy HH:mm"),
      })) || [];

      const filename = `orders-export-${format(new Date(), "yyyy-MM-dd")}`;

      if (options.format === "csv") {
        const csv = Papa.unparse(exportData, { delimiter: ";" });
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `${filename}.csv`);
      } else {
        await writeExcelFile(exportData, `${filename}.xlsx`, "Orders");
      }

      toast({ title: `${exportData.length} orders geëxporteerd` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: "Export mislukt", description: message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return {
    importing,
    exporting,
    downloadTemplate,
    parseFile,
    validateImportData,
    importOrders,
    exportOrders,
  };
}

// Helper functions
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    gepland: "Gepland",
    onderweg: "Onderweg",
    afgerond: "Afgerond",
    geannuleerd: "Geannuleerd",
  };
  return statusMap[status] || status;
}