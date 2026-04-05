import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStopProofs, type StopProofRecord } from "@/hooks/useStopProofs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SendPodEmailDialog } from "@/components/operations/SendPodEmailDialog";
import { 
  FileCheck, Camera, CheckCircle, Clock, Eye, Search, Image, MapPin, Calendar, User, Pen, 
  ExternalLink, Package, Truck, Timer, RefreshCw, Download, Loader2, FileText, Send
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Spring config ───────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 300, damping: 25 };
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

// ─── Helpers ─────────────────────────────────────────────────

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: StopProofRecord['status'] }) {
  const config = {
    signed: { icon: CheckCircle, label: 'Getekend', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    photo_only: { icon: Camera, label: 'Alleen foto', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    pending: { icon: Clock, label: 'In afwachting', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn(c.className, "font-medium gap-1.5 px-2.5 py-1 text-[11px] tracking-wide")}>
      <Icon className="h-3 w-3" />{c.label}
    </Badge>
  );
}

// ─── POD Detail Dialog ───────────────────────────────────────
function PODDetailContent({ pod, getCachedSignedUrl }: { pod: StopProofRecord; getCachedSignedUrl: (p: string) => Promise<string | null> }) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingVrachtbrief, setDownloadingVrachtbrief] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  // Load media on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    let cancelled = false;
    (async () => {
      setLoadingMedia(true);
      const [sigUrl, ...photoResults] = await Promise.all([
        pod.signature_url ? getCachedSignedUrl(pod.signature_url) : Promise.resolve(null),
        ...(pod.photo_urls || []).map(p => getCachedSignedUrl(p)),
      ]);
      if (!cancelled) {
        setSignatureUrl(sigUrl);
        setPhotoUrls(photoResults.filter((u): u is string => u !== null));
        setLoadingMedia(false);
      }
    })();
  });

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const payload = { stop_proof_id: pod.id };
      const { data, error } = await supabase.functions.invoke('generate-pod-pdf', { body: payload });
      if (error) throw error;
      if (!data?.pdf) throw new Error('Geen PDF data ontvangen');

      // Decode base64 PDF (consistent with invoice/purchase-invoice pattern)
      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || `POD-${pod.order_number || pod.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF gedownload');
    } catch (err: any) {
      console.error('PDF download error:', err);
      toast.error('PDF download mislukt', { description: err.message });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadVrachtbrief = async () => {
    setDownloadingVrachtbrief(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-pdf', {
        body: { orderId: pod.trip_id, documentType: 'vrachtbrief', copies: ['sender', 'receiver', 'carrier'], language: 'nl' },
      });
      if (error) throw error;
      if (data?.url) {
        // URL response — direct anchor download (avoids CORS/sandbox issues)
        const a = document.createElement('a');
        a.href = data.url;
        a.download = data.fileName || `Vrachtbrief_${pod.order_number}.html`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (data?.pdf) {
        // Base64 PDF response — decode and download via blob
        const binaryString = atob(data.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = data.fileName || `Vrachtbrief_${pod.order_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else if (data?.html) {
        // HTML response fallback — download as HTML blob
        const blob = new Blob([data.html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = data.fileName || `Vrachtbrief_${pod.order_number}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else {
        throw new Error('Geen document data ontvangen van de server');
      }
      toast.success('Vrachtbrief gedownload');
    } catch (err: any) {
      console.error('Vrachtbrief download error:', err);
      toast.error('Vrachtbrief download mislukt', { description: err.message });
    } finally {
      setDownloadingVrachtbrief(false);
    }
  };

  const receiverName = [pod.receiver_first_name, pod.receiver_last_name].filter(Boolean).join(' ');

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin"
    >
      {/* Header info cards */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="visible" 
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
      >
        {[
          { icon: <Package className="h-4 w-4" />, label: "Order", value: pod.order_number || '-', color: 'text-primary' },
          { icon: <Truck className="h-4 w-4" />, label: "Chauffeur", value: pod.driver_name || '-', color: 'text-blue-500' },
          { icon: <User className="h-4 w-4" />, label: "Ontvanger", value: receiverName || '-', color: 'text-emerald-500' },
          { icon: <MapPin className="h-4 w-4" />, label: "Locatie", value: pod.stop_city || '-', color: 'text-amber-500' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            transition={{ ...spring, delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm p-3 space-y-1.5"
          >
            <div className={cn("flex items-center gap-1.5", item.color)}>
              {item.icon}
              <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
            </div>
            <p className="font-semibold text-sm truncate">{item.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Klant & Adres */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={spring}
        className="rounded-xl border border-border/40 bg-muted/20 backdrop-blur-sm p-4 space-y-1"
      >
        <p className="font-semibold">{pod.stop_company_name || pod.customer_name || '-'}</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {[pod.stop_address, pod.stop_city].filter(Boolean).join(', ') || '-'}
        </p>
      </motion.div>

      {/* Times */}
      {(pod.arrival_time || pod.departure_time) && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="grid grid-cols-3 gap-2.5"
        >
          <TimeCard icon={<Clock className="h-4 w-4 text-emerald-500" />} label="Aankomst" value={pod.arrival_time} />
          <TimeCard icon={<Clock className="h-4 w-4 text-blue-500" />} label="Vertrek" value={pod.departure_time} />
          <TimeCard icon={<Timer className="h-4 w-4 text-amber-500" />} label="Wachttijd" timeValue={pod.waiting_minutes != null ? `${pod.waiting_minutes} min` : '-'} />
        </motion.div>
      )}

      {/* Signature */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-2">
        <SectionLabel icon={<Pen className="h-4 w-4" />} title="Handtekening" />
        {loadingMedia ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : signatureUrl ? (
          <motion.div 
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            className="bg-white dark:bg-zinc-900/80 border-2 border-dashed border-muted-foreground/15 rounded-xl p-6 flex items-center justify-center backdrop-blur-sm"
          >
            <img src={signatureUrl} alt="Handtekening" className="max-h-36 object-contain" />
          </motion.div>
        ) : (
          <EmptyState text="Geen handtekening beschikbaar" />
        )}
      </motion.div>

      {/* Photos */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="space-y-2">
        <SectionLabel icon={<Camera className="h-4 w-4" />} title={`Foto's (${pod.photo_urls?.length || 0})`} />
        {loadingMedia ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        ) : photoUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photoUrls.map((url, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => setExpandedPhoto(url)}
                className="aspect-video rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/40 transition-colors cursor-pointer group relative ring-0 hover:ring-2 hover:ring-primary/20"
              >
                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <EmptyState text="Geen foto's beschikbaar" />
        )}
      </motion.div>

      {/* GPS */}
      {pod.latitude && pod.longitude && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="rounded-xl border border-border/40 bg-muted/20 backdrop-blur-sm p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono text-sm">{pod.latitude.toFixed(5)}, {pod.longitude.toFixed(5)}</span>
            {pod.accuracy && <span className="text-xs text-muted-foreground">(±{pod.accuracy.toFixed(0)}m)</span>}
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs" asChild>
              <a href={`https://www.google.com/maps?q=${pod.latitude},${pod.longitude}`} target="_blank" rel="noopener noreferrer">
                🗺️ Maps
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 rounded-xl text-xs" asChild>
              <a href={`https://waze.com/ul?ll=${pod.latitude},${pod.longitude}&navigate=yes`} target="_blank" rel="noopener noreferrer">
                👻 Waze
              </a>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Note */}
      {pod.note && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-sm p-4"
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Opmerkingen</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">{pod.note}</p>
        </motion.div>
      )}

      {/* Action Buttons — simplified */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }}
        className="flex flex-col gap-2 pt-1"
      >
        <Button 
          onClick={handleDownloadPdf} 
          disabled={downloadingPdf} 
          className="w-full gap-2 h-12 rounded-xl text-sm font-semibold"
          variant="default"
        >
          {downloadingPdf ? (
            <><Loader2 className="h-4 w-4 animate-spin" />PDF genereren...</>
          ) : (
            <><Download className="h-4 w-4" />Download POD als PDF</>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2 h-10 rounded-xl"
            disabled={downloadingVrachtbrief}
            onClick={handleDownloadVrachtbrief}
          >
            {downloadingVrachtbrief ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Vrachtbrief
          </Button>

          <Button
            variant="outline"
            className="gap-2 h-10 rounded-xl"
            onClick={() => setShowSendDialog(true)}
          >
            <Send className="h-4 w-4" />
            Verstuur
          </Button>
        </div>
      </motion.div>

      {/* Send Email Dialog */}
      <SendPodEmailDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        tripId={pod.trip_id}
        orderNumber={pod.order_number || pod.id.slice(0, 8)}
        isDemo={false}
      />

      {/* Photo lightbox */}
      <AnimatePresence>
        {expandedPhoto && (
          <Dialog open={!!expandedPhoto} onOpenChange={() => setExpandedPhoto(null)}>
            <DialogContent className="max-w-4xl p-2 bg-black/95 border-none">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
                src={expandedPhoto}
                alt="Foto vergroot"
                className="w-full h-auto rounded-lg max-h-[85vh] object-contain"
              />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TimeCard({ icon, label, value, timeValue }: { icon: React.ReactNode; label: string; value?: string | null; timeValue?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3 text-center space-y-1">
      <div className="flex items-center justify-center gap-1.5">{icon}</div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="font-bold text-lg tabular-nums tracking-tight">
        {timeValue || (value ? format(new Date(value), "HH:mm") : '-')}
      </p>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
      {icon}<span>{title}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-muted-foreground/10 p-6 text-center">
      <p className="text-sm text-muted-foreground/60 italic">{text}</p>
    </div>
  );
}

// ─── Stat Card (Elite) ───────────────────────────────────────
const statColors = {
  primary: { bg: 'bg-primary/8', icon: 'text-primary', ring: 'ring-primary/20' },
  emerald: { bg: 'bg-emerald-500/8', icon: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  blue: { bg: 'bg-blue-500/8', icon: 'text-blue-500', ring: 'ring-blue-500/20' },
  amber: { bg: 'bg-amber-500/8', icon: 'text-amber-500', ring: 'ring-amber-500/20' },
};

type StatAccent = keyof typeof statColors;

function StatCard({ icon, value, label, loading, accent }: { icon: React.ReactNode; value: number; label: string; loading: boolean; accent: StatAccent }) {
  const colors = statColors[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
    >
      <Card className="relative overflow-hidden border-border/40 bg-card/70 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3.5">
            <div className={cn("p-2.5 rounded-xl ring-1", colors.bg, colors.ring)}>
              {icon}
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-12 mb-1 rounded-lg" />
              ) : (
                <motion.p 
                  key={value}
                  initial={{ scale: 1.15, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                  className="text-2xl font-bold tabular-nums tracking-tight"
                >
                  {value}
                </motion.p>
              )}
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────
function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2",
        active 
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
      whileTap={{ scale: 0.97 }}
      transition={spring}
    >
      {label}
      <span className={cn(
        "text-[11px] tabular-nums font-semibold rounded-md px-1.5 py-0.5 min-w-[22px] text-center",
        active ? "bg-primary-foreground/20" : "bg-muted"
      )}>
        {count}
      </span>
    </motion.button>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function DigitalPOD() {
  const { proofs: liveProofs, loading, stats: liveStats, getCachedSignedUrl, refetch } = useStopProofs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPod, setSelectedPod] = useState<StopProofRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchFocused, setSearchFocused] = useState(false);

  const stats = useMemo(() => ({
    total: liveProofs.length,
    signed: liveProofs.filter(p => p.status === 'signed').length,
    photoOnly: liveProofs.filter(p => p.status === 'photo_only').length,
    pending: liveProofs.filter(p => p.status === 'pending').length,
  }), [liveProofs]);

  const filteredProofs = useMemo(() => {
    let filtered = liveProofs;
    if (activeTab === 'signed') filtered = filtered.filter(p => p.status === 'signed');
    else if (activeTab === 'photo_only') filtered = filtered.filter(p => p.status === 'photo_only');
    else if (activeTab === 'pending') filtered = filtered.filter(p => p.status === 'pending');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.order_number || '').toLowerCase().includes(q) ||
        (p.stop_company_name || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q) ||
        (p.driver_name || '').toLowerCase().includes(q) ||
        (p.receiver_first_name || '').toLowerCase().includes(q) ||
        (p.receiver_last_name || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [liveProofs, activeTab, searchQuery]);

  return (
    <DashboardLayout title="Digital POD" description="Digitale afleverbewijzen met foto's en handtekeningen">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<FileCheck className="h-5 w-5 text-primary" />} value={stats.total} label="Totaal POD's" loading={loading} accent="primary" />
          <StatCard icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} value={stats.signed} label="Getekend" loading={loading} accent="emerald" />
          <StatCard icon={<Camera className="h-5 w-5 text-blue-500" />} value={stats.photoOnly} label="Alleen foto" loading={loading} accent="blue" />
          <StatCard icon={<Clock className="h-5 w-5 text-amber-500" />} value={stats.pending} label="In afwachting" loading={loading} accent="amber" />
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <Card className="overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Afleverbewijzen</CardTitle>
                  <CardDescription className="text-sm mt-0.5">Live gesynchroniseerd met de chauffeurs-app</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="relative"
                    animate={{ width: searchFocused ? 240 : 200 }}
                    transition={spring}
                  >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Zoeken..." 
                      className="pl-9 h-9 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                    />
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.92, rotate: -90 }} transition={spring}>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50" onClick={refetch}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardHeader>

            {/* Tabs — custom inline pills */}
            <div className="px-6 pb-3">
              <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
                <TabButton active={activeTab === 'all'} label="Alles" count={stats.total} onClick={() => setActiveTab('all')} />
                <TabButton active={activeTab === 'signed'} label="Getekend" count={stats.signed} onClick={() => setActiveTab('signed')} />
                <TabButton active={activeTab === 'photo_only'} label="Foto" count={stats.photoOnly} onClick={() => setActiveTab('photo_only')} />
                <TabButton active={activeTab === 'pending'} label="Open" count={stats.pending} onClick={() => setActiveTab('pending')} />
              </div>
            </div>

            <CardContent className="pt-0">
              {loading && liveProofs.length === 0 ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : filteredProofs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={spring}
                  className="text-center py-20 text-muted-foreground"
                >
                  <div className="inline-flex p-4 rounded-2xl bg-muted/30 mb-4">
                    <FileCheck className="h-12 w-12 opacity-30" />
                  </div>
                  <p className="font-semibold text-lg">Geen afleverbewijzen gevonden</p>
                  <p className="text-sm mt-1.5 max-w-sm mx-auto text-muted-foreground/70">
                    POD's verschijnen hier automatisch zodra chauffeurs stops afmelden in de app
                  </p>
                </motion.div>
              ) : (
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/40">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Order</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Klant / Adres</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Chauffeur</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Bewijs</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ontvanger</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tijdstip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {filteredProofs.map((pod, idx) => (
                          <motion.tr
                            key={pod.id}
                            layout
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ ...spring, delay: Math.min(idx * 0.03, 0.25) }}
                            onClick={() => setSelectedPod(pod)}
                            className="cursor-pointer hover:bg-primary/[0.03] transition-colors group border-b border-border/30 last:border-b-0"
                          >
                            <TableCell>
                              <span className="font-mono text-sm font-semibold tracking-tight">{pod.order_number || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{pod.stop_company_name || pod.customer_name || '-'}</p>
                                {pod.stop_address && (
                                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {[pod.stop_address, pod.stop_city].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{pod.driver_name || '-'}</TableCell>
                            <TableCell><StatusBadge status={pod.status} /></TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2.5">
                                {pod.signature_url && (
                                  <div className="flex items-center gap-0.5 text-emerald-500">
                                    <Pen className="h-3.5 w-3.5" />
                                  </div>
                                )}
                                {(pod.photo_urls?.length || 0) > 0 && (
                                  <div className="flex items-center gap-0.5 text-blue-500">
                                    <Image className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold tabular-nums">{pod.photo_urls?.length}</span>
                                  </div>
                                )}
                                {!pod.signature_url && !(pod.photo_urls?.length) && (
                                  <span className="text-xs text-muted-foreground/40">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {pod.receiver_first_name || pod.receiver_last_name
                                ? <span className="font-medium">{[pod.receiver_first_name, pod.receiver_last_name].filter(Boolean).join(' ')}</span>
                                : <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(pod.created_at), "d MMM HH:mm", { locale: nl })}
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPod} onOpenChange={(open) => !open && setSelectedPod(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              POD Details — {selectedPod?.order_number || selectedPod?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {selectedPod && (
            <PODDetailContent pod={selectedPod} getCachedSignedUrl={getCachedSignedUrl} />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
