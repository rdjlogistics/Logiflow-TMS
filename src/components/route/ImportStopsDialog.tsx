import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { readExcelFile } from "@/lib/excelUtils";
import { writeExcelFromArrays } from "@/lib/excelUtils";
import { geocodeAddress } from "@/utils/geocoding";
import { useToast } from "@/hooks/use-toast";
import type { OptimizableStop } from "@/hooks/useAdvancedRouteOptimization";

// ============= FIELD MAPPING =============

const FIELD_MAP: Record<string, string> = {
  bedrijfsnaam: "companyName",
  company_name: "companyName",
  companyname: "companyName",
  company: "companyName",
  adres: "address",
  address: "address",
  straat: "address",
  street: "address",
  huisnummer: "houseNumber",
  house_number: "houseNumber",
  housenumber: "houseNumber",
  nummer: "houseNumber",
  postcode: "postalCode",
  postal_code: "postalCode",
  postalcode: "postalCode",
  zip: "postalCode",
  stad: "city",
  city: "city",
  plaats: "city",
  type: "stopType",
  stop_type: "stopType",
  stoptype: "stopType",
  tijdvenster_van: "timeWindowStart",
  time_window_start: "timeWindowStart",
  van: "timeWindowStart",
  start: "timeWindowStart",
  tijdvenster_tot: "timeWindowEnd",
  time_window_end: "timeWindowEnd",
  tot: "timeWindowEnd",
  end: "timeWindowEnd",
  prioriteit: "priority",
  priority: "priority",
  opmerkingen: "notes",
  notes: "notes",
  opmerking: "notes",
  remarks: "notes",
  notitie: "notes",
};

const STOP_TYPE_MAP: Record<string, string> = {
  ophalen: "pickup",
  pickup: "pickup",
  afleveren: "delivery",
  delivery: "delivery",
  bezorgen: "delivery",
  stop: "stop",
};

const PRIORITY_MAP: Record<string, string> = {
  urgent: "urgent",
  hoog: "high",
  high: "high",
  normaal: "normal",
  normal: "normal",
  laag: "low",
  low: "low",
};

interface ParsedRow {
  companyName?: string;
  address?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  stopType?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  priority?: string;
  notes?: string;
}

interface ImportStopsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportStops: (stops: OptimizableStop[]) => void;
}

function mapRow(raw: Record<string, unknown>): ParsedRow {
  const mapped: ParsedRow = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = key.toLowerCase().trim().replace(/\s+/g, "_");
    const field = FIELD_MAP[normalized];
    if (field && value != null && value !== "") {
      (mapped as any)[field] = String(value).trim();
    }
  }
  // Map stop type
  if (mapped.stopType) {
    mapped.stopType = STOP_TYPE_MAP[mapped.stopType.toLowerCase()] || "stop";
  }
  // Map priority
  if (mapped.priority) {
    mapped.priority = PRIORITY_MAP[mapped.priority.toLowerCase()] || "normal";
  }
  return mapped;
}

const ImportStopsDialog: React.FC<ImportStopsDialogProps> = ({
  open,
  onOpenChange,
  onImportStops,
}) => {
  const { toast } = useToast();
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const resetState = () => {
    setParsedRows([]);
    setIsGeocoding(false);
    setGeocodeProgress(0);
    setFileName("");
  };

  const handleClose = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  // ============= TEMPLATE DOWNLOAD =============

  const handleDownloadTemplate = async () => {
    const rows = [
      ["bedrijfsnaam", "adres", "huisnummer", "postcode", "stad", "type", "tijdvenster_van", "tijdvenster_tot", "prioriteit", "opmerkingen"],
      ["Voorbeeld BV", "Keizersgracht", "100", "1015 AA", "Amsterdam", "afleveren", "09:00", "12:00", "normaal", "Bel bij aankomst"],
    ];
    await writeExcelFromArrays(rows, "import_stops_template.xlsx", "Stops");
    toast({ title: "Template gedownload", description: "Vul het template in en upload het hier." });
  };

  // ============= FILE PARSING =============

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);

    try {
      let rawRows: Record<string, unknown>[] = [];

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        rawRows = result.data as Record<string, unknown>[];
      } else {
        const { rows } = await readExcelFile(file);
        rawRows = rows;
      }

      if (rawRows.length === 0) {
        toast({ title: "Geen data gevonden", description: "Het bestand bevat geen rijen.", variant: "destructive" });
        return;
      }

      const mapped = rawRows.map(mapRow).filter(r => r.address || r.city);
      if (mapped.length === 0) {
        toast({ title: "Geen geldige rijen", description: "Controleer of de kolomnamen overeenkomen met het template.", variant: "destructive" });
        return;
      }

      setParsedRows(mapped);
      toast({ title: `${mapped.length} rijen gevonden`, description: "Controleer de preview en klik op importeren." });
    } catch (err) {
      console.error("Parse error:", err);
      toast({ title: "Fout bij lezen bestand", description: "Controleer het bestandsformaat.", variant: "destructive" });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  // ============= IMPORT WITH GEOCODING =============

  const handleImport = async () => {
    setIsGeocoding(true);
    setGeocodeProgress(0);

    const importedStops: OptimizableStop[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const addressParts = [row.address, row.houseNumber].filter(Boolean).join(" ");

      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const geo = await geocodeAddress(addressParts, row.postalCode, row.city);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
        }
      } catch (err) {
        console.warn(`Geocoding failed for ${addressParts}:`, err);
      }

      importedStops.push({
        id: crypto.randomUUID(),
        address: row.address || "",
        houseNumber: row.houseNumber,
        postalCode: row.postalCode,
        city: row.city,
        companyName: row.companyName,
        latitude: lat,
        longitude: lng,
        stopType: (row.stopType as any) || "stop",
        timeWindowStart: row.timeWindowStart,
        timeWindowEnd: row.timeWindowEnd,
        priority: (row.priority as any) || "normal",
        notes: row.notes,
      });

      setGeocodeProgress(Math.round(((i + 1) / parsedRows.length) * 100));
    }

    onImportStops(importedStops);
    setIsGeocoding(false);
    toast({ title: `${importedStops.length} stops geïmporteerd`, description: "De stops zijn toegevoegd aan je route." });
    handleClose(false);
  };

  // ============= RENDER =============

  const previewRows = parsedRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Stops importeren
          </DialogTitle>
          <DialogDescription>
            Upload een Excel of CSV bestand met stopadressen. Download eerst het template voor de juiste indeling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download template (.xlsx)
          </Button>

          {/* Dropzone */}
          {parsedRows.length === 0 && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive ? "Laat los om te uploaden" : "Sleep een bestand hierheen of klik om te selecteren"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls of .csv</p>
            </div>
          )}

          {/* Preview */}
          {parsedRows.length > 0 && !isGeocoding && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="secondary">{parsedRows.length} rijen</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Ander bestand
                </Button>
              </div>

              <div className="border rounded-lg overflow-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Bedrijf</TableHead>
                      <TableHead>Adres</TableHead>
                      <TableHead>Nr</TableHead>
                      <TableHead>Stad</TableHead>
                      <TableHead>Opmerkingen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{row.companyName || "-"}</TableCell>
                        <TableCell>{row.address || "-"}</TableCell>
                        <TableCell>{row.houseNumber || "-"}</TableCell>
                        <TableCell>{row.city || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{row.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  En nog {parsedRows.length - 5} andere rijen...
                </p>
              )}
            </div>
          )}

          {/* Geocoding progress */}
          {isGeocoding && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Adressen worden opgezocht... ({geocodeProgress}%)</span>
              </div>
              <Progress value={geocodeProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isGeocoding}>
            Annuleren
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedRows.length === 0 || isGeocoding}
          >
            {isGeocoding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importeren...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {parsedRows.length} stops importeren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStopsDialog;
