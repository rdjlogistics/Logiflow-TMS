import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Truck,
  FileText,
  Zap,
  PiggyBank,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardStats {
  activeShipments: number;
  pendingSubmissions: number;
  deliveredThisMonth: number;
  problemShipments: number;
  onTimePercentage: number;
  totalSavings: number;
}

interface Shipment {
  id: string;
  status: string;
  pickup_city?: string | null;
  delivery_city?: string | null;
  trip_date: string;
  order_number?: string | null;
  tracking_token?: string | null;
  eta?: string;
}

interface ImperialDashboardProps {
  stats: DashboardStats;
  activeShipments: Shipment[];
  onNewBooking: () => void;
  onViewShipments: () => void;
  onViewShipment: (id: string) => void;
  onImportCSV: () => void;
}

const statusConfig: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: "In afwachting", class: "portal-badge-pending", icon: Clock },
  aanvraag: { label: "In afwachting", class: "portal-badge-pending", icon: Clock },
  approved: { label: "Goedgekeurd", class: "portal-badge-success", icon: CheckCircle2 },
  gepland: { label: "Gepland", class: "portal-badge-active", icon: Package },
  geladen: { label: "Geladen", class: "portal-badge-active", icon: Truck },
  onderweg: { label: "Onderweg", class: "portal-badge-active", icon: Truck },
  afgeleverd: { label: "Afgeleverd", class: "portal-badge-success", icon: CheckCircle2 },
  afgerond: { label: "Afgeleverd", class: "portal-badge-success", icon: CheckCircle2 },
  gecontroleerd: { label: "Afgeleverd", class: "portal-badge-success", icon: CheckCircle2 },
  gefactureerd: { label: "Afgeleverd", class: "portal-badge-success", icon: CheckCircle2 },
  delivered: { label: "Afgeleverd", class: "portal-badge-success", icon: CheckCircle2 },
  probleem: { label: "Actie nodig", class: "portal-badge-danger", icon: AlertTriangle },
};

export const ImperialDashboard = ({
  stats,
  activeShipments,
  onNewBooking,
  onViewShipments,
  onViewShipment,
  onImportCSV,
}: ImperialDashboardProps) => {
  return (
    <div className="space-y-6 portal-animate-in">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onNewBooking}
          className="portal-glass-gold p-4 text-left group relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--portal-gold)/.15)] flex items-center justify-center mb-3">
              <Zap className="h-5 w-5 text-[hsl(var(--portal-gold))]" />
            </div>
            <p className="font-semibold text-[hsl(var(--portal-text))]">Nieuwe Zending</p>
            <p className="text-xs text-[hsl(var(--portal-text-muted))] mt-0.5">In 60 seconden boeken</p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-[hsl(var(--portal-gold))] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={onImportCSV}
          className="portal-glass p-4 text-left group relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--portal-primary)/.15)] flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-[hsl(var(--portal-primary-glow))]" />
            </div>
            <p className="font-semibold text-[hsl(var(--portal-text))]">Importeren</p>
            <p className="text-xs text-[hsl(var(--portal-text-muted))] mt-0.5">CSV/Excel upload</p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-[hsl(var(--portal-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="portal-kpi">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-[hsl(var(--portal-warning))]" />
            <span className="text-xs text-[hsl(var(--portal-text-muted))]">In afwachting</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--portal-warning))]">{stats.pendingSubmissions}</p>
        </div>

        <div className="portal-kpi">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-[hsl(var(--portal-info))]" />
            <span className="text-xs text-[hsl(var(--portal-text-muted))]">Goedgekeurd</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--portal-info))]">{stats.activeShipments}</p>
        </div>

        <div className="portal-kpi">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-[hsl(var(--portal-primary-glow))]" />
            <span className="text-xs text-[hsl(var(--portal-text-muted))]">Onderweg</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--portal-primary-glow))]">{stats.activeShipments}</p>
        </div>

        <div className="portal-kpi">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[hsl(var(--portal-success))]" />
            <span className="text-xs text-[hsl(var(--portal-text-muted))]">Afgeleverd</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--portal-success))]">{stats.deliveredThisMonth}</p>
        </div>

        <div className="portal-kpi col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--portal-danger))]" />
            <span className="text-xs text-[hsl(var(--portal-text-muted))]">Problemen</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--portal-danger))]">{stats.problemShipments}</p>
        </div>
      </div>

      {/* Active Shipments */}
      <div className="portal-glass p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[hsl(var(--portal-text))]">Actieve Zendingen</h2>
          <button 
            onClick={onViewShipments}
            className="text-sm text-[hsl(var(--portal-gold))] hover:underline flex items-center gap-1"
          >
            Alle bekijken
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {activeShipments.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-[hsl(var(--portal-text-muted))] mb-3 opacity-50" />
            <p className="text-[hsl(var(--portal-text-muted))]">Geen actieve zendingen</p>
            <button 
              onClick={onNewBooking}
              className="mt-3 text-sm text-[hsl(var(--portal-gold))] hover:underline"
            >
              Boek je eerste zending
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeShipments.slice(0, 5).map((shipment) => {
              const config = statusConfig[shipment.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              
              return (
                <button
                  key={shipment.id}
                  onClick={() => onViewShipment(shipment.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl bg-[hsl(var(--portal-surface))] hover:bg-[hsl(var(--portal-surface-hover))] transition-colors text-left"
                >
                  <div className={cn("portal-badge", config.class)}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[hsl(var(--portal-text))] truncate">
                      {shipment.pickup_city || "?"} → {shipment.delivery_city || "?"}
                    </p>
                    <p className="text-xs text-[hsl(var(--portal-text-muted))]">
                      {format(new Date(shipment.trip_date), "d MMM", { locale: nl })}
                      {shipment.order_number && ` • ${shipment.order_number}`}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--portal-text-muted))]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Savings Widget */}
      <div className="portal-glass-gold p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--portal-gold)/.15)] flex items-center justify-center">
            <PiggyBank className="h-5 w-5 text-[hsl(var(--portal-gold))]" />
          </div>
          <div>
            <h2 className="font-semibold text-[hsl(var(--portal-text))]">Live Besparingen</h2>
            <p className="text-xs text-[hsl(var(--portal-text-muted))]">Deze maand bespaard</p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-[hsl(var(--portal-gold))]">€{stats.totalSavings.toLocaleString()}</span>
          <span className="text-sm text-[hsl(var(--portal-success))] flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            +12%
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[hsl(var(--portal-text-muted))]">Consolidatie bonus</span>
            <span className="text-[hsl(var(--portal-success))]">€89</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[hsl(var(--portal-text-muted))]">Flexibel tijdvenster</span>
            <span className="text-[hsl(var(--portal-success))]">€156</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[hsl(var(--portal-text-muted))]">Volume korting</span>
            <span className="text-[hsl(var(--portal-success))]">€203</span>
          </div>
        </div>
      </div>

      {/* Stress Radar Widget */}
      <div className="portal-glass p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--portal-danger)/.15)] flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-[hsl(var(--portal-danger))]" />
          </div>
          <div>
            <h2 className="font-semibold text-[hsl(var(--portal-text))]">Stress Radar</h2>
            <p className="text-xs text-[hsl(var(--portal-text-muted))]">Potentiële issues</p>
          </div>
        </div>

        {stats.problemShipments === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--portal-success)/.1)] border border-[hsl(var(--portal-success)/.2)]">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--portal-success))]" />
            <div>
              <p className="font-medium text-[hsl(var(--portal-success))]">Alles op schema</p>
              <p className="text-xs text-[hsl(var(--portal-text-muted))]">Geen actie nodig</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--portal-warning)/.1)] border border-[hsl(var(--portal-warning)/.2)]">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--portal-warning))]" />
              <div className="flex-1">
                <p className="font-medium text-[hsl(var(--portal-warning))]">
                  {stats.problemShipments} zending(en) met risico
                </p>
                <p className="text-xs text-[hsl(var(--portal-text-muted))]">
                  Klik om details te bekijken
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--portal-warning))]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImperialDashboard;
