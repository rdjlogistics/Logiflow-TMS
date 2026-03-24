import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  PenLine,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CustomerContract } from '@/hooks/useCustomerContracts';

interface CustomerContractSigningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: CustomerContract | null;
  onSign: (params: { 
    contractId: string; 
    signatureRequestId: string; 
    signatureData: string;
    ipAddress?: string;
    userAgent?: string;
  }) => void;
  onDecline: (params: { 
    contractId: string; 
    signatureRequestId: string; 
    reason: string;
  }) => void;
  onView: (contractId: string, signatureRequestId?: string) => void;
  isSigning: boolean;
  isDeclining: boolean;
}

export const CustomerContractSigningDialog = ({
  open,
  onOpenChange,
  contract,
  onSign,
  onDecline,
  onView,
  isSigning,
  isDeclining,
}: CustomerContractSigningDialogProps) => {
  const [activeTab, setActiveTab] = useState<'view' | 'sign'>('view');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canSign = contract?.signature_request?.status && 
    ['pending', 'sent', 'viewed'].includes(contract.signature_request.status);

  // Log view event when opening
  useEffect(() => {
    if (open && contract) {
      onView(contract.id, contract.signature_request?.id);
    }
  }, [open, contract?.id]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setActiveTab('view');
      setDeclineReason('');
      setHasDrawn(false);
      clearCanvas();
    }
  }, [open]);

  // Canvas setup
  useEffect(() => {
    if (activeTab === 'sign' && open) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = 200;
        }
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }, 100);
    }
  }, [activeTab, open]);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = () => {
    if (!contract || !contract.signature_request || !hasDrawn) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');
    
    onSign({
      contractId: contract.id,
      signatureRequestId: contract.signature_request.id,
      signatureData,
      userAgent: navigator.userAgent,
    });
  };

  const handleDecline = () => {
    if (!contract || !contract.signature_request || !declineReason.trim()) return;

    onDecline({
      contractId: contract.id,
      signatureRequestId: contract.signature_request.id,
      reason: declineReason.trim(),
    });
    setShowDeclineDialog(false);
    onOpenChange(false);
  };

  if (!contract) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                contract.status === 'completed' 
                  ? "bg-green-500/20" 
                  : canSign
                    ? "bg-amber-500/20"
                    : "bg-muted"
              )}>
                <FileText className={cn(
                  "h-6 w-6",
                  contract.status === 'completed' 
                    ? "text-green-600" 
                    : canSign
                      ? "text-amber-600"
                      : "text-muted-foreground"
                )} />
              </div>
              <div>
                <DialogTitle className="text-xl">{contract.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {contract.status === 'completed' ? (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ondertekend
                    </Badge>
                  ) : canSign ? (
                    <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                      <PenLine className="h-3 w-3 mr-1" />
                      Te ondertekenen
                    </Badge>
                  ) : contract.status === 'declined' ? (
                    <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                      <XCircle className="h-3 w-3 mr-1" />
                      Afgewezen
                    </Badge>
                  ) : (
                    <Badge variant="outline">{contract.status}</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Versie {contract.version} • {format(new Date(contract.created_at), 'd MMMM yyyy', { locale: nl })}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {canSign ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'view' | 'sign')} className="flex-1 flex flex-col">
              <div className="px-6 border-b">
                <TabsList className="h-12">
                  <TabsTrigger value="view" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Contract Bekijken
                  </TabsTrigger>
                  <TabsTrigger value="sign" className="gap-2">
                    <PenLine className="h-4 w-4" />
                    Ondertekenen
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="view" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-[50vh]">
                  <div className="p-6">
                    {contract.content_html ? (
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.content_html || '') }}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Contract inhoud niet beschikbaar</p>
                        {contract.pdf_storage_url && (
                          <Button
                            variant="outline"
                            className="mt-3"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = contract.pdf_storage_url!;
                              a.download = `Contract.pdf`;
                              a.target = '_blank';
                              a.rel = 'noopener noreferrer';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sign" className="flex-1 m-0">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <PenLine className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      Teken hieronder uw handtekening
                    </p>
                  </div>
                  
                  <div className="border-2 border-dashed border-border rounded-xl bg-card overflow-hidden relative h-[200px]">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full touch-none cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-muted-foreground/40 text-lg font-medium">
                          Teken hier
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      disabled={!hasDrawn}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Wissen
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Door te ondertekenen gaat u akkoord met de voorwaarden in dit contract.
                    Deze handtekening is juridisch bindend.
                  </p>
                </div>
              </TabsContent>

              {/* Action Buttons */}
              <div className="p-6 border-t bg-muted/30 flex gap-3">
                {activeTab === 'sign' ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeclineDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Afwijzen
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-500"
                      onClick={handleSign}
                      disabled={!hasDrawn || isSigning}
                    >
                      {isSigning ? (
                        'Bezig met ondertekenen...'
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Bevestig Handtekening
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeclineDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Afwijzen
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setActiveTab('sign')}
                    >
                      <PenLine className="h-4 w-4 mr-2" />
                      Ga naar Ondertekenen
                    </Button>
                  </>
                )}
              </div>
            </Tabs>
          ) : (
            <>
              <ScrollArea className="flex-1 max-h-[60vh]">
                <div className="p-6">
                  {contract.content_html ? (
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.content_html || '') }}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Contract inhoud niet beschikbaar</p>
                      {contract.pdf_storage_url && (
                        <Button
                          variant="outline"
                          className="mt-3"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = contract.pdf_storage_url!;
                            a.download = `Contract.pdf`;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {contract.status === 'completed' && contract.signature_request?.signed_at && (
                <div className="p-6 border-t bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Contract ondertekend
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(contract.signature_request.signed_at), 'd MMMM yyyy HH:mm', { locale: nl })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Contract afwijzen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit contract wilt afwijzen? Geef hieronder een reden op.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reden voor afwijzing..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDecline}
              disabled={!declineReason.trim() || isDeclining}
            >
              {isDeclining ? 'Bezig...' : 'Afwijzen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
