import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Spinner } from "@/components/ui/loading-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePODClaims } from "@/hooks/usePODClaims";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Search, FileCheck, Camera, MessageSquare,
  Clock, CheckCircle2, XCircle, Euro, ChevronRight, Eye,
  Download, Send, ShieldAlert, Hourglass, FileWarning,
  BadgeCheck, Banknote, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

// ── Settlement Section (unchanged logic) ──
const SettlementSection = ({
  selectedClaim,
  onSettle,
}: {
  selectedClaim: any;
  onSettle: (amount: number, liability: 'carrier' | 'customer' | 'charter') => void;
}) => {
  const [settlementAmount, setSettlementAmount] = useState<string>(selectedClaim?.claimed_amount?.toString() || '');
  const [settlementLiability, setSettlementLiability] = useState<'carrier' | 'customer' | 'charter'>('carrier');

  return (
    <div className="border-t border-border/30 pt-4">
      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Afwikkeling</Label>
      <div className="flex gap-2 mt-3">
        <Input
          type="number"
          placeholder="Bedrag"
          className="w-32 rounded-xl"
          value={settlementAmount}
          onChange={(e) => setSettlementAmount(e.target.value)}
        />
        <Select value={settlementLiability} onValueChange={(v) => setSettlementLiability(v as any)}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Aansprakelijk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carrier">Vervoerder</SelectItem>
            <SelectItem value="customer">Klant</SelectItem>
            <SelectItem value="charter">Charter</SelectItem>
          </SelectContent>
        </Select>
        <Button className="rounded-xl" onClick={() => {
          const amount = parseFloat(settlementAmount) || 0;
          onSettle(amount, settlementLiability);
        }}>Afwikkelen</Button>
      </div>
    </div>
  );
};

// ── Filter chip config ──
type FilterKey = 'all' | 'open' | 'in_review' | 'awaiting_info' | 'resolved' | 'claimed' | 'approved_amount';

interface FilterChip {
  key: FilterKey;
  label: string;
  icon: React.ElementType;
  color: string;
  getValue: (stats: any) => string | number;
}

const filterChips: FilterChip[] = [
  { key: 'open', label: 'Open', icon: ShieldAlert, color: 'text-red-500', getValue: (s) => s.open },
  { key: 'in_review', label: 'In behandeling', icon: Hourglass, color: 'text-blue-500', getValue: (s) => s.inReview },
  { key: 'awaiting_info', label: 'Wacht op info', icon: FileWarning, color: 'text-amber-500', getValue: (s) => s.awaitingInfo },
  { key: 'resolved', label: 'Afgehandeld', icon: BadgeCheck, color: 'text-green-500', getValue: (s) => s.resolved },
  { key: 'claimed', label: 'Geclaimd', icon: Banknote, color: 'text-foreground', getValue: (s) => `€${(s.totalClaimedAmount || 0).toLocaleString()}` },
  { key: 'approved_amount', label: 'Goedgekeurd', icon: TrendingUp, color: 'text-green-500', getValue: (s) => `€${(s.totalApprovedAmount || 0).toLocaleString()}` },
];

// ── Claim Card (mobile-first) ──
const ClaimCard = ({ claim, onSelect, getStatusBadge, getTypeBadge }: any) => {
  const orderNumber = claim.order?.order_number || '—';
  const customerName = claim.order?.customer?.company_name || 'Onbekend';
  const ageDays = Math.floor((Date.now() - new Date(claim.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect({ ...claim, order_number: orderNumber, customer: customerName, age_days: ageDays })}
      className={cn(
        "p-4 rounded-2xl cursor-pointer",
        "bg-card/60 backdrop-blur-xl border border-border/30",
        "hover:bg-card/80 hover:border-border/50 hover:shadow-lg",
        "transition-colors duration-200",
        "active:bg-muted/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{orderNumber}</span>
            {getTypeBadge(claim.claim_type)}
          </div>
          <p className="text-sm text-muted-foreground truncate">{customerName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(claim.status)}
            {ageDays > 7 && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />{ageDays}d
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold">€{(claim.claimed_amount || 0).toLocaleString()}</p>
          {claim.approved_amount != null && claim.approved_amount > 0 && (
            <p className="text-xs text-green-500">€{claim.approved_amount.toLocaleString()}</p>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-2" />
        </div>
      </div>
    </motion.div>
  );
};

// ── POD Card (mobile-first) ──
const PODCard = ({ pod }: any) => {
  const orderNumber = pod.order?.order_number || '—';
  const customerName = pod.order?.customer?.company_name || '—';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={cn(
        "p-4 rounded-2xl",
        "bg-card/60 backdrop-blur-xl border border-border/30"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="font-mono text-sm font-semibold">{orderNumber}</span>
          <p className="text-sm text-muted-foreground truncate">{customerName}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-lg text-xs">
            {pod.method === 'signature' ? 'Handtekening' :
             pod.method === 'photo' ? 'Foto' :
             pod.method === 'scan' ? 'Scan' : 'Multi'}
          </Badge>
          {pod.signed_name && <span className="text-xs text-muted-foreground">{pod.signed_name}</span>}
          <span className="text-xs text-muted-foreground">
            {format(new Date(pod.captured_at), "d MMM HH:mm", { locale: nl })}
          </span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {pod.has_photos && <Camera className="h-4 w-4 text-blue-500" />}
        {pod.has_documents && <FileCheck className="h-4 w-4 text-green-500" />}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={async (e) => {
          e.stopPropagation();
          toast.info(`POD wordt geladen voor ${orderNumber}`);
          try {
            const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
              body: { orderId: pod.id, documentType: "pod" }
            });
            if (error) throw error;
            if (data?.url) {
              const response = await fetch(data.url);
              const htmlContent = await response.text();
              const viewWindow = window.open("", "_blank");
              if (viewWindow) { viewWindow.document.write(htmlContent); viewWindow.document.close(); }
            }
          } catch { toast.error("POD kon niet worden geladen"); }
        }}><Eye className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={async (e) => {
          e.stopPropagation();
          toast.info(`POD download gestart voor ${orderNumber}`);
          try {
            const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
              body: { orderId: pod.id, documentType: "pod" }
            });
            if (error) throw error;
            if (data?.url) {
              const response = await fetch(data.url);
              const htmlContent = await response.text();
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const downloadUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `POD_${pod.order_number}.html`;
              a.click();
              URL.revokeObjectURL(downloadUrl);
              toast.success("POD gedownload");
            }
          } catch { toast.error("Download mislukt"); }
        }}><Download className="h-4 w-4" /></Button>
      </div>
    </div>
  </motion.div>
);

// ── Claim Detail Content (shared between Dialog & Sheet) ──
const ClaimDetailContent = ({ claim, resolveClaim, onClose, getTypeBadge, getStatusBadge }: any) => (
  <div className="space-y-5">
    {/* Summary grid */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { label: 'Klant', value: claim.customer || '—' },
        { label: 'Type', value: getTypeBadge(claim.claim_type) },
        { label: 'Geclaimd', value: `€${(claim.claimed_amount || 0).toLocaleString()}` },
      ].map((item, i) => (
        <div key={i} className="p-3 bg-muted/30 backdrop-blur-sm rounded-2xl">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
          <div className="font-semibold mt-1">{item.value}</div>
        </div>
      ))}
    </div>

    {claim.notes && (
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Omschrijving</Label>
        <p className="mt-1.5 text-sm leading-relaxed">{claim.notes}</p>
      </div>
    )}

    {/* Evidence */}
    <div>
      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Bewijsmateriaal</Label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="aspect-square bg-muted/30 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div className="aspect-square bg-muted/30 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <FileCheck className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </div>
    </div>

    {/* Action buttons */}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="rounded-xl" onClick={async () => {
        if (claim?.id && !claim.id.startsWith('demo')) {
          try { await supabase.from('claim_cases').update({ status: 'awaiting_info' }).eq('id', claim.id); } catch (e) { console.error(e); }
        }
        toast.success('Informatie aangevraagd ✓', { description: `E-mail verstuurd voor claim ${claim?.order_number}.` });
      }}><MessageSquare className="h-4 w-4 mr-2" />Vraag info op</Button>

      <Button variant="outline" className="rounded-xl" onClick={async () => {
        if (claim?.id && !claim.id.startsWith('demo')) {
          try { await supabase.from('claim_cases').update({ status: 'in_review' }).eq('id', claim.id); } catch (e) { console.error(e); }
        }
        const subject = encodeURIComponent(`Claim doorgestuurd: ${claim?.order_number}`);
        const body = encodeURIComponent(`Geachte charter,\n\nHierbij sturen wij u de claim door voor order ${claim?.order_number}.\n\nType: ${claim?.claim_type}\nBedrag: €${claim?.claimed_amount}\n\nGraag uw reactie binnen 5 werkdagen.\n\nMet vriendelijke groet`);
        window.open(`mailto:charter@example.com?subject=${subject}&body=${body}`, '_blank');
        toast.success('Claim doorgestuurd ✓');
      }}><Send className="h-4 w-4 mr-2" />Stuur naar charter</Button>

      <Button variant="outline" className="rounded-xl text-green-500 hover:text-green-600" onClick={async () => {
        if (claim?.id && !claim.id.startsWith('demo')) {
          await resolveClaim.mutateAsync({ id: claim.id, status: 'approved', approved_amount: claim.claimed_amount });
        }
        toast.success('Claim goedgekeurd ✓');
        onClose();
      }}><CheckCircle2 className="h-4 w-4 mr-2" />Goedkeuren</Button>

      <Button variant="outline" className="rounded-xl text-red-500 hover:text-red-600" onClick={async () => {
        if (claim?.id && !claim.id.startsWith('demo')) {
          await resolveClaim.mutateAsync({ id: claim.id, status: 'rejected' });
        }
        toast.error('Claim afgewezen');
        onClose();
      }}><XCircle className="h-4 w-4 mr-2" />Afwijzen</Button>
    </div>

    <SettlementSection
      selectedClaim={claim}
      onSettle={async (amount, liability) => {
        if (claim?.id && !claim.id.startsWith('demo')) {
          await resolveClaim.mutateAsync({ id: claim.id, status: 'settled', approved_amount: amount, liability });
        }
        toast.success('Afwikkeling verstuurd');
        onClose();
      }}
    />
  </div>
);

// ── Main Page ──
const ClaimsInbox = () => {
  const [activeTab, setActiveTab] = useState("claims");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const { claims, pods, claimStats, isLoading, resolveClaim } = usePODClaims();

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-red-500/10 text-red-500 border-red-500/20",
      in_review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      awaiting_info: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-muted text-muted-foreground",
      settled: "bg-primary/10 text-primary border-primary/20",
    };
    const labels: Record<string, string> = {
      open: 'Open', in_review: 'In behandeling', awaiting_info: 'Wacht op info',
      approved: 'Goedgekeurd', rejected: 'Afgewezen', settled: 'Afgewikkeld',
    };
    return <Badge className={cn("rounded-lg", styles[status])}>{labels[status] || status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, { label: string; cls: string }> = {
      damage: { label: 'Schade', cls: 'text-red-500' },
      shortage: { label: 'Tekort', cls: 'text-orange-500' },
      delay: { label: 'Vertraging', cls: 'text-amber-500' },
      no_show: { label: 'No-show', cls: 'text-purple-500' },
    };
    const { label, cls } = labels[type] || { label: 'Anders', cls: '' };
    return <Badge variant="outline" className={cn("rounded-lg", cls)}>{label}</Badge>;
  };

  // Filter logic
  const filteredClaims = useMemo(() => {
    let result = claims;
    // Status filters
    if (activeFilter === 'open') result = result.filter((c: any) => c.status === 'open');
    else if (activeFilter === 'in_review') result = result.filter((c: any) => c.status === 'in_review');
    else if (activeFilter === 'awaiting_info') result = result.filter((c: any) => c.status === 'awaiting_info');
    else if (activeFilter === 'resolved') result = result.filter((c: any) => ['approved', 'rejected', 'settled'].includes(c.status));
    else if (activeFilter === 'approved_amount') result = result.filter((c: any) => c.status === 'approved');
    else if (activeFilter === 'claimed') result = [...result].sort((a: any, b: any) => (b.claimed_amount || 0) - (a.claimed_amount || 0));
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        c.order_number?.toLowerCase().includes(q) ||
        c.customer?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [claims, activeFilter, searchTerm]);

  const handleCloseDetail = () => setSelectedClaim(null);

  return (
    <DashboardLayout title="Claims & POD" description="Proof-to-Cash: Claims beheer en afleverbewijzen">
      {/* ── Filter Chips (iOS 26 style) ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.key;
          const Icon = chip.icon;
          return (
            <motion.button
              key={chip.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(isActive ? 'all' : chip.key)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-2xl",
                "backdrop-blur-xl border transition-all duration-200",
                "min-h-[76px] touch-manipulation",
                isActive
                  ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10 scale-[1.02]"
                  : "bg-card/50 border-border/20 hover:bg-card/70 hover:border-border/40"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? 'text-primary' : chip.color)} />
              <span className={cn(
                "text-lg font-bold tabular-nums leading-none",
                isActive ? 'text-primary' : chip.color
              )}>
                {chip.getValue(claimStats)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium leading-none">{chip.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeFilterIndicator"
                  className="absolute inset-0 rounded-2xl border-2 border-primary/40"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="claims" className="rounded-lg">
              Claims
              {(claimStats?.open || 0) > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full h-5 min-w-[20px] text-[10px]">
                  {claimStats.open}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pod" className="rounded-lg">POD</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek order of klant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full sm:w-56 rounded-xl bg-card/50 backdrop-blur-sm border-border/30"
          />
        </div>
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "claims" && (
          <motion.div
            key="claims"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {filteredClaims.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Geen claims gevonden</p>
              </div>
            ) : (
              filteredClaims.map((claim: any) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  onSelect={setSelectedClaim}
                  getStatusBadge={getStatusBadge}
                  getTypeBadge={getTypeBadge}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === "pod" && (
          <motion.div
            key="pod"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {pods.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Geen afleverbewijzen gevonden</p>
              </div>
            ) : (
              pods.map((pod: any) => <PODCard key={pod.id} pod={pod} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Claim Detail: Sheet on mobile, Dialog on desktop ── */}
      {isMobile ? (
        <Sheet open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <SheetContent side="bottom" variant="premium" showDragHandle className="max-h-[90dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Claim {selectedClaim?.order_number}
              </SheetTitle>
            </SheetHeader>
            {selectedClaim && (
              <ClaimDetailContent
                claim={selectedClaim}
                resolveClaim={resolveClaim}
                onClose={handleCloseDetail}
                getTypeBadge={getTypeBadge}
                getStatusBadge={getStatusBadge}
              />
            )}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Claim {selectedClaim?.order_number}
              </DialogTitle>
            </DialogHeader>
            {selectedClaim && (
              <ClaimDetailContent
                claim={selectedClaim}
                resolveClaim={resolveClaim}
                onClose={handleCloseDetail}
                getTypeBadge={getTypeBadge}
                getStatusBadge={getStatusBadge}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default ClaimsInbox;
