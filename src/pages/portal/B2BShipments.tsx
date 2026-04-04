import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { usePortalExport } from "@/hooks/usePortalExport";
import { 
  Search,
  Download,
  ArrowUpRight,
  Loader2,
  Package,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusConfig } from "@/components/portal/shared/types";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingState } from "@/components/portal/shared/LoadingState";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};
const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, type: "spring", stiffness: 400, damping: 25 },
  }),
};

const B2BShipments = () => {
  const navigate = useNavigate();
  const { customerId, customer } = usePortalAuth();
  const { shipments, loading, refetch } = usePortalData(customerId);
  const { exportShipments, exporting } = usePortalExport();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = !search || 
      s.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.fromCity.toLowerCase().includes(search.toLowerCase()) ||
      s.toCity.toLowerCase().includes(search.toLowerCase()) ||
      s.trackingCode?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' 
        ? ['confirmed', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)
        : statusFilter === 'problems'
          ? ['failed', 'cancelled'].includes(s.status)
          : s.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: shipments.length,
    pending: shipments.filter(s => s.status === 'pending').length,
    active: shipments.filter(s => ['confirmed', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)).length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    problems: shipments.filter(s => ['failed', 'cancelled'].includes(s.status)).length,
  };

  if (loading) {
    return (
      <B2BLayout companyName={customer?.companyName || "Laden..."}>
        <LoadingState message="Zendingen laden..." />
      </B2BLayout>
    );
  }

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"} onRefresh={refetch}>
      <div
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Zendingen</h1>
            <p className="text-sm text-muted-foreground">{shipments.length} zendingen in totaal</p>
          </div>
          <div>
            <Button 
              variant="outline" 
              className="gap-2"
              disabled={exporting || shipments.length === 0}
              onClick={() => {
                exportShipments(shipments);
                toast.success("Export gestart");
              }}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporteren
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken op referentie, tracking, stad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none">
            {[
              { key: null, label: 'Alles', count: statusCounts.all },
              { key: 'pending', label: 'Wachtend', count: statusCounts.pending },
              { key: 'active', label: 'Actief', count: statusCounts.active },
              { key: 'delivered', label: 'Afgeleverd', count: statusCounts.delivered },
              { key: 'problems', label: 'Problemen', count: statusCounts.problems },
            ].map(tab => (
              <div key={tab.key || 'all'}} className="snap-start">
                <Button
                  variant={statusFilter === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(tab.key as any)}
                  className="whitespace-nowrap touch-manipulation min-h-[44px]"
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredShipments.map((shipment, index) => {
            const status = statusConfig[shipment.status];
            return (
              <div
                key={shipment.id}
                className="touch-manipulation"
                onClick={() => navigate(`/portal/b2b/shipments/${shipment.id}`)}
              >
                <div className="bg-card rounded-xl border border-border/50 p-4 cursor-pointer active:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{shipment.referenceNumber}</span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(status.bgColor, status.color, "border-0 text-xs")}
                      >
                        {status.label}
                      </Badge>
                      {shipment.status === 'in_transit' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{shipment.fromCity} → {shipment.toCity}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(shipment.createdAt), "d MMM yyyy", { locale: nl })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {shipment.price ? `€${shipment.price.toFixed(2)}` : '-'}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Referentie</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Route</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tracking</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Datum</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Prijs</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredShipments.map((shipment, index) => {
                  const status = statusConfig[shipment.status];
                  return (
                    <tr
                      key={shipment.id}
                      className="transition-colors cursor-pointer"
                      onClick={() => navigate(`/portal/b2b/shipments/${shipment.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm">{shipment.referenceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{shipment.fromCity} → {shipment.toCity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(status.bgColor, status.color, "border-0 text-xs")}
                          >
                            {status.label}
                          </Badge>
                          {shipment.status === 'in_transit' && (
                            <span className="relative flex h-2.5 w-2.5" title="Live tracking beschikbaar">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {shipment.trackingCode || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(shipment.createdAt), "d MMM yyyy", { locale: nl })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">
                          {shipment.price ? `€${shipment.price.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link 
                          to={`/portal/b2b/shipments/${shipment.id}`}
                          className="text-primary hover:text-primary/80"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
          
        {filteredShipments.length === 0 && (
          <div 
            className="text-center py-16"
          >
            <div
            >
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Geen zendingen gevonden</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Probeer een andere zoekopdracht' : 'Je hebt nog geen zendingen'}
            </p>
            {!search && (
              <div>
                <Button asChild className="bg-gold hover:bg-gold/90 text-gold-foreground">
                  <Link to="/portal/b2b/book">Eerste zending aanmaken</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </B2BLayout>
  );
};

export default B2BShipments;
