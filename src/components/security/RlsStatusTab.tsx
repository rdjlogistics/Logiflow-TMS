import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton, TableEmpty } from '@/components/ui/table';
import { Shield, ShieldAlert, ShieldCheck, Search, Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface RlsRow {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
}

export const RlsStatusTab = () => {
  const [search, setSearch] = useState('');

  const { data: tables, isLoading, isError, error } = useQuery({
    queryKey: ['rls-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rls_status');
      if (error) throw error;
      return (data as RlsRow[]) ?? [];
    },
  });

  const filtered = tables?.filter((t) =>
    t.table_name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getStatus = (row: RlsRow) => {
    if (!row.rls_enabled) return { label: 'Geen RLS', variant: 'destructive' as const, icon: ShieldAlert, color: 'text-destructive' };
    if (row.policy_count === 0) return { label: 'RLS zonder policies', variant: 'secondary' as const, icon: Shield, color: 'text-amber-500' };
    return { label: 'Beveiligd', variant: 'default' as const, icon: ShieldCheck, color: 'text-emerald-500' };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              RLS Status Monitor
            </CardTitle>
            <CardDescription>Realtime overzicht van Row Level Security per tabel</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek tabel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isError && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-medium">Fout bij laden</p>
            <p className="text-xs text-muted-foreground mt-1">
              {String(error).includes('admin') ? 'Alleen administrators hebben toegang tot RLS-gegevens.' : 'Er is een fout opgetreden bij het ophalen van de gegevens.'}
            </p>
          </div>
        )}
        {!isError && <Table variant="premium" stickyHeader maxHeight="500px">
          <TableHeader>
            <TableRow>
              <TableHead>Tabel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Policies</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton rows={8} columns={3} />}
            {!isLoading && filtered.length === 0 && (
              <TableEmpty
                icon={<Database className="h-6 w-6 text-muted-foreground" />}
                title="Geen tabellen gevonden"
                description={search ? 'Probeer een andere zoekopdracht' : 'Geen publieke tabellen beschikbaar'}
                colSpan={3}
              />
            )}
            {filtered.map((row, i) => {
              const status = getStatus(row);
              return (
                <motion.tr
                  key={row.table_name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/30 transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-sm">{row.table_name}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <status.icon className={`h-3 w-3 ${status.color}`} />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{row.policy_count}</TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>}
      </CardContent>
    </Card>
  );
};
