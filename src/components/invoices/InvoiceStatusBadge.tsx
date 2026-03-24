import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  MailX,
} from "lucide-react";

interface InvoiceStatusBadgeProps {
  status: string;
  sentAt?: string | null;
  isManual?: boolean;
  isOverdue?: boolean;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; icon: typeof FileText; bgColor: string; textColor: string; borderColor: string }
> = {
  concept: {
    label: "Concept",
    icon: FileText,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted-foreground/30",
  },
  proforma: {
    label: "Proforma",
    icon: Clock,
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-300 dark:border-slate-600",
  },
  verzonden: {
    label: "Verzonden",
    icon: Send,
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  betaald: {
    label: "Betaald",
    icon: CheckCircle2,
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-700",
  },
  vervallen: {
    label: "Vervallen",
    icon: AlertTriangle,
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700",
  },
};

export function InvoiceStatusBadge({
  status,
  sentAt,
  isManual,
  isOverdue,
  className,
}: InvoiceStatusBadgeProps) {
  // If overdue, show vervallen status instead
  const effectiveStatus = isOverdue && status !== "betaald" ? "vervallen" : status;
  const config = statusConfig[effectiveStatus] || statusConfig.concept;
  const Icon = config.icon;

  // Check for "not sent" status when status is concept/proforma but not sent
  const isNotSent = !sentAt && ["concept", "proforma"].includes(status);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant="outline"
        className={cn(
          "flex items-center gap-1.5 font-medium border",
          config.bgColor,
          config.textColor,
          config.borderColor
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>

      {/* Email status indicator */}
      {isNotSent && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-700"
        >
          <MailX className="h-3 w-3" />
          <span className="text-xs">Niet verzonden</span>
        </Badge>
      )}

      {sentAt && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600"
        >
          <Mail className="h-3 w-3" />
          <span className="text-xs">
            {new Date(sentAt).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}
          </span>
        </Badge>
      )}

      {/* Manual invoice indicator */}
      {isManual && (
        <Badge
          variant="outline"
          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 italic"
        >
          Handmatig
        </Badge>
      )}
    </div>
  );
}
