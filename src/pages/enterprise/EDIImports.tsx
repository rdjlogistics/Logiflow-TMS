import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Upload, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";

const EDIImports = () => {
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState<{ rows: number; fields: string[] } | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: (files) => {
      if (!files.length) return;
      const file = files[0];

      if (file.name.endsWith(".csv")) {
        setParsing(true);
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setParsing(false);
            setResults({ rows: result.data.length, fields: result.meta.fields ?? [] });
            toast({ title: `${result.data.length} rijen geparsed ✓`, description: `Velden: ${(result.meta.fields ?? []).join(", ")}` });
          },
          error: () => {
            setParsing(false);
            toast({ title: "Parse fout", variant: "destructive" });
          },
        });
      } else {
        toast({ title: "Bestand ontvangen", description: `${file.name} — Excel import wordt voorbereid.` });
      }
    },
  });

  return (
    <DashboardLayout title="EDI / Imports">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>EDI / Imports</CardTitle>
          </div>
          <CardDescription>CSV/Excel import met automatische veldherkenning</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            {parsing ? (
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
            ) : (
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            )}
            <p className="font-medium">{isDragActive ? "Laat los om te uploaden" : "Sleep bestanden hierheen"}</p>
            <p className="text-sm text-muted-foreground mt-1">CSV of Excel formaat</p>
          </div>

          {results && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <p className="font-medium">{results.rows} rijen gevonden</p>
              </div>
              <p className="text-sm text-muted-foreground">Velden: {results.fields.join(", ")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default EDIImports;
