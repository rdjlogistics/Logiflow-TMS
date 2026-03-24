import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton, TableEmpty } from '@/components/ui/table';
import { History, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface AuditLogEntry {
  id: string;
  carrier_id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  changes: Record<string, any>;
  created_at: string;
  user_name?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INSERT: { label: 'Aangemaakt', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  UPDATE: { label: 'Gewijzigd', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  SOFT_DELETE: { label: 'Verwijderd', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  RESTORE: { label: 'Hersteld', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  DELETE: { label: 'Definitief verwijderd', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

const FIELD_LABELS: Record<string, string> = {
  company_name: 'Bedrijfsnaam',
  contact_name: 'Contactpersoon',
  email: 'E-mail',
  phone: 'Telefoon',
  address: 'Adres',
  postal_code: 'Postcode',
  city: 'Plaats',
  country: 'Land',
  vat_number: 'BTW-nummer',
  iban: 'IBAN',
  bic: 'BIC',
  is_active: 'Actief',
  rating: 'Beoordeling',
  notes: 'Notities',
  payment_terms_days: 'Betalingstermijn',
  payment_method: 'Betaalwijze',
  credit_limit: 'Kredietlimiet',
  vehicle_types: 'Voertuigtypes',
  permits: 'Vergunningen',
  vat_liable_eu: 'BTW-plichtig EU',
  vat_liable_non_eu: 'BTW-plichtig buiten EU',
  deleted_at: 'Verwijderd op',
};

export const CarrierAuditLogTab = ({ carrierId }: { carrierId: string }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['carrier-audit-log', carrierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrier_audit_log')
        .select('*')
        .eq('carrier_id', carrierId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      // Fetch user names for all unique user_ids
      const userIds = [...new Set((data ?? []).map(d => d.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name || 'Onbekend']));
      }

      return (data ?? []).map(entry => ({
        ...entry,
        changes: (entry.changes as Record<string, any>) || {},
        user_name: entry.user_id ? (profileMap[entry.user_id] || entry.user_id.slice(0, 8) + '...') : 'Systeem',
      })) as AuditLogEntry[];
    },
  });

  const renderChangeSummary = (entry: AuditLogEntry) => {
    if (entry.action === 'INSERT') return 'Charter aangemaakt';
    if (entry.action === 'SOFT_DELETE') return 'Naar prullenbak verplaatst';
    if (entry.action === 'RESTORE') return 'Uit prullenbak hersteld';
    if (entry.action === 'DELETE') return 'Definitief verwijderd';
    
    // UPDATE: list changed field names
    const fields = Object.keys(entry.changes)
      .map(k => FIELD_LABELS[k] || k)
      .join(', ');
    return fields || 'Gewijzigd';
  };

  const renderChangesDetail = (entry: AuditLogEntry) => {
    if (entry.action === 'INSERT' && entry.changes.new_values) {
      return (
        <div className="space-y-1">
          {Object.entries(entry.changes.new_values).map(([key, val]) => {
            if (key === 'id' || key === 'tenant_id') return null;
            return (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-muted-foreground min-w-[140px]">{FIELD_LABELS[key] || key}:</span>
                <span className="font-mono">{JSON.stringify(val)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (entry.action === 'DELETE' && entry.changes.old_values) {
      return (
        <pre className="text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto p-3 rounded-lg bg-background border">
          {JSON.stringify(entry.changes.old_values, null, 2)}
        </pre>
      );
    }

    // UPDATE diff
    return (
      <div className="space-y-1">
        {Object.entries(entry.changes).map(([key, val]: [string, any]) => (
          <div key={key} className="flex gap-2 text-xs items-start">
            <span className="text-muted-foreground min-w-[140px] shrink-0">{FIELD_LABELS[key] || key}:</span>
            {val?.old !== undefined ? (
              <div className="flex gap-1 flex-wrap">
                <span className="line-through text-destructive/70 font-mono">{JSON.stringify(val.old)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary font-mono">{JSON.stringify(val.new)}</span>
              </div>
            ) : (
              <span className="font-mono">{JSON.stringify(val)}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" /> Historie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table variant="premium">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Datum</TableHead>
              <TableHead>Gebruiker</TableHead>
              <TableHead>Actie</TableHead>
              <TableHead>Wijzigingen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton rows={5} columns={5} />}
            {!isLoading && (!logs || logs.length === 0) && (
              <TableEmpty
                icon={<History className="h-6 w-6 text-muted-foreground" />}
                title="Geen historie"
                description="Er zijn nog geen wijzigingen gelogd voor dit charter"
                colSpan={5}
              />
            )}
            {logs?.map(entry => {
              const actionInfo = ACTION_LABELS[entry.action] || { label: entry.action, color: '' };
              const isExpanded = expandedId === entry.id;
              return (
                <TableRow
                  key={entry.id}
                  isClickable
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <TableCell className="w-8">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                  </TableCell>
                  <TableCell className="text-sm">{entry.user_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={actionInfo.color}>{actionInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {renderChangeSummary(entry)}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Expanded detail rows */}
            {logs?.map(entry =>
              expandedId === entry.id ? (
                <TableRow key={`${entry.id}-detail`} className="bg-muted/30">
                  <TableCell colSpan={5} className="py-3">
                    {renderChangesDetail(entry)}
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
