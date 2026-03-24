import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { readExcelFromBinary } from "@/lib/excelUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  fileType: "csv" | "xlsx";
}

interface FileUploadZoneProps {
  onFileParsed: (data: ParsedFile) => void;
  onError?: (error: string) => void;
  maxRows?: number;
  acceptedTypes?: string[];
}

export function FileUploadZone({
  onFileParsed,
  onError,
  maxRows = 10000,
  acceptedTypes = [".csv", ".xlsx", ".xls"],
}: FileUploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; status: "success" | "error"; message?: string } | null>(null);

  const parseCSV = (file: File): Promise<ParsedFile> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }
          
          const rows = results.data as Record<string, unknown>[];
          if (rows.length > maxRows) {
            reject(new Error(`Bestand bevat meer dan ${maxRows} rijen. Upload een kleiner bestand.`));
            return;
          }

          resolve({
            fileName: file.name,
            headers: results.meta.fields || [],
            rows: rows.slice(0, maxRows),
            rowCount: rows.length,
            fileType: "csv",
          });
        },
        error: (error) => reject(error),
      });
    });
  };

  const parseExcel = (file: File): Promise<ParsedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string;
          const { headers, rows } = await readExcelFromBinary(data);

          if (rows.length === 0) {
            reject(new Error("Excel bestand is leeg of heeft geen data rijen"));
            return;
          }

          if (rows.length > maxRows) {
            reject(new Error(`Bestand bevat meer dan ${maxRows} rijen. Upload een kleiner bestand.`));
            return;
          }

          resolve({
            fileName: file.name,
            headers,
            rows: rows.slice(0, maxRows),
            rowCount: rows.length,
            fileType: "xlsx",
          });
        } catch (err) {
          reject(new Error("Kon Excel bestand niet lezen. Controleer of het bestand geldig is."));
        }
      };
      reader.onerror = () => reject(new Error("Fout bij lezen van bestand"));
      reader.readAsBinaryString(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(20);
    setUploadedFile(null);

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      setProgress(50);

      const parsed = isExcel ? await parseExcel(file) : await parseCSV(file);
      
      setProgress(100);
      setUploadedFile({ name: file.name, status: "success" });
      onFileParsed(parsed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setUploadedFile({ name: file.name, status: "error", message });
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileParsed, onError, maxRows]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const clearUpload = () => {
    setUploadedFile(null);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          {isDragActive ? (
            <p className="text-lg font-medium">Laat los om te uploaden</p>
          ) : (
            <>
              <p className="text-lg font-medium">Sleep een bestand hierheen</p>
              <p className="text-sm text-muted-foreground">of klik om te bladeren</p>
              <p className="text-xs text-muted-foreground">
                Ondersteund: {acceptedTypes.join(", ")} (max {maxRows.toLocaleString()} rijen)
              </p>
            </>
          )}
        </div>
      </div>

      {isProcessing && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm">Bestand verwerken...</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedFile && (
        <Card className={cn(
          uploadedFile.status === "success" ? "border-emerald-500/30" : "border-red-500/30"
        )}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {uploadedFile.status === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  {uploadedFile.message && (
                    <p className="text-sm text-muted-foreground">{uploadedFile.message}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}