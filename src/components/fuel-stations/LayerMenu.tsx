import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Fuel, Route, ParkingCircle, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { hapticSelection } from "@/lib/haptics";

export type LayerVisibility = {
  fuel: boolean;
  toll: boolean;
  parking: boolean;
};

interface LayerMenuProps {
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  className?: string;
}

const layerConfig = [
  {
    id: "fuel" as const,
    label: "Brandstof",
    icon: Fuel,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    description: "Tankstations en prijzen",
  },
  {
    id: "toll" as const,
    label: "Tol",
    icon: Route,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    description: "Tolwegen en vignetten",
  },
  {
    id: "parking" as const,
    label: "Parkeren",
    icon: ParkingCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "Truck- en rustplaatsen",
  },
];

export function LayerMenu({ layers, onLayersChange, className }: LayerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(
    (layerId: keyof LayerVisibility) => {
      hapticSelection();
      onLayersChange({
        ...layers,
        [layerId]: !layers[layerId],
      });
    },
    [layers, onLayersChange]
  );

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className={cn("relative", className)}>
      {/* Layer Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-2 right-0 w-64 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="p-3 border-b border-border/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Kaartlagen</h3>
                <span className="text-xs text-muted-foreground">
                  {activeCount} actief
                </span>
              </div>
            </div>

            <div className="p-2 space-y-1">
              {layerConfig.map((layer) => {
                const Icon = layer.icon;
                const isActive = layers[layer.id];

                return (
                  <button
                    key={layer.id}
                    onClick={() => handleToggle(layer.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? cn(layer.bgColor, layer.borderColor, "border")
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                        isActive ? layer.bgColor : "bg-muted/50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? layer.color : "text-muted-foreground"
                        )}
                      />
                    </div>

                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          "text-sm font-medium transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {layer.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {layer.description}
                      </p>
                    </div>

                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggle(layer.id)}
                      className="pointer-events-none"
                    />
                  </button>
                );
              })}
            </div>

            {/* Info footer */}
            <div className="p-2 border-t border-border/30">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Indicatieve data — kan afwijken van actuele situatie
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          hapticSelection();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "relative h-10 w-10 bg-background/90 backdrop-blur-sm border-border/50 shadow-lg",
          isOpen && "bg-primary text-primary-foreground border-primary"
        )}
      >
        <Layers className="h-4 w-4" />
        
        {/* Active indicator badge */}
        {activeCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
            {activeCount}
          </span>
        )}
        
        {/* Expand indicator */}
        <ChevronUp
          className={cn(
            "absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </Button>
    </div>
  );
}
