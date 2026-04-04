import { Crown, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  compact?: boolean;
  className?: string;
}

export const PlanBadge = ({ compact = false, className }: PlanBadgeProps) => {
  const { plan, isTrialing, trialDaysLeft, status, loading } = useSubscriptionPlan();

  if (loading) return null;

  // No plan state — show CTA
  if (!plan) {
    return (
      <Link
        to="/admin/settings?tab=upgrade"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer transition-all hover:shadow-md active:scale-[0.97]",
          "text-primary bg-primary/10 border-primary/20 hover:bg-primary/15",
          className
        )}
      >
        <Sparkles className="h-3 w-3" />
        <span>Abonnement kiezen</span>
      </Link>
    );
  }

  const statusColor = {
    trial: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    active: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    past_due: "text-red-600 bg-red-500/10 border-red-500/20",
    cancelled: "text-muted-foreground bg-muted border-border",
    expired: "text-muted-foreground bg-muted border-border",
  }[status ?? "trial"];

  const linkTo = `/admin/settings?tab=abonnement`;

  if (compact) {
    return (
      <Link
        to={linkTo}
        className={cn(
          "flex items-center justify-center w-9 h-9 mx-auto rounded-xl cursor-pointer transition-all hover:shadow-lg active:scale-[0.95]",
          "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/25 hover:border-amber-500/40",
          className
        )}
        title={`${plan.name}${isTrialing && trialDaysLeft > 0 ? ` · Trial ${trialDaysLeft}d` : ''}`}
      >
        <Crown className="h-4 w-4 text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]" />
      </Link>
    );
  }

  return (
    <Link
      to={linkTo}
      className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.97]", statusColor, className)}
    >
      <Crown className="h-4 w-4 shrink-0" />
      <div className="flex flex-col text-xs leading-tight">
        <span className="font-semibold">{plan.name}</span>
        {isTrialing && trialDaysLeft > 0 ? (
          <span className="flex items-center gap-1 opacity-75">
            <Clock className="h-3 w-3" />
            Trial · {trialDaysLeft} dagen
          </span>
        ) : (
          <span className="opacity-75 capitalize">{status}</span>
        )}
      </div>
    </Link>
  );
};
