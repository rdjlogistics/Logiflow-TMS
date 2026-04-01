import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Package, 
  Euro, 
  TrendingUp, 
  AlertTriangle,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickStats {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  plannedCount: number;
  enRouteCount: number;
  completedCount: number;
  unassignedCount: number;
}

interface QuickStatsHeaderProps {
  stats: QuickStats;
  onStatClick?: (filter: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

export const QuickStatsHeader = ({ stats, onStatClick }: QuickStatsHeaderProps) => {
  const statCards = [
    {
      id: "total",
      title: "Totaal Orders",
      value: stats.totalOrders,
      icon: Package,
      gradient: "from-primary/20 to-primary/10",
      iconColor: "text-primary",
      onClick: () => onStatClick?.("all"),
      badges: [
        { label: `${stats.enRouteCount} onderweg`, color: "bg-blue-500/10 text-blue-600" },
        { label: `${stats.completedCount} afgerond`, color: "bg-green-500/10 text-green-600" },
      ],
    },
    {
      id: "revenue",
      title: "Omzet",
      value: formatCurrency(stats.totalRevenue),
      icon: Euro,
      gradient: "from-accent/20 to-accent/10",
      iconColor: "text-accent",
      subtitle: "Geselecteerde periode",
    },
    {
      id: "profit",
      title: "Bruto Winst",
      value: formatCurrency(stats.totalProfit),
      valueClass: stats.totalProfit >= 0 ? "text-success" : "text-destructive",
      icon: TrendingUp,
      gradient: stats.totalProfit >= 0 ? "from-success/20 to-success/10" : "from-destructive/20 to-destructive/10",
      iconColor: stats.totalProfit >= 0 ? "text-success" : "text-destructive",
      badges: [
        { label: `Gem. marge: ${stats.avgMargin.toFixed(1)}%`, color: stats.avgMargin >= 0 ? "bg-success/10 text-success font-semibold" : "bg-destructive/10 text-destructive font-semibold" },
      ],
    },
    {
      id: "attention",
      title: "Aandacht Nodig",
      value: stats.unassignedCount,
      valueClass: stats.unassignedCount > 0 ? "text-destructive" : "text-muted-foreground",
      icon: AlertTriangle,
      gradient: "from-destructive/20 to-destructive/10",
      iconColor: "text-destructive",
      onClick: () => onStatClick?.("needs_driver"),
      subtitle: "Geen chauffeur toegewezen",
      pulse: stats.unassignedCount > 0,
    },
  ];

  return (
    <TooltipProvider>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
      >
        {statCards.map((card) => (
          <motion.div key={card.id} variants={itemVariants} className="h-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className={cn(
                    "relative overflow-hidden border-white/[0.06] dark:border-white/[0.06] bg-white/[0.04] dark:bg-white/[0.04] backdrop-blur-xl shadow-none hover:bg-white/[0.07] dark:hover:bg-white/[0.07] transition-all duration-500 group h-full",
                    card.onClick && "cursor-pointer",
                    card.pulse && "ring-1 ring-destructive/20 ring-offset-1 ring-offset-background"
                  )}
                  onClick={card.onClick}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] opacity-50" />
                  <CardContent className="relative p-3 sm:p-5 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                      <span className="text-[11px] sm:text-sm font-medium text-muted-foreground">{card.title}</span>
                      <div className={cn(
                        "p-1.5 sm:p-2 rounded-xl bg-gradient-to-br group-hover:scale-110 transition-transform duration-300",
                        card.gradient
                      )}>
                        <card.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", card.iconColor)} />
                      </div>
                    </div>
                    <div className={cn("text-lg sm:text-3xl font-bold tracking-tight", card.valueClass)}>
                      {card.value}
                    </div>
                    <div className="min-h-[24px] sm:min-h-[28px] mt-1.5 sm:mt-2 mt-auto">
                      {card.badges && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-wrap">
                          {card.badges.map((badge, i) => (
                            <span key={i} className={cn("px-1.5 sm:px-2 py-0.5 rounded-full font-medium", badge.color)}>
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {card.subtitle && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                          {card.subtitle}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{card.onClick ? "Klik om te filteren" : card.title}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </motion.div>

      {/* Status distribution bar */}
      <motion.div 
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-3 sm:mt-4"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="font-medium">Status verdeling</span>
          <span className="text-muted-foreground/60">({stats.totalOrders} totaal)</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted/50">
          {stats.totalOrders > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.plannedCount / stats.totalOrders) * 100}%` }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="bg-muted-foreground/40 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onStatClick?.("gepland")}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{stats.plannedCount} Gepland</span>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.enRouteCount / stats.totalOrders) * 100}%` }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="bg-blue-500 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onStatClick?.("onderweg")}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <Truck className="h-3 w-3" />
                    <span>{stats.enRouteCount} Onderweg</span>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.completedCount / stats.totalOrders) * 100}%` }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="bg-green-500 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onStatClick?.("afgerond")}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{stats.completedCount} Afgerond</span>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.unassignedCount / stats.totalOrders) * 100}%` }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    className="bg-destructive cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onStatClick?.("needs_driver")}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{stats.unassignedCount} Aandacht nodig</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span className="hidden sm:inline">Gepland</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="hidden sm:inline">Onderweg</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="hidden sm:inline">Afgerond</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              <span className="hidden sm:inline">Aandacht</span>
            </span>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default QuickStatsHeader;
