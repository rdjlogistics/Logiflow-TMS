import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Truck, Package, Weight, AlertTriangle, CheckCircle2, Info, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleCapacity, VehicleCategory, VEHICLE_CAPACITIES, VEHICLE_CATEGORIES, CargoItem } from './types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { VehicleImage } from './VehicleImage';

interface CapacityIndicatorProps {
  cargoStats: {
    totalWeight: number;
    totalVolume: number;
    totalLoadingMeters: number;
    totalItems: number;
    hasFragile: boolean;
    hasHazmat: boolean;
    requiresTemp: boolean;
  };
  capacityUsage: {
    volumePercent: number;
    weightPercent: number;
    ldmPercent: number;
    isOverCapacity: boolean;
    limitingFactor: 'volume' | 'weight' | 'ldm';
  };
  recommendedVehicle: VehicleCapacity;
  selectedVehicle?: VehicleCapacity | null;
  onSelectVehicle?: (vehicle: VehicleCapacity) => void;
  cargoItems?: CargoItem[];
}

// --- Shimmer Animation ---
const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: { repeat: Infinity, duration: 3.5, ease: 'linear', repeatDelay: 1.5 }
  }
};

// --- Animated Number ---
const AnimatedNumber = ({ value, decimals = 0 }: { value: number; decimals?: number }) => {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  spring.set(value);
  return <motion.span>{display}</motion.span>;
};

// --- Capacity Bar (Premium) ---
const CapacityBar = ({ 
  icon, label, current, max, unit, percent 
}: { 
  icon: React.ReactNode; label: string; current: string; max: string; unit: string; percent: number;
}) => {
  const getBarGradient = (p: number) => {
    if (p > 100) return 'from-destructive/80 to-destructive';
    if (p > 80) return 'from-amber-400 to-amber-500';
    return 'from-emerald-400 to-emerald-500';
  };
  const getGlowColor = (p: number) => {
    if (p > 100) return 'shadow-[0_0_12px_-2px_hsl(var(--destructive)/0.5)]';
    if (p > 80) return 'shadow-[0_0_12px_-2px_rgba(245,158,11,0.4)]';
    return 'shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)]';
  };
  const getTextColor = (p: number) => {
    if (p > 100) return 'text-destructive';
    if (p > 80) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <motion.div 
      className="space-y-1.5 p-2.5 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20 relative overflow-hidden"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {current} / {max} {unit}
          </span>
          <motion.span 
            className={cn("font-bold tabular-nums min-w-[36px] text-right", getTextColor(percent))}
            key={Math.round(percent)}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {Math.round(percent)}%
          </motion.span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-muted/30 overflow-hidden relative border border-border/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percent)}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          className={cn(
            "h-full rounded-full relative bg-gradient-to-r",
            getBarGradient(percent),
            getGlowColor(percent)
          )}
        >
          {/* Inner shine */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-transparent" />
          {/* Animated shimmer on bar */}
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

// --- Vehicle Card (Elite Class) ---
const VehicleCard = ({ 
  vehicle, isActive, isRecommended, onSelect, index 
}: { 
  vehicle: VehicleCapacity; isActive: boolean; isRecommended: boolean; 
  onSelect: () => void; index: number;
}) => (
  <motion.button
    layout
    initial={{ opacity: 0, y: 12, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.97 }}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.97 }}
    onClick={onSelect}
    className={cn(
      "p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden backdrop-blur-sm touch-manipulation",
      isActive
        ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-card/80 ring-2 ring-primary/25 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.35)]"
        : "border-border/30 bg-card/40 hover:border-primary/30 hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.2)]"
    )}
  >
    {/* Top highlight */}
    <div className={cn(
      "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
      isActive ? "via-primary/40" : "via-foreground/5"
    )} />
    
    {/* Mesh gradient for active */}
    {isActive && (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_-10%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
    )}

    <div className="flex items-center gap-2 relative">
      <div className="w-10 h-7 rounded-md overflow-hidden bg-muted/20 shrink-0">
        <VehicleImage vehicleType={vehicle.type} className="w-full h-full" alt={vehicle.label} />
      </div>
      <span className="text-xs font-semibold truncate">{vehicle.label}</span>
      {isRecommended && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-bold text-primary whitespace-nowrap shrink-0 backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <motion.span 
              className="absolute h-full w-full rounded-full bg-primary"
              animate={{ scale: [1, 1.8, 1], opacity: [0.75, 0, 0.75] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="relative rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          Aanbevolen
        </span>
      )}
    </div>
    <div className="flex flex-wrap gap-1 mt-2 relative">
      {[
        `${vehicle.maxVolumeM3}m³`,
        `${vehicle.maxPayloadKg}kg`,
        `${vehicle.loadingMeters}m`,
        `${vehicle.palletCapacity}pal`,
      ].map((spec) => (
        <span key={spec} className="px-1.5 py-0.5 rounded-lg bg-muted/30 backdrop-blur-sm border border-border/15 text-[9px] text-muted-foreground font-medium">
          {spec}
        </span>
      ))}
    </div>
    {vehicle.hasTailLift && (
      <div className="mt-1.5 flex items-center gap-1 relative">
        <span className="text-[9px]">🔽</span>
        <span className="text-[9px] text-muted-foreground font-medium">Klep {vehicle.tailLiftCapacityKg}kg</span>
      </div>
    )}
  </motion.button>
);

// --- Category Accordion (Premium) ---
const CategoryAccordion = ({
  category, vehicles, activeVehicleId, recommendedVehicleId, isDefaultOpen, onSelectVehicle,
}: {
  category: typeof VEHICLE_CATEGORIES[number];
  vehicles: VehicleCapacity[];
  activeVehicleId: string;
  recommendedVehicleId: string;
  isDefaultOpen: boolean;
  onSelectVehicle: (v: VehicleCapacity) => void;
}) => {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);
  const hasActive = vehicles.some(v => v.id === activeVehicleId);

  return (
    <motion.div 
      className="rounded-xl border border-border/25 overflow-hidden backdrop-blur-sm bg-card/30 relative"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 text-left transition-all duration-300 touch-manipulation relative",
          hasActive 
            ? "bg-gradient-to-r from-primary/8 via-primary/4 to-transparent" 
            : "hover:bg-muted/20"
        )}
      >
        <div className="flex items-center gap-2.5">
          {/* Active indicator dot */}
          {hasActive && (
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          <div className="w-8 h-5 rounded overflow-hidden bg-muted/20 shrink-0">
            <VehicleImage categoryId={category.id} className="w-full h-full" alt={category.label} />
          </div>
          <span className="text-xs font-semibold">{category.label}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-muted/30 backdrop-blur-sm border border-border/15 text-[9px] text-muted-foreground font-medium">
            {vehicles.length}
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 p-3 pt-0">
              {vehicles.map((vehicle, i) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  isActive={vehicle.id === activeVehicleId}
                  isRecommended={vehicle.id === recommendedVehicleId}
                  onSelect={() => onSelectVehicle(vehicle)}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// === MAIN COMPONENT ===
export const CapacityIndicator = ({
  cargoStats,
  capacityUsage,
  recommendedVehicle,
  selectedVehicle,
  onSelectVehicle,
  cargoItems,
}: CapacityIndicatorProps) => {
  const activeVehicle = selectedVehicle || recommendedVehicle;
  const [tailLiftOnly, setTailLiftOnly] = useState(false);
  

  const filteredByCategory = useMemo(() => {
    return VEHICLE_CATEGORIES.map(cat => ({
      category: cat,
      vehicles: VEHICLE_CAPACITIES
        .filter(v => v.category === cat.id)
        .filter(v => !tailLiftOnly || v.hasTailLift),
    })).filter(g => g.vehicles.length > 0);
  }, [tailLiftOnly]);

  return (
    <motion.div 
      className="rounded-2xl border border-border/25 bg-card/50 backdrop-blur-2xl overflow-hidden relative shadow-xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Premium multi-layer effects */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/15 via-transparent to-transparent" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[radial-gradient(circle,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
      
      {/* Animated shimmer */}
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent pointer-events-none"
      />

      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.1),transparent)] pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <h3 className="text-sm font-bold flex items-center gap-3">
            <motion.div 
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary shadow-lg shadow-primary/15"
              whileHover={{ scale: 1.05, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Truck className="h-4 w-4" />
              <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl animate-pulse" />
            </motion.div>
            Voertuigcapaciteit
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Op basis van uw lading berekenen wij automatisch het geschikte voertuig.
                  U kunt ook handmatig een voertuigtype selecteren.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {/* Active Vehicle Hero — Crystal Card */}
        <motion.div 
          className={cn(
            "flex items-center gap-3 p-3.5 rounded-xl border backdrop-blur-xl relative overflow-hidden",
            activeVehicle.id === recommendedVehicle.id
              ? "border-primary/30 bg-gradient-to-br from-primary/8 via-primary/4 to-card/80 ring-2 ring-primary/20 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.3)]"
              : "border-border/30 bg-card/40"
          )}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        >
          {/* Top highlight */}
          <div className={cn(
            "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
            activeVehicle.id === recommendedVehicle.id ? "via-primary/40" : "via-foreground/5"
          )} />
          
          {/* Mesh gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_-10%,hsl(var(--primary)/0.08),transparent)] pointer-events-none" />
          
          {/* Animated ring pulse for recommended */}
          {activeVehicle.id === recommendedVehicle.id && (
            <motion.div 
              className="absolute inset-0 rounded-xl border-2 border-primary/15 pointer-events-none"
              animate={{ 
                boxShadow: [
                  '0 0 0 0px hsl(var(--primary)/0.15)',
                  '0 0 0 6px hsl(var(--primary)/0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          
          <motion.div 
            className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-muted/20 border border-border/20 shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <VehicleImage vehicleType={activeVehicle.type} className="w-full h-full" alt={activeVehicle.label} />
          </motion.div>
          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">{activeVehicle.label}</span>
              {activeVehicle.id === recommendedVehicle.id && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm shadow-sm">
                  Aanbevolen
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeVehicle.maxVolumeM3}m³ · {activeVehicle.maxPayloadKg}kg · {activeVehicle.loadingMeters}m · {activeVehicle.palletCapacity} pallets
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {activeVehicle.hasTailLift && (
                <span className="px-2 py-0.5 rounded-lg bg-muted/30 backdrop-blur-sm border border-border/15 text-[9px] font-medium text-muted-foreground">
                  🔽 Klep {activeVehicle.tailLiftCapacityKg}kg
                </span>
              )}
            </div>
          </div>
          <AnimatePresence mode="wait">
            {capacityUsage.isOverCapacity ? (
              <motion.div 
                key="warn" 
                initial={{ scale: 0, rotate: -10 }} 
                animate={{ scale: 1, rotate: 0 }} 
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <AlertTriangle className="h-6 w-6 text-destructive shrink-0 drop-shadow-[0_0_8px_hsl(var(--destructive)/0.5)]" />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                key="ok" 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Capacity Bars */}
        <div className="space-y-2">
          <CapacityBar
            icon={<Package className="h-3.5 w-3.5" />}
            label="Volume"
            current={cargoStats.totalVolume.toFixed(2)}
            max={String(activeVehicle.maxVolumeM3)}
            unit="m³"
            percent={capacityUsage.volumePercent}
          />
          <CapacityBar
            icon={<Weight className="h-3.5 w-3.5" />}
            label="Gewicht"
            current={cargoStats.totalWeight.toFixed(0)}
            max={String(activeVehicle.maxPayloadKg)}
            unit="kg"
            percent={capacityUsage.weightPercent}
          />
          <CapacityBar
            icon={<span className="text-xs">📏</span>}
            label="Laadmeters"
            current={cargoStats.totalLoadingMeters.toFixed(2)}
            max={String(activeVehicle.loadingMeters)}
            unit="m"
            percent={capacityUsage.ldmPercent}
          />
        </div>


        {/* Tail-lift filter — Glassmorphism pill */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-card/30 backdrop-blur-sm border border-border/15 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
          <label htmlFor="taillift-filter" className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer font-medium">
            <Filter className="h-3.5 w-3.5" />
            Alleen met laadklep
          </label>
          <Switch
            id="taillift-filter"
            checked={tailLiftOnly}
            onCheckedChange={setTailLiftOnly}
            className="scale-90"
          />
        </div>

        {/* Vehicle Categories Accordion */}
        <div className="space-y-2">
          <AnimatePresence>
            {filteredByCategory.map(({ category, vehicles }) => (
              <CategoryAccordion
                key={category.id}
                category={category}
                vehicles={vehicles}
                activeVehicleId={activeVehicle.id}
                recommendedVehicleId={recommendedVehicle.id}
                isDefaultOpen={vehicles.some(v => v.id === recommendedVehicle.id)}
                onSelectVehicle={(v) => onSelectVehicle?.(v)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Cargo Summary — Premium Stat Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-border/20">
          {[
            { value: cargoStats.totalItems, label: 'Items', decimals: 0 },
            { value: cargoStats.totalVolume, label: 'm³', decimals: 1 },
            { value: cargoStats.totalWeight, label: 'kg', decimals: 0 },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label} 
              className="p-3 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20 text-center relative overflow-hidden group"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="absolute top-0 right-0 w-10 h-10 bg-[radial-gradient(circle,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />
              <div className="text-lg font-bold text-foreground group-hover:drop-shadow-[0_0_6px_hsl(var(--primary)/0.3)] transition-all duration-300">
                <AnimatedNumber value={stat.value} decimals={stat.decimals} />
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
          <motion.div 
            className="p-3 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20 text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <TooltipProvider>
              <div className="flex justify-center gap-1.5">
                {cargoStats.hasFragile && (
                  <Tooltip>
                    <TooltipTrigger><span>⚠️</span></TooltipTrigger>
                    <TooltipContent><p className="text-xs">Breekbare lading</p></TooltipContent>
                  </Tooltip>
                )}
                {cargoStats.hasHazmat && (
                  <Tooltip>
                    <TooltipTrigger><span>☢️</span></TooltipTrigger>
                    <TooltipContent><p className="text-xs">ADR gevaarlijke stoffen</p></TooltipContent>
                  </Tooltip>
                )}
                {cargoStats.requiresTemp && (
                  <Tooltip>
                    <TooltipTrigger><span>❄️</span></TooltipTrigger>
                    <TooltipContent><p className="text-xs">Temperatuurgecontroleerd</p></TooltipContent>
                  </Tooltip>
                )}
                {!cargoStats.hasFragile && !cargoStats.hasHazmat && !cargoStats.requiresTemp && (
                  <span className="text-emerald-500 text-lg drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">✓</span>
                )}
              </div>
            </TooltipProvider>
            <div className="text-[10px] text-muted-foreground font-medium">Status</div>
          </motion.div>
        </div>

        {/* Over Capacity Warning — Premium Alert */}
        {capacityUsage.isOverCapacity && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="p-3.5 rounded-xl bg-destructive/8 backdrop-blur-xl border border-destructive/25 flex items-start gap-3 relative overflow-hidden shadow-[0_0_30px_-10px_hsl(var(--destructive)/0.2)]"
          >
            {/* Red mesh gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_-10%,hsl(var(--destructive)/0.1),transparent)] pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/40 to-transparent" />
            
            {/* Animated pulse border */}
            <motion.div 
              className="absolute inset-0 rounded-xl border border-destructive/20 pointer-events-none"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 4 }}
            >
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5 drop-shadow-[0_0_6px_hsl(var(--destructive)/0.5)]" />
            </motion.div>
            <div className="relative">
              <p className="text-xs font-bold text-destructive">Capaciteit overschreden</p>
              <p className="text-[10px] text-destructive/80 mt-0.5">
                De lading past niet in het geselecteerde voertuig. Kies een groter voertuig of verdeel de lading.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
