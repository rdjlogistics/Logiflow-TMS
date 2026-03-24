import { useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { 
  ScanLine, 
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Sparkles,
  FileCheck,
  Receipt,
  Truck
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

interface OcrResult {
  id: string;
  fileName: string;
  documentType: string;
  status: string;
  confidence?: number;
  progress?: number;
  extractedData?: Record<string, string>;
  linkedOrder?: string;
  error?: string;
  createdAt: Date;
}

export default function SmartDocumentOCR() {
  const [results, setResults] = useState<OcrResult[]>([]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processDocument = async (file: File, resultId: string) => {
    try {
      // Step 1: Convert file to base64
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, progress: 20 } : r
      ));

      const base64 = await fileToBase64(file);

      // Step 2: Upload to storage
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, progress: 40 } : r
      ));

      const filePath = `ocr/${Date.now()}_${file.name}`;
      await supabase.storage.from('order-documents').upload(filePath, file);

      // Step 3: Call AI OCR edge function
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, progress: 60 } : r
      ));

      const { data, error } = await supabase.functions.invoke('smart-document-ocr', {
        body: {
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        },
      });

      if (error) throw error;

      // Step 4: Process result
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, progress: 90 } : r
      ));

      if (data?.success) {
        const extracted = data.extractedData || {};
        // Flatten nested objects for display, exclude meta fields
        const displayData: Record<string, string> = {};
        for (const [key, value] of Object.entries(extracted)) {
          if (['confidence', 'documentType', 'warnings'].includes(key)) continue;
          if (typeof value === 'string' || typeof value === 'number') {
            displayData[key] = String(value);
          }
        }

        setResults(prev => prev.map(r => 
          r.id === resultId ? {
            ...r,
            status: 'completed',
            progress: undefined,
            confidence: data.confidence || 75,
            extractedData: displayData,
            documentType: data.documentType || r.documentType,
          } : r
        ));
        toast.success(`${file.name} succesvol verwerkt`);
      } else {
        throw new Error(data?.error || 'Verwerking mislukt');
      }
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setResults(prev => prev.map(r => 
        r.id === resultId ? {
          ...r,
          status: 'failed',
          progress: undefined,
          error: err?.message || 'Verwerking mislukt',
        } : r
      ));
      toast.error(`Fout bij verwerken: ${file.name}`);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const resultId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const lowerName = file.name.toLowerCase();
      const documentType = lowerName.includes('cmr') ? 'cmr' : 
                    (lowerName.includes('inv') || lowerName.includes('fact')) ? 'invoice' :
                    lowerName.includes('pod') ? 'pod' : 'other';

      const newResult: OcrResult = {
        id: resultId,
        fileName: file.name,
        documentType,
        status: 'processing',
        progress: 5,
        createdAt: new Date(),
      };
      
      setResults(prev => [newResult, ...prev]);
      toast.info(`${file.name} wordt verwerkt via AI...`);
      
      // Process via edge function
      processDocument(file, resultId);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
    }
  });

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'cmr':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><Truck className="h-3 w-3 mr-1" />CMR</Badge>;
      case 'invoice':
        return <Badge variant="outline" className="border-green-500 text-green-500"><Receipt className="h-3 w-3 mr-1" />Factuur</Badge>;
      case 'pod':
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><FileCheck className="h-3 w-3 mr-1" />POD</Badge>;
      case 'packing_list':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><FileText className="h-3 w-3 mr-1" />Paklijst</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string, confidence?: number) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            {confidence}% betrouwbaar
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Verwerken...
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Mislukt
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = {
    total: results.length,
    completed: results.filter(r => r.status === 'completed').length,
    processing: results.filter(r => r.status === 'processing').length,
    avgConfidence: Math.round(
      results.filter(r => r.confidence).reduce((acc, r) => acc + (r.confidence || 0), 0) / 
      results.filter(r => r.confidence).length
    ) || 0,
  };

  return (
    <DashboardLayout title="Smart Document OCR" description="AI-gestuurde documentherkenning en data-extractie">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ScanLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Totaal gescand</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Succesvol</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">In verwerking</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgConfidence}%</p>
                  <p className="text-sm text-muted-foreground">Gem. betrouwbaarheid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Zone */}
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop documenten hier...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Sleep documenten hierheen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    of klik om te selecteren • PDF, JPG, PNG
                  </p>
                </>
              )}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="outline">CMR</Badge>
                <Badge variant="outline">Facturen</Badge>
                <Badge variant="outline">POD's</Badge>
                <Badge variant="outline">Paklijsten</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Verwerkingsresultaten</CardTitle>
            <CardDescription>AI-geëxtraheerde data uit gescande documenten</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScanLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Upload een document om te beginnen</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Geëxtraheerde Data</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(result => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-48">{result.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getDocTypeBadge(result.documentType)}</TableCell>
                      <TableCell>
                        {result.status === 'processing' && result.progress !== undefined ? (
                          <div className="flex items-center gap-2">
                            <Progress value={result.progress} className="w-20 h-2" />
                            <span className="text-sm">{result.progress}%</span>
                          </div>
                        ) : (
                          getStatusBadge(result.status, result.confidence)
                        )}
                      </TableCell>
                      <TableCell>
                        {result.extractedData ? (
                          <div className="text-sm space-y-0.5">
                            {Object.entries(result.extractedData).slice(0, 2).map(([key, value]) => (
                              <div key={key} className="flex gap-1">
                                <span className="text-muted-foreground capitalize">{key}:</span>
                                <span className="truncate max-w-32">{value}</span>
                              </div>
                            ))}
                            {Object.keys(result.extractedData).length > 2 && (
                              <span className="text-muted-foreground">
                                +{Object.keys(result.extractedData).length - 2} meer...
                              </span>
                            )}
                          </div>
                        ) : result.error ? (
                          <span className="text-sm text-destructive">{result.error}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Verwerken...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(result.createdAt, "d MMM HH:mm", { locale: nl })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
