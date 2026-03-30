import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CreditInfo } from '@/hooks/useChatGPT';
import { AISubscription } from '@/hooks/useAICredits';

interface CreditBadgeProps {
  creditInfo?: CreditInfo | null;
  subscription?: AISubscription | null;
  compact?: boolean;
}

export const CreditBadge = ({ creditInfo, subscription, compact }: CreditBadgeProps) => {
  const remaining = creditInfo?.remaining ?? subscription?.credits_remaining ?? 0;
  const total = subscription?.plan?.credits_included ?? 500;
  const plan = creditInfo?.plan ?? subscription?.plan?.slug ?? 'starter';
  const percent = Math.min(100, (remaining / total) * 100);

  const planLabel = 'AI Credits';
  const planColor = 'text-primary';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/20 text-xs">
        <Sparkles className={`w-3 h-3 ${planColor}`} />
        <span className="font-medium">{remaining}</span>
        <span className="text-muted-foreground">cr</span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${planColor}`}>{planLabel} Plan</span>
        <span className="text-muted-foreground">{remaining}/{total}</span>
      </div>
      <Progress value={percent} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">
        {remaining === 0 ? 'Credits op — upgrade voor meer' : `${remaining} credits resterend`}
      </p>
    </div>
  );
};
