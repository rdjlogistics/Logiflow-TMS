import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, CheckCircle, Eye } from "lucide-react";

interface OCRResult {
  documentType: string;
  confidence: number;
  extractedData: Record<string, any>;
  rawText: string;
}

export default function SmartOCR() {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [fileName, setFileName] = useState("");

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    setProcessing(true);
    setResult(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const b64 = (reader.result as string).split(",")[1];
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("smart-document-ocr", {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "OCR mislukt");

      setResult({
        documentType: data.documentType,
        confidence: data.confidence,
        extractedData: data.extractedData,
        rawText: data.rawText,
      });
      toast({ title: "Document geanalyseerd", description: `Type: ${data.documentType}` });
    } catch (e: any) {
      toast({ title: "OCR fout", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [], "text/plain": [] },
    maxFiles: 1,
    disabled: processing,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Smart OCR" description="Upload een document voor automatische herkenning en data-extractie" />

      {/* Upload zone */}
      <Card variant="interactive">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            } ${processing ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input {...getInputProps()} />
            {processing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-lg font-medium">Document wordt geanalyseerd...</p>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Sleep een document hierheen</p>
                <p className="text-sm text-muted-foreground">of klik om te selecteren (afbeeldingen, PDF, tekst)</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="stat">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Document type</p>
                <p className="text-lg font-bold capitalize">{result.documentType}</p>
              </CardContent>
            </Card>
            <Card variant="stat">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Betrouwbaarheid</p>
                <p className="text-lg font-bold">{Math.round(result.confidence * 100)}%</p>
              </CardContent>
            </Card>
            <Card variant="stat">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Velden gevonden</p>
                <p className="text-lg font-bold">{Object.keys(result.extractedData).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Extracted fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Geëxtraheerde gegevens
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(result.extractedData).length === 0 ? (
                <p className="text-muted-foreground text-sm">Geen gestructureerde data geëxtraheerd</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(result.extractedData).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start gap-2 p-2 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-sm font-semibold text-right">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw text */}
          {result.rawText && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Ruwe tekst
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto max-h-60 whitespace-pre-wrap">{result.rawText}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
