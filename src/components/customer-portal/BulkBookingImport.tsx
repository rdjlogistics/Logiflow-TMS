import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Loader2,
  ArrowRight
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { readExcelFile, writeExcelFile } from "@/lib/excelUtils";
import { useToast } from "@/hooks/use-toast";

interface BulkImportRow {
  row: number;
  pickup_postcode: string;
  pickup_house_number: string;
  delivery_postcode: string;
  delivery_house_number: string;
  date: string;
  reference: string;
  service?: string;
  errors: string[];
  valid: boolean;
}

interface BulkBookingImportProps {
  customerId: string;
  tenantId: string;
  onImport: (rows: BulkImportRow[]) => Promise<{ success: number; failed: number }>;
}

export const BulkBookingImport = ({ 
  customerId, 
  tenantId,
  onImport 
}: BulkBookingImportProps) => {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const { toast } = useToast();

  const validateRow = (data: Record<string, unknown>, rowIndex: number): BulkImportRow => {
    const errors: string[] = [];
    
    const pickupPostcode = String(data.pickup_postcode || data.ophaal_postcode || "").trim();
    const pickupHouseNumber = String(data.pickup_house_number || data.ophaal_huisnummer || "").trim();
    const deliveryPostcode = String(data.delivery_postcode || data.aflever_postcode || "").trim();
    const deliveryHouseNumber = String(data.delivery_house_number || data.aflever_huisnummer || "").trim();
    const date = String(data.date || data.datum || "").trim();
    const reference = String(data.reference || data.referentie || "").trim();
    const service = String(data.service || data.dienst || "").trim();

    if (!pickupPostcode) errors.push("Ophaal postcode ontbreekt");
    if (!deliveryPostcode) errors.push("Aflever postcode ontbreekt");
    if (!date) errors.push("Datum ontbreekt");

    return {
      row: rowIndex + 1,
      pickup_postcode: pickupPostcode,
      pickup_house_number: pickupHouseNumber,
      delivery_postcode: deliveryPostcode,
      delivery_house_number: deliveryHouseNumber,
      date,
      reference,
      service,
      errors,
      valid: errors.length === 0,
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const { rows: jsonData } = await readExcelFile(file);
      const validatedRows = jsonData.map((row, index) => validateRow(row, index));
      setRows(validatedRows);
      setStep("preview");
    } catch (err) {
      toast({
        title: "Fout bij laden",
        description: "Kon bestand niet lezen. Controleer het formaat.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const downloadTemplate = async () => {
    const template = [
      {
        pickup_postcode: "1234 AB",
        pickup_house_number: "10",
        delivery_postcode: "5678 CD",
        delivery_house_number: "20",
        date: "2025-01-15",
        reference: "REF-001",
        service: "Express",
      },
    ];
    await writeExcelFile(template, "bulk-import-template.xlsx", "Template");
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast({
        title: "Geen geldige rijen",
        description: "Er zijn geen geldige rijen om te importeren.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setStep("importing");
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await onImport(validRows);
      setResult(result);
      setProgress(100);
      setStep("done");
    } catch (err) {
      toast({
        title: "Import mislukt",
        description: "Er is een fout opgetreden bij het importeren.",
        variant: "destructive",
      });
      setStep("preview");
    } finally {
      clearInterval(interval);
      setImporting(false);
    }
  };

  const validCount = rows.filter(r => r.valid).length;
  const errorCount = rows.filter(r => !r.valid).length;

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download template
          </Button>
        </div>

        <Card
          {...getRootProps()}
          className={`premium-card border-dashed cursor-pointer transition-all ${
            isDragActive ? "ring-2 ring-primary bg-primary/5" : ""
          }`}
        >
          <input {...getInputProps()} />
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">
              {isDragActive ? "Laat los om te uploaden" : "Sleep bestand hierheen"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              of klik om een bestand te selecteren
            </p>
            <Badge variant="secondary">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              CSV, XLS, XLSX
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4">
          <Card className="flex-1 premium-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{validCount}</p>
                  <p className="text-sm text-muted-foreground">Geldig</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 premium-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">Fouten</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview table */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base">Voorbeeld</CardTitle>
            <CardDescription>Controleer de gegevens voor import</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto">
              <table className="min-w-full w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Ophalen</th>
                    <th className="text-left p-2">Afleveren</th>
                    <th className="text-left p-2">Datum</th>
                    <th className="text-left p-2">Referentie</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row) => (
                    <tr key={row.row} className="border-b">
                      <td className="p-2">{row.row}</td>
                      <td className="p-2">{row.pickup_postcode} {row.pickup_house_number}</td>
                      <td className="p-2">{row.delivery_postcode} {row.delivery_house_number}</td>
                      <td className="p-2">{row.date}</td>
                      <td className="p-2">{row.reference || "-"}</td>
                      <td className="p-2">
                        {row.valid ? (
                          <Badge className="bg-green-500/10 text-green-600">OK</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            {row.errors[0]}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  + {rows.length - 10} meer rijen
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); }}>
            Annuleren
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validCount === 0}
            className="btn-premium"
          >
            Importeer {validCount} zending{validCount !== 1 ? "en" : ""}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Importeren...</h3>
          <Progress value={progress} className="max-w-xs mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            Even geduld, zendingen worden aangemaakt
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "done" && result) {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Import voltooid!</h3>
          <p className="text-muted-foreground mb-4">
            {result.success} zending{result.success !== 1 ? "en" : ""} aangemaakt
            {result.failed > 0 && `, ${result.failed} mislukt`}
          </p>
          <Button onClick={() => { setStep("upload"); setRows([]); setResult(null); }}>
            Nieuwe import
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};