import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useOrderBulkOperations, OrderImportRow, IMPORT_TEMPLATE_FIELDS } from "@/hooks/useOrderBulkOperations";

interface OrderImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function OrderImportDialog({ open, onOpenChange }: OrderImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<OrderImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: Array<{ row: number; error: string }> } | null>(null);

  const { importing, downloadTemplate, parseFile, validateImportData, importOrders } = useOrderBulkOperations();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      const data = await parseFile(uploadedFile);
      const { valid, errors } = validateImportData(data);
      
      setParsedData(valid);
      setValidationErrors(errors);
      setStep("preview");
    } catch (error: any) {
      setValidationErrors([{ row: 0, error: error.message || "Fout bij verwerken bestand" }]);
      setStep("preview");
    }
  }, [parseFile, validateImportData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setStep("importing");
    const result = await importOrders(parsedData);
    setImportResult(result);
    setStep("complete");
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportResult(null);
    onOpenChange(false);
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Orders Importeren
          </DialogTitle>
          <DialogDescription>
            Upload een CSV of Excel bestand om meerdere orders tegelijk aan te maken
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-2">
          <StepIndicator step={1} label="Upload" active={step === "upload"} complete={step !== "upload"} />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator step={2} label="Controleren" active={step === "preview"} complete={step === "importing" || step === "complete"} />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator step={3} label="Importeren" active={step === "importing"} complete={step === "complete"} />
        </div>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4 py-4">
              {/* Download Template */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Download template</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gebruik onze template voor de juiste kolomindeling
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate("xlsx")}>
                          <Download className="h-3 w-3 mr-1" />
                          Excel (.xlsx)
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate("csv")}>
                          <Download className="h-3 w-3 mr-1" />
                          CSV
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-primary font-medium">Laat los om te uploaden...</p>
                ) : (
                  <>
                    <p className="font-medium">Sleep een bestand hierheen</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      of klik om te selecteren
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      CSV of Excel (.xlsx) bestanden
                    </p>
                  </>
                )}
              </div>

              {/* Required Fields Info */}
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-2">Verplichte velden:</p>
                <div className="flex flex-wrap gap-1">
                  {IMPORT_TEMPLATE_FIELDS.filter((f) => f.required).map((field) => (
                    <Badge key={field.key} variant="outline" className="text-xs">
                      {field.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <ScrollArea className="h-[400px] py-4">
              <div className="space-y-4">
                {/* File Info */}
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{file?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedData.length} geldige rijen gevonden
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      Ander bestand
                    </Button>
                  </CardContent>
                </Card>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive text-sm">
                            {validationErrors.length} fout(en) gevonden
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                            {validationErrors.slice(0, 5).map((err, i) => (
                              <li key={i}>
                                Rij {err.row}: {err.error}
                              </li>
                            ))}
                            {validationErrors.length > 5 && (
                              <li className="text-muted-foreground">
                                +{validationErrors.length - 5} meer fouten...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preview Data */}
                {parsedData.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Preview (eerste 5 rijen)</p>
                    <div className="space-y-2">
                      {parsedData.slice(0, 5).map((row, index) => (
                        <Card key={index} className="bg-muted/30">
                          <CardContent className="p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Datum:</span>{" "}
                                <span className="font-medium">{row.trip_date}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Van:</span>{" "}
                                <span className="font-medium">
                                  {row.pickup_city || row.pickup_address}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Naar:</span>{" "}
                                <span className="font-medium">
                                  {row.delivery_city || row.delivery_address}
                                </span>
                              </div>
                              {row.price && (
                                <div>
                                  <span className="text-muted-foreground">Prijs:</span>{" "}
                                  <span className="font-medium">€{row.price}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {parsedData.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{parsedData.length - 5} meer orders
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="font-medium">Orders worden geïmporteerd...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Even geduld, dit kan enkele seconden duren
              </p>
            </div>
          )}

          {step === "complete" && importResult && (
            <div className="py-8 space-y-6">
              {/* Summary */}
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">Geïmporteerd</p>
                </div>

                {importResult.failed > 0 && (
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                      <XCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Mislukt</p>
                  </div>
                )}
              </div>

              {/* Errors Detail */}
              {importResult.errors.length > 0 && (
                <Card className="border-destructive/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Fouten tijdens import:
                    </p>
                    <ScrollArea className="max-h-[150px]">
                      <ul className="text-xs space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="text-muted-foreground">
                            Rij {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Success Message */}
              {importResult.success > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  De geïmporteerde orders zijn direct beschikbaar in het overzicht
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Annuleren
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Terug
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedData.length === 0 || importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {parsedData.length} orders importeren
                  </>
                )}
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>Sluiten</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step, label, active, complete }: { step: number; label: string; active: boolean; complete: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
          complete
            ? "bg-primary text-primary-foreground"
            : active
            ? "bg-primary/20 text-primary border border-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
