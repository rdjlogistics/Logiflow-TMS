import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAICredits } from '@/hooks/useAICredits';
import { Progress } from '@/components/ui/progress';
import { format, subDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface DailyUsage {
  date: string;
  label: string;
  credits: number;
  requests: number;
}

const AIUsageWidget = () => {
  const { subscription, creditsPercent } = useAICredits();
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      const sevenDaysAgo = subDays(new Date(), 6).toISOString().split('T')[0];
      const { data } = await supabase
        .from('ai_usage_daily_rollup')
        .select('date, total_credits, total_requests')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true });

      const days: DailyUsage[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const match = data?.find(r => r.date === dateStr);
        days.push({
          date: dateStr,
          label: format(d, 'EEE', { locale: nl }),
          credits: match?.total_credits ?? 0,
          requests: match?.total_requests ?? 0,
        });
      }
      setDailyData(days);
      setLoading(false);
    };
    fetchUsage();
  }, []);

  const todayUsage = dailyData[dailyData.length - 1];
  const remaining = subscription?.credits_remaining ?? 0;
  const total = subscription?.plan?.credits_included ?? 500;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resterend</p>
            <p className="text-sm font-semibold">{remaining} <span className="text-muted-foreground font-normal">/ {total}</span></p>
          </div>
        </div>
        {todayUsage && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Vandaag</p>
            <p className="text-sm font-semibold">{todayUsage.credits} <span className="text-xs text-muted-foreground font-normal">cr</span></p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <Progress value={creditsPercent} className="h-1.5" />

      {/* 7-day chart */}
      <div className="h-[80px] -mx-1">
        {!loading && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="aiUsageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as DailyUsage;
                  return (
                    <div className="bg-popover border border-border rounded-md px-2.5 py-1.5 text-xs shadow-md">
                      <p className="font-medium">{d.label} — {d.credits} credits</p>
                      <p className="text-muted-foreground">{d.requests} requests</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="credits"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill="url(#aiUsageGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer link */}
      <Link
        to="/admin/ai-usage"
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors pt-1"
      >
        Volledig overzicht <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

export default AIUsageWidget;
