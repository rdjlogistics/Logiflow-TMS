import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, Info, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditWarningBannerProps {
  customerId?: string;
  creditCheck?: {
    allowed: boolean;
    reason?: string;
    warningLevel?: 'info' | 'warning' | 'error';
    creditLimit?: number;
    currentExposure?: number;
    availableCredit?: number;
  };
  className?: string;
}

export function CreditWarningBanner({ creditCheck, className }: CreditWarningBannerProps) {
  if (!creditCheck || (!creditCheck.reason && creditCheck.allowed)) {
    return null;
  }

  const getVariant = () => {
    if (!creditCheck.allowed) return 'destructive';
    if (creditCheck.warningLevel === 'warning') return 'warning';
    return 'default';
  };

  const Icon = creditCheck.warningLevel === 'error' ? ShieldAlert 
    : creditCheck.warningLevel === 'warning' ? AlertTriangle 
    : Info;

  return (
    <Alert 
      variant={getVariant() as "default" | "destructive"} 
      className={cn(
        "animate-fade-in",
        creditCheck.warningLevel === 'warning' && "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {!creditCheck.allowed ? "Kredietblokkade" : "Kredietwaarschuwing"}
        {creditCheck.creditLimit && (
          <Badge variant="outline" className="text-xs font-normal">
            <CreditCard className="h-3 w-3 mr-1" />
            Limiet: €{creditCheck.creditLimit.toLocaleString()}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>{creditCheck.reason}</p>
        {creditCheck.availableCredit !== undefined && creditCheck.availableCredit > 0 && (
          <p className="mt-1 text-sm opacity-80">
            Beschikbaar krediet: €{creditCheck.availableCredit.toLocaleString()}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
