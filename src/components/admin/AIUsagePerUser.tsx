import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, DataTableColumn } from '@/components/common/DataTable';
import { Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface UserUsageRow {
  id: string;
  name: string;
  email: string;
  topModel: string;
  totalCredits: number;
  totalRequests: number;
  lastActivity: string;
  modelBreakdown: Record<string, { credits: number; requests: number }>;
}

const MODEL_SHORT: Record<string, string> = {
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
};

const shortModel = (m: string) => MODEL_SHORT[m] || m || 'Onbekend';

export default function AIUsagePerUser() {
  const [rows, setRows] = useState<UserUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from('ai_credit_transactions')
        .select('user_id, credits_used, model_used, action_type, created_at, profiles!ai_credit_transactions_user_id_fkey(full_name, email)')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      const map = new Map<string, {
        name: string; email: string;
        totalCredits: number; totalRequests: number;
        lastActivity: string;
        models: Record<string, { credits: number; requests: number }>;
      }>();

      for (const t of data) {
        const uid = t.user_id;
        const profile = t.profiles as any;
        if (!map.has(uid)) {
          map.set(uid, {
            name: profile?.full_name || 'Onbekend',
            email: profile?.email || '',
            totalCredits: 0, totalRequests: 0,
            lastActivity: t.created_at,
            models: {},
          });
        }
        const u = map.get(uid)!;
        u.totalCredits += t.credits_used;
        u.totalRequests++;
        const model = t.model_used || 'unknown';
        if (!u.models[model]) u.models[model] = { credits: 0, requests: 0 };
        u.models[model].credits += t.credits_used;
        u.models[model].requests++;
      }

      const result: UserUsageRow[] = Array.from(map.entries()).map(([uid, u]) => {
        const topModel = Object.entries(u.models).sort((a, b) => b[1].requests - a[1].requests)[0]?.[0] || 'unknown';
        return {
          id: uid,
          name: u.name,
          email: u.email,
          topModel,
          totalCredits: u.totalCredits,
          totalRequests: u.totalRequests,
          lastActivity: u.lastActivity,
          modelBreakdown: u.models,
        };
      }).sort((a, b) => b.totalCredits - a.totalCredits);

      setRows(result);
      setLoading(false);
    };
    load();
  }, []);

  const columns: DataTableColumn<UserUsageRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Gebruiker',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'topModel',
      header: 'Meest gebruikt model',
      sortable: true,
      cell: (row) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {shortModel(row.topModel)}
        </Badge>
      ),
    },
    {
      key: 'totalCredits',
      header: 'Credits',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="font-semibold tabular-nums">{row.totalCredits.toLocaleString('nl-NL')}</span>,
    },
    {
      key: 'totalRequests',
      header: 'Requests',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (row) => <span className="tabular-nums">{row.totalRequests.toLocaleString('nl-NL')}</span>,
    },
    {
      key: 'lastActivity',
      header: 'Laatste activiteit',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.lastActivity), 'd MMM HH:mm', { locale: nl })}
        </span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Gebruik per Gebruiker — 30 dagen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          columns={columns}
          searchable
          searchPlaceholder="Zoek gebruiker..."
          searchKeys={['name', 'email']}
          emptyTitle="Geen AI gebruik gevonden"
          emptyDescription="Er zijn nog geen AI requests in de laatste 30 dagen."
          pageSize={10}
          onRowClick={(row) => setExpandedUser(expandedUser === row.id ? null : row.id)}
        />

        {expandedUser && (() => {
          const user = rows.find(r => r.id === expandedUser);
          if (!user) return null;
          return (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm font-medium mb-3">Model breakdown — {user.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(user.modelBreakdown)
                  .sort((a, b) => b[1].credits - a[1].credits)
                  .map(([model, data]) => (
                    <div key={model} className="flex items-center justify-between p-2.5 rounded-md bg-card border border-border/30">
                      <span className="text-xs font-medium">{shortModel(model)}</span>
                      <div className="text-right">
                        <span className="text-xs font-semibold tabular-nums">{data.credits}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">cr</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{data.requests}x</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
