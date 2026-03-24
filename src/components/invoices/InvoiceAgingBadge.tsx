import { cn } from "@/lib/utils";

interface InvoiceAgingBadgeProps {
  dueDate: string | null;
  status: string;
  className?: string;
}

/**
 * Shows how long an invoice is overdue: "3d", "2w", "1m+"
 * Pulsing red dot for severely overdue (>30d)
 */
export const InvoiceAgingBadge = ({ dueDate, status, className }: InvoiceAgingBadgeProps) => {
  if (status === "betaald" || !dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - due.getTime();
  if (diffMs <= 0) return null; // Not overdue

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  let severity: "low" | "medium" | "high";

  if (diffDays <= 7) {
    label = `${diffDays}d`;
    severity = "low";
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    label = `${weeks}w`;
    severity = "medium";
  } else {
    const months = Math.floor(diffDays / 30);
    label = `${months}m+`;
    severity = "high";
  }

  const severityStyles = {
    low: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    medium: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
    high: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border tabular-nums",
        severityStyles[severity],
        className
      )}
    >
      {severity === "high" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
        </span>
      )}
      {label} verlopen
    </span>
  );
};
