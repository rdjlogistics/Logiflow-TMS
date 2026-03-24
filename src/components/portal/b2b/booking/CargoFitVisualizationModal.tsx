import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, X, Maximize2, Package, Weight, Ruler, Box, Eye, Boxes, DoorOpen, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleCapacity, CargoItem } from './types';
import { VehicleImage } from './VehicleImage';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CargoFit3DScene } from './CargoFit3DScene';
import { getVehicleBrand, type DoorState } from './vehicles';

interface CargoFitVisualizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleCapacity;
  cargoItems: CargoItem[];
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
  x: number;
  y: number;
  w: number;
  h: number;
  overflow: boolean;
  colorIdx: number;
}

function packItems(vehicle: VehicleCapacity, cargoItems: CargoItem[]): PlacedItem[] {
  const vW = vehicle.widthCm;
  const vL = vehicle.lengthCm;
  const placed: PlacedItem[] = [];
  let x = 0, y = 0, rowHeight = 0;

  for (const item of cargoItems) {
    if (item.length <= 0 || item.width <= 0) continue;
    for (let q = 0; q < item.quantity; q++) {
      const w = item.width;
      const h = item.length;
      if (x + w > vW) { x = 0; y += rowHeight; rowHeight = 0; }
      const overflow = y + h > vL;
      placed.push({ item, index: q, x, y, w, h, overflow });
      x += w;
      rowHeight = Math.max(rowHeight, h);
    }
  }
  return placed;
}

function packItemsSideView(vehicle: VehicleCapacity, cargoItems: CargoItem[], itemColorMap: Map<string, number>): SidePlacedItem[] {
  const vL = vehicle.lengthCm;
  const vH = vehicle.heightCm;
  const placed: SidePlacedItem[] = [];
  type Column = { x: number; w: number; currentHeight: number };
  const columns: Column[] = [];

  for (const item of cargoItems) {
    if (item.length <= 0 || item.height <= 0) continue;
    for (let q = 0; q < item.quantity; q++) {
      const itemW = item.length;
      const itemH = item.height;
      let col = columns.find(c => c.w === itemW && item.stackable && c.currentHeight + itemH <= vH);
      if (!col) {
        const prevEnd = columns.length > 0 ? Math.max(...columns.map(c => c.x + c.w)) : 0;
        col = { x: prevEnd, w: itemW, currentHeight: 0 };
        columns.push(col);
      }
      const overflow = col.x + itemW > vL || col.currentHeight + itemH > vH;
      placed.push({ item, index: q, x: col.x, y: col.currentHeight, w: itemW, h: itemH, overflow, colorIdx: itemColorMap.get(item.id) ?? 0 });
      col.currentHeight += itemH;
    }
  }
  return placed;
}

const SvgDefs = () => (
  <defs>
    {GRADIENT_PAIRS.map((pair, i) => (
      <linearGradient key={`grad-${i}`} id={`modalGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={pair.from} stopOpacity={0.5} />
        <stop offset="100%" stopColor={pair.to} stopOpacity={0.35} />
      </linearGradient>
    ))}
    <linearGradient id="modalOverflowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
    </linearGradient>
    <filter id="modalGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="modalShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
    </filter>
    <filter id="modalRedGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feFlood floodColor="hsl(var(--destructive))" floodOpacity="0.3" />
      <feComposite in2="blur" operator="in" />
      <feComposite in="SourceGraphic" operator="over" />
    </filter>
  </defs>
);

// Crystal stat card
const CrystalStat = ({ icon, label, value, unit, delay }: { icon: React.ReactNode; label: string; value: string; unit: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
    whileHover={{ scale: 1.04, y: -2 }}
    className={cn(
      "relative p-4 rounded-xl overflow-hidden group cursor-default",
      "bg-card/50 backdrop-blur-xl border border-border/25",
      "hover:border-primary/30 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.25)]",
      "transition-all duration-300"
    )}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    <div className="absolute top-0 right-0 w-16 h-16 bg-[radial-gradient(circle,hsl(var(--primary)/0.08),transparent)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="flex items-center gap-2 mb-1.5">
      <div className="text-primary/70">{icon}</div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold text-foreground group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)] transition-all duration-300">{value}</span>
      <span className="text-xs text-muted-foreground font-medium">{unit}</span>
    </div>
  </motion.div>
);

export const CargoFitVisualizationModal = ({ open, onOpenChange, vehicle, cargoItems }: CargoFitVisualizationModalProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [doors, setDoors] = useState<DoorState>({ rear: false, side: false });
  const [cargoOnly, setCargoOnly] = useState(false);
  const placed = useMemo(() => packItems(vehicle, cargoItems), [vehicle, cargoItems]);
  const itemColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const uniqueIds = [...new Set(cargoItems.map(i => i.id))];
    uniqueIds.forEach((id, i) => map.set(id, i % GRADIENT_PAIRS.length));
    return map;
  }, [cargoItems]);
  const sidePlaced = useMemo(() => packItemsSideView(vehicle, cargoItems, itemColorMap), [vehicle, cargoItems, itemColorMap]);

  if (placed.length === 0) return null;

  const vW = vehicle.widthCm;
  const vL = vehicle.lengthCm;
  const vH = vehicle.heightCm;

  const totalVehicleArea = vW * vL;
  const totalCargoArea = placed.reduce((sum, p) => sum + p.w * p.h, 0);
  const usagePercent = Math.min(Math.round((totalCargoArea / totalVehicleArea) * 100), 100);

  const maxStackHeight = sidePlaced.length > 0 ? Math.max(...sidePlaced.map(p => p.y + p.h)) : 0;
  const heightUsagePercent = Math.min(Math.round((maxStackHeight / vH) * 100), 100);

  const totalWeight = cargoItems.reduce((sum, i) => sum + i.weight * i.quantity, 0);
  const totalVolume = cargoItems.reduce((sum, i) => sum + (i.length * i.width * i.height / 1000000) * i.quantity, 0);
  const totalItems = cargoItems.reduce((sum, i) => sum + i.quantity, 0);

  const overflowCount = placed.filter(p => p.overflow).length + sidePlaced.filter(p => p.overflow).length;
  const fitsAll = overflowCount === 0;

  // Large SVG scales
  const svgMaxWidth = 520;
  const topScale = svgMaxWidth / vW;
  const topSvgW = vW * topScale;
  const topSvgH = Math.min(vL * topScale, 400);

  const sideScale = svgMaxWidth / vL;
  const sideSvgW = vL * sideScale;
  const sideSvgH = Math.min(vH * sideScale, 400);

  const getUsageColor = (p: number) => p > 95 ? 'hsl(var(--destructive))' : p > 75 ? 'hsl(40, 90%, 50%)' : 'hsl(160, 60%, 45%)';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="premium" size="xl" className="max-h-[92vh] overflow-y-auto p-0" hideCloseButton>
        {/* Multi-layer premium effects */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,hsl(var(--primary)/0.1),transparent_70%)]" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[radial-gradient(circle,hsl(var(--primary)/0.06),transparent_70%)]" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            style={{ width: '40%' }}
          />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative p-6 pb-4 border-b border-border/25 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.1),transparent)] pointer-events-none" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <motion.div
                className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary shadow-lg shadow-primary/15"
                animate={{ boxShadow: ['0 0 12px hsl(var(--primary) / 0.2)', '0 0 24px hsl(var(--primary) / 0.35)', '0 0 12px hsl(var(--primary) / 0.2)'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Layers className="h-5 w-5" />
                <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl animate-pulse" />
              </motion.div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">Laadruimte Visualisatie</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-4 rounded overflow-hidden">
                      <VehicleImage vehicleType={vehicle.type} className="w-full h-full" alt={vehicle.label} />
                    </div>
                    {vehicle.label} — {(vL/100).toFixed(1)} × {(vW/100).toFixed(1)} × {(vH/100).toFixed(1)}m
                  </div>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 2D/3D Toggle */}
              <div className="flex items-center rounded-xl bg-card/60 backdrop-blur-xl border border-border/30 p-0.5">
                {(['2d', '3d'] as const).map((mode) => (
                  <motion.button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-200",
                      viewMode === mode
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {viewMode === mode && (
                      <motion.div
                        layoutId="viewToggle"
                        className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/25"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                    <span className="relative">
                      {mode === '2d' ? <Eye className="h-3 w-3" /> : <Boxes className="h-3 w-3" />}
                    </span>
                    <span className="relative">{mode.toUpperCase()}</span>
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {fitsAll ? (
                  <motion.div key="fits" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(160,60%,45%)]/10 border border-[hsl(160,60%,45%)]/25">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'hsl(160, 60%, 45%)' }} />
                    </motion.div>
                    <span className="text-xs font-semibold" style={{ color: 'hsl(160, 60%, 45%)' }}>Alles past ✓</span>
                  </motion.div>
                ) : (
                  <motion.div key="overflow" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, x: [0, -2, 2, -1, 1, 0] }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/25">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">{overflowCount} past niet</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                onClick={() => onOpenChange(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl bg-card/60 backdrop-blur-xl border border-border/30 hover:bg-muted hover:border-border/50 transition-all duration-150"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-6 space-y-6 relative">
          {/* Stats HUD */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <CrystalStat icon={<Box className="h-4 w-4" />} label="Laadvloer" value={`${usagePercent}`} unit="%" delay={0.1} />
            <CrystalStat icon={<Ruler className="h-4 w-4" />} label="Hoogte" value={`${heightUsagePercent}`} unit="%" delay={0.15} />
            <CrystalStat icon={<Weight className="h-4 w-4" />} label="Gewicht" value={`${totalWeight.toFixed(0)}`} unit="kg" delay={0.2} />
            <CrystalStat icon={<Package className="h-4 w-4" />} label="Volume" value={`${totalVolume.toFixed(2)}`} unit="m³" delay={0.25} />
          </motion.div>

          {/* View Content */}
          <AnimatePresence mode="wait">
          {viewMode === '3d' ? (
            <motion.div
              key="3d-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <CargoFit3DScene vehicle={vehicle} cargoItems={cargoItems} doors={doors} cargoOnly={cargoOnly} />

              {/* Door Controls + Cargo-Only Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 p-2 rounded-xl bg-card/50 backdrop-blur-xl border border-border/25"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCargoOnly(c => !c)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                    cargoOnly
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]"
                      : "bg-card/60 text-muted-foreground border border-border/30 hover:text-foreground hover:border-border/50"
                  )}
                >
                  <Box className="h-3.5 w-3.5" />
                  Laadruimte
                </motion.button>

                <div className="w-px h-6 bg-border/30 mx-1" />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDoors(d => ({ ...d, rear: !d.rear }))}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                    doors.rear
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]"
                      : "bg-card/60 text-muted-foreground border border-border/30 hover:text-foreground hover:border-border/50"
                  )}
                >
                  <DoorOpen className="h-3.5 w-3.5" />
                  Achterdeuren
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDoors(d => ({ ...d, side: !d.side }))}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                    doors.side
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]"
                      : "bg-card/60 text-muted-foreground border border-border/30 hover:text-foreground hover:border-border/50"
                  )}
                >
                  <DoorOpen className="h-3.5 w-3.5" style={{ transform: 'scaleX(-1)' }} />
                  Zijdeur
                </motion.button>

                <div className="w-px h-6 bg-border/30 mx-1" />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDoors({ rear: false, side: false }); setCargoOnly(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-card/60 text-muted-foreground border border-border/30 hover:text-foreground hover:border-border/50 transition-all duration-200"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </motion.button>
              </motion.div>
            </motion.div>
          ) : (
          <motion.div key="2d-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TOP VIEW */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-border/30 bg-card/40 backdrop-blur-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/8 to-transparent pointer-events-none" />
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
                animate={{ x: ['-100%', '200%'] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }} style={{ width: '50%' }} />

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                  <span className="text-xs font-semibold text-foreground/80 tracking-wider uppercase">Bovenaanzicht</span>
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">{(vW/100).toFixed(1)}m × {(vL/100).toFixed(1)}m</span>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center justify-between py-2 gap-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <ArrowUp className="h-3 w-3 text-primary/60" />
                      <span className="text-[8px] font-mono text-primary/60 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>VOOR</span>
                    </div>
                    <div className="flex-1 w-px bg-gradient-to-b from-primary/30 via-border/20 to-muted-foreground/20" />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>ACHTER</span>
                      <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                  </div>

                  <div className="flex-1 flex justify-center">
                    <TooltipProvider delayDuration={0}>
                      <svg width={topSvgW} height={topSvgH} viewBox={`0 0 ${vW} ${vL}`}
                        className="rounded-xl border border-border/40 bg-background/60" style={{ maxWidth: '100%' }}>
                        <SvgDefs />
                        {Array.from({ length: Math.floor(vW / 100) + 1 }).map((_, i) => (
                          <line key={`vg-${i}`} x1={i * 100} y1={0} x2={i * 100} y2={vL} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.2} />
                        ))}
                        {Array.from({ length: Math.floor(vL / 100) + 1 }).map((_, i) => (
                          <line key={`hg-${i}`} x1={0} y1={i * 100} x2={vW} y2={i * 100} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.15} />
                        ))}
                        <line x1={0} y1={1} x2={vW} y2={1} stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.5} />

                        {placed.map((p, i) => {
                          const key = `modal-top-${p.item.id}-${p.index}`;
                          const isHovered = hoveredId === key;
                          const colorIdx = itemColorMap.get(p.item.id) ?? 0;
                          const pair = GRADIENT_PAIRS[colorIdx];
                          const gradId = p.overflow ? 'modalOverflowGrad' : `modalGrad-${colorIdx}`;
                          const filterId = p.overflow ? 'modalRedGlow' : isHovered ? 'modalGlow' : 'modalShadow';

                          return (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <motion.g
                                  initial={{ opacity: 0, scale: 0.7 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 20 }}
                                  onMouseEnter={() => setHoveredId(key)}
                                  onMouseLeave={() => setHoveredId(null)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {isHovered && !p.overflow && (
                                    <rect x={p.x - 2} y={p.y - 2} width={p.w + 4} height={p.h + 4} rx={5} fill={pair.from} fillOpacity={0.12} />
                                  )}
                                  <rect x={p.x + 1.5} y={p.y + 1.5} width={Math.max(p.w - 3, 1)} height={Math.max(p.h - 3, 1)} rx={4}
                                    fill={`url(#${gradId})`} stroke={p.overflow ? 'hsl(var(--destructive))' : pair.from}
                                    strokeWidth={isHovered ? 2 : 1.2} strokeOpacity={p.overflow ? 0.7 : isHovered ? 0.9 : 0.5}
                                    strokeDasharray={p.overflow ? '6 3' : undefined} filter={`url(#${filterId})`}
                                    style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)', transformOrigin: `${p.x + p.w / 2}px ${p.y + p.h / 2}px`, transition: 'transform 0.2s ease' }}
                                  />
                                  {p.w > 20 && p.h > 15 && !p.overflow && (
                                    <line x1={p.x + 5} y1={p.y + 4} x2={p.x + p.w - 5} y2={p.y + 4} stroke="white" strokeWidth={0.8} opacity={0.15} strokeLinecap="round" />
                                  )}
                                  {p.w > 35 && p.h > 25 && (
                                    <>
                                      <text x={p.x + p.w / 2} y={p.y + p.h / 2 - 4} textAnchor="middle" dominantBaseline="central"
                                        fontSize={Math.min(p.w / 6, p.h / 4, 13)} fill={p.overflow ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'} opacity={0.8} fontWeight={600}>
                                        {p.item.description?.slice(0, 12) || `#${i + 1}`}
                                      </text>
                                      <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 10} textAnchor="middle" dominantBaseline="central"
                                        fontSize={Math.min(p.w / 8, p.h / 5, 10)} fill="hsl(var(--muted-foreground))" opacity={0.6} fontFamily="monospace">
                                        {p.item.length}×{p.item.width}cm
                                      </text>
                                    </>
                                  )}
                                </motion.g>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="space-y-1.5 min-w-[180px]">
                                <p className="font-semibold text-xs">{p.item.description || `Item #${i + 1}`}</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                  <span>Afmetingen</span><span className="font-mono text-foreground">{p.item.length}×{p.item.width}×{p.item.height}cm</span>
                                  <span>Gewicht</span><span className="font-mono text-foreground">{p.item.weight}kg</span>
                                  <span>Volume</span><span className="font-mono text-foreground">{((p.item.length * p.item.width * p.item.height) / 1000000).toFixed(2)}m³</span>
                                </div>
                                {p.overflow && <p className="text-destructive font-medium text-[10px] pt-1 border-t border-destructive/20">⚠ Past niet in laadruimte</p>}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        <text x={vW / 2} y={vL - 8} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))" opacity={0.35} fontFamily="monospace">{vehicle.label}</text>
                      </svg>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Floor usage bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Laadvloer bezetting</span>
                    <span className="text-xs font-mono font-bold" style={{ color: getUsageColor(usagePercent) }}>{usagePercent}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div className="absolute inset-y-0 left-0 rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${usagePercent}%` }} transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ backgroundColor: getUsageColor(usagePercent), boxShadow: `0 0 12px ${getUsageColor(usagePercent)}40` }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* SIDE VIEW */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-border/30 bg-card/40 backdrop-blur-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/8 to-transparent pointer-events-none" />
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
                animate={{ x: ['-100%', '200%'] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 8, ease: 'easeInOut' }} style={{ width: '50%' }} />

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[hsl(280,55%,55%)] to-[hsl(280,55%,55%)]/40" />
                  <span className="text-xs font-semibold text-foreground/80 tracking-wider uppercase">Zij-aanzicht</span>
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">{(vL/100).toFixed(1)}m × {(vH/100).toFixed(1)}m</span>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center justify-between py-2 gap-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <ArrowUp className="h-3 w-3 text-[hsl(280,55%,55%)]/60" />
                      <span className="text-[8px] font-mono text-[hsl(280,55%,55%)]/60 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>PLAFOND</span>
                    </div>
                    <div className="flex-1 w-px bg-gradient-to-b from-[hsl(280,55%,55%)]/30 via-border/20 to-muted-foreground/20" />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>VLOER</span>
                      <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                  </div>

                  <div className="flex-1 flex justify-center">
                    <TooltipProvider delayDuration={0}>
                      <svg width={sideSvgW} height={sideSvgH} viewBox={`0 0 ${vL} ${vH}`}
                        className="rounded-xl border border-border/40 bg-background/60" style={{ maxWidth: '100%' }}>
                        <SvgDefs />
                        {Array.from({ length: Math.floor(vL / 100) + 1 }).map((_, i) => (
                          <line key={`svg-${i}`} x1={i * 100} y1={0} x2={i * 100} y2={vH} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.2} />
                        ))}
                        {Array.from({ length: Math.floor(vH / 100) + 1 }).map((_, i) => (
                          <line key={`shg-${i}`} x1={0} y1={i * 100} x2={vL} y2={i * 100} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.15} />
                        ))}
                        <line x1={0} y1={vH - 1} x2={vL} y2={vH - 1} stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} opacity={0.4} />
                        <line x1={0} y1={1} x2={vL} y2={1} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} opacity={0.2} strokeDasharray="8 4" />
                        <line x1={1} y1={0} x2={1} y2={vH} stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.5} />
                        <text x={12} y={vH - 10} fontSize={9} fill="hsl(var(--primary))" opacity={0.5} fontFamily="monospace" fontWeight={600}>VOOR</text>
                        <text x={vL - 12} y={vH - 10} fontSize={9} fill="hsl(var(--muted-foreground))" opacity={0.3} fontFamily="monospace" textAnchor="end">ACHTER</text>

                        {sidePlaced.map((p, i) => {
                          const key = `modal-side-${p.item.id}-${p.index}`;
                          const isHovered = hoveredId === key;
                          const pair = GRADIENT_PAIRS[p.colorIdx];
                          const gradId = p.overflow ? 'modalOverflowGrad' : `modalGrad-${p.colorIdx}`;
                          const filterId = p.overflow ? 'modalRedGlow' : isHovered ? 'modalGlow' : 'modalShadow';
                          const svgY = vH - p.y - p.h;

                          return (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <motion.g
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.04 + 0.2, type: 'spring', stiffness: 250, damping: 22 }}
                                  onMouseEnter={() => setHoveredId(key)}
                                  onMouseLeave={() => setHoveredId(null)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {isHovered && !p.overflow && (
                                    <rect x={p.x - 2} y={svgY - 2} width={p.w + 4} height={p.h + 4} rx={5} fill={pair.from} fillOpacity={0.12} />
                                  )}
                                  <rect x={p.x + 1.5} y={svgY + 1.5} width={Math.max(p.w - 3, 1)} height={Math.max(p.h - 3, 1)} rx={4}
                                    fill={`url(#${gradId})`} stroke={p.overflow ? 'hsl(var(--destructive))' : pair.from}
                                    strokeWidth={isHovered ? 2 : 1.2} strokeOpacity={p.overflow ? 0.7 : isHovered ? 0.9 : 0.5}
                                    strokeDasharray={p.overflow ? '6 3' : undefined} filter={`url(#${filterId})`}
                                    style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)', transformOrigin: `${p.x + p.w / 2}px ${svgY + p.h / 2}px`, transition: 'transform 0.2s ease' }}
                                  />
                                  {p.w > 35 && p.h > 25 && (
                                    <>
                                      <text x={p.x + p.w / 2} y={svgY + p.h / 2 - 4} textAnchor="middle" dominantBaseline="central"
                                        fontSize={Math.min(p.w / 6, p.h / 4, 13)} fill={p.overflow ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'} opacity={0.8} fontWeight={600}>
                                        {p.item.description?.slice(0, 12) || `#${i + 1}`}
                                      </text>
                                      <text x={p.x + p.w / 2} y={svgY + p.h / 2 + 10} textAnchor="middle" dominantBaseline="central"
                                        fontSize={Math.min(p.w / 8, p.h / 5, 10)} fill="hsl(var(--muted-foreground))" opacity={0.6} fontFamily="monospace">
                                        {p.item.length}×{p.item.height}cm
                                      </text>
                                    </>
                                  )}
                                </motion.g>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="space-y-1.5 min-w-[180px]">
                                <p className="font-semibold text-xs">{p.item.description || `Item #${i + 1}`}</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                  <span>Afmetingen</span><span className="font-mono text-foreground">{p.item.length}×{p.item.width}×{p.item.height}cm</span>
                                  <span>Gewicht</span><span className="font-mono text-foreground">{p.item.weight}kg</span>
                                  <span>Stapelbaar</span><span className="font-mono text-foreground">{p.item.stackable ? 'Ja' : 'Nee'}</span>
                                </div>
                                {p.overflow && <p className="text-destructive font-medium text-[10px] pt-1 border-t border-destructive/20">⚠ Past niet in laadruimte</p>}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        <text x={vL / 2} y={14} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))" opacity={0.35} fontFamily="monospace">{vehicle.label}</text>
                      </svg>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Height usage bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Hoogte bezetting</span>
                    <span className="text-xs font-mono font-bold" style={{ color: getUsageColor(heightUsagePercent) }}>{heightUsagePercent}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div className="absolute inset-y-0 left-0 rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${heightUsagePercent}%` }} transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{ backgroundColor: getUsageColor(heightUsagePercent), boxShadow: `0 0 12px ${getUsageColor(heightUsagePercent)}40` }} />
                  </div>
                </div>
              </div>
            </motion.div>
           </div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl border border-border/25 bg-card/30 backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/40" />
              <span className="text-xs font-semibold text-foreground/80 tracking-wider uppercase">Lading items</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{totalItems} items totaal</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cargoItems.filter(i => i.length > 0 && i.width > 0).map(item => {
                const colorIdx = itemColorMap.get(item.id) ?? 0;
                const pair = GRADIENT_PAIRS[colorIdx];
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45 }} whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border/25 backdrop-blur-sm hover:border-primary/20 transition-all duration-200">
                    <motion.div className="w-2.5 h-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${pair.from}, ${pair.to})` }}
                      animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2.5, repeat: Infinity, delay: colorIdx * 0.3 }} />
                    <span className="text-xs text-foreground font-medium">{item.description || 'Item'}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{item.quantity}×</span>
                    <span className="text-[9px] font-mono text-muted-foreground/70">{item.length}×{item.width}×{item.height}cm</span>
                    <span className="text-[9px] font-mono text-muted-foreground/70">{item.weight}kg</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
          </motion.div>
          )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
