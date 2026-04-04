import React, { memo, useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GripVertical, 
  X, 
  Plus, 
  RotateCcw,
  Check,
  Sparkles,
  LayoutGrid,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  WIDGET_REGISTRY, 
  WidgetCategory,
  DEFAULT_WIDGET_ORDER,
} from "./widgets/WidgetRegistry";
import { WidgetConfig } from "./DraggableWidgetGrid";
import { DASHBOARD_PRESETS, DashboardPreset } from "./DashboardPresetSelector";

interface WidgetCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
  onReset: () => void;
  onSelectPreset?: (preset: DashboardPreset) => void;
  currentPresetId?: string;
}

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  operations: 'Operaties',
  finance: 'Finance',
  insights: 'Inzichten',
  analytics: 'Analytics',
};

type PanelTab = 'presets' | 'widgets';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
};

const WidgetCustomizer = ({
  isOpen,
  onClose,
  widgets,
  onSave,
  onReset,
  onSelectPreset,
  currentPresetId,
}: WidgetCustomizerProps) => {
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(widgets);
  const [activeCategory, setActiveCategory] = useState<WidgetCategory>('operations');
  const [activeTab, setActiveTab] = useState<PanelTab>('presets');
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (isOpen) {
      setLocalWidgets(widgets);
    }
  }, [isOpen, widgets]);

  const activeWidgetIds = localWidgets.map(w => w.id);
  const availableWidgets = Object.values(WIDGET_REGISTRY).filter(
    w => !activeWidgetIds.includes(w.id)
  );
  const categoryWidgets = availableWidgets.filter(w => w.category === activeCategory);

  const handleRemoveWidget = (widgetId: string) => {
    setLocalWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleAddWidget = (widgetId: string) => {
    const definition = WIDGET_REGISTRY[widgetId];
    if (definition) {
      setLocalWidgets(prev => [
        ...prev,
        { id: widgetId, size: definition.defaultSize }
      ]);
    }
  };

  const handleSave = () => {
    onSave(localWidgets);
    onClose();
  };

  const handleReset = () => {
    const defaultWidgets: WidgetConfig[] = DEFAULT_WIDGET_ORDER.map(id => ({
      id,
      size: WIDGET_REGISTRY[id]?.defaultSize || 'medium',
    }));
    setLocalWidgets(defaultWidgets);
  };

  const handleSelectPreset = (preset: DashboardPreset) => {
    if (preset.isCustom) {
      setActiveTab('widgets');
      return;
    }
    if (onSelectPreset) {
      onSelectPreset(preset);
    }
    // Also update local widgets to reflect the preset
    setLocalWidgets(preset.widgets);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"}
        showDragHandle={isMobile}
        className={cn(
          "p-0 flex flex-col",
          isMobile && "max-h-[92vh] rounded-t-3xl",
          !isMobile && "w-full sm:max-w-lg xl:max-w-xl",
          "bg-background/60 backdrop-blur-2xl border-border/20"
        )}
      >
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mesh-bg-animated rounded-inherit" />
        
        <SheetHeader className="relative p-4 sm:p-6 pb-3 gradient-border-shimmer">
          <div className="flex items-center gap-3">
            <motion.div 
              className="relative"

            >
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-primary/50 rounded-xl blur opacity-40" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
            </motion.div>
            <div>
              <SheetTitle className="text-lg font-bold">Dashboard Aanpassen</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Kies een thema of stel je eigen samen
              </SheetDescription>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mt-4 p-1 rounded-xl bg-muted/30 border border-border/20">
            {([
              { id: 'presets' as PanelTab, label: 'Thema\'s', icon: Zap },
              { id: 'widgets' as PanelTab, label: 'Widgets', icon: LayoutGrid },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors touch-manipulation",
                  activeTab === tab.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="panel-tab"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-lg shadow-lg shadow-primary/20"
                  />
                )}
                <tab.icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className={cn("flex-1 relative", isMobile && "pb-20")}>
          <AnimatePresence mode="wait">
            {activeTab === 'presets' ? (
              <motion.div
                key="presets"
                initial={{ opacity: 0, x: -20 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 sm:p-6"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {DASHBOARD_PRESETS.map((preset, index) => {
                    const isActive = currentPresetId === preset.id;
                    const PresetIcon = preset.icon;

                    return (
                      <motion.button
                        key={preset.id}
                        initial={{ opacity: 0, y: 10 }}
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          "group relative flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation",
                          "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                          isActive
                            ? `${preset.borderColor} ${preset.bg}`
                            : "border-border/30 glass-panel-subtle hover:border-border/60"
                        )}
                      >
                        {preset.recommended && (
                          <Badge variant="premium" className="absolute -top-2 -right-2 text-[9px] px-2 py-0.5">
                            Aanbevolen
                          </Badge>
                        )}

                        {isActive && (
                          <div className="absolute top-2 right-2">
                            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          </div>
                        )}

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

                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {preset.isCustom ? 'Eigen samenstelling' : `${preset.widgets.length} widgets`}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4 opacity-70">
                  Na het kiezen kun je altijd widgets toevoegen of verwijderen via het <span className="font-semibold">Widgets</span> tab
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="widgets"
                initial={{ opacity: 0, x: 20 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-5 sm:p-6 space-y-6"
              >
                {/* Active Widgets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      Jouw Widgets
                    </h3>
                    <Badge variant="secondary" className="text-xs glass-panel-subtle">
                      {localWidgets.length} actief
                    </Badge>
                  </div>

                  <Reorder.Group
                    axis="y"
                    values={localWidgets}
                    onReorder={setLocalWidgets}
                    className="space-y-2"
                  >
                    <AnimatePresence>
                      {localWidgets.map((widget) => {
                        const definition = WIDGET_REGISTRY[widget.id];
                        if (!definition) return null;
                        
                        return (
                          <Reorder.Item
                            key={widget.id}
                            value={widget}
                            className="cursor-grab active:cursor-grabbing touch-manipulation"
                          >
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              exit={{ opacity: 0, x: -20, scale: 0.9 }}
                              className={cn(
                                "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl overflow-hidden",
                                "glass-panel-subtle",
                                "hover:border-border/40 hover:bg-card/50",
                                "transition-all duration-150"
                              )}
                            >
                              <div className="hidden sm:flex p-1.5 hover:bg-muted/50 rounded-lg transition-colors items-center justify-center">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              
                              <div className="p-2 rounded-lg bg-primary/10 border border-primary/10">
                                <definition.icon className="h-4 w-4 text-primary" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{definition.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {definition.description}
                                </p>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-8 sm:w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive touch-manipulation"
                                onClick={() => handleRemoveWidget(widget.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </Reorder.Item>
                        );
                      })}
                    </AnimatePresence>
                  </Reorder.Group>

                  {localWidgets.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8 text-center"
                    >
                      <div className="p-4 rounded-full glass-panel-subtle mb-3">
                        <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Geen widgets geselecteerd</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Voeg widgets toe uit de gallerij hieronder
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Animated gradient divider */}
                <div className="relative h-px">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" 
                       style={{ backgroundSize: '200% 100%', animation: 'border-shimmer 3s ease-in-out infinite' }} />
                  <div className="relative flex justify-center -top-3">
                    <span className="bg-background/80 backdrop-blur-sm px-3 text-xs text-muted-foreground uppercase tracking-wider">
                      Beschikbaar
                    </span>
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {(Object.keys(CATEGORY_LABELS) as WidgetCategory[]).map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        "relative shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors duration-200 touch-manipulation min-h-[40px] sm:min-h-0",
                        activeCategory === category
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      {activeCategory === category && (
                        <motion.div
                          layoutId="category-pill"
                          className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-lg shadow-primary/20"
                        />
                      )}
                      <span className="relative z-10">{CATEGORY_LABELS[category]}</span>
                    </button>
                  ))}
                </div>

                {/* Available Widgets Gallery */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  <AnimatePresence mode="popLayout">
                    {categoryWidgets.map((widget, index) => (
                      <motion.button
                        key={widget.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        exit={{ opacity: 0, scale: 0.9 }}
}
                        onClick={() => handleAddWidget(widget.id)}
                        className={cn(
                          "flex flex-col items-center gap-2.5 p-4 rounded-xl",
                          "glass-panel-subtle",
                          "hover:border-primary/40 hover:bg-primary/5",
                          "transition-all duration-200",
                          "cursor-pointer text-center group touch-manipulation min-h-[88px]"
                        )}
                      >
                        <motion.div
                          className="p-3 rounded-xl bg-background/50 border border-border/20 group-hover:border-primary/30 group-hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.2)] transition-all"

                        >
                          <widget.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </motion.div>
                        <span className="text-xs font-medium leading-tight">{widget.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>

                  {categoryWidgets.length === 0 && (
                    <div className="col-span-2 sm:col-span-3 py-6 text-center">
                      <Sparkles className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Alle widgets in deze categorie zijn al toegevoegd
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer — only show on widgets tab */}
        {activeTab === 'widgets' && (
          <SheetFooter className={cn(
            "relative p-4 gap-2",
            isMobile && "sticky bottom-0 z-10 bg-background/95 backdrop-blur-xl border-t border-border/30 rounded-none"
          )}
          style={isMobile ? { paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' } : undefined}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex-1 h-11 sm:h-9 touch-manipulation"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <motion.div className="flex-1">
              <Button
                variant="premium"
                size="sm"
                onClick={handleSave}
                className="w-full h-11 sm:h-9 touch-manipulation shimmer"
              >
                <Check className="h-4 w-4 mr-2" />
                Opslaan
              </Button>
            </motion.div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default memo(WidgetCustomizer);
