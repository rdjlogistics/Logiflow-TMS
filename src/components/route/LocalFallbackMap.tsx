import React, { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import type { OptimizableStop, OptimizedStop, OptimizationResult } from "@/hooks/useAdvancedRouteOptimization";
import { getEtaStatusColor } from "@/utils/etaColor";

interface LocalFallbackMapProps {
  stops: OptimizableStop[];
  optimizationResult?: OptimizationResult | null;
  className?: string;
  onStopClick?: (stopId: string) => void;
}

const PADDING = 48;

function lngLatToSvg(
  lng: number, lat: number,
  bounds: { west: number; east: number; north: number; south: number },
  width: number, height: number
) {
  const x = PADDING + ((lng - bounds.west) / (bounds.east - bounds.west)) * (width - PADDING * 2);
  const latRad = (lat * Math.PI) / 180;
  const northRad = (bounds.north * Math.PI) / 180;
  const southRad = (bounds.south * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const mercNorth = Math.log(Math.tan(Math.PI / 4 + northRad / 2));
  const mercSouth = Math.log(Math.tan(Math.PI / 4 + southRad / 2));
  const y = PADDING + ((mercNorth - mercY) / (mercNorth - mercSouth)) * (height - PADDING * 2);
  return { x, y };
}

const LocalFallbackMap: React.FC<LocalFallbackMapProps> = ({
  stops, optimizationResult, className = "", onStopClick,
}) => {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const displayStops = optimizationResult?.stops || stops;
  const validStops = useMemo(() => displayStops.filter((s) => s.latitude && s.longitude), [displayStops]);

  const WIDTH = 800;
  const HEIGHT = 400;

  const bounds = useMemo(() => {
    if (validStops.length === 0) return null;
    let west = Infinity, east = -Infinity, north = -Infinity, south = Infinity;
    validStops.forEach((s) => {
      if (s.longitude! < west) west = s.longitude!;
      if (s.longitude! > east) east = s.longitude!;
      if (s.latitude! > north) north = s.latitude!;
      if (s.latitude! < south) south = s.latitude!;
    });
    const lngPad = Math.max((east - west) * 0.2, 0.02);
    const latPad = Math.max((north - south) * 0.2, 0.02);
    return { west: west - lngPad, east: east + lngPad, north: north + latPad, south: south - latPad };
  }, [validStops]);

  if (validStops.length === 0 || !bounds) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted w-full h-full min-h-[320px] ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-muted-foreground/10 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium">Voeg stops toe om de kaart te zien</p>
      </div>
    );
  }

  const points = validStops.map((s) => lngLatToSvg(s.longitude!, s.latitude!, bounds, WIDTH, HEIGHT));
  const polyline = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className={`relative overflow-hidden bg-muted/20 w-full h-full min-h-[320px] ${className}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="hsl(var(--muted))" opacity="0.3" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

        {/* Animated route line */}
        <style>{`@keyframes dash { to { stroke-dashoffset: -36; } }`}</style>
        <path d={polyline} fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" filter="blur(3px)" />
        <path d={polyline} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" strokeDasharray="12 6" style={{ animation: "dash 1.5s linear infinite" }} />

        {/* Markers */}
        {validStops.map((stop, index) => {
          const p = points[index];
          const isPickup = stop.stopType === "pickup";
          const isDelivery = stop.stopType === "delivery";
          const color = isPickup ? "#22c55e" : isDelivery ? "#ef4444" : "#6b7280";

          return (
            <g key={stop.id} className="cursor-pointer" onClick={() => {
              setActivePopup(activePopup === stop.id ? null : stop.id);
              onStopClick?.(stop.id);
            }}>
              <circle cx={p.x} cy={p.y} r="14" fill={color} stroke="white" strokeWidth="2" />
              <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="bold">
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Popup overlay */}
      {activePopup && (() => {
        const idx = validStops.findIndex((s) => s.id === activePopup);
        if (idx === -1) return null;
        const stop = validStops[idx];
        const p = points[idx];
        const isPickup = stop.stopType === "pickup";
        const isDelivery = stop.stopType === "delivery";
        const color = isPickup ? "#22c55e" : isDelivery ? "#ef4444" : "#6b7280";
        const optStop = stop as OptimizedStop;
        let etaLabel = "";
        if (optStop.arrivalTime) {
          try {
            const d = new Date(optStop.arrivalTime);
            etaLabel = !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : optStop.arrivalTime;
          } catch { etaLabel = optStop.arrivalTime; }
        }
        const etaColor = etaLabel ? getEtaStatusColor(etaLabel, stop.timeWindowEnd || null) : "";

        // Convert SVG coords to percentage
        const leftPct = (p.x / WIDTH) * 100;
        const topPct = (p.y / HEIGHT) * 100;

        return (
          <div
            className="absolute z-20 bg-background rounded-lg shadow-xl border border-border p-3 min-w-[200px] max-w-[260px] -translate-x-1/2 -translate-y-full"
            style={{ left: `${leftPct}%`, top: `calc(${topPct}% - 20px)` }}
          >
            <button onClick={() => setActivePopup(null)} className="absolute top-1 right-2 text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: color }}>{idx + 1}</span>
              <span className="font-semibold text-sm">{stop.companyName || `Stop ${idx + 1}`}</span>
            </div>
            <p className="text-xs text-muted-foreground">{stop.address}{stop.city ? `, ${stop.city}` : ""}</p>
            <div className="flex gap-1 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>{isPickup ? "Ophalen" : isDelivery ? "Afleveren" : "Tussenstop"}</span>
              {stop.priority === "urgent" && <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 text-destructive">Urgent</span>}
            </div>
            {etaLabel && (
              <div className="border-t border-border mt-2 pt-2">
                <p className="text-xs"><strong>🕐 ETA:</strong> <span className={`font-mono font-bold text-sm ${etaColor}`}>{etaLabel}</span></p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-border/30">
        <p className="text-xs font-medium mb-2">Stopsoorten</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }} /><span>Ophalen</span></div>
          <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} /><span>Afleveren</span></div>
          <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6b7280" }} /><span>Tussenstop</span></div>
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm text-[10px] text-muted-foreground">
        Lokale kaart — zonder tiles
      </div>
    </div>
  );
};

export default LocalFallbackMap;
