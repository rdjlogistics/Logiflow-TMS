import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePortalBulkImport } from "@/hooks/usePortalBulkImport";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ShipmentFieldMapper } from "./ShipmentFieldMapper";
import { matchHeaders, parseCSVHeaders, SHIPMENT_TARGET_FIELDS, type FieldMapping } from "@/lib/shipment-field-matching";
import { supabase } from "@/integrations/supabase/client";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'mapping' | 'importing' | 'result';

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const { importShipmentsWithMapping, downloadTemplate, importing, progress } = usePortalBulkImport();
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [step, setStep] = useState<Step>('upload');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setResult(null);

      const content = await f.text();
      setFileContent(content);

      const headers = parseCSVHeaders(content);
      const initialMappings = matchHeaders(headers);

      // Extract first 2 data rows as sample
      const lines = content.split('\n').filter(l => l.trim());
      const samples = lines.slice(1, 3).map(line =>
        line.split(';').map(v => v.trim().replace(/^"|"$/g, ''))
      );
      setSampleData(samples);

      // Check if there are unmapped columns that could benefit from AI
      const unmappedHeaders = initialMappings.filter(m => !m.targetKey || m.confidence < 0.7);

      if (unmappedHeaders.length > 0) {
        setMappings(initialMappings);
        setStep('mapping');
        setAiLoading(true);

        try {
          // Build sample rows as objects for the AI
          const sampleRows = samples.map(row => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = row[i] || ''; });
            return obj;
          });

          const { data, error } = await supabase.functions.invoke('migration-field-mapper', {
            body: {
              sourceHeaders: unmappedHeaders.map(m => m.sourceHeader),
              sampleRows,
              entityType: 'shipment',
              targetFields: SHIPMENT_TARGET_FIELDS.map(tf => ({ field: tf.key, label: tf.label })),
            },
          });

          if (!error && data?.mappings) {
            // Merge AI results into existing mappings (only for unmapped/low-confidence)
            const aiMap = new Map<string, { targetField: string | null; confidence: number }>();
            for (const aiMapping of data.mappings) {
              if (aiMapping.targetField && aiMapping.confidence >= 50) {
                aiMap.set(aiMapping.sourceField, {
                  targetField: aiMapping.targetField,
                  confidence: aiMapping.confidence / 100, // normalize to 0-1
                });
              }
            }

            setMappings(prev => prev.map(m => {
              if ((!m.targetKey || m.confidence < 0.7) && aiMap.has(m.sourceHeader)) {
                const ai = aiMap.get(m.sourceHeader)!;
                return { ...m, targetKey: ai.targetField, confidence: ai.confidence };
              }
              return m;
            }));
          }
        } catch (e) {
          console.warn('AI field mapping fallback failed, using local matching only:', e);
        } finally {
          setAiLoading(false);
        }
      } else {
        setMappings(initialMappings);
        setStep('mapping');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleMappingChange = (index: number, targetKey: string | null) => {
    setMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, targetKey, confidence: targetKey ? (m.confidence || 1) : 0 } : m
    ));
  };

  const handleConfirmMapping = async () => {
    if (!file) return;

    setStep('importing');

    const mappingRecord: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.targetKey) {
        mappingRecord[m.sourceHeader] = m.targetKey;
      }
    });

    const importResult = await importShipmentsWithMapping(fileContent, mappingRecord);
    setResult(importResult);
    setStep('result');

    if (importResult.success > 0) {
      toast.success(`${importResult.success} zending(en) geïmporteerd`);
      onSuccess?.();
    }
    if (importResult.failed > 0) {
      toast.error(`${importResult.failed} zending(en) mislukt`);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFileContent('');
    setResult(null);
    setStep('upload');
    setMappings([]);
    setSampleData([]);
    setAiLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Importeren
            {step === 'mapping' && (
              <span className="text-xs font-normal text-muted-foreground ml-2">— Stap 2: Kolomtoewijzing</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="text-sm font-medium">Download template</p>
                  <p className="text-xs text-muted-foreground">CSV bestand met de juiste kolommen</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Template
                </Button>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                  isDragActive ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Sleep je CSV bestand hierheen</p>
                  <p className="text-xs text-muted-foreground">of klik om te bladeren</p>
                </div>
              </div>
            </>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && file && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{mappings.length} kolommen gedetecteerd</p>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI detecteert...</span>
                  </div>
                )}
              </div>

              <ShipmentFieldMapper
                sourceHeaders={mappings.map(m => m.sourceHeader)}
                targetFields={SHIPMENT_TARGET_FIELDS}
                mappings={mappings}
                onMappingChange={handleMappingChange}
                onConfirm={handleConfirmMapping}
                sampleData={sampleData}
              />
            </>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importeren...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-2xl font-bold text-emerald-400">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Succesvol</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Mislukt</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">Fouten</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'mapping' && (
            <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Terug
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            {step === 'result' ? 'Sluiten' : 'Annuleren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
