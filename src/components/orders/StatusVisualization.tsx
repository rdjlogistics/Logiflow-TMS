import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Clock,
  Truck,
  CheckCircle2,
  Shield,
  FileText,
  XCircle,
  AlertTriangle,
  Timer,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "offerte" | "aanvraag" | "draft" | "gepland" | "geladen" | "onderweg" | "afgeleverd" | "afgerond" | "gecontroleerd" | "gefactureerd" | "geannuleerd";

interface StatusVisualizationProps {
  status: string;
  driverId?: string | null;
  carrierId?: string | null;
  pickupTime?: string | null;
  deliveryTime?: string | null;
  etaMinutes?: number | null;
  waitTimeMinutes?: number | null;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  showEta?: boolean;
}

const statusConfig: Record<string, {
  label: string;
  icon: typeof Clock;
  color: string;
  bgColor: string;
  borderColor: string;
  progressValue: number;
}> = {
  offerte: {
    label: "Offerte",
    icon: FileText,
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    progressValue: 0,
  },
  aanvraag: {
    label: "Aanvraag",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    progressValue: 5,
  },
  draft: {
    label: "Concept",
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-muted-foreground/30",
    progressValue: 3,
  },
  gepland: {
    label: "Gepland",
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-muted-foreground/30",
    progressValue: 10,
  },
  geladen: {
    label: "Geladen",
    icon: Truck,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    progressValue: 30,
  },
  onderweg: {
    label: "Onderweg",
    icon: Truck,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    progressValue: 50,
  },
  afgeleverd: {
    label: "Afgeleverd",
    icon: MapPin,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    progressValue: 70,
  },
  afgerond: {
    label: "Afgerond",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    progressValue: 80,
  },
  gecontroleerd: {
    label: "Gecontroleerd",
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    progressValue: 90,
  },
  gefactureerd: {
    label: "Gefactureerd",
    icon: FileText,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-muted-foreground/30",
    progressValue: 100,
  },
  geannuleerd: {
    label: "Geannuleerd",
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    progressValue: 0,
  },
};

export const StatusVisualization = ({
  status,
  driverId,
  carrierId,
  pickupTime,
  deliveryTime,
  etaMinutes,
  waitTimeMinutes,
  size = "md",
  showProgress = false,
  showEta = false,
}: StatusVisualizationProps) => {
  const needsDriver = !driverId && !carrierId && ["gepland", "draft"].includes(status);
  const config = needsDriver 
    ? {
        label: "Eigen chauffeur nodig",
        icon: AlertTriangle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        progressValue: 0,
      }
    : statusConfig[status] || statusConfig.gepland;

  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      badge: "text-[10px] px-1.5 py-0.5 gap-1",
      icon: "h-3 w-3",
    },
    md: {
      badge: "text-xs px-2 py-1 gap-1.5",
      icon: "h-3.5 w-3.5",
    },
    lg: {
      badge: "text-sm px-3 py-1.5 gap-2",
      icon: "h-4 w-4",
    },
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                className="cursor-default"
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium transition-all",
                    config.bgColor,
                    config.borderColor,
                    config.color,
                    sizeClasses[size].badge,
                    needsDriver && "animate-pulse"
                  )}
                >
                  <Icon className={cn(sizeClasses[size].icon)} />
                  {config.label}
                </Badge>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <p className="font-medium">{config.label}</p>
                {pickupTime && <p>Opgehaald: {pickupTime}</p>}
                {deliveryTime && <p>Afgeleverd: {deliveryTime}</p>}
                {needsDriver && <p className="text-destructive">Geen eigen chauffeur of charter toegewezen</p>}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* ETA Badge */}
          {showEta && etaMinutes !== undefined && etaMinutes !== null && status === "onderweg" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 gap-1",
                    etaMinutes < 0 
                      ? "bg-destructive/10 border-destructive/30 text-destructive" 
                      : etaMinutes < 30 
                        ? "bg-warning/10 border-warning/30 text-warning"
                        : "bg-blue-500/10 border-blue-500/30 text-blue-600"
                  )}
                >
                  <Timer className="h-2.5 w-2.5" />
                  {etaMinutes < 0 
                    ? `${Math.abs(etaMinutes)}m te laat` 
                    : `${etaMinutes}m`
                  }
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {etaMinutes < 0 
                    ? `Geschatte vertraging: ${Math.abs(etaMinutes)} minuten` 
                    : `Geschatte aankomsttijd: ${etaMinutes} minuten`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Wait time badge */}
          {waitTimeMinutes !== undefined && waitTimeMinutes !== null && waitTimeMinutes > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 gap-1",
                    waitTimeMinutes > 60 
                      ? "bg-destructive/10 border-destructive/30 text-destructive animate-pulse" 
                      : "bg-warning/10 border-warning/30 text-warning"
                  )}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {waitTimeMinutes}m wacht
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Wachttijd: {waitTimeMinutes} minuten
                  {waitTimeMinutes > 60 && " (boven drempel)"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
          >
            <Progress 
              value={config.progressValue} 
              className="h-1.5"
            />
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Compact status timeline for order details
export const StatusTimeline = ({ currentStatus }: { currentStatus: string }) => {
  const statuses: OrderStatus[] = ["aanvraag", "gepland", "geladen", "onderweg", "afgeleverd", "afgerond", "gecontroleerd", "gefactureerd"];
  const currentIndex = statuses.indexOf(currentStatus as OrderStatus);

  return (
    <div className="flex items-center gap-1">
      {statuses.map((status, index) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <TooltipProvider key={status}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      isActive && cn(config.bgColor, "ring-2 ring-offset-2 ring-offset-background", config.borderColor.replace("border-", "ring-")),
                      isCompleted && "bg-green-500/20",
                      !isActive && !isCompleted && "bg-muted"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-3 w-3",
                        isActive && config.color,
                        isCompleted && "text-green-600",
                        !isActive && !isCompleted && "text-muted-foreground/50"
                      )} 
                    />
                  </motion.div>
                  {index < statuses.length - 1 && (
                    <div 
                      className={cn(
                        "w-4 h-0.5 mx-0.5",
                        isCompleted ? "bg-green-500" : "bg-muted"
                      )} 
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{config.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

export default StatusVisualization;
