import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton, TableEmpty } from '@/components/ui/table';
import { ExportButton } from '@/components/reporting/ExportButton';
import { FileText, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuditRealtimeAlerts } from '@/hooks/useAuditRealtimeAlerts';
import { useUserRole } from '@/hooks/useUserRole';

interface AuditEntry {
  id: string;
  source: string;
  action: string;
  table_name: string;
  user_id: string | null;
  created_at: string;
  details: any;
}

const DATE_RANGES: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const AuditLogTab = () => {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isAdmin } = useUserRole();
  useAuditRealtimeAlerts(isAdmin);

  const since = useMemo(() => new Date(Date.now() - (DATE_RANGES[dateRange] || DATE_RANGES['7d'])).toISOString(), [dateRange]);

  const { data: financialLogs, isLoading: loadingFinancial } = useQuery({
    queryKey: ['financial-audit-logs', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_audit_log')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        source: 'Financieel',
        action: r.action,
        table_name: r.table_name,
        user_id: r.user_id,
        created_at: r.created_at ?? '',
        details: r.details,
      }));
    },
  });

  const { data: portalLogs, isLoading: loadingPortal } = useQuery({
    queryKey: ['portal-audit-logs', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_portal_audit_log')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        source: 'Klantportaal',
        action: r.action,
        table_name: r.entity_type,
        user_id: r.actor_user_id,
        created_at: r.created_at,
        details: r.diff_json,
      }));
    },
  });

  const { data: aiLogs, isLoading: loadingAi } = useQuery({
    queryKey: ['chatgpt-audit-logs', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_audit_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        source: 'AI Assistent',
        action: r.action_type,
        table_name: r.target_entity ?? '—',
        user_id: r.user_id,
        created_at: r.created_at ?? '',
        details: r.tool_arguments,
      }));
    },
  });

  const { data: docLogs, isLoading: loadingDoc } = useQuery({
    queryKey: ['document-access-logs', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_document_access_log')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        source: 'Documenten',
        action: r.action,
        table_name: r.document_type,
        user_id: r.driver_user_id,
        created_at: r.created_at,
        details: { document_name: r.document_name, document_id: r.document_id, trip_id: r.trip_id },
      }));
    },
  });

  const isLoading = loadingFinancial || loadingPortal || loadingAi || loadingDoc;

  const allLogs = useMemo(() => {
    const merged = [...(financialLogs ?? []), ...(portalLogs ?? []), ...(aiLogs ?? []), ...(docLogs ?? [])];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  }, [financialLogs, portalLogs, aiLogs, docLogs]);

  const filtered = useMemo(() => {
    if (!search) return allLogs;
    const q = search.toLowerCase();
    return allLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.table_name.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        (l.user_id && l.user_id.toLowerCase().includes(q))
    );
  }, [allLogs, search]);

  const sourceColor = (source: string) => {
    switch (source) {
      case 'Financieel': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'Klantportaal': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'AI Assistent': return 'bg-violet-500/10 text-violet-600 border-violet-500/30';
      case 'Documenten': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Live Audit Logs
            <span className="relative flex h-3 w-3 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-normal text-muted-foreground ml-1">Live</span>
          </CardTitle>
          <CardDescription>{filtered.length} events in geselecteerde periode</CardDescription>
        </div>
        <ExportButton
          data={filtered as Record<string, unknown>[]}
          filename={`audit-logs-${format(new Date(), 'yyyy-MM-dd')}`}
          columns={[
            { key: 'created_at', label: 'Timestamp' },
            { key: 'source', label: 'Bron' },
            { key: 'action', label: 'Actie' },
            { key: 'table_name', label: 'Tabel' },
            { key: 'user_id', label: 'Gebruiker' },
          ]}
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoek op actie, tabel, bron..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-base" />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Laatste 24 uur</SelectItem>
              <SelectItem value="7d">Laatste 7 dagen</SelectItem>
              <SelectItem value="30d">Laatste 30 dagen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table variant="premium" stickyHeader maxHeight="500px">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>Bron</TableHead>
              <TableHead>Actie</TableHead>
              <TableHead>Tabel/Entity</TableHead>
              <TableHead>Gebruiker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton rows={6} columns={6} />}
            {!isLoading && filtered.length === 0 && (
              <TableEmpty
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="Geen audit logs"
                description="Er zijn geen events gevonden in deze periode"
                colSpan={6}
              />
            )}
              {filtered.slice(0, 100).map((log, i) => (
                <tr
                  key={log.id}
                  className="border-b border-border/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <TableCell className="w-8">
                    {expandedId === log.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm:ss', { locale: nl }) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={sourceColor(log.source)}>{log.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                    {log.user_id ? log.user_id.slice(0, 8) + '...' : '—'}
                  </TableCell>
                </tr>
              ))}
            {/* Expanded details rows rendered separately */}
            {filtered.slice(0, 100).map((log) =>
              expandedId === log.id && log.details ? (
                <TableRow key={`${log.id}-detail`} className="bg-muted/30">
                  <TableCell colSpan={6}>
                    <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto p-3 rounded-lg bg-background border">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              ) : null
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
