import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Gauge,
  Euro,
  Truck,
  Users,
  TrendingUp,
  Map,
  Zap,
  AlertTriangle,
  LineChart,
  Sparkles,
  X,
  ChevronRight,
  Settings2,
  Palette,
} from "lucide-react";
import { DashboardWidgetConfig, WidgetSize } from "@/hooks/useUserPreferences";

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  borderColor: string;
  widgets: DashboardWidgetConfig[];
  recommended?: boolean;
  isCustom?: boolean;
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: "operations",
    name: "Operaties",
    description: "Live tracking, alerts en actiewachtrij",
    icon: Truck,
    color: "text-primary",
    bg: "bg-primary/10",
    borderColor: "border-primary/30",
    recommended: true,
    widgets: [
      { id: "fleet-map", size: "large" as WidgetSize },
      { id: "alerts-widget", size: "medium" as WidgetSize },
      { id: "action-queue", size: "large" as WidgetSize },
      { id: "activity-feed", size: "medium" as WidgetSize },
    ],
  },
  {
    id: "performance",
    name: "Performance",
    description: "KPI's, OTIF en operationele metrics",
    icon: Gauge,
    color: "text-success",
    bg: "bg-success/10",
    borderColor: "border-success/30",
    widgets: [
      { id: "performance-metrics", size: "large" as WidgetSize },
      { id: "geographic-heatmap", size: "medium" as WidgetSize },
      { id: "trip-stats", size: "large" as WidgetSize },
      { id: "smart-insights", size: "medium" as WidgetSize },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Omzet, marges en cashflow overzicht",
    icon: Euro,
    color: "text-gold",
    bg: "bg-gold/10",
    borderColor: "border-gold/30",
    widgets: [
      { id: "trends-widget", size: "large" as WidgetSize },
      { id: "finance-snapshot", size: "medium" as WidgetSize },
      { id: "revenue-chart", size: "large" as WidgetSize },
      { id: "smart-insights", size: "medium" as WidgetSize },
    ],
  },
  {
    id: "executive",
    name: "Executive",
    description: "High-level KPI's voor management",
    icon: TrendingUp,
    color: "text-chart-purple",
    bg: "bg-chart-purple/10",
    borderColor: "border-chart-purple/30",
    widgets: [
      { id: "performance-metrics", size: "medium" as WidgetSize },
      { id: "trends-widget", size: "large" as WidgetSize },
      { id: "geographic-heatmap", size: "medium" as WidgetSize },
      { id: "smart-insights", size: "medium" as WidgetSize },
    ],
  },
  {
    id: "dispatcher",
    name: "Dispatcher",
    description: "Real-time planning en chauffeur coördinatie",
    icon: Map,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    widgets: [
      { id: "fleet-map", size: "large" as WidgetSize },
      { id: "action-queue", size: "large" as WidgetSize },
      { id: "alerts-widget", size: "medium" as WidgetSize },
      { id: "fuel-stations", size: "small" as WidgetSize },
    ],
  },
  {
    id: "balanced",
    name: "Alles-in-één",
    description: "Gebalanceerde mix van alle modules",
    icon: Sparkles,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    widgets: [
      { id: "fleet-map", size: "large" as WidgetSize },
      { id: "performance-metrics", size: "medium" as WidgetSize },
      { id: "finance-snapshot", size: "medium" as WidgetSize },
      { id: "action-queue", size: "large" as WidgetSize },
      { id: "trends-widget", size: "large" as WidgetSize },
      { id: "alerts-widget", size: "medium" as WidgetSize },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Stel je eigen dashboard samen",
    icon: Palette,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    widgets: [],
    isCustom: true,
  },
];

interface DashboardPresetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: DashboardPreset) => void;
  onOpenCustomizer?: () => void;
  currentPresetId?: string;
}

export function DashboardPresetSelector({
  isOpen,
  onClose,
  onSelectPreset,
  onOpenCustomizer,
  currentPresetId,
}: DashboardPresetSelectorProps) {
  const handleSelect = (preset: DashboardPreset) => {
    if (preset.isCustom && onOpenCustomizer) {
      onClose();
      onOpenCustomizer();
      return;
    }
    onSelectPreset(preset);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:max-h-[85vh] z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50 bg-gradient-to-r from-card to-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Kies je Dashboard</h2>
                    <p className="text-xs text-muted-foreground">
                      Selecteer een layout die past bij jouw rol
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Presets Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {DASHBOARD_PRESETS.map((preset, index) => {
                    const isActive = currentPresetId === preset.id;
                    const PresetIcon = preset.icon;

                    return (
                      <motion.button
                        key={preset.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelect(preset)}
                        className={cn(
                          "group relative flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200",
                          "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                          isActive
                            ? `${preset.borderColor} ${preset.bg}`
                            : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
                        )}
                      >
                        {/* Recommended badge */}
                        {preset.recommended && (
                          <Badge
                            variant="premium"
                            className="absolute -top-2 -right-2 text-[9px] px-2 py-0.5"
                          >
                            Aanbevolen
                          </Badge>
                        )}

                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute top-2 right-2">
                            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          </div>
                        )}

                        {/* Icon + Title */}
                        <div className="flex items-start gap-3 mb-2">
                          <div className={cn("p-2.5 rounded-xl", preset.bg)}>
                            <PresetIcon className={cn("h-5 w-5", preset.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm">{preset.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {preset.description}
                            </p>
                          </div>
                        </div>

                        {/* Widget preview */}
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {preset.widgets.length} widgets
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Footer hint */}
              <div className="p-4 border-t border-border/50 bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  Je kunt altijd widgets toevoegen of verwijderen na het kiezen
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default DashboardPresetSelector;
