import { useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, FileText, Loader2, CheckCircle, Eye, 
  MapPin, Building2, User, Package, Hash, Calendar,
  Truck, ClipboardCheck, Scale, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OCRResult {
  documentType: string;
  confidence: number;
  extractedData: Record<string, any>;
  rawText: string;
}

// Smart field renderer — recursively renders objects cleanly
function SmartField({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  const [expanded, setExpanded] = useState(false);

  // Parse stringified JSON
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { /* keep as string */ }
  }

  // Render array of objects (e.g. goederen)
  if (Array.isArray(parsed)) {
    return (
      <div className="col-span-1 sm:col-span-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50 backdrop-blur-sm hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              {Icon && <Icon className="h-4 w-4 text-primary/70 shrink-0" />}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{parsed.length}</Badge>
            </div>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {parsed.map((item: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-muted/10 border border-border/30 space-y-1.5">
                    {typeof item === "object" && item !== null ? (
                      Object.entries(item).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <span className="text-xs text-muted-foreground capitalize shrink-0">{formatLabel(k)}</span>
                          <span className="text-sm font-medium text-right">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm font-medium">{String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render nested object (e.g. afzender, ontvanger)
  if (typeof parsed === "object" && parsed !== null) {
    return (
      <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 backdrop-blur-sm space-y-2">
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="h-4 w-4 text-primary/70 shrink-0" />}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <div className="space-y-1.5 pl-0.5">
          {Object.entries(parsed).map(([k, v]) => (
            <div key={k} className="flex justify-between items-baseline gap-3">
              <span className="text-[11px] text-muted-foreground capitalize shrink-0">{formatLabel(k)}</span>
              <span className="text-sm font-semibold text-right">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simple value
  return (
    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-primary/70 shrink-0" />}
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold mt-1">{String(parsed)}</p>
    </div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Map known field keys to icons
function getFieldIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes("afzender") || k.includes("sender")) return Building2;
  if (k.includes("ontvanger") || k.includes("receiver") || k.includes("recipient")) return MapPin;
  if (k.includes("goederen") || k.includes("goods") || k.includes("cargo")) return Package;
  if (k.includes("kenteken") || k.includes("plate") || k.includes("vehicle")) return Truck;
  if (k.includes("referentie") || k.includes("reference") || k.includes("nummer")) return Hash;
  if (k.includes("datum") || k.includes("date")) return Calendar;
  if (k.includes("status")) return ClipboardCheck;
  if (k.includes("gewicht") || k.includes("weight")) return Scale;
  if (k.includes("naam") || k.includes("name") || k.includes("contact")) return User;
  return FileText;
}

export default function SmartOCR() {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [showRawText, setShowRawText] = useState(false);

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

  const confidenceColor = result
    ? result.confidence >= 0.85 ? "text-emerald-400" 
    : result.confidence >= 0.6 ? "text-amber-400" 
    : "text-red-400"
    : "";

  return (
    <DashboardLayout title="Smart OCR" description="Upload een document voor automatische herkenning">
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader title="Smart OCR" description="Upload een document voor automatische herkenning en data-extractie" />

        {/* Upload zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card variant="interactive" className="overflow-hidden">
            <CardContent className="p-0">
              <div
                {...getRootProps()}
                className={`relative p-10 sm:p-16 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? "bg-primary/5 ring-2 ring-primary/30 ring-inset" 
                    : "hover:bg-muted/10"
                } ${processing ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input {...getInputProps()} />
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                  backgroundSize: "24px 24px"
                }} />
                
                {processing ? (
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                      <Loader2 className="h-14 w-14 text-primary animate-spin relative" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Document wordt geanalyseerd...</p>
                      <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Sleep een document hierheen</p>
                      <p className="text-sm text-muted-foreground mt-1">of tik om te selecteren · Afbeeldingen, PDF, tekst</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-5"
            >
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 backdrop-blur-sm text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm sm:text-base font-bold capitalize truncate">{result.documentType}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 backdrop-blur-sm text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Betrouwbaarheid</p>
                  <p className={`text-sm sm:text-base font-bold ${confidenceColor}`}>
                    {Math.round(result.confidence * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 backdrop-blur-sm text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Velden</p>
                  <p className="text-sm sm:text-base font-bold">{Object.keys(result.extractedData).length}</p>
                </div>
              </div>

              {/* Extracted fields — Elite Class */}
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-emerald-500/10">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                    Geëxtraheerde gegevens
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {Object.keys(result.extractedData).length === 0 ? (
                    <p className="text-muted-foreground text-sm py-6 text-center">Geen gestructureerde data geëxtraheerd</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(result.extractedData).map(([key, value]) => (
                        <SmartField
                          key={key}
                          label={formatLabel(key)}
                          value={value}
                          icon={getFieldIcon(key)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Raw text — collapsible */}
              {result.rawText && (
                <Card className="border-border/50">
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="w-full"
                  >
                    <CardHeader className="pb-0">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 rounded-md bg-muted/30">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                          Ruwe tekst
                        </div>
                        {showRawText 
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> 
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </CardTitle>
                    </CardHeader>
                  </button>
                  <AnimatePresence>
                    {showRawText && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <CardContent className="pt-3">
                          <ScrollArea className="h-48">
                            <pre className="text-xs bg-muted/10 p-4 rounded-xl whitespace-pre-wrap font-mono leading-relaxed">{result.rawText}</pre>
                          </ScrollArea>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
