import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, Maximize2, Box, Grid3X3, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleCapacity, CargoItem } from './types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CargoFit3DScene } from './CargoFit3DScene';
import type { DoorState } from './vehicles';

interface CargoFitVisualizationProps {
  vehicle: VehicleCapacity;
  cargoItems: CargoItem[];
  onExpand?: () => void;
}

interface PlacedItem {
  item: CargoItem;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  overflow: boolean;
}

interface SidePlacedItem {
  item: CargoItem;
  index: number;
  x: number;      // length position (from front)
  y: number;      // height position (from floor, SVG-inverted later)
  w: number;      // length dimension
  h: number;      // height dimension
  overflow: boolean;
  colorIdx: number;
}

// Gradient color pairs for premium rendering
const GRADIENT_PAIRS = [
  { from: 'hsl(220, 70%, 55%)', to: 'hsl(250, 60%, 45%)' },
  { from: 'hsl(160, 60%, 45%)', to: 'hsl(180, 50%, 35%)' },
  { from: 'hsl(280, 55%, 55%)', to: 'hsl(300, 45%, 40%)' },
  { from: 'hsl(30, 80%, 55%)',  to: 'hsl(15, 70%, 45%)' },
  { from: 'hsl(340, 60%, 55%)', to: 'hsl(320, 50%, 42%)' },
  { from: 'hsl(190, 70%, 50%)', to: 'hsl(210, 60%, 40%)' },
];

function packItems(vehicle: VehicleCapacity, cargoItems: CargoItem[]): PlacedItem[] {
  const vW = vehicle.widthCm;
  const vL = vehicle.lengthCm;
  const placed: PlacedItem[] = [];

  let x = 0;
  let y = 0;
  let rowHeight = 0;

  for (const item of cargoItems) {
    if (item.length <= 0 || item.width <= 0) continue;
    for (let q = 0; q < item.quantity; q++) {
      const w = item.width;
      const h = item.length;

      if (x + w > vW) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }

      const overflow = y + h > vL;
      placed.push({ item, index: q, x, y, w, h, overflow });
      x += w;
      rowHeight = Math.max(rowHeight, h);
    }
  }

  return placed;
}

/** Side-view packing: stack items by their length position, pile up by height */
function packItemsSideView(
  vehicle: VehicleCapacity,
  cargoItems: CargoItem[],
  itemColorMap: Map<string, number>
): SidePlacedItem[] {
  const vL = vehicle.lengthCm;
  const vH = vehicle.heightCm;
  const placed: SidePlacedItem[] = [];

  // Group items into columns by their length position
  // Each column = one item.length wide, items stack by height
  type Column = { x: number; w: number; currentHeight: number };
  const columns: Column[] = [];

  for (const item of cargoItems) {
    if (item.length <= 0 || item.height <= 0) continue;
    for (let q = 0; q < item.quantity; q++) {
      const itemW = item.length; // length maps to x-axis in side view
      const itemH = item.height;

      // Find a column where this item fits (same x-width and stackable)
      let col = columns.find(c =>
        c.w === itemW &&
        item.stackable &&
        c.currentHeight + itemH <= vH
      );

      if (!col) {
        // Start a new column
        const prevEnd = columns.length > 0
          ? Math.max(...columns.map(c => c.x + c.w))
          : 0;
        col = { x: prevEnd, w: itemW, currentHeight: 0 };
        columns.push(col);
      }

      const overflow = col.x + itemW > vL || col.currentHeight + itemH > vH;
      placed.push({
        item,
        index: q,
        x: col.x,
        y: col.currentHeight,
        w: itemW,
        h: itemH,
        overflow,
        colorIdx: itemColorMap.get(item.id) ?? 0,
      });

      col.currentHeight += itemH;
    }
  }

  return placed;
}

// Shared SVG defs component
const SvgDefs = () => (
  <defs>
    {GRADIENT_PAIRS.map((pair, i) => (
      <linearGradient key={`grad-${i}`} id={`itemGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={pair.from} stopOpacity={0.5} />
        <stop offset="100%" stopColor={pair.to} stopOpacity={0.35} />
      </linearGradient>
    ))}
    <linearGradient id="overflowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
    </linearGradient>
    <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="shadowFilter" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
    </filter>
    <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feFlood floodColor="hsl(var(--destructive))" floodOpacity="0.3" />
      <feComposite in2="blur" operator="in" />
      <feComposite in="SourceGraphic" operator="over" />
    </filter>
  </defs>
);

export const CargoFitVisualization = ({ vehicle, cargoItems, onExpand }: CargoFitVisualizationProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [doors, setDoors] = useState<DoorState>({ rear: false, side: false });
  const [cargoOnly, setCargoOnly] = useState(false);
  const placed = useMemo(() => packItems(vehicle, cargoItems), [vehicle, cargoItems]);

  const itemColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const uniqueIds = [...new Set(cargoItems.map(i => i.id))];
    uniqueIds.forEach((id, i) => {
      map.set(id, i % GRADIENT_PAIRS.length);
    });
    return map;
  }, [cargoItems]);

  const sidePlaced = useMemo(
    () => packItemsSideView(vehicle, cargoItems, itemColorMap),
    [vehicle, cargoItems, itemColorMap]
  );

  if (placed.length === 0) return null;

  const vW = vehicle.widthCm;
  const vL = vehicle.lengthCm;
  const vH = vehicle.heightCm;

  // Top view calculations
  const totalVehicleArea = vW * vL;
  const totalCargoArea = placed.reduce((sum, p) => sum + p.w * p.h, 0);
  const usagePercent = Math.min(Math.round((totalCargoArea / totalVehicleArea) * 100), 100);

  const maxWidth = 280;
  const topScale = maxWidth / vW;
  const topSvgW = vW * topScale;
  const topSvgH = vL * topScale;
  const topDisplayH = Math.min(topSvgH, 320);

  // Side view calculations
  const sideMaxWidth = 280;
  const sideScale = sideMaxWidth / vL;
  const sideSvgW = vL * sideScale;
  const sideSvgH = vH * sideScale;
  const sideDisplayH = Math.min(sideSvgH, 320);

  const maxStackHeight = sidePlaced.length > 0
    ? Math.max(...sidePlaced.map(p => p.y + p.h))
    : 0;
  const heightUsagePercent = Math.min(Math.round((maxStackHeight / vH) * 100), 100);

  const overflowCount = placed.filter(p => p.overflow).length;
  const sideOverflowCount = sidePlaced.filter(p => p.overflow).length;
  const totalOverflow = overflowCount + sideOverflowCount;
  const fitsAll = totalOverflow === 0;

  const usageColor = usagePercent > 95 ? 'hsl(var(--destructive))' : usagePercent > 75 ? 'hsl(40, 90%, 50%)' : 'hsl(160, 60%, 45%)';
  const heightUsageColor = heightUsagePercent > 95 ? 'hsl(var(--destructive))' : heightUsagePercent > 75 ? 'hsl(40, 90%, 50%)' : 'hsl(160, 60%, 45%)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <motion.div
            className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
            animate={{ boxShadow: ['0 0 8px hsl(var(--primary) / 0.15)', '0 0 16px hsl(var(--primary) / 0.25)', '0 0 8px hsl(var(--primary) / 0.15)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Layers className="h-4 w-4 text-primary" />
          </motion.div>
          <div>
            <span className="text-xs font-semibold text-foreground tracking-tight">Laadruimte visualisatie</span>
            <p className="text-[10px] text-muted-foreground">{vehicle.label} — {(vL/100).toFixed(1)}×{(vW/100).toFixed(1)}×{(vH/100).toFixed(1)}m</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 2D/3D Toggle */}
          <div className="flex items-center rounded-xl bg-card/60 backdrop-blur-xl border border-border/30 p-0.5">
            <motion.button
              onClick={() => setViewMode('2d')}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200",
                viewMode === '2d'
                  ? "bg-primary/15 text-primary border border-primary/25 shadow-[0_0_8px_-2px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="h-3 w-3" />
              <span>2D</span>
            </motion.button>
            <motion.button
              onClick={() => setViewMode('3d')}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200",
                viewMode === '3d'
                  ? "bg-primary/15 text-primary border border-primary/25 shadow-[0_0_8px_-2px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Box className="h-3 w-3" />
              <span>3D</span>
            </motion.button>
          </div>

          {onExpand && (
            <motion.button
              onClick={onExpand}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl",
                "bg-card/60 backdrop-blur-xl border border-primary/20",
                "text-primary hover:border-primary/40 hover:bg-primary/10",
                "shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]",
                "hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.35)]",
                "transition-all duration-200 touch-manipulation"
              )}
            >
              <Maximize2 className="h-3 w-3" />
              <span className="text-[10px] font-semibold">Vergroot</span>
            </motion.button>
          )}

        <AnimatePresence mode="wait">
          {fitsAll ? (
            <motion.div
              key="fits"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(160,60%,45%)]/10 border border-[hsl(160,60%,45%)]/20"
            >
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <CheckCircle2 className="h-3 w-3" style={{ color: 'hsl(160, 60%, 45%)' }} />
              </motion.div>
              <span className="text-[10px] font-semibold" style={{ color: 'hsl(160, 60%, 45%)' }}>Alles past ✓</span>
            </motion.div>
          ) : (
            <motion.div
              key="overflow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, x: [0, -2, 2, -1, 1, 0] }}
              transition={{ x: { duration: 0.5, delay: 0.3 } }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20"
            >
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] font-semibold text-destructive">{totalOverflow} past niet</span>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === '3d' ? (
          <motion.div
            key="3d-view"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2"
          >
            {/* 3D Scene - compact */}
            <div className="relative rounded-2xl border border-border/30 overflow-hidden" style={{ height: 320 }}>
              <CargoFit3DScene vehicle={vehicle} cargoItems={cargoItems} doors={doors} cargoOnly={cargoOnly} />
            </div>

            {/* Door controls + cargo-only toggle */}
            <div className="flex items-center gap-1.5">
              <motion.button
                onClick={() => setCargoOnly(c => !c)}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200",
                  "backdrop-blur-xl border touch-manipulation",
                  cargoOnly
                    ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_10px_-3px_hsl(var(--primary)/0.3)]"
                    : "bg-card/60 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
                )}
              >
                <Box className="h-3 w-3" />
                <span>Laadruimte</span>
              </motion.button>

              <div className="w-px h-4 bg-border/30" />

              <motion.button
                onClick={() => setDoors(d => ({ ...d, rear: !d.rear }))}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200",
                  "backdrop-blur-xl border touch-manipulation",
                  doors.rear
                    ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_10px_-3px_hsl(var(--primary)/0.3)]"
                    : "bg-card/60 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
                )}
              >
                <DoorOpen className="h-3 w-3" />
                <span>Achterdeuren</span>
              </motion.button>
              <motion.button
                onClick={() => setDoors(d => ({ ...d, side: !d.side }))}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200",
                  "backdrop-blur-xl border touch-manipulation",
                  doors.side
                    ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_10px_-3px_hsl(var(--primary)/0.3)]"
                    : "bg-card/60 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
                )}
              >
                <DoorOpen className="h-3 w-3" />
                <span>Zijdeur</span>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="2d-view"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
      {/* Dual view container */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* ====== TOP VIEW ====== */}
        <div className="relative flex-1 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/8 to-transparent pointer-events-none" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />

          <div className="p-4 space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/40" />
              <span className="text-[10px] font-semibold text-foreground/80 tracking-wider uppercase">Bovenaanzicht</span>
              <span className="text-[9px] font-mono text-muted-foreground ml-auto">{(vW/100).toFixed(1)}m × {(vL/100).toFixed(1)}m</span>
            </div>

            <div className="flex gap-3">
              {/* Direction labels */}
              <div className="flex flex-col items-center justify-between py-2 gap-1">
                <div className="flex flex-col items-center gap-0.5">
                  <ArrowUp className="h-3 w-3 text-primary/60" />
                  <span className="text-[7px] font-mono text-primary/60 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>VOOR</span>
                </div>
                <div className="flex-1 w-px bg-gradient-to-b from-primary/30 via-border/20 to-muted-foreground/20" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-mono text-muted-foreground/50 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>ACHTER</span>
                  <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                </div>
              </div>

              <motion.div
                initial={{ rotateX: 8, opacity: 0 }}
                animate={{ rotateX: 2, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                className="flex-1"
              >
                <TooltipProvider delayDuration={0}>
                  <svg
                    width={topSvgW}
                    height={topDisplayH}
                    viewBox={`0 0 ${vW} ${vL}`}
                    className="rounded-xl border border-border/40 bg-background/60"
                    style={{ maxWidth: '100%' }}
                  >
                    <SvgDefs />

                    {/* Grid lines */}
                    {Array.from({ length: Math.floor(vW / 100) + 1 }).map((_, i) => (
                      <line key={`vg-${i}`} x1={i * 100} y1={0} x2={i * 100} y2={vL}
                        stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.2} />
                    ))}
                    {Array.from({ length: Math.floor(vL / 100) + 1 }).map((_, i) => (
                      <line key={`hg-${i}`} x1={0} y1={i * 100} x2={vW} y2={i * 100}
                        stroke="hsl(var(--border))" strokeWidth={0.5} opacity={Math.max(0.3 - (i / Math.floor(vL / 100)) * 0.15, 0.08)} />
                    ))}

                    {/* Front indicator */}
                    <line x1={0} y1={1} x2={vW} y2={1} stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.5} />

                    {/* Placed items */}
                    {placed.map((p, i) => {
                      const key = `top-${p.item.id}-${p.index}`;
                      const isHovered = hoveredId === key;
                      const colorIdx = itemColorMap.get(p.item.id) ?? 0;
                      const pair = GRADIENT_PAIRS[colorIdx];
                      const gradId = p.overflow ? 'overflowGrad' : `itemGrad-${colorIdx}`;
                      const filterId = p.overflow ? 'redGlow' : isHovered ? 'glowFilter' : 'shadowFilter';

                      return (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <motion.g
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                              onMouseEnter={() => setHoveredId(key)}
                              onMouseLeave={() => setHoveredId(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              {isHovered && !p.overflow && (
                                <rect x={p.x - 2} y={p.y - 2} width={p.w + 4} height={p.h + 4} rx={5}
                                  fill={pair.from} fillOpacity={0.12} />
                              )}
                              <rect
                                x={p.x + 1.5} y={p.y + 1.5}
                                width={Math.max(p.w - 3, 1)} height={Math.max(p.h - 3, 1)}
                                rx={4}
                                fill={`url(#${gradId})`}
                                stroke={p.overflow ? 'hsl(var(--destructive))' : pair.from}
                                strokeWidth={isHovered ? 2 : 1.2}
                                strokeOpacity={p.overflow ? 0.7 : isHovered ? 0.9 : 0.5}
                                strokeDasharray={p.overflow ? '6 3' : undefined}
                                filter={`url(#${filterId})`}
                                style={{
                                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                  transformOrigin: `${p.x + p.w / 2}px ${p.y + p.h / 2}px`,
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                              {p.w > 20 && p.h > 15 && !p.overflow && (
                                <line x1={p.x + 5} y1={p.y + 4} x2={p.x + p.w - 5} y2={p.y + 4}
                                  stroke="white" strokeWidth={0.8} opacity={0.15} strokeLinecap="round" />
                              )}
                              {p.w > 45 && p.h > 30 && (
                                <>
                                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 - 4}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={Math.min(p.w / 7, p.h / 5, 11)}
                                    fill={p.overflow ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}
                                    opacity={0.75} fontWeight={600}>
                                    {p.item.description?.slice(0, 10) || `#${i + 1}`}
                                  </text>
                                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 8}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={Math.min(p.w / 9, p.h / 6, 8)}
                                    fill="hsl(var(--muted-foreground))" opacity={0.6} fontFamily="monospace">
                                    {p.item.length}×{p.item.width}cm
                                  </text>
                                </>
                              )}
                            </motion.g>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="space-y-1.5 min-w-[160px]">
                            <p className="font-semibold text-xs">{p.item.description || `Item #${i + 1}`}</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span>Afmetingen</span>
                              <span className="font-mono text-foreground">{p.item.length}×{p.item.width}×{p.item.height}cm</span>
                              <span>Gewicht</span>
                              <span className="font-mono text-foreground">{p.item.weight}kg</span>
                              <span>Volume</span>
                              <span className="font-mono text-foreground">{((p.item.length * p.item.width * p.item.height) / 1000000).toFixed(2)}m³</span>
                            </div>
                            {p.overflow && (
                              <p className="text-destructive font-medium text-[10px] pt-1 border-t border-destructive/20">⚠ Past niet in laadruimte</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    <text x={vW / 2} y={vL - 8} textAnchor="middle" fontSize={9}
                      fill="hsl(var(--muted-foreground))" opacity={0.35} fontFamily="monospace">
                      {vehicle.label}
                    </text>
                  </svg>
                </TooltipProvider>
              </motion.div>
            </div>

            {/* Floor usage bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">Laadvloer bezetting</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: usageColor }}>{usagePercent}%</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: usageColor, boxShadow: `0 0 12px ${usageColor}40` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ====== SIDE VIEW ====== */}
        <div className="relative flex-1 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/8 to-transparent pointer-events-none" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 8, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />

          <div className="p-4 space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[hsl(280,55%,55%)] to-[hsl(280,55%,55%)]/40" />
              <span className="text-[10px] font-semibold text-foreground/80 tracking-wider uppercase">Zij-aanzicht</span>
              <span className="text-[9px] font-mono text-muted-foreground ml-auto">{(vL/100).toFixed(1)}m × {(vH/100).toFixed(1)}m</span>
            </div>

            <div className="flex gap-3">
              {/* Height labels */}
              <div className="flex flex-col items-center justify-between py-2 gap-1">
                <div className="flex flex-col items-center gap-0.5">
                  <ArrowUp className="h-3 w-3 text-[hsl(280,55%,55%)]/60" />
                  <span className="text-[7px] font-mono text-[hsl(280,55%,55%)]/60 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>PLAFOND</span>
                </div>
                <div className="flex-1 w-px bg-gradient-to-b from-[hsl(280,55%,55%)]/30 via-border/20 to-muted-foreground/20" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-mono text-muted-foreground/50 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>VLOER</span>
                  <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                </div>
              </div>

              <motion.div
                initial={{ rotateX: 8, opacity: 0 }}
                animate={{ rotateX: 2, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                className="flex-1"
              >
                <TooltipProvider delayDuration={0}>
                  <svg
                    width={sideSvgW}
                    height={sideDisplayH}
                    viewBox={`0 0 ${vL} ${vH}`}
                    className="rounded-xl border border-border/40 bg-background/60"
                    style={{ maxWidth: '100%' }}
                  >
                    <SvgDefs />

                    {/* Grid lines */}
                    {Array.from({ length: Math.floor(vL / 100) + 1 }).map((_, i) => (
                      <line key={`svg-${i}`} x1={i * 100} y1={0} x2={i * 100} y2={vH}
                        stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.2} />
                    ))}
                    {Array.from({ length: Math.floor(vH / 100) + 1 }).map((_, i) => (
                      <line key={`shg-${i}`} x1={0} y1={i * 100} x2={vL} y2={i * 100}
                        stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.15} />
                    ))}

                    {/* Floor line (bottom) */}
                    <line x1={0} y1={vH - 1} x2={vL} y2={vH - 1}
                      stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} opacity={0.4} />

                    {/* Ceiling indicator (top) */}
                    <line x1={0} y1={1} x2={vL} y2={1}
                      stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} opacity={0.2}
                      strokeDasharray="8 4" />

                    {/* Front indicator (left edge) */}
                    <line x1={1} y1={0} x2={1} y2={vH}
                      stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.5} />

                    {/* Front/Back labels */}
                    <text x={12} y={vH - 10} fontSize={8} fill="hsl(var(--primary))" opacity={0.5}
                      fontFamily="monospace" fontWeight={600}>VOOR</text>
                    <text x={vL - 12} y={vH - 10} fontSize={8} fill="hsl(var(--muted-foreground))" opacity={0.3}
                      fontFamily="monospace" textAnchor="end">ACHTER</text>

                    {/* Side-placed items */}
                    {sidePlaced.map((p, i) => {
                      const key = `side-${p.item.id}-${p.index}`;
                      const isHovered = hoveredId === key;
                      const pair = GRADIENT_PAIRS[p.colorIdx];
                      const gradId = p.overflow ? 'overflowGrad' : `itemGrad-${p.colorIdx}`;
                      const filterId = p.overflow ? 'redGlow' : isHovered ? 'glowFilter' : 'shadowFilter';
                      const svgY = vH - p.y - p.h;

                      return (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <motion.g
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06 + 0.3, type: 'spring', stiffness: 250, damping: 22 }}
                              onMouseEnter={() => setHoveredId(key)}
                              onMouseLeave={() => setHoveredId(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              {isHovered && !p.overflow && (
                                <rect x={p.x - 2} y={svgY - 2} width={p.w + 4} height={p.h + 4} rx={5}
                                  fill={pair.from} fillOpacity={0.12} />
                              )}
                              <rect
                                x={p.x + 1.5} y={svgY + 1.5}
                                width={Math.max(p.w - 3, 1)} height={Math.max(p.h - 3, 1)}
                                rx={4}
                                fill={`url(#${gradId})`}
                                stroke={p.overflow ? 'hsl(var(--destructive))' : pair.from}
                                strokeWidth={isHovered ? 2 : 1.2}
                                strokeOpacity={p.overflow ? 0.7 : isHovered ? 0.9 : 0.5}
                                strokeDasharray={p.overflow ? '6 3' : undefined}
                                filter={`url(#${filterId})`}
                                style={{
                                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                  transformOrigin: `${p.x + p.w / 2}px ${svgY + p.h / 2}px`,
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                              {p.w > 20 && p.h > 15 && !p.overflow && (
                                <line x1={p.x + 5} y1={svgY + 4} x2={p.x + p.w - 5} y2={svgY + 4}
                                  stroke="white" strokeWidth={0.8} opacity={0.15} strokeLinecap="round" />
                              )}
                              {p.w > 45 && p.h > 30 && (
                                <>
                                  <text x={p.x + p.w / 2} y={svgY + p.h / 2 - 4}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={Math.min(p.w / 7, p.h / 5, 11)}
                                    fill={p.overflow ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}
                                    opacity={0.75} fontWeight={600}>
                                    {p.item.description?.slice(0, 10) || `#${i + 1}`}
                                  </text>
                                  <text x={p.x + p.w / 2} y={svgY + p.h / 2 + 8}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={Math.min(p.w / 9, p.h / 6, 8)}
                                    fill="hsl(var(--muted-foreground))" opacity={0.6} fontFamily="monospace">
                                    {p.item.length}×{p.item.height}cm
                                  </text>
                                </>
                              )}
                            </motion.g>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="space-y-1.5 min-w-[160px]">
                            <p className="font-semibold text-xs">{p.item.description || `Item #${i + 1}`}</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span>Afmetingen</span>
                              <span className="font-mono text-foreground">{p.item.length}×{p.item.width}×{p.item.height}cm</span>
                              <span>Gewicht</span>
                              <span className="font-mono text-foreground">{p.item.weight}kg</span>
                              <span>Stapelbaar</span>
                              <span className="font-mono text-foreground">{p.item.stackable ? 'Ja' : 'Nee'}</span>
                            </div>
                            {p.overflow && (
                              <p className="text-destructive font-medium text-[10px] pt-1 border-t border-destructive/20">⚠ Past niet in laadruimte</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    <text x={vL / 2} y={14} textAnchor="middle" fontSize={9}
                      fill="hsl(var(--muted-foreground))" opacity={0.35} fontFamily="monospace">
                      {vehicle.label}
                    </text>
                  </svg>
                </TooltipProvider>
              </motion.div>
            </div>

            {/* Height usage bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">Hoogte bezetting</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: heightUsageColor }}>{heightUsagePercent}%</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${heightUsagePercent}%` }}
                  transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: heightUsageColor, boxShadow: `0 0 12px ${heightUsageColor}40` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium legend */}
      <div className="flex flex-wrap gap-1.5">
        {cargoItems.filter(i => i.length > 0 && i.width > 0).map(item => {
          const colorIdx = itemColorMap.get(item.id) ?? 0;
          const pair = GRADIENT_PAIRS[colorIdx];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/30 border border-border/30 backdrop-blur-sm"
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: `linear-gradient(135deg, ${pair.from}, ${pair.to})` }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: colorIdx * 0.3 }}
              />
              <span className="text-[9px] text-muted-foreground font-medium">{item.description || 'Item'}</span>
              <span className="text-[8px] font-mono text-muted-foreground/70 bg-muted/40 px-1 rounded">{item.quantity}×</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
