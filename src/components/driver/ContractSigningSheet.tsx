import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  X,
  FileText,
  PenLine,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DriverContract } from '@/hooks/useDriverContracts';

interface ContractSigningSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: DriverContract | null;
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

type ViewMode = 'view' | 'sign' | 'decline';

export const ContractSigningSheet = ({
  open,
  onOpenChange,
  contract,
  onSign,
  onDecline,
  onView,
  isSigning,
  isDeclining,
}: ContractSigningSheetProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
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
      setViewMode('view');
      setDeclineReason('');
      setHasDrawn(false);
      clearCanvas();
    }
  }, [open]);

  // Canvas setup
  useEffect(() => {
    if (viewMode === 'sign') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = 200;
        }
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [viewMode]);

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
    setShowDeclineConfirm(false);
  };

  if (!contract) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl">
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-border bg-background sticky top-0 z-10">
            <div className="flex items-center justify-between">
              {viewMode !== 'view' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('view')}
                  className="h-10 w-10 rounded-xl"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-10 w-10 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1 text-center">
                <h2 className="font-semibold text-lg truncate px-2">
                  {viewMode === 'sign' ? 'Ondertekenen' : 
                   viewMode === 'decline' ? 'Afwijzen' : 
                   contract.title}
                </h2>
              </div>
              <div className="w-10" /> {/* Spacer for balance */}
            </div>
          </div>

          {viewMode === 'view' && (
            <>
              {/* Contract Info */}
              <div className="px-4 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
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
                        ? "text-green-600 dark:text-green-400" 
                        : canSign
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{contract.title}</p>
                    <p className="text-sm text-muted-foreground">{contract.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {contract.status === 'completed' ? (
                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ondertekend
                    </Badge>
                  ) : canSign ? (
                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      <PenLine className="h-3 w-3 mr-1" />
                      Te ondertekenen
                    </Badge>
                  ) : contract.status === 'declined' ? (
                    <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
                      <XCircle className="h-3 w-3 mr-1" />
                      Afgewezen
                    </Badge>
                  ) : (
                    <Badge variant="outline">{contract.status}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Versie {contract.version} • {format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })}
                  </span>
                </div>
              </div>

              {/* Contract Content */}
              <ScrollArea className="flex-1 h-[calc(95vh-280px)]">
                <div className="p-4">
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

              {/* Action Buttons */}
              {canSign && (
                <div className="flex-shrink-0 p-4 border-t border-border bg-background space-y-2">
                  <Button
                    className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary-glow"
                    onClick={() => setViewMode('sign')}
                  >
                    <PenLine className="h-5 w-5 mr-2" />
                    Ondertekenen
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl text-destructive hover:text-destructive"
                    onClick={() => setViewMode('decline')}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Afwijzen
                  </Button>
                </div>
              )}

              {contract.status === 'completed' && contract.signature_request?.signed_at && (
                <div className="flex-shrink-0 p-4 border-t border-border bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
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

          {viewMode === 'sign' && (
            <div className="flex flex-col h-full">
              {/* Signature Canvas */}
              <div className="flex-1 p-4 flex flex-col">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Teken hieronder je handtekening
                  </p>
                </div>
                
                <div className="flex-1 border-2 border-dashed border-border rounded-xl bg-card overflow-hidden relative min-h-[200px]">
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
                
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={clearCanvas}
                  disabled={!hasDrawn}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Wissen
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Door te ondertekenen ga je akkoord met de voorwaarden in dit contract.
                  Deze handtekening is juridisch bindend.
                </p>
              </div>

              {/* Sign Button */}
              <div className="flex-shrink-0 p-4 border-t border-border bg-background">
                <Button
                  className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-green-600 to-green-500"
                  onClick={handleSign}
                  disabled={!hasDrawn || isSigning}
                >
                  {isSigning ? (
                    <>Bezig met ondertekenen...</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Bevestig handtekening
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {viewMode === 'decline' && (
            <div className="flex flex-col h-full">
              {/* Decline Form */}
              <div className="flex-1 p-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                </div>
                
                <h3 className="font-semibold text-center mb-2">Contract afwijzen</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Weet je zeker dat je dit contract wilt afwijzen? 
                  Geef hieronder een reden op.
                </p>

                <Textarea
                  placeholder="Reden voor afwijzing..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              {/* Decline Button */}
              <div className="flex-shrink-0 p-4 border-t border-border bg-background">
                <Button
                  variant="destructive"
                  className="w-full h-14 text-lg font-semibold rounded-xl"
                  onClick={() => setShowDeclineConfirm(true)}
                  disabled={!declineReason.trim() || isDeclining}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Bevestig afwijzing
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={showDeclineConfirm} onOpenChange={setShowDeclineConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract afwijzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit contract wilt afwijzen? 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDecline}
              disabled={isDeclining}
            >
              {isDeclining ? 'Bezig...' : 'Ja, afwijzen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
