import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { CreateCaseDialog } from "@/components/portal/b2b/CreateCaseDialog";
import { useCaseMessages } from "@/hooks/useCaseMessages";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Plus, MessageCircle, Clock, CheckCircle2, AlertTriangle, Package,
  Search, ChevronRight, MapPin, Calendar, FileText, Send, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 },
  }),
};

const caseStatusConfig = {
  open: { label: 'Open', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Clock },
  in_progress: { label: 'In behandeling', color: 'text-primary', bgColor: 'bg-primary/20', icon: MessageCircle },
  resolved: { label: 'Opgelost', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2 },
  closed: { label: 'Gesloten', color: 'text-muted-foreground', bgColor: 'bg-muted', icon: CheckCircle2 },
};

const caseTypeLabels = {
  damage: 'Schade', delay: 'Vertraging', lost: 'Verloren', other: 'Overig',
};

const B2BCases = () => {
  const { customerId, customer } = usePortalAuth();
  const { cases, shipments, loading, refetch } = usePortalData(customerId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { messages, isLoading: messagesLoading, sendMessage } = useCaseMessages(selectedCase?.id || null);

  const filteredCases = cases.filter(c => {
    const shipment = shipments.find(s => s.id === c.shipmentId);
    const matchesSearch = !search || 
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      shipment?.referenceNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    open: cases.filter(c => c.status === 'open').length,
    in_progress: cases.filter(c => c.status === 'in_progress').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
  };

  const handleSendMessage = async () => {
    if (!replyMessage.trim() || !selectedCase) return;
    sendMessage.mutate({ content: replyMessage.trim(), senderName: "Klant", senderRole: "customer" }, {
      onSuccess: () => setReplyMessage(""),
    });
  };

  const statusCards = [
    { key: 'open', label: 'Open', count: statusCounts.open, icon: Clock, color: 'text-amber-400', border: 'border-amber-500', borderHover: 'hover:border-amber-500/50', bg: 'bg-amber-500/10' },
    { key: 'in_progress', label: 'In behandeling', count: statusCounts.in_progress, icon: MessageCircle, color: 'text-primary', border: 'border-primary', borderHover: 'hover:border-primary/50', bg: 'bg-primary/10' },
    { key: 'resolved', label: 'Opgelost', count: statusCounts.resolved, icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500', borderHover: 'hover:border-emerald-500/50', bg: 'bg-emerald-500/10' },
  ];

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"} unreadNotifications={statusCounts.open} onRefresh={refetch}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Cases</h1>
            <p className="text-sm text-muted-foreground">
              {statusCounts.open} open, {statusCounts.in_progress} in behandeling
            </p>
          </div>
          <div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground">
              <Plus className="h-4 w-4" /> Nieuwe Case
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statusCards.map((sc, index) => (
            <motion.div key={sc.key}>
              <Card 
                className={cn(
                  "cursor-pointer transition-all border-2 backdrop-blur-sm bg-card/60",
                  statusFilter === sc.key ? sc.border : `border-border/30 ${sc.borderHover}`
                )}
                onClick={() => setStatusFilter(statusFilter === sc.key ? null : sc.key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("p-1.5 rounded-lg", sc.bg)}>
                      <sc.icon className={cn("h-4 w-4", sc.color)} />
                    </div>
                    <span className="text-xs text-muted-foreground">{sc.label}</span>
                  </div>
                  <motion.p
                    className={cn("text-2xl font-display font-bold", sc.color)}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: index * 0.08 }}
                  >
                    {sc.count}
                  </motion.p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken in cases..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 text-base" />
          </div>
        </div>

        {/* Cases List */}
        <div className="space-y-3">
          {filteredCases.map((caseItem, index) => {
            const shipment = shipments.find(s => s.id === caseItem.shipmentId);
            const status = caseStatusConfig[caseItem.status];
            const StatusIcon = status.icon;
            
            return (
              <motion.div
                key={caseItem.id}
                custom={index}
               
               


              >
                <Card 
                  className="border-border/30 hover:border-primary/30 transition-all cursor-pointer backdrop-blur-sm bg-card/60 touch-manipulation"
                  onClick={() => setSelectedCase({ ...caseItem, shipment })}
                >
                  <CardContent className="p-4 min-h-[56px]">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", status.bgColor)}

                      >
                        <StatusIcon className={cn("h-5 w-5", status.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{caseItem.description}</span>
                          <Badge variant="outline" className="text-[10px]">{caseTypeLabels[caseItem.type]}</Badge>
                        </div>
                        {shipment && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" />
                            <span>{shipment.referenceNumber}</span>
                            <span>•</span>
                            <span>{shipment.fromCity} → {shipment.toCity}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className={cn(status.bgColor, status.color, "border-0 text-[10px]")}>{status.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Aangemaakt {format(new Date(caseItem.createdAt), "d MMM", { locale: nl })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredCases.length === 0 && (
          <div className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Geen cases</h3>
            <p className="text-sm text-muted-foreground">
              {statusFilter ? 'Geen cases met deze status' : 'Alles verloopt soepel!'}
            </p>
          </div>
        )}

        <CreateCaseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} shipments={shipments} onSuccess={refetch} />

        {/* Case Detail Sheet */}
        <Sheet open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
          <SheetContent className="sm:max-w-lg backdrop-blur-xl bg-background/95">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Case Details</SheetTitle>
              <SheetDescription>{selectedCase?.description}</SheetDescription>
            </SheetHeader>
            {selectedCase && (
              <div className="mt-6 space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn(caseStatusConfig[selectedCase.status]?.bgColor, caseStatusConfig[selectedCase.status]?.color, "border-0")}>
                    {caseStatusConfig[selectedCase.status]?.label}
                  </Badge>
                  <Badge variant="outline">{caseTypeLabels[selectedCase.type]}</Badge>
                </div>

                <div className="space-y-4">
                  {selectedCase.shipment && (
                    <>
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div><p className="text-sm text-muted-foreground">Zending</p><p className="font-medium">{selectedCase.shipment.referenceNumber}</p></div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div><p className="text-sm text-muted-foreground">Route</p><p className="font-medium">{selectedCase.shipment.fromCity} → {selectedCase.shipment.toCity}</p></div>
                      </div>
                    </>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div><p className="text-sm text-muted-foreground">Aangemaakt</p><p className="font-medium">{format(new Date(selectedCase.createdAt), "d MMMM yyyy", { locale: nl })}</p></div>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-4">
                  <h4 className="font-medium mb-3">Berichten</h4>
                  <ScrollArea className="h-48 pr-4">
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/30 backdrop-blur-sm" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                        <p className="text-sm">{selectedCase.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(selectedCase.createdAt), "d MMM, HH:mm", { locale: nl })}</p>
                      </div>
                      {messagesLoading ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                      ) : (
                        messages.map((msg, i) => (
                          <div
                            key={msg.id} className="animate-fade-in {cn("p-3 rounded-lg", msg.sender_role === 'customer' ? "bg-primary/10 ml-4" : "bg-muted/30 mr-4")}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">{msg.sender_name}</span>
                              <Badge variant="outline" className="text-[10px]">{msg.sender_role === 'customer' ? 'Klant' : 'Support'}</Badge>
                            </div>
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), "d MMM, HH:mm", { locale: nl })}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border-t border-border/30 pt-4">
                  <h4 className="font-medium mb-3">Reactie versturen</h4>
                  <div className="space-y-3">
                    <Textarea placeholder="Typ je bericht..." value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={3} />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Button className="w-full" onClick={handleSendMessage} disabled={!replyMessage.trim() || sendMessage.isPending}>
                          {sendMessage.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Versturen
                        </Button>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedCase(null)}>Sluiten</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </B2BLayout>
  );
};

export default B2BCases;
