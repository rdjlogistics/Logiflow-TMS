import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, ShieldAlert, Activity, Lock } from 'lucide-react';

export const SecurityDashboardStats = () => {
  const { data: rlsStats, isError: rlsError } = useQuery({
    queryKey: ['rls-status-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rls_status');
      if (error) throw error;
      const total = data?.length ?? 0;
      const withRls = data?.filter((t: any) => t.rls_enabled).length ?? 0;
      const withoutRls = total - withRls;
      const withPolicies = data?.filter((t: any) => t.rls_enabled && t.policy_count > 0).length ?? 0;
      return { total, withRls, withoutRls, withPolicies };
    },
  });

  const { data: auditCount } = useQuery({
    queryKey: ['audit-count-24h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('financial_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);
      return count ?? 0;
    },
  });

  const { data: chatgptCount } = useQuery({
    queryKey: ['chatgpt-audit-count-24h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('chatgpt_audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);
      return count ?? 0;
    },
  });

  const stats = [
    {
      label: 'Tabellen met RLS',
      value: rlsError ? '!' : (rlsStats?.withRls ?? '—'),
      sublabel: `van ${rlsStats?.total ?? '—'} totaal`,
      icon: Shield,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Zonder RLS',
      value: rlsError ? '!' : (rlsStats?.withoutRls ?? '—'),
      sublabel: 'vereist actie',
      icon: ShieldAlert,
      color: rlsStats?.withoutRls ? 'text-destructive' : 'text-emerald-500',
      bg: rlsStats?.withoutRls ? 'bg-destructive/10' : 'bg-emerald-500/10',
    },
    {
      label: 'Audit Events (24u)',
      value: (auditCount ?? 0) + (chatgptCount ?? 0),
      sublabel: 'financieel + AI',
      icon: Activity,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Met Policies',
      value: rlsError ? '!' : (rlsStats?.withPolicies ?? '—'),
      sublabel: 'RLS + beleid actief',
      icon: Lock,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sublabel}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
