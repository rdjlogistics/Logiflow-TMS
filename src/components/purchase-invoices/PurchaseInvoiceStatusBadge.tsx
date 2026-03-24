import { Badge } from "@/components/ui/badge";
import {
  FileEdit,
  FileCheck,
  Send,
  Inbox,
  ThumbsUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

interface PurchaseInvoiceStatusBadgeProps {
  status: PurchaseInvoiceStatus;
  isOverdue?: boolean;
  dueDate?: string | null;
}

const statusConfig: Record<PurchaseInvoiceStatus, { label: string; icon: any; variant: string; className: string }> = {
  concept: {
    label: "Concept",
    icon: FileEdit,
    variant: "outline",
    className: "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-900",
  },
  definitief: {
    label: "Definitief",
    icon: FileCheck,
    variant: "outline",
    className: "border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:bg-blue-950",
  },
  verzonden: {
    label: "Verzonden",
    icon: Send,
    variant: "outline",
    className: "border-indigo-300 text-indigo-600 bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:bg-indigo-950",
  },
  ontvangen: {
    label: "Ontvangen",
    icon: Inbox,
    variant: "outline",
    className: "border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:bg-amber-950",
  },
  goedgekeurd: {
    label: "Goedgekeurd",
    icon: ThumbsUp,
    variant: "outline",
    className: "border-cyan-300 text-cyan-600 bg-cyan-50 dark:border-cyan-600 dark:text-cyan-400 dark:bg-cyan-950",
  },
  betaald: {
    label: "Betaald",
    icon: CheckCircle2,
    variant: "outline",
    className: "border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:bg-emerald-950",
  },
  betwist: {
    label: "Betwist",
    icon: AlertTriangle,
    variant: "outline",
    className: "border-red-300 text-red-600 bg-red-50 dark:border-red-600 dark:text-red-400 dark:bg-red-950",
  },
};

// Overdue status config (used when isOverdue=true and status !== betaald)
const overdueConfig = {
  label: "Verlopen",
  icon: Clock,
  variant: "outline",
  className: "border-red-400 text-red-700 bg-red-100 dark:border-red-500 dark:text-red-400 dark:bg-red-950",
};

export const PurchaseInvoiceStatusBadge = ({ status, isOverdue, dueDate }: PurchaseInvoiceStatusBadgeProps) => {
  // If overdue and not paid, show overdue badge instead
  const showOverdue = isOverdue && status !== "betaald";
  const config = showOverdue ? overdueConfig : (statusConfig[status] || statusConfig.concept);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
