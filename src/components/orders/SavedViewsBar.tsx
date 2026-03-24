import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Users, 
  FileWarning,
  Timer,
  MapPinOff,
  AlertCircle,
  TimerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SavedView {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: Record<string, any>;
  count?: number;
  isChip?: boolean;
  variant?: 'default' | 'warning' | 'danger';
}

interface SavedViewsBarProps {
  views: SavedView[];
  activeViewId: string | null;
  onViewSelect: (viewId: string | null) => void;
  quickFilterChips?: SavedView[];
  activeChips?: string[];
  onChipToggle?: (chipId: string) => void;
}

const SavedViewsBar = ({
  views,
  activeViewId,
  onViewSelect,
  quickFilterChips = [],
  activeChips = [],
  onChipToggle,
}: SavedViewsBarProps) => {
  return (
    <div className="space-y-3">
      {/* Main saved views */}
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 pb-2">
          <Button
            variant={activeViewId === null ? "default" : "outline"}
            size="sm"
            onClick={() => onViewSelect(null)}
            className="shrink-0 text-xs h-8"
          >
            Alle orders
          </Button>
          {views.map((view) => (
            <Button
              key={view.id}
              variant={activeViewId === view.id ? "default" : "outline"}
              size="sm"
              onClick={() => onViewSelect(view.id)}
              className={cn(
                "shrink-0 gap-1.5 text-xs h-8",
                activeViewId === view.id && "shadow-md"
              )}
            >
              {view.icon}
              {view.label}
              {view.count !== undefined && view.count > 0 && (
                <Badge 
                  variant={activeViewId === view.id ? "secondary" : "outline"} 
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px]"
                >
                  {view.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Quick filter chips */}
      {quickFilterChips.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-muted-foreground shrink-0">Snel filter:</span>
            {quickFilterChips.map((chip) => {
              const isActive = activeChips.includes(chip.id);
              return (
                <Badge
                  key={chip.id}
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105 gap-1 text-xs px-2 py-1",
                    chip.variant === 'warning' && !isActive && "border-warning/50 text-warning hover:bg-warning/10",
                    chip.variant === 'danger' && !isActive && "border-destructive/50 text-destructive hover:bg-destructive/10",
                    isActive && chip.variant === 'warning' && "bg-warning text-warning-foreground",
                    isActive && chip.variant === 'danger' && "bg-destructive text-destructive-foreground",
                  )}
                  onClick={() => onChipToggle?.(chip.id)}
                >
                  {chip.icon}
                  {chip.label}
                  {chip.count !== undefined && chip.count > 0 && (
                    <span className="ml-0.5 font-bold">({chip.count})</span>
                  )}
                </Badge>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};

// Pre-defined views
export const getDefaultSavedViews = (stats: {
  todayCount?: number;
  needsDriverCount?: number;
  atRiskCount?: number;
  toInvoiceCount?: number;
  openCount?: number;
}): SavedView[] => [
  {
    id: 'today',
    label: 'Vandaag',
    icon: <Calendar className="h-3.5 w-3.5" />,
    filter: { datePreset: 'today' },
    count: stats.todayCount,
  },
  {
    id: 'needs_driver',
    label: 'Eigen chauffeur nodig',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    filter: { needsDriver: true },
    count: stats.needsDriverCount,
  },
  {
    id: 'at_risk',
    label: 'At-risk',
    icon: <Clock className="h-3.5 w-3.5" />,
    filter: { atRisk: true },
    count: stats.atRiskCount,
  },
  {
    id: 'to_invoice',
    label: 'Te factureren',
    icon: <FileText className="h-3.5 w-3.5" />,
    filter: { status: 'gecontroleerd' },
    count: stats.toInvoiceCount,
  },
  {
    id: 'open',
    label: 'Openstaand',
    icon: <Users className="h-3.5 w-3.5" />,
    filter: { statusIn: ['gepland', 'geladen', 'onderweg'] },
    count: stats.openCount,
  },
];

export const getQuickFilterChips = (stats: {
  podMissingCount?: number;
  waitingTimeCount?: number;
  gpsOffCount?: number;
  holdCount?: number;
  etaRiskCount?: number;
}): SavedView[] => [
  {
    id: 'pod_missing',
    label: 'POD ontbreekt',
    icon: <FileWarning className="h-3 w-3" />,
    filter: { podMissing: true },
    count: stats.podMissingCount,
    isChip: true,
    variant: 'warning',
  },
  {
    id: 'waiting_time',
    label: 'Wachttijd loopt',
    icon: <Timer className="h-3 w-3" />,
    filter: { waitingTimeActive: true },
    count: stats.waitingTimeCount,
    isChip: true,
    variant: 'warning',
  },
  {
    id: 'gps_off',
    label: 'GPS uit',
    icon: <MapPinOff className="h-3 w-3" />,
    filter: { gpsOff: true },
    count: stats.gpsOffCount,
    isChip: true,
    variant: 'danger',
  },
  {
    id: 'hold',
    label: 'Hold',
    icon: <AlertCircle className="h-3 w-3" />,
    filter: { onHold: true },
    count: stats.holdCount,
    isChip: true,
    variant: 'danger',
  },
  {
    id: 'eta_risk',
    label: 'ETA risico',
    icon: <TimerOff className="h-3 w-3" />,
    filter: { etaAtRisk: true },
    count: stats.etaRiskCount,
    isChip: true,
    variant: 'warning',
  },
];

export default SavedViewsBar;
