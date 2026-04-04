import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, ArrowRight, Loader2, X, FileText } from 'lucide-react';
import { useBulkImport } from '@/hooks/useBulkImport';
import { cn } from '@/lib/utils';
import { readExcelFile } from '@/lib/excelUtils';

interface BulkImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'orders' | 'customers';
  companyId: string;
  onComplete?: () => void;
}

export const BulkImportWizard = ({ open, onOpenChange, entityType, companyId, onComplete }: BulkImportWizardProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [result, setResult] = useState<{ success: boolean; imported: number; skipped: number; errors?: string[] } | null>(null);
  const { importing, importOrders, importCustomers, downloadTemplate } = useBulkImport();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const f = acceptedFiles[0];
      setFile(f);
      try {
        const { rows } = await readExcelFile(f);
        setPreview(rows.slice(0, 10));
        setStep(2);
      } catch { 
        setPreview([]); 
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) return;
    const res = entityType === 'orders' ? await importOrders(file, companyId) : await importCustomers(file, companyId);
    setResult({ success: res.success > 0, imported: res.success, skipped: res.failed, errors: res.errors.map(e => e.error) });
    setStep(3);
  };

  const handleClose = () => {
    setFile(null); setPreview([]); setResult(null); setStep(1);
    onOpenChange(false);
    if (result?.success && onComplete) onComplete();
  };

  const entityLabels = { orders: { plural: 'orders' }, customers: { plural: 'klanten' } };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><Upload className="h-5 w-5 text-primary" /></div>
            Bulk Import - {entityLabels[entityType].plural}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={cn("flex-1 h-0.5 mx-2", step > s ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>
          {step === 1 && (
            <div key="step1" className="space-y-4">
              <div {...getRootProps()} className={cn("border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer", isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <input {...getInputProps()} />
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4"><FileSpreadsheet className="h-8 w-8 text-muted-foreground" /></div>
                <p className="font-medium mb-1">{isDragActive ? 'Laat los' : 'Sleep bestand hierheen'}</p>
                <p className="text-sm text-muted-foreground">CSV of Excel</p>
              </div>
              <div className="flex items-center justify-center">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate(entityType)}><Download className="h-4 w-4 mr-2" />Download template</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div key="step2" className="space-y-4">
              {file && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/40">
                  <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary" /><span className="font-medium text-sm">{file.name}</span></div>
                  <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreview([]); setStep(1); }}><X className="h-4 w-4" /></Button>
                </div>
              )}
              {preview.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="py-3"><CardTitle className="text-sm flex items-center justify-between">Preview<Badge variant="secondary">{preview.length} rijen</Badge></CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-48 overflow-auto">
                      <Table>
                        <TableHeader><TableRow>{Object.keys(preview[0]).slice(0, 4).map(k => <TableHead key={k} className="text-xs">{k}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>{preview.slice(0, 5).map((row, i) => <TableRow key={i}>{Object.values(row).slice(0, 4).map((v, j) => <TableCell key={j} className="text-xs">{String(v).slice(0, 20)}</TableCell>)}</TableRow>)}</TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setFile(null); setPreview([]); setStep(1); }}>Terug</Button>
                <Button variant="premium" className="flex-1" onClick={handleImport} disabled={importing || !preview.length}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}Importeren
                </Button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div key="step3" className="text-center py-8">
              <div className={cn("w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4", result.success ? "bg-success/20" : "bg-destructive/20")}>
                {result.success ? <CheckCircle2 className="h-10 w-10 text-success" /> : <AlertCircle className="h-10 w-10 text-destructive" />}
              </div>
              <h3 className="text-xl font-bold mb-2">{result.success ? 'Import geslaagd!' : 'Import mislukt'}</h3>
              <p className="text-muted-foreground mb-6">{result.imported} geïmporteerd</p>
              <Button onClick={handleClose} variant="premium">Sluiten</Button>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
};