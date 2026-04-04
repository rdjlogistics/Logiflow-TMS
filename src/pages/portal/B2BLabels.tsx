import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { usePortalLabels } from "@/hooks/usePortalLabels";
import { statusConfig } from "@/components/portal/shared/types";
import { LoadingState } from "@/components/portal/shared/LoadingState";
import { EmptyLabels } from "@/components/portal/shared/EmptyState";
import { 
  Download, Printer, FileText, Check, Package, Search, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.04, type: "spring", stiffness: 400, damping: 25 },
  }),
};

const B2BLabels = () => {
  const { customerId, customer } = usePortalAuth();
  const { shipments, loading, refetch } = usePortalData(customerId);
  const { downloadLabels, printLabels, generating } = usePortalLabels();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const labelableShipments = shipments.filter(s => 
    ['confirmed', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(s.status)
  );

  const filteredShipments = labelableShipments.filter(s =>
    !search || 
    s.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.trackingCode?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelected(prev => prev.length === filteredShipments.length ? [] : filteredShipments.map(s => s.id));
  };

  const getSelectedShipments = () => filteredShipments
    .filter(s => selected.includes(s.id))
    .map(s => ({ id: s.id, referenceNumber: s.referenceNumber, trackingCode: s.trackingCode, fromAddress: s.fromAddress ?? '', fromCity: s.fromCity, toAddress: s.toAddress ?? '', toCity: s.toCity, carrier: s.carrier }));

  if (loading) {
    return (
      <B2BLayout companyName={customer?.companyName || "Laden..."}>
        <LoadingState message="Labels laden..." />
      </B2BLayout>
    );
  }

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"} onRefresh={refetch}>
      <motion.div className="space-y-6">
        {/* Header */}
        <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Labels</h1>
            <p className="text-sm text-muted-foreground">Download en print verzendlabels</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'PDF', icon: Download, onClick: () => downloadLabels(getSelectedShipments(), 'pdf') },
              { label: 'ZPL', icon: FileText, onClick: () => downloadLabels(getSelectedShipments(), 'zpl') },
            ].map(btn => (
              <motion.div key={btn.label} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" disabled={selected.length === 0 || generating} onClick={btn.onClick} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <btn.icon className="h-4 w-4" />}
                  {btn.label}
                </Button>
              </motion.div>
            ))}
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button 
                disabled={selected.length === 0 || generating}
                onClick={() => printLabels(getSelectedShipments())}
                className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Print ({selected.length})
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Search & Select All */}
        <motion.div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken op referentie of tracking..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 text-base" />
          </div>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={selectAll} disabled={filteredShipments.length === 0}>
              {selected.length === filteredShipments.length && filteredShipments.length > 0 ? 'Deselecteer alles' : 'Selecteer alles'}
            </Button>
          </motion.div>
        </motion.div>

        {/* Labels Grid */}
        {filteredShipments.length > 0 ? (
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShipments.map((shipment, index) => {
              const isSelected = selected.includes(shipment.id);
              const status = statusConfig[shipment.status];
              
              return (
                <motion.div
                  key={shipment.id}
                  custom={index}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all border-2 backdrop-blur-sm",
                      isSelected 
                        ? "border-gold bg-gold/5 shadow-[0_0_15px_hsl(var(--gold)/0.15)]" 
                        : "border-border/30 hover:border-primary/30 bg-card/60"
                    )}
                    onClick={() => toggleSelect(shipment.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center",
                              isSelected ? "bg-gold border-gold" : "border-muted-foreground/30"
                            )}
                            animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                  <Check className="h-3 w-3 text-gold-foreground" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                          <div>
                            <p className="font-semibold text-sm">{shipment.referenceNumber}</p>
                            <p className="text-xs text-muted-foreground font-mono">{shipment.trackingCode || 'Geen tracking'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(status.bgColor, status.color, "border-0 text-[10px]")}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{shipment.fromCity} → {shipment.toCity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{shipment.carrier || 'PostNL'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <EmptyLabels />
        )}
      </motion.div>
    </B2BLayout>
  );
};

export default B2BLabels;
