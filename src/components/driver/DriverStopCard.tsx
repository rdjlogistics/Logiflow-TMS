import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/utils/storageUtils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { NavigationChooser } from '@/components/shared/NavigationChooser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  Building2,
  User,
  FileText,
  Package,
  Globe,
  PenLine,
  Camera,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Upload,
  Image,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StopCheckoutFlow } from './StopCheckoutFlow';
import { WaitingTimeControls } from './WaitingTimeControls';
import { StopDocumentUpload } from './StopDocumentUpload';

interface DriverStopCardProps {
  stop: {
    id: string;
    trip_id: string;
    stop_order: number;
    stop_type: string;
    address: string;
    city: string | null;
    postal_code: string | null;
    company_name: string | null;
    contact_name: string | null;
    phone: string | null;
    notes: string | null;
    status: string;
    time_window_start: string | null;
    time_window_end: string | null;
    actual_arrival: string | null;
    customer_reference: string | null;
    waybill_number: string | null;
    cargo_description?: string | null;
    weight_kg?: number | null;
    colli_count?: number | null;
    dimensions?: string | null;
    country?: string | null;
    waiting_started_at?: string | null;
    waiting_ended_at?: string | null;
    waiting_minutes?: number | null;
  };
  tripId: string;
  isActive: boolean;
  isCompleted: boolean;
  onRefresh: () => void;
  showPurchasePrice?: boolean;
  purchaseTotal?: number | null;
  tripStatus?: string;
}

const stopTypeConfig: Record<string, { label: string; icon: typeof ArrowUp; color: string }> = {
  pickup: { label: 'Ophalen', icon: ArrowUp, color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  delivery: { label: 'Afleveren', icon: ArrowDown, color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
  both: { label: 'Ophalen & Afleveren', icon: ArrowUpDown, color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400' },
};

export const DriverStopCard = ({
  stop,
  tripId,
  isActive,
  isCompleted,
  onRefresh,
  showPurchasePrice = false,
  purchaseTotal,
  tripStatus,
}: DriverStopCardProps) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'signature' | 'photos' | 'form'>('idle');
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  // Query documents for this stop
  const { data: stopDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['stop-documents', tripId, stop.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('order_documents')
        .select('id, name, mime_type, file_size, url, created_at')
        .eq('order_id', tripId)
        .like('url', `%${stop.id}%`)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Query stop proofs (signature + photos)
  const { data: proofData, isLoading: proofLoading } = useQuery({
    queryKey: ['stop-proof-preview', stop.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stop_proofs')
        .select('id, signature_url, photo_urls')
        .eq('stop_id', stop.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;

      // Resolve signed URLs
      const [signatureSignedUrl, ...photoSignedUrls] = await Promise.all([
        data.signature_url ? getSignedUrl('pod-files', data.signature_url) : Promise.resolve(null),
        ...((data.photo_urls as string[]) || []).map((p: string) => getSignedUrl('pod-files', p)),
      ]);

      return {
        id: data.id,
        signatureUrl: signatureSignedUrl,
        photoUrls: photoSignedUrls.filter((u): u is string => u !== null),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const downloadViaBlob = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 100);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleViewDocument = async (doc: { id: string; url: string; name: string }) => {
    setOpeningDocId(doc.id);
    try {
      if (doc.url.startsWith('http://') || doc.url.startsWith('https://')) {
        await downloadViaBlob(doc.url, doc.name);
        return;
      }
      const { data, error } = await supabase.storage
        .from('order-documents')
        .createSignedUrl(doc.url, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        await downloadViaBlob(data.signedUrl, doc.name);
      }
    } catch (err) {
      console.error('Error opening document:', err);
      toast.error('Kan document niet openen');
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleDocUploadClose = () => {
    setShowDocUpload(false);
    refetchDocs();
  };

  const stopConfig = stopTypeConfig[stop.stop_type] || stopTypeConfig.delivery;
  const StopIcon = stopConfig.icon;

  const formatTimeWindow = () => {
    if (!stop.time_window_start && !stop.time_window_end) return null;
    const start = stop.time_window_start?.substring(0, 5) || '00:00';
    const end = stop.time_window_end?.substring(0, 5) || '23:59';
    
    const typeLabel = stop.stop_type === 'pickup' ? 'Ophalen' : 'Afleveren';
    if (start === end || !stop.time_window_end) {
      return `${typeLabel} om ${start}`;
    }
    return `${typeLabel} ${start} - ${end}`;
  };

  const [showNavChooser, setShowNavChooser] = useState(false);

  const fullAddress = useMemo(() => {
    return `${stop.address}, ${stop.postal_code || ''} ${stop.city || ''} ${stop.country || 'NL'}`.trim();
  }, [stop]);

  const openNavigation = () => {
    setShowNavChooser(true);
  };

  const handleCheckoutComplete = () => {
    setShowCheckout(false);
    setCheckoutStep('idle');
    onRefresh();
  };

  // Show checkout flow
  if (showCheckout) {
    return (
      <StopCheckoutFlow
        stop={stop}
        tripId={tripId}
        onComplete={handleCheckoutComplete}
        onCancel={() => setShowCheckout(false)}
      />
    );
  }

  const isImage = (mimeType: string | null) => mimeType?.startsWith('image/');

  return (
    <>
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden',
        isCompleted && 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/40',
        isActive && !isCompleted && 'border-2 border-primary shadow-xl shadow-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
      )}
    >
      <CardContent className="p-0">
        {/* Header with stop number and type */}
        <div className={cn(
          'px-4 py-4 flex items-center justify-between',
          isCompleted 
            ? 'bg-gradient-to-r from-green-500/15 to-green-500/5 border-b border-green-500/20' 
            : 'bg-gradient-to-r from-muted/50 to-transparent border-b border-border/50'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg transition-transform',
              isCompleted 
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-500/25' 
                : isActive 
                  ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-primary/25 scale-105'
                  : 'bg-gradient-to-br from-muted to-muted/50 text-muted-foreground'
            )}>
              {isCompleted ? (
                <CheckCircle className="w-7 h-7" />
              ) : (
                stop.stop_order
              )}
            </div>
            <div>
              <Badge 
                variant="outline" 
                className={cn(
                  'text-sm font-semibold px-3 py-1 mb-1', 
                  stopConfig.color
                )}
              >
                <StopIcon className="w-4 h-4 mr-1.5" />
                {stopConfig.label}
              </Badge>
              {formatTimeWindow() && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatTimeWindow()}
                </p>
              )}
            </div>
          </div>
          {isCompleted && (
            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold px-3 py-1.5 shadow-lg shadow-green-500/20">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Afgemeld
            </Badge>
          )}
        </div>

        {/* Address section */}
        <div className="px-4 py-3 space-y-2">
          {stop.company_name && (
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="font-semibold text-lg">{stop.company_name}</span>
            </div>
          )}
          
          {stop.contact_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>t.a.v. {stop.contact_name}</span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{stop.address}</p>
              <p className="text-muted-foreground">
                {stop.postal_code} {stop.city}
                {stop.country && stop.country !== 'NL' && `, ${stop.country}`}
              </p>
            </div>
          </div>

          {/* Phone - clickable */}
          {stop.phone && (
            <a
              href={`tel:${stop.phone}`}
              className="flex items-center gap-2 text-primary hover:underline py-2 px-3 -mx-3 bg-primary/5 rounded-lg"
            >
              <Phone className="w-5 h-5" />
              <span className="font-medium text-lg">{stop.phone}</span>
            </a>
          )}

          {/* Reference */}
          {stop.customer_reference && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ref:</span>
              <span className="font-medium">{stop.customer_reference}</span>
            </div>
          )}

          {/* Notes */}
          {stop.notes && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <FileText className="w-4 h-4 inline mr-1.5" />
                {stop.notes}
              </p>
            </div>
          )}

          {/* Cargo info */}
          {(stop.colli_count || stop.weight_kg || stop.dimensions || stop.cargo_description) && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                Lading
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {stop.colli_count && (
                  <div>
                    <span className="text-muted-foreground">Colli: </span>
                    <span className="font-medium">{stop.colli_count}</span>
                  </div>
                )}
                {stop.weight_kg && (
                  <div>
                    <span className="text-muted-foreground">Gewicht: </span>
                    <span className="font-medium">{stop.weight_kg} kg</span>
                  </div>
                )}
                {stop.dimensions && (
                  <div>
                    <span className="text-muted-foreground">Afm: </span>
                    <span className="font-medium">{stop.dimensions}</span>
                  </div>
                )}
              </div>
              {stop.cargo_description && (
                <p className="text-sm">{stop.cargo_description}</p>
              )}
            </div>
          )}

          {/* Purchase price / earnings (if enabled via tenant settings) */}
          {showPurchasePrice && purchaseTotal != null && purchaseTotal > 0 && (
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Jouw verdienste
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  € {purchaseTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Documents overview */}
        {stopDocs && stopDocs.length > 0 && (
          <div className="px-4 py-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Paperclip className="w-4 h-4" />
              Documenten ({stopDocs.length})
            </div>
            <div className="space-y-1.5">
              {stopDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleViewDocument(doc)}
                  disabled={openingDocId === doc.id}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    isImage(doc.mime_type) ? 'bg-blue-500/10' : 'bg-orange-500/10'
                  )}>
                    {openingDocId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : isImage(doc.mime_type) ? (
                      <Image className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Proof Preview (signature + photos) */}
        {(proofLoading || proofData) && (
          <div className="px-4 py-3 border-t border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 mb-2.5">
              <CheckCircle className="w-4 h-4" />
              Afleverbewijzen
            </div>
            {proofLoading ? (
              <div className="flex gap-3">
                <Skeleton className="h-16 w-24 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
              </div>
            ) : proofData && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {proofData.signatureUrl && (
                  <a
                    href={proofData.signatureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex-shrink-0 group"
                  >
                    <div className="h-16 w-24 rounded-lg border-2 border-green-500/30 bg-white overflow-hidden">
                      <img
                        src={proofData.signatureUrl}
                        alt="Handtekening"
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <Badge className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] px-1.5 py-0 h-5">
                      <PenLine className="w-3 h-3 mr-0.5" />
                      Teken
                    </Badge>
                  </a>
                )}
                {proofData.photoUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex-shrink-0 group"
                  >
                    <div className="h-16 w-16 rounded-lg border border-border/50 overflow-hidden">
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    {i === 0 && proofData.photoUrls.length > 0 && (
                      <Badge className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] px-1.5 py-0 h-5">
                        <Camera className="w-3 h-3 mr-0.5" />
                        {proofData.photoUrls.length}
                      </Badge>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}


        {(isActive || isCompleted) && (() => {
          const hasArrived = !!stop.actual_arrival;
          const waitingStarted = !!stop.waiting_started_at;
          const waitingEnded = !!stop.waiting_ended_at;
          const waitingSkipped = hasArrived && !waitingStarted && !isCompleted;
          const waitingPassed = waitingEnded || waitingSkipped;

          const steps = [
            {
              label: 'Aankomst',
              icon: MapPin,
              status: hasArrived ? 'completed' : (isActive ? 'current' : 'pending'),
            },
            {
              label: 'Wachttijd',
              icon: Clock,
              status: (waitingPassed || isCompleted)
                ? 'completed'
                : (hasArrived ? 'current' : 'pending'),
            },
            {
              label: 'Afmelden',
              icon: CheckCircle,
              status: isCompleted
                ? 'completed'
                : (waitingPassed ? 'current' : 'pending'),
            },
          ] as const;

          return (
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.label} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        }
                        className={cn(
                          "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-300",
                          step.status === 'completed' && "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30",
                          step.status === 'current' && "border-primary bg-primary/10 text-primary",
                          step.status === 'pending' && "border-muted-foreground/30 bg-muted/30 text-muted-foreground/50",
                        )}
                      >
                          {step.status === 'completed' ? (
                            <div
                              key="check"
                            >
                              <Check className="w-4 h-4" />
                            </div>
                          ) : (
                            <div
                              key="icon"
                            >
                              <step.icon className="w-4 h-4" />
                            </div>
                          )}
                        {step.status === 'current' && (
                          <div
                            className="absolute inset-0 rounded-full border-2 border-primary"
                          />
                        )}
                        {step.status === 'completed' && (
                          <div
                            className="absolute inset-0 rounded-full border-2 border-green-400"
                          />
                        )}
                      </div>
                      <span className={cn(
                        "text-2xs font-medium transition-colors duration-300",
                        step.status === 'completed' && "text-green-600 dark:text-green-400",
                        step.status === 'current' && "text-primary font-semibold",
                        step.status === 'pending' && "text-muted-foreground/50",
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 mb-4 rounded-full bg-muted-foreground/20 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Waiting Time Controls */}
        {isActive && !isCompleted && (
          <div className="px-4 py-3 border-t border-border/50">
            <WaitingTimeControls
              stopId={stop.id}
              tripId={tripId}
              stopStatus={stop.status}
              waitingStartedAt={stop.waiting_started_at || null}
              waitingEndedAt={stop.waiting_ended_at || null}
              waitingMinutes={stop.waiting_minutes || 0}
              actualArrival={stop.actual_arrival}
              onEventRecorded={onRefresh}
              onStartCheckout={() => setShowCheckout(true)}
            />
          </div>
        )}

        {/* Premium Action Buttons — always show, read-only when completed */}
        {(
          <div className="px-4 py-4 border-t border-border/40 bg-background/80 backdrop-blur-xl">
            {/* Disabled hint */}
            {!isActive && !isCompleted && (
              <div className="flex items-center justify-center gap-2 mb-3 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {tripStatus === 'onderweg' || tripStatus === 'geladen'
                    ? 'Meld eerst de vorige stop af' 
                    : 'Start eerst de rit om acties te gebruiken'}
                </span>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center justify-center gap-2 mb-3 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Stop afgemeld
                </span>
              </div>
            )}
            <div className="grid grid-cols-5 gap-2">
              <button
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-sm hover:bg-blue-500/10 hover:border-blue-500/30 active:scale-95 transition-all duration-200"
                onClick={openNavigation}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-[11px] font-semibold text-foreground">Navigeer</span>
              </button>

              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-200",
                  isActive 
                    ? "border-border/50 bg-background/60 backdrop-blur-sm hover:bg-purple-500/10 hover:border-purple-500/30 active:scale-95" 
                    : "border-border/20 bg-muted/30 opacity-50"
                )}
                onClick={() => isActive && setShowCheckout(true)}
                disabled={!isActive}
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", isActive ? "bg-purple-500/15" : "bg-muted/50")}>
                  <PenLine className={cn("h-5 w-5", isActive ? "text-purple-500" : "text-muted-foreground/50")} />
                </div>
                <span className={cn("text-[11px] font-semibold", isActive ? "text-foreground" : "text-muted-foreground/50")}>Teken</span>
              </button>

              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-200",
                  isActive 
                    ? "border-border/50 bg-background/60 backdrop-blur-sm hover:bg-amber-500/10 hover:border-amber-500/30 active:scale-95" 
                    : "border-border/20 bg-muted/30 opacity-50"
                )}
                onClick={() => isActive && setShowCheckout(true)}
                disabled={!isActive}
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", isActive ? "bg-amber-500/15" : "bg-muted/50")}>
                  <Camera className={cn("h-5 w-5", isActive ? "text-amber-500" : "text-muted-foreground/50")} />
                </div>
                <span className={cn("text-[11px] font-semibold", isActive ? "text-foreground" : "text-muted-foreground/50")}>Foto</span>
              </button>

              <button
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-sm hover:bg-orange-500/10 hover:border-orange-500/30 active:scale-95 transition-all duration-200"
                onClick={() => setShowDocUpload(true)}
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-[11px] font-semibold text-foreground">Upload</span>
              </button>

              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border transition-all duration-200",
                  isActive 
                    ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-xl active:scale-95 text-white" 
                    : "border-border/20 bg-muted/30 opacity-50"
                )}
                onClick={() => isActive && setShowCheckout(true)}
                disabled={!isActive}
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", isActive ? "bg-white/20" : "bg-muted/50")}>
                  <Check className={cn("h-5 w-5", isActive ? "text-white" : "text-muted-foreground/50")} />
                </div>
                <span className={cn("text-[11px] font-semibold", isActive ? "text-white" : "text-muted-foreground/50")}>Afmelden</span>
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <NavigationChooser
      isOpen={showNavChooser}
      onClose={() => setShowNavChooser(false)}
      destination={fullAddress}
      label={stop.company_name || stop.address}
    />

    <StopDocumentUpload
      isOpen={showDocUpload}
      onClose={handleDocUploadClose}
      tripId={tripId}
      stopId={stop.id}
      stopLabel={stop.company_name || stop.address}
    />
    </>
  );
};
