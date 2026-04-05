import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Thermometer, AlertTriangle, Box, Snowflake, Truck, ArrowDownToLine } from "lucide-react";

interface Zone {
  id: string;
  code: string;
  name: string;
  type: "storage" | "picking" | "staging" | "receiving" | "shipping" | "cold" | "hazmat";
  utilization: number;
  items: number;
  alerts?: number;
}

interface WMSWarehouseMapProps {
  zones: Zone[];
  className?: string;
  onZoneClick?: (zone: Zone) => void;
}

const zoneConfig: Record<Zone["type"], { 
  bg: string; 
  border: string; 
  glow: string;
  icon: React.ReactNode;
  gradient: string;
}> = {
  storage: { 
    bg: "bg-blue-500/15", 
    border: "border-blue-500/50", 
    glow: "shadow-blue-500/20",
    gradient: "from-blue-500/20 to-transparent",
    icon: <Box className="h-3.5 w-3.5" /> 
  },
  picking: { 
    bg: "bg-violet-500/15", 
    border: "border-violet-500/50", 
    glow: "shadow-violet-500/20",
    gradient: "from-violet-500/20 to-transparent",
    icon: <Package className="h-3.5 w-3.5" /> 
  },
  staging: { 
    bg: "bg-amber-500/15", 
    border: "border-amber-500/50", 
    glow: "shadow-amber-500/20",
    gradient: "from-amber-500/20 to-transparent",
    icon: <Package className="h-3.5 w-3.5" /> 
  },
  receiving: { 
    bg: "bg-emerald-500/15", 
    border: "border-emerald-500/50", 
    glow: "shadow-emerald-500/20",
    gradient: "from-emerald-500/20 to-transparent",
    icon: <ArrowDownToLine className="h-3.5 w-3.5" /> 
  },
  shipping: { 
    bg: "bg-cyan-500/15", 
    border: "border-cyan-500/50", 
    glow: "shadow-cyan-500/20",
    gradient: "from-cyan-500/20 to-transparent",
    icon: <Truck className="h-3.5 w-3.5" /> 
  },
  cold: { 
    bg: "bg-sky-500/15", 
    border: "border-sky-500/50", 
    glow: "shadow-sky-500/20",
    gradient: "from-sky-500/20 to-transparent",
    icon: <Snowflake className="h-3.5 w-3.5" /> 
  },
  hazmat: { 
    bg: "bg-red-500/15", 
    border: "border-red-500/50", 
    glow: "shadow-red-500/20",
    gradient: "from-red-500/20 to-transparent",
    icon: <AlertTriangle className="h-3.5 w-3.5" /> 
  },
};

const getUtilizationStyle = (util: number) => {
  if (util >= 90) return { color: "text-red-400", bg: "bg-red-500", border: "border-red-500/60" };
  if (util >= 75) return { color: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/60" };
  return { color: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/60" };
};

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.015 }
  }
};

const zoneVariants = {
  hidden: { opacity: 0.9, scale: 0.98 },
  show: { 
    opacity: 1, 
    scale: 1, 
    transition: { type: "tween", duration: 0.08 }
  }
};

export function WMSWarehouseMap({ zones, className, onZoneClick }: WMSWarehouseMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  return (
    <div className={cn("relative", className)}>
      {/* Legend - Premium Style */}
      <div className="flex items-center gap-5 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-emerald-500/50 border border-emerald-500/60" />
          <span className="text-muted-foreground">&lt;75%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-amber-500/50 border border-amber-500/60" />
          <span className="text-muted-foreground">75-90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-red-500/50 border border-red-500/60" />
          <span className="text-muted-foreground">&gt;90%</span>
        </div>
      </div>

      {/* Zone Grid with Smooth Animations */}
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-3 gap-3"
        >
          
            {zones.map((zone) => {
              const config = zoneConfig[zone.type];
              const utilStyle = getUtilizationStyle(zone.utilization);
              const isHovered = hoveredZone === zone.id;

              return (
                <Tooltip key={zone.id}>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ 
                        scale: 1.02, 
                        y: -2,
                        transition: { type: "tween", duration: 0.1 }
                      }}
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                      onClick={() => onZoneClick?.(zone)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-left transition-all duration-300",
                        "backdrop-blur-sm overflow-hidden",
                        config.bg,
                        isHovered ? utilStyle.border : config.border,
                        isHovered && `shadow-lg ${config.glow}`
                      )}
                    >
                      {/* Animated gradient overlay */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        className={cn("absolute inset-0 bg-gradient-to-br", config.gradient, "pointer-events-none")}
                      />

                      {/* Utilization progress bar at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-background/40 overflow-hidden rounded-b-lg">
                        <motion.div
                          initial={{ width: 0 }}
                          className={cn("h-full", utilStyle.bg)}
                        />
                      </div>

                      {/* Zone header */}
                      <div className="relative flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{config.icon}</span>
                          <span className="font-mono text-sm font-bold tracking-wide">{zone.code}</span>
                        </div>
                        {zone.alerts && zone.alerts > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                          >
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                              {zone.alerts}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Zone name */}
                      <p className="relative text-sm font-medium truncate mb-2">{zone.name}</p>
                      
                      {/* Stats row */}
                      <div className="relative flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{zone.items.toLocaleString('nl-NL')} items</span>
                        <motion.span 
                          className={cn("font-bold tabular-nums", utilStyle.color)}
                        >
                          {zone.utilization}%
                        </motion.span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-popover/95 backdrop-blur-md border-border/50"
                  >
                    <div className="text-sm p-1">
                      <p className="font-semibold">{zone.name}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Type: <span className="capitalize">{zone.type}</span> • {zone.items.toLocaleString('nl-NL')} items • {zone.utilization}% bezet
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          
        </div>
      </TooltipProvider>

      {zones.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          className="text-center py-12 text-muted-foreground"
        >
          <Box className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Geen zones geconfigureerd</p>
          <p className="text-xs mt-1">Voeg magazijn zones toe om te beginnen</p>
        </div>
      )}
    </div>
  );
}

// Returns empty array — zones come from database
export function generateDemoZones(): Zone[] {
  return [];
}
