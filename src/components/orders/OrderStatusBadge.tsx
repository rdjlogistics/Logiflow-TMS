import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Shield, 
  FileText, 
  XCircle 
} from "lucide-react";
import { ORDER_STATUS_CONFIG, OrderStatus, getEffectiveStatus } from "@/types/orderStatus";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderStatusBadgeProps {
  status: string;
  driverId?: string | null;
  carrierId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const iconMap = {
  alert: AlertTriangle,
  clock: Clock,
  truck: Truck,
  check: CheckCircle2,
  verified: Shield,
  invoice: FileText,
  cancel: XCircle,
};

const STATUS_FLOW: { key: OrderStatus; label: string }[] = [
  { key: 'aanvraag', label: 'Aanvraag' },
  { key: 'gepland', label: 'Gepland' },
  { key: 'geladen', label: 'Geladen' },
  { key: 'onderweg', label: 'Onderweg' },
  { key: 'afgeleverd', label: 'Afgeleverd' },
  { key: 'afgerond', label: 'Afgemeld' },
  { key: 'gecontroleerd', label: 'Gecontroleerd' },
  { key: 'gefactureerd', label: 'Gefactureerd' },
];

const OrderStatusBadge = ({
  status,
  driverId,
  carrierId,
  size = 'md',
  showIcon = true,
  className,
}: OrderStatusBadgeProps) => {
  const { status: effectiveStatus, needsDriver } = getEffectiveStatus(status, {
    driver_id: driverId,
    carrier_id: carrierId,
  });

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  const iconSizeClasses = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  // Build tooltip flow text
  const flowTooltip = STATUS_FLOW.map(s => 
    s.key === effectiveStatus ? `[${s.label}]` : s.label
  ).join(' → ');

  // Special case: needs driver assignment
  if (needsDriver) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="destructive" 
              className={cn("gap-1 animate-pulse", sizeClasses[size], className)}
            >
              {showIcon && <AlertTriangle className={iconSizeClasses[size]} />}
              Chauffeur nodig
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            <p>{flowTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const config = ORDER_STATUS_CONFIG[effectiveStatus] || ORDER_STATUS_CONFIG.gepland;
  const IconComponent = iconMap[config.icon];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              "gap-1 font-medium border",
              config.bgColor,
              config.color,
              config.borderColor,
              sizeClasses[size],
              className
            )}
          >
            {showIcon && <IconComponent className={iconSizeClasses[size]} />}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <p>{flowTooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OrderStatusBadge;
