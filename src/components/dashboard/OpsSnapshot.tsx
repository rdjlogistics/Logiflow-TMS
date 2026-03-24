import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion, useSpring, useTransform } from "framer-motion";
import { Truck, UserPlus, CheckCircle2, AlertTriangle, FileX, Clock, Navigation, Timer, Hand, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Animated counter using Framer Motion spring
const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));

  React.useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

interface OpsSnapshotProps {
  chauffeurNodig: number;
  onderweg: number;
  afgeleverd: number;
  atRisk: number;
  podMissing: number;
  waitingTime: number;
  gpsOff: number;
  etaRisk: number;
  hold: number;
  loading?: boolean;
}

const OpsSnapshot = ({
  chauffeurNodig,
  onderweg,
  afgeleverd,
  atRisk,
  podMissing,
  waitingTime,
  gpsOff,
  etaRisk,
  hold,
  loading,
}: OpsSnapshotProps) => {
  const kpiTiles = [
    {
      label: "Chauffeur nodig",
      value: chauffeurNodig,
      icon: UserPlus,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/8",
      borderClass: "border-destructive/20",
      glowClass: "hover:shadow-destructive/10",
      href: "/driver/assign",
      pulse: chauffeurNodig > 0,
    },
    {
      label: "Onderweg",
      value: onderweg,
      icon: Truck,
      colorClass: "text-primary",
      bgClass: "bg-primary/8",
      borderClass: "border-primary/20",
      glowClass: "hover:shadow-primary/10",
      href: "/trips?filter=onderweg",
      pulse: false,
    },
    {
      label: "Afgeleverd",
      value: afgeleverd,
      icon: CheckCircle2,
      colorClass: "text-success",
      bgClass: "bg-success/8",
      borderClass: "border-success/20",
      glowClass: "hover:shadow-success/10",
      href: "/trips?filter=afgerond",
      pulse: false,
    },
    {
      label: "Risico",
      value: atRisk,
      icon: AlertTriangle,
      colorClass: "text-warning",
      bgClass: "bg-warning/8",
      borderClass: "border-warning/20",
      glowClass: "hover:shadow-warning/10",
      href: "/trips?filter=at-risk",
      pulse: false,
    },
  ];

  const riskChips = [
    { label: "POD ontbreekt", count: podMissing, icon: FileX, href: "/claims?filter=pod-missing" },
    { label: "Wachttijd loopt", count: waitingTime, icon: Clock, href: "/trips?filter=waiting" },
    { label: "GPS uit", count: gpsOff, icon: Navigation, href: "/trips?filter=gps-off" },
    { label: "ETA risico", count: etaRisk, icon: Timer, href: "/trips?filter=eta-risk" },
    { label: "Hold", count: hold, icon: Hand, href: "/enterprise/holds" },
  ];

  const activeRiskChips = riskChips.filter(chip => chip.count > 0);

  return (
    <div className="space-y-4">
      {/* Main KPI Grid — spatial glassmorphism cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiTiles.map((tile, index) => (
          <Link key={tile.label} to={tile.href} className="block touch-manipulation group">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200",
                "bg-card/50 cursor-pointer overflow-hidden",
                tile.borderClass,
                `hover:shadow-xl ${tile.glowClass}`,
                "hover:-translate-y-0.5",
              )}
            >
              {/* Pulse indicator */}
              {tile.pulse && tile.value > 0 && (
                <div className="absolute top-3 right-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
                  tile.bgClass
                )}>
                  <tile.icon className={cn("h-5 w-5", tile.colorClass)} />
                </div>

                {/* Label */}
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {tile.label}
                </p>

                {/* Value */}
                {loading ? (
                  <div className="h-9 w-14 bg-muted/20 rounded-lg animate-pulse" />
                ) : (
                  <p className={cn(
                    "text-3xl sm:text-4xl font-bold tabular-nums tracking-tight leading-none",
                    tile.colorClass
                  )}>
                    <AnimatedNumber value={tile.value} />
                  </p>
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Risk Chips */}
      {activeRiskChips.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {activeRiskChips.map((chip) => (
            <Link key={chip.label} to={chip.href} className="touch-manipulation">
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-2 text-xs font-semibold cursor-pointer transition-all duration-150",
                  "bg-warning/5 border-warning/25 hover:bg-warning/10 hover:border-warning/40",
                  "backdrop-blur-sm active:scale-95"
                )}
              >
                <chip.icon className="h-3.5 w-3.5 mr-2 text-warning" />
                <span className="text-foreground/80">{chip.label}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/15 text-warning font-bold text-[10px] tabular-nums">
                  {chip.count}
                </span>
              </Badge>
            </Link>
          ))}
        </motion.div>
      )}

      {/* All Clear State */}
      {activeRiskChips.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-success/5 border border-success/15"
        >
          <div className="p-2 rounded-xl bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-success">Operaties op schema</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Alle {afgeleverd > 0 ? `${afgeleverd} leveringen` : 'ritten'} zonder problemen
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-success shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold">100%</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default memo(OpsSnapshot);
