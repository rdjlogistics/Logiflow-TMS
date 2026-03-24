import { useState } from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  Truck,
  MapPin,
  ExternalLink,
  ChevronDown,
  X,
  Calendar,
  FileDown,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import Papa from "papaparse";
import { cn } from "@/lib/utils";


type ShipmentTab = "all" | "pending" | "active" | "delivered" | "problems";

interface Shipment {
  id: string;
  status: string;
  pickup_city?: string | null;
  delivery_city?: string | null;
  pickup_address?: string;
  delivery_address?: string;
  trip_date: string;
  order_number?: string | null;
  tracking_token?: string | null;
  reference?: string;
  carrier?: string;
  eta?: string;
}

interface ImperialShipmentsListProps {
  shipments: Shipment[];
  loading: boolean;
  onViewShipment: (id: string) => void;
  onTrackShipment: (token: string) => void;
}

const tabs: { id: ShipmentTab; label: string; icon: typeof Package }[] = [
  { id: "all", label: "Alles", icon: Package },
  { id: "pending", label: "Aanvragen", icon: Clock },
  { id: "active", label: "Actief", icon: Truck },
  { id: "delivered", label: "Afgerond", icon: CheckCircle2 },
  { id: "problems", label: "Problemen", icon: AlertTriangle },
];

const statusConfig: Record<string, { label: string; class: string; tab: ShipmentTab }> = {
  pending: { label: "In afwachting", class: "portal-badge-pending", tab: "pending" },
  aanvraag: { label: "In afwachting", class: "portal-badge-pending", tab: "pending" },
  approved: { label: "Goedgekeurd", class: "portal-badge-success", tab: "active" },
  gepland: { label: "Gepland", class: "portal-badge-active", tab: "active" },
  geladen: { label: "Geladen", class: "portal-badge-active", tab: "active" },
  onderweg: { label: "Onderweg", class: "portal-badge-active", tab: "active" },
  afgeleverd: { label: "Afgeleverd", class: "portal-badge-success", tab: "delivered" },
  delivered: { label: "Afgeleverd", class: "portal-badge-success", tab: "delivered" },
  afgerond: { label: "Afgeleverd", class: "portal-badge-success", tab: "delivered" },
  gecontroleerd: { label: "Gecontroleerd", class: "portal-badge-success", tab: "delivered" },
  gefactureerd: { label: "Gefactureerd", class: "portal-badge-success", tab: "delivered" },
  probleem: { label: "Actie nodig", class: "portal-badge-danger", tab: "problems" },
  cancelled: { label: "Geannuleerd", class: "portal-badge-danger", tab: "problems" },
  geannuleerd: { label: "Geannuleerd", class: "portal-badge-danger", tab: "problems" },
};

export const ImperialShipmentsList = ({
  shipments,
  loading,
  onViewShipment,
  onTrackShipment,
}: ImperialShipmentsListProps) => {
  const [activeTab, setActiveTab] = useState<ShipmentTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  // Filter shipments
  const filteredShipments = shipments.filter((shipment) => {
    // Tab filter
    if (activeTab !== "all") {
      const config = statusConfig[shipment.status] || statusConfig.pending;
      if (config.tab !== activeTab) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCity = 
        shipment.pickup_city?.toLowerCase().includes(query) ||
        shipment.delivery_city?.toLowerCase().includes(query);
      const matchesRef = 
        shipment.order_number?.toLowerCase().includes(query) ||
        shipment.reference?.toLowerCase().includes(query);
      if (!matchesCity && !matchesRef) return false;
    }

    // Date filter
    if (dateFilter && shipment.trip_date !== dateFilter) return false;

    return true;
  });

  // Tab counts
  const tabCounts = {
    all: shipments.length,
    pending: shipments.filter(s => ["pending", "aanvraag"].includes(s.status)).length,
    active: shipments.filter(s => ["approved", "gepland", "geladen", "onderweg"].includes(s.status)).length,
    delivered: shipments.filter(s => ["afgeleverd", "afgerond", "delivered", "gecontroleerd", "gefactureerd"].includes(s.status)).length,
    problems: shipments.filter(s => ["probleem", "cancelled", "geannuleerd"].includes(s.status)).length,
  };


  const handleExportCsv = () => {
    if (filteredShipments.length === 0) return;

    const rows = filteredShipments.map((s) => ({
      id: s.id,
      order_number: s.order_number ?? "",
      reference: s.reference ?? "",
      status: s.status,
      trip_date: s.trip_date,
      pickup_city: s.pickup_city ?? "",
      delivery_city: s.delivery_city ?? "",
      carrier: s.carrier ?? "",
      eta: s.eta ?? "",
    }));

    const csv = Papa.unparse(rows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `zendingen_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 portal-animate-in">
      {/* Search Bar */}
      <div className="portal-glass p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--portal-text-muted))]" />
            <input
              type="text"
              placeholder="Zoek op stad, referentie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="portal-input pl-10 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-[hsl(var(--portal-text-muted))]" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-3 rounded-xl border transition-colors",
              showFilters 
                ? "bg-[hsl(var(--portal-primary)/.15)] border-[hsl(var(--portal-primary)/.3)] text-[hsl(var(--portal-primary-glow))]"
                : "bg-[hsl(var(--portal-surface))] border-[hsl(var(--portal-border))] text-[hsl(var(--portal-text-secondary))]"
            )}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[hsl(var(--portal-border))] flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Datum</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--portal-text-muted))]" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="portal-input pl-10 text-sm"
                />
              </div>
            </div>
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="self-end px-3 py-2 text-sm text-[hsl(var(--portal-danger))]"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          const hasProblem = tab.id === "problems" && count > 0;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                isActive 
                  ? "bg-[hsl(var(--portal-gold)/.15)] text-[hsl(var(--portal-gold))] border border-[hsl(var(--portal-gold)/.3)]"
                  : "bg-[hsl(var(--portal-surface))] text-[hsl(var(--portal-text-secondary))] border border-transparent hover:bg-[hsl(var(--portal-surface-hover))]",
                hasProblem && !isActive && "border-[hsl(var(--portal-danger)/.3)]"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-bold",
                  isActive 
                    ? "bg-[hsl(var(--portal-gold)/.2)]"
                    : hasProblem 
                      ? "bg-[hsl(var(--portal-danger)/.2)] text-[hsl(var(--portal-danger))]"
                      : "bg-[hsl(var(--portal-surface-hover))]"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shipments List */}
      {loading ? (
        <div className="portal-glass p-8 text-center">
          <div className="w-8 h-8 border-2 border-[hsl(var(--portal-gold))] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[hsl(var(--portal-text-muted))]">Laden...</p>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="portal-glass p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-[hsl(var(--portal-text-muted))] mb-3 opacity-50" />
          <p className="text-[hsl(var(--portal-text))] font-medium">Geen zendingen gevonden</p>
          <p className="text-sm text-[hsl(var(--portal-text-muted))] mt-1">
            {searchQuery || dateFilter 
              ? "Pas je filters aan om meer resultaten te zien"
              : "Boek je eerste zending via de + knop"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredShipments.map((shipment) => {
            const config = statusConfig[shipment.status] || statusConfig.pending;
            
            return (
              <div
                key={shipment.id}
                className="portal-glass p-4 cursor-pointer hover:border-[hsl(var(--portal-gold)/.3)] transition-colors"
                onClick={() => onViewShipment(shipment.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Route */}
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-[hsl(var(--portal-success))] flex-shrink-0" />
                      <span className="font-medium text-[hsl(var(--portal-text))] truncate">
                        {shipment.pickup_city || "?"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-[hsl(var(--portal-text-muted))] flex-shrink-0" />
                      <MapPin className="h-4 w-4 text-[hsl(var(--portal-danger))] flex-shrink-0" />
                      <span className="font-medium text-[hsl(var(--portal-text))] truncate">
                        {shipment.delivery_city || "?"}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--portal-text-muted))]">
                      <span>{format(new Date(shipment.trip_date), "d MMM yyyy", { locale: nl })}</span>
                      {shipment.order_number && (
                        <>
                          <span>•</span>
                          <span>{shipment.order_number}</span>
                        </>
                      )}
                      {shipment.carrier && (
                        <>
                          <span>•</span>
                          <span>{shipment.carrier}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("portal-badge", config.class)}>
                      {config.label}
                    </span>
                    
                    {shipment.tracking_token && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTrackShipment(shipment.tracking_token!);
                        }}
                        className="text-xs text-[hsl(var(--portal-primary-glow))] hover:underline flex items-center gap-1"
                      >
                        Track & Trace
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ETA if available */}
                {shipment.eta && shipment.status === "onderweg" && (
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--portal-border))] flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[hsl(var(--portal-gold))]" />
                    <span className="text-sm text-[hsl(var(--portal-text))]">
                      Verwacht: <strong className="text-[hsl(var(--portal-gold))]">{shipment.eta}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Export Button */}
      {filteredShipments.length > 0 && (
        <button
          onClick={handleExportCsv}
          className="w-full portal-glass p-3 flex items-center justify-center gap-2 text-sm text-[hsl(var(--portal-text-secondary))] hover:text-[hsl(var(--portal-text))] transition-colors"
        >
          <FileDown className="h-4 w-4" />
          Exporteer naar CSV
        </button>
      )}
    </div>
  );
};

export default ImperialShipmentsList;
