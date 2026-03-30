import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAICredits } from '@/hooks/useAICredits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Sparkles, TrendingUp, Users, Zap, Crown, Loader2 } from 'lucide-react';
import AIUsagePerUser from '@/components/admin/AIUsagePerUser';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DailyUsage {
  date: string;
  total_credits: number;
  total_requests: number;
  unique_users: number;
}

interface TopUser {
  user_id: string;
  full_name: string;
  total_credits: number;
  total_requests: number;
}

interface TopAction {
  action_type: string;
  total_credits: number;
  count: number;
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['500 credits/maand', 'Basis AI chat', 'Order zoeken', 'KPI rapporten'],
  pro: ['2.000 credits/maand', 'Alle AI tools', 'Smart Order Entry', 'Margin Analyse', 'Cashflow Forecast', 'Auto-Dispatch'],
  enterprise: ['Onbeperkt credits', 'Alle Pro features', 'Prioriteit support', 'Custom integraties', 'Dedicated model access'],
};

export default function AIUsage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, creditsPercent, isLoading: subLoading } = useAICredits();
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [topActions, setTopActions] = useState<TopAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadUsageData();
  }, [user]);

  const loadUsageData = async () => {
    setIsLoading(true);
    try {
      // Load daily rollup for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: daily } = await supabase
        .from('ai_usage_daily_rollup')
        .select('date, total_credits, total_requests, unique_users')
        .gte('date', thirtyDaysAgo)
        .order('date');

      setDailyUsage(daily || []);

      // Load top actions from credit transactions
      const { data: transactions } = await supabase
        .from('ai_credit_transactions')
        .select('action_type, credits_used')
        .gte('created_at', thirtyDaysAgo);

      if (transactions) {
        const actionMap: Record<string, { credits: number; count: number }> = {};
        for (const t of transactions) {
          if (!actionMap[t.action_type]) actionMap[t.action_type] = { credits: 0, count: 0 };
          actionMap[t.action_type].credits += t.credits_used;
          actionMap[t.action_type].count++;
        }
        const sorted = Object.entries(actionMap)
          .map(([action_type, data]) => ({ action_type, total_credits: data.credits, count: data.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopActions(sorted);
      }
    } catch (err) {
      console.error('Error loading usage data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const actionLabel = (type: string) => {
    const labels: Record<string, string> = {
      chat: 'Chat', chat_with_tools: 'Chat + Tools', search_orders: 'Orders zoeken',
      get_kpis: 'KPI rapport', margin_analysis: 'Marge analyse', cashflow_forecast: 'Cashflow',
      smart_order_entry: 'Smart Order Entry', auto_dispatch: 'Auto-Dispatch',
      generate_email: 'E-mail genereren', explain_order: 'Order uitleg',
    };
    return labels[type] || type;
  };

  const totalCreditsUsed = dailyUsage.reduce((s, d) => s + d.total_credits, 0);
  const totalRequests = dailyUsage.reduce((s, d) => s + d.total_requests, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">AI Assistent — Gebruik</h1>
                <p className="text-xs text-muted-foreground">
                  {subscription?.plan?.name || 'Starter'} Plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Credit Overview */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Credits resterend</p>
                <p className="text-3xl font-bold">
                  {subscription?.credits_remaining?.toLocaleString('nl-NL') || '0'}
                  <span className="text-lg text-muted-foreground font-normal">
                    {' '}/ {subscription?.plan?.credits_included?.toLocaleString('nl-NL') || '500'}
                  </span>
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Progress value={creditsPercent} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {creditsPercent.toFixed(0)}% beschikbaar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs">Credits gebruikt (30d)</span>
              </div>
              <p className="text-xl font-semibold">{totalCreditsUsed.toLocaleString('nl-NL')}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs">Verzoeken (30d)</span>
              </div>
              <p className="text-xl font-semibold">{totalRequests.toLocaleString('nl-NL')}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">Status</span>
              </div>
              <p className="text-xl font-semibold capitalize">{subscription?.status || 'trial'}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Crown className="w-3.5 h-3.5" />
                <span className="text-xs">Plan</span>
              </div>
              <p className="text-xl font-semibold">{subscription?.plan?.name || 'Starter'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verbruik Trend — 30 dagen</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : dailyUsage.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Nog geen gebruiksdata beschikbaar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyUsage}>
                  <defs>
                    <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="total_credits" stroke="hsl(var(--primary))" fill="url(#creditGrad)" strokeWidth={2} name="Credits" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Acties</CardTitle>
          </CardHeader>
          <CardContent>
            {topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen acties uitgevoerd</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topActions} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="action_type" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100}
                    tickFormatter={(v) => actionLabel(v)} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [`${value}x`, 'Aantal']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Per User Breakdown */}
        <AIUsagePerUser />

        {/* Plan Comparison */}
        <div>
          <h3 className="text-sm font-medium mb-3">Plan Vergelijking</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { slug: 'starter', name: 'Starter', price: '€19', credits: '500' },
              { slug: 'pro', name: 'Pro', price: '€49', credits: '2.000' },
              { slug: 'enterprise', name: 'Enterprise', price: '€149', credits: 'Onbeperkt' },
            ].map((plan) => {
              const isActive = subscription?.plan?.slug === plan.slug;
              return (
                <Card key={plan.slug} className={`border-border/50 relative ${isActive ? 'ring-2 ring-primary' : ''}`}>
                  {isActive && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Huidig plan
                    </div>
                  )}
                  <CardContent className="pt-5 pb-4">
                    <h4 className="font-semibold text-base">{plan.name}</h4>
                    <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">/maand</span></p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.credits} credits</p>
                    <ul className="mt-3 space-y-1">
                      {(PLAN_FEATURES[plan.slug] || []).map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="text-primary">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {!isActive && (
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        {plan.slug === 'enterprise' ? 'Contact opnemen' : 'Upgraden'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
