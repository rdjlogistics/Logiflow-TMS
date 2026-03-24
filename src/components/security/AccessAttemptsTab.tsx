import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton, TableEmpty } from '@/components/ui/table';
import { Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface UserActivity {
  user_id: string;
  source: string;
  total_actions: number;
  last_action: string;
  last_action_type: string;
  is_suspicious: boolean;
}

export const AccessAttemptsTab = () => {
  const since = useMemo(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), []);

  const { data: aiAccess, isLoading: loadingAi } = useQuery({
    queryKey: ['access-ai', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatgpt_audit_logs')
        .select('user_id, action_type, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: portalAccess, isLoading: loadingPortal } = useQuery({
    queryKey: ['access-portal', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_portal_audit_log')
        .select('actor_user_id, action, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingAi || loadingPortal;

  const userActivities: UserActivity[] = useMemo(() => {
    const map = new Map<string, { actions: number; last: string; lastType: string; source: string }>();

    (aiAccess ?? []).forEach((r) => {
      const key = `${r.user_id}|AI`;
      const existing = map.get(key);
      if (!existing || new Date(r.created_at ?? '') > new Date(existing.last)) {
        map.set(key, {
          actions: (existing?.actions ?? 0) + 1,
          last: r.created_at ?? '',
          lastType: r.action_type,
          source: 'AI Assistent',
        });
      } else {
        existing.actions++;
      }
    });

    (portalAccess ?? []).forEach((r) => {
      if (!r.actor_user_id) return;
      const key = `${r.actor_user_id}|Portal`;
      const existing = map.get(key);
      if (!existing || new Date(r.created_at) > new Date(existing.last)) {
        map.set(key, {
          actions: (existing?.actions ?? 0) + 1,
          last: r.created_at,
          lastType: r.action,
          source: 'Klantportaal',
        });
      } else {
        existing.actions++;
      }
    });

    return Array.from(map.entries())
      .map(([key, val]) => ({
        user_id: key.split('|')[0],
        source: val.source,
        total_actions: val.actions,
        last_action: val.last,
        last_action_type: val.lastType,
        is_suspicious: val.actions > 50,
      }))
      .sort((a, b) => b.total_actions - a.total_actions);
  }, [aiAccess, portalAccess]);

  const suspiciousCount = userActivities.filter((u) => u.is_suspicious).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Toegangspogingen (24u)
        </CardTitle>
        <CardDescription>
          {userActivities.length} actieve gebruikers · {suspiciousCount > 0 ? (
            <span className="text-destructive font-medium">{suspiciousCount} verdacht patroon{suspiciousCount > 1 ? 'en' : ''}</span>
          ) : (
            <span className="text-emerald-500">Geen verdachte patronen</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table variant="premium" stickyHeader maxHeight="500px">
          <TableHeader>
            <TableRow>
              <TableHead>Gebruiker</TableHead>
              <TableHead>Bron</TableHead>
              <TableHead>Acties</TableHead>
              <TableHead>Laatste actie</TableHead>
              <TableHead>Laatste activiteit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton rows={5} columns={6} />}
            {!isLoading && userActivities.length === 0 && (
              <TableEmpty
                icon={<Users className="h-6 w-6 text-muted-foreground" />}
                title="Geen activiteit"
                description="Er zijn geen toegangspogingen in de afgelopen 24 uur"
                colSpan={6}
              />
            )}
            {userActivities.map((user, i) => (
              <motion.tr
                key={`${user.user_id}-${user.source}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border/30 hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-mono text-xs">{user.user_id.slice(0, 8)}...</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{user.source}</Badge>
                </TableCell>
                <TableCell className="font-bold">{user.total_actions}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">{user.last_action_type}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.last_action ? format(new Date(user.last_action), 'dd MMM HH:mm', { locale: nl }) : '—'}
                </TableCell>
                <TableCell>
                  {user.is_suspicious ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Verdacht
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <ShieldCheck className="h-3 w-3" />
                      Normaal
                    </Badge>
                  )}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
