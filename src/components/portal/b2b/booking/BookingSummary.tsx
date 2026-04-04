import { 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Camera,
  PenTool,
  Bell,
  ArrowDownUp,
  Snowflake,
  Box,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookingFormData, SERVICE_LEVELS, PRIORITY_OPTIONS, VehicleCapacity, VEHICLE_CATEGORIES } from './types';
import { VehicleImage } from './VehicleImage';

interface BookingSummaryProps {
  formData: BookingFormData;
  cargoStats: {
    totalWeight: number;
    totalVolume: number;
    totalLoadingMeters: number;
    totalItems: number;
    hasFragile: boolean;
    hasHazmat: boolean;
    requiresTemp: boolean;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  activeVehicle?: VehicleCapacity;
}

/* ──── Premium Animation Variants ──── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { 
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  }
};

const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: { repeat: Infinity, duration: 3.5, ease: 'linear', repeatDelay: 1.5 }
  }
};

/* ──── Animated Number ──── */
const AnimatedNumber = ({ value, decimals = 0 }: { value: number; decimals?: number }) => {
  return <span>{value.toFixed(decimals)}</span>;
};

/* ──── Elite Capacity Bar (upgraded with card wrapper + glow + inner shine) ──── */
const CapacityBar = ({ label, value, max, unit, icon }: { label: string; value: number; max: number; unit: string; icon: React.ReactNode }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 110) : 0;
  const isOver = pct > 100;
  const isWarn = pct > 80 && !isOver;

  const getGlowColor = () => {
    if (isOver) return 'shadow-[0_0_12px_-2px_hsl(var(--destructive)/0.5)]';
    if (isWarn) return 'shadow-[0_0_12px_-2px_rgba(245,158,11,0.4)]';
    return 'shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)]';
  };

  return (
    <div
      className="space-y-1.5 p-2.5 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20 relative overflow-hidden"
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />

      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            <AnimatedNumber value={value} decimals={1} /> / {max} {unit}
          </span>
          <span
            className={cn(
              "font-bold tabular-nums min-w-[36px] text-right",
              isOver && "text-destructive",
              isWarn && "text-amber-500",
              !isOver && !isWarn && "text-emerald-500"
            )}
            key={Math.round(pct)}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </div>

      {/* Glassmorphism track */}
      <div className="relative h-3 rounded-full bg-muted/30 overflow-hidden border border-border/10">
        {/* Fill with glow shadow */}
        <div
          className={cn(
            "h-full rounded-full relative bg-gradient-to-r",
            isOver ? "from-destructive/80 to-destructive" :
            isWarn ? "from-amber-400 to-amber-500" :
            "from-emerald-400 to-emerald-500",
            getGlowColor()
          )}
        >
          {/* Inner shine overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-transparent" />
          {/* Animated shimmer on bar */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
};

/* ──── Elite Glass Section ──── */
const GlassSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div
    className="relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-2xl overflow-hidden group/section transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_40px_-15px_hsl(var(--primary)/0.2)]"
  >
    {/* Double border highlights */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
    
    {/* Animated shimmer */}
    <div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none"
    />
    
    {/* Mesh gradient overlay */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />

    <div className="relative p-3 sm:p-4 border-b border-border/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <h3 className="text-sm font-semibold flex items-center gap-3">
        {/* Icon with glow background */}
        <div 
          className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/15"
        >
          {icon}
          <div className="absolute inset-0 rounded-lg bg-primary/10 blur-lg animate-pulse opacity-50" />
        </div>
        <span className="tracking-tight">{title}</span>
      </h3>
    </div>
    <div className="relative p-3 sm:p-4">{children}</div>
  </div>
);

export const BookingSummary = ({ formData, cargoStats, validation, activeVehicle }: BookingSummaryProps) => {
  const serviceLevel = SERVICE_LEVELS.find(s => s.id === formData.serviceLevel);
  const priority = PRIORITY_OPTIONS.find(p => p.id === formData.priority);
  const category = activeVehicle ? VEHICLE_CATEGORIES.find(c => c.id === activeVehicle.category) : null;

  const stopTypeConfig = {
    pickup: { label: 'Ophalen', gradient: 'from-primary to-primary/70', icon: '📦' },
    delivery: { label: 'Afleveren', gradient: 'from-gold to-gold/70', icon: '📍' },
    hub: { label: 'Hub', gradient: 'from-purple-500 to-purple-400', icon: '🏭' },
  };

  return (
    <div 
      className="rounded-2xl border border-border/25 bg-card/50 backdrop-blur-2xl overflow-hidden relative shadow-xl"
    >
      {/* Premium multi-layer effects (matching CapacityIndicator) */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/15 via-transparent to-transparent" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[radial-gradient(circle,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
      
      {/* Animated shimmer */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent pointer-events-none"
      />

      {/* ── Premium Header ── */}
      <div className="p-3 sm:p-4 border-b border-border/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.1),transparent)] pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div 
            className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary shadow-lg shadow-primary/15"
          >
            <ClipboardCheck className="h-4 w-4" />
            <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl animate-pulse" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Boekingsoverzicht</h3>
        </div>
      </div>

      {/* ── Content ── */}
      <div 
        className="relative p-3 sm:p-4 space-y-4 sm:space-y-5"
      >
        {/* ── Validation Alerts ── */}
          {!validation.isValid && (
            <div
              className="relative p-4 rounded-2xl bg-destructive/10 border border-destructive/30 backdrop-blur-2xl overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/40 to-transparent" />
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-destructive">Er zijn nog problemen</p>
                  <ul className="mt-2 space-y-1">
                    {validation.errors.map((error, i) => (
                      <li key={i} className="text-xs text-destructive/80">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div
              className="relative p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-2xl overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-amber-600 dark:text-amber-400">Waarschuwingen</p>
                  <ul className="mt-2 space-y-1">
                    {validation.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-600/80 dark:text-amber-400/80">• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        {/* ── Selected Vehicle Hero — Elite ── */}
        {activeVehicle && (
          <div
            className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card/70 to-primary/4 backdrop-blur-2xl overflow-hidden group"
          >
            {/* Premium border highlights */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/30 via-transparent to-transparent" />
            
            {/* Animated shimmer */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
            />
            
            {/* Floating mesh gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_20%,hsl(var(--primary)/0.1),transparent)] pointer-events-none" />
            
            {/* Floating particles */}
            <div
              className="absolute top-4 right-8 w-2 h-2 rounded-full bg-primary/30 blur-[2px]"
            />
            <div
              className="absolute top-8 right-16 w-1.5 h-1.5 rounded-full bg-primary/20 blur-[1px]"
            />

            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                {/* Pulsating ring around vehicle icon */}
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-xl bg-primary/20 blur-md"
                  />
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/15 overflow-hidden">
                    <VehicleImage vehicleType={activeVehicle.type} className="w-full h-full p-1" alt={activeVehicle.label} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm tracking-tight">{activeVehicle.label}</p>
                  <p className="text-xs text-muted-foreground">{category?.label} — {activeVehicle.description}</p>
                </div>
                <div
                  className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center shadow-lg shadow-primary/10"
                >
                  <Truck className="h-4 w-4 text-primary" />
                </div>
              </div>

              {/* Specs badges with glassmorphism + glow */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { emoji: '📦', val: `${activeVehicle.maxVolumeM3} m³` },
                  { emoji: '⚖️', val: `${activeVehicle.maxPayloadKg} kg` },
                  { emoji: '📏', val: `${activeVehicle.loadingMeters} m` },
                  { emoji: '🎯', val: `${activeVehicle.palletCapacity} pallets` },
                ].map((spec) => (
                  <Badge key={spec.val} variant="secondary" className="text-[10px] font-mono bg-card/50 backdrop-blur-xl border border-border/30 shadow-sm hover:shadow-primary/10 hover:border-primary/20 transition-all duration-300">
                    {spec.emoji} {spec.val}
                  </Badge>
                ))}
                {activeVehicle.hasTailLift && (
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 backdrop-blur-xl shadow-sm shadow-emerald-500/10">
                    ⬆️ Laadklep {activeVehicle.tailLiftCapacityKg}kg
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Route Overview ── */}
        <GlassSection title={`Route (${formData.stops.length} stops)`} icon={<MapPin className="h-4 w-4 text-primary" />}>
          <div className="relative">
            {formData.stops.map((stop, index) => {
              const conf = stopTypeConfig[stop.type];
              return (
                <div
                  key={stop.id}
                  className="relative"
                >
                  {index > 0 && (
                    <div className="absolute left-4 -top-3 w-0.5 h-6 bg-gradient-to-b from-primary/40 to-gold/40 rounded-full" />
                  )}
                  <div className="flex items-start gap-3 py-2 group">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-gradient-to-br text-white shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:shadow-primary/20 group-hover:scale-105",
                      conf.gradient
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{conf.icon} {conf.label}</Badge>
                        {stop.loadItems.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {stop.loadItems.reduce((s, i) => s + i.quantity, 0)} items laden
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{stop.company || 'Geen bedrijfsnaam'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {stop.street ? `${stop.street} ${stop.houseNumber}, ` : ''}{stop.postcode} {stop.city}
                      </p>
                      {stop.date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(stop.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {stop.timeWindowFrom && ` ${stop.timeWindowFrom} - ${stop.timeWindowTo}`}
                        </p>
                      )}
                    </div>
                  </div>
                  {index < formData.stops.length - 1 && (
                    <div className="ml-4 py-0.5">
                      <ArrowDownUp className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassSection>

        {/* ── Cargo & Capacity ── */}
        <GlassSection title="Lading & Capaciteit" icon={<Package className="h-4 w-4 text-primary" />}>
          <div className="space-y-4">
            <div className="space-y-3">
              <CapacityBar label="Volume" value={cargoStats.totalVolume} max={activeVehicle?.maxVolumeM3 || 90} unit="m³" icon={<Box className="h-3.5 w-3.5" />} />
              <CapacityBar label="Gewicht" value={cargoStats.totalWeight} max={activeVehicle?.maxPayloadKg || 24000} unit="kg" icon={<Package className="h-3.5 w-3.5" />} />
              <CapacityBar label="Laadmeters" value={cargoStats.totalLoadingMeters} max={activeVehicle?.loadingMeters || 13.6} unit="m" icon={<Truck className="h-3.5 w-3.5" />} />
            </div>

            {/* Crystal Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-border/30">
              {[
                { value: cargoStats.totalItems, label: 'Items', decimals: 0 },
                { value: cargoStats.totalWeight, label: 'kg', decimals: 0 },
                { value: cargoStats.totalVolume, label: 'm³', decimals: 2 },
              ].map((stat) => (
                <div 
                  key={stat.label} 
                  className="relative p-3 rounded-xl bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl border border-border/30 text-center overflow-hidden group/stat cursor-default transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.25)] hover:scale-[1.03]"
                >
                  {/* Top highlight on hover */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300" />
                  {/* Mesh gradient */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300" />
                  <div className="text-lg font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    <AnimatedNumber value={stat.value} decimals={stat.decimals} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
              <div 
                className="relative p-3 rounded-xl bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl border border-border/30 text-center overflow-hidden group/stat cursor-default transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.25)] hover:scale-[1.03]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300" />
                <div className="flex justify-center gap-1.5 text-base">
                  {cargoStats.hasFragile && <span title="Breekbaar">⚠️</span>}
                  {cargoStats.hasHazmat && <span title="Gevaarlijke stoffen">☢️</span>}
                  {cargoStats.requiresTemp && <Snowflake className="h-4 w-4 text-blue-400" />}
                  {!cargoStats.hasFragile && !cargoStats.hasHazmat && !cargoStats.requiresTemp && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">Status</div>
              </div>
            </div>
          </div>
        </GlassSection>

        {/* ── Service & Options ── */}
        <GlassSection title="Service & Opties" icon={<Truck className="h-4 w-4 text-primary" />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Service niveau</span>
              <Badge variant="outline" className="font-medium">
                <Zap className="h-3 w-3 mr-1" />{serviceLevel?.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prioriteit</span>
              <Badge variant="outline" className={cn("font-medium", priority?.color)}>
                {priority?.label}
              </Badge>
            </div>
            <div className="pt-2 border-t border-border/30 flex flex-wrap gap-2">
              {formData.requiresSignature && (
                <Badge variant="secondary" className="text-xs"><PenTool className="h-3 w-3 mr-1" /> Handtekening</Badge>
              )}
              {formData.requiresPhoto && (
                <Badge variant="secondary" className="text-xs"><Camera className="h-3 w-3 mr-1" /> Foto bewijs</Badge>
              )}
              {formData.trackingNotifications && (
                <Badge variant="secondary" className="text-xs"><Bell className="h-3 w-3 mr-1" /> Notificaties</Badge>
              )}
              {formData.insurance && (
                <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" /> Verzekerd €{formData.insuranceValue || 0}</Badge>
              )}
            </div>
          </div>
        </GlassSection>

        {/* ── References ── */}
        {(formData.customerReference || formData.poNumber || formData.costCenter || formData.projectCode) && (
          <GlassSection title="Referenties" icon={<FileText className="h-4 w-4 text-primary" />}>
            <div className="grid grid-cols-2 gap-3">
              {formData.customerReference && (
                <div><p className="text-[10px] text-muted-foreground">Referentie</p><p className="text-sm font-medium">{formData.customerReference}</p></div>
              )}
              {formData.poNumber && (
                <div><p className="text-[10px] text-muted-foreground">PO Nummer</p><p className="text-sm font-medium">{formData.poNumber}</p></div>
              )}
              {formData.costCenter && (
                <div><p className="text-[10px] text-muted-foreground">Kostenplaats</p><p className="text-sm font-medium">{formData.costCenter}</p></div>
              )}
              {formData.projectCode && (
                <div><p className="text-[10px] text-muted-foreground">Projectcode</p><p className="text-sm font-medium">{formData.projectCode}</p></div>
              )}
            </div>
          </GlassSection>
        )}

        {/* ── Ready to Submit Banner — Elite ── */}
          {validation.isValid && (
            <div
              className="relative p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 backdrop-blur-2xl flex items-center gap-3 overflow-hidden group"
            >
              {/* Premium border highlights */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-emerald-400/30 via-transparent to-transparent" />
              
              {/* Enhanced shimmer sweep */}
              <div
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent skew-x-12 pointer-events-none"
              />
              
              {/* Mesh gradient */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_50%,hsl(152_65%_45%/0.08),transparent)] pointer-events-none" />
              
              {/* Pulsating glow ring icon */}
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full bg-emerald-500/30 blur-md"
                />
                <div
                  className="relative"
                >
                  <Sparkles className="h-6 w-6 text-emerald-500 shrink-0" />
                </div>
              </div>
              <div className="relative">
                <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">Klaar om te verzenden</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  Alle gegevens zijn compleet. Klik op "Zending aanmaken" om door te gaan.
                </p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
