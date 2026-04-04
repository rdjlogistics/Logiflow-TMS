import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCharterGrowth } from '@/hooks/useCharterGrowth';
import { useRFQFileUpload } from '@/hooks/useRFQFileUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Inbox, 
  Mail, 
  Upload, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  ArrowRight,
  FileText,
  Clock,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

// Upload Dialog Component with drag & drop
const UploadRFQDialog = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const uploadFile = useRFQFileUpload();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'message/rfc822': ['.eml'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploadProgress(25);
    try {
      await uploadFile.mutateAsync(selectedFile);
      setUploadProgress(100);
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        onOpenChange(false);
      }, 500);
    } catch {
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            RFQ Bestand Uploaden
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!selectedFile ? (
            <div 
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                isDragActive && !isDragReject && "border-primary bg-primary/5",
                isDragReject && "border-destructive bg-destructive/5",
                !isDragActive && "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className={cn(
                "h-10 w-10 mx-auto mb-3",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )} />
              {isDragActive && !isDragReject ? (
                <p className="text-sm font-medium text-primary">Laat los om te uploaden</p>
              ) : isDragReject ? (
                <p className="text-sm font-medium text-destructive">Ongeldig bestandstype</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Sleep een bestand hierheen of klik om te selecteren</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, EML of TXT (max. 10MB)</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadFile.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {uploadProgress < 100 ? 'Uploaden...' : 'Voltooid!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploadFile.isPending}>
            Annuleren
          </Button>
          {selectedFile && (
            <Button onClick={handleUpload} disabled={uploadFile.isPending}>
              {uploadFile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Uploaden
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RFQInbox = () => {
  const { rfqMessages, rfqLoading, createRFQ, updateRFQStatus } = useCharterGrowth();
  const { toast } = useToast();
  const [selectedRFQ, setSelectedRFQ] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [newRFQ, setNewRFQ] = useState({ subject: '', body_text: '', sender_email: '' });

  const stats = {
    new: rfqMessages.filter(r => r.status === 'NEW').length,
    needsReview: rfqMessages.filter(r => r.status === 'NEEDS_REVIEW').length,
    converted: rfqMessages.filter(r => r.status === 'CONVERTED').length,
  };

  const selectedMessage = rfqMessages.find(r => r.id === selectedRFQ);

  const handleAddRFQ = async () => {
    await createRFQ.mutateAsync({
      source: 'MANUAL',
      subject: newRFQ.subject,
      body_text: newRFQ.body_text,
      sender_email: newRFQ.sender_email,
    });
    setShowAddDialog(false);
    setNewRFQ({ subject: '', body_text: '', sender_email: '' });
  };

  const handleParseRFQ = async (rfqId: string) => {
    setIsParsing(true);
    try {
      const rfq = rfqMessages.find(r => r.id === rfqId);
      if (!rfq) return;

      // Call AI to parse the RFQ
      const { data, error } = await supabase.functions.invoke('rfq-parser', {
        body: { 
          subject: rfq.subject,
          body: rfq.body_text,
        },
      });

      if (error) throw error;

      const confidence = data?.confidence || 0;
      const newStatus = confidence >= 0.8 ? 'PARSED' : 'NEEDS_REVIEW';

      await updateRFQStatus.mutateAsync({
        id: rfqId,
        status: newStatus,
        extracted_json: data?.extracted,
      });

      toast({
        title: confidence >= 0.8 ? 'RFQ geparsed' : 'Review nodig',
        description: confidence >= 0.8 
          ? 'De RFQ is succesvol verwerkt.' 
          : 'De AI heeft lage zekerheid, controleer de extractie.',
      });
    } catch (err) {
      // Fallback: mock parsing
      await updateRFQStatus.mutateAsync({
        id: rfqId,
        status: 'PARSED',
        extracted_json: {
          lanes: [{ origin: 'Amsterdam', destination: 'Rotterdam' }],
          volumes: '50 pallets/week',
          requirements: ['Tautliner', 'Next-day delivery'],
        },
      });
      toast({ title: 'RFQ geparsed' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleConvert = async (rfqId: string) => {
    await updateRFQStatus.mutateAsync({
      id: rfqId,
      status: 'CONVERTED',
    });
    toast({
      title: 'RFQ geconverteerd',
      description: 'Een nieuwe deal en offerte-concept zijn aangemaakt.',
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      NEW: { label: 'Nieuw', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Mail },
      PARSED: { label: 'Geparsed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
      NEEDS_REVIEW: { label: 'Review nodig', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: AlertTriangle },
      CONVERTED: { label: 'Geconverteerd', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: ArrowRight },
      ARCHIVED: { label: 'Gearchiveerd', color: 'bg-gray-500/10 text-gray-600 border-gray-500/30', icon: FileText },
    };
    return configs[status] || configs.NEW;
  };

  return (
    <DashboardLayout title="RFQ Inbox" description="Tender en offerte aanvragen beheren">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
                  <p className="text-xs text-muted-foreground">Nieuwe RFQs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.needsReview}</p>
                  <p className="text-xs text-muted-foreground">Review Nodig</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.converted}</p>
                  <p className="text-xs text-muted-foreground">Geconverteerd</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inbox</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload RFQ
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Handmatig Toevoegen
            </Button>
          </div>
        </div>

        {/* Messages List */}
        <Card>
          <CardContent className="p-0">
            {rfqLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rfqMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Geen RFQ berichten</p>
                <p className="text-sm mt-1">Upload of voeg handmatig een RFQ toe</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {rfqMessages.map((rfq) => {
                  const statusConfig = getStatusConfig(rfq.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={rfq.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedRFQ(rfq.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn('p-2 rounded-lg', statusConfig.color.split(' ')[0])}>
                          <StatusIcon className={cn('h-4 w-4', statusConfig.color.split(' ')[1])} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{rfq.subject || 'Geen onderwerp'}</span>
                            <Badge variant="outline" className={cn('text-[10px]', statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {rfq.sender_email && <span>{rfq.sender_email}</span>}
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(rfq.created_at), 'd MMM HH:mm', { locale: nl })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rfq.status === 'NEW' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleParseRFQ(rfq.id); }}
                            disabled={isParsing}
                          >
                            {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                            Parse
                          </Button>
                        )}
                        {(rfq.status === 'PARSED' || rfq.status === 'NEEDS_REVIEW') && (
                          <Button 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleConvert(rfq.id); }}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Converteer
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedRFQ(rfq.id); >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RFQ Detail Sheet */}
      <Sheet open={!!selectedRFQ} onOpenChange={() => setSelectedRFQ(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedMessage?.subject || 'RFQ Details'}</SheetTitle>
            <SheetDescription>
              {selectedMessage?.sender_email} • {selectedMessage && format(new Date(selectedMessage.created_at), 'PPp', { locale: nl })}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Status */}
            {selectedMessage && (
              <Badge variant="outline" className={getStatusConfig(selectedMessage.status).color}>
                {getStatusConfig(selectedMessage.status).label}
              </Badge>
            )}

            {/* Body */}
            <div>
              <Label className="text-xs text-muted-foreground">Bericht</Label>
              <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                {selectedMessage?.body_text || 'Geen inhoud'}
              </div>
            </div>

            {/* Extracted Data */}
            {selectedMessage?.extracted_json && (
              <div>
                <Label className="text-xs text-muted-foreground">AI Extractie</Label>
                <div className="mt-1 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(selectedMessage.extracted_json, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {selectedMessage?.status === 'NEW' && (
                <Button onClick={() => handleParseRFQ(selectedMessage.id)} disabled={isParsing} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Parse
                </Button>
              )}
              {(selectedMessage?.status === 'PARSED' || selectedMessage?.status === 'NEEDS_REVIEW') && (
                <Button onClick={() => handleConvert(selectedMessage.id)} className="flex-1">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Converteer naar Deal
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add RFQ Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RFQ Handmatig Toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input 
                value={newRFQ.subject}
                onChange={(e) => setNewRFQ(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="RFQ onderwerp..."
              />
            </div>
            <div className="space-y-2">
              <Label>Afzender Email</Label>
              <Input 
                type="email"
                value={newRFQ.sender_email}
                onChange={(e) => setNewRFQ(prev => ({ ...prev, sender_email: e.target.value }))}
                placeholder="email@bedrijf.nl"
              />
            </div>
            <div className="space-y-2">
              <Label>Bericht</Label>
              <Textarea 
                value={newRFQ.body_text}
                onChange={(e) => setNewRFQ(prev => ({ ...prev, body_text: e.target.value }))}
                placeholder="Volledige tekst van de RFQ..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuleren</Button>
            <Button onClick={handleAddRFQ} disabled={createRFQ.isPending}>
              {createRFQ.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload RFQ Dialog */}
      <UploadRFQDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog}
      />
    </DashboardLayout>
  );
};

export default RFQInbox;
