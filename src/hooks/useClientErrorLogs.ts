import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientErrorLog {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  component_name: string | null;
  url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ErrorSummary {
  error_message: string;
  component_name: string | null;
  count: number;
  last_seen: string;
}

export function useClientErrorLogs(limit = 50) {
  return useQuery({
    queryKey: ['client-error-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_error_logs')
        .select('id, error_message, error_stack, component_name, url, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as ClientErrorLog[];
    },
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  });
}

export function useClientErrorSummary() {
  return useQuery({
    queryKey: ['client-error-summary'],
    queryFn: async () => {
      // Fetch last 24h errors and aggregate client-side
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('client_error_logs')
        .select('error_message, component_name, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const grouped = new Map<string, ErrorSummary>();
      for (const row of data ?? []) {
        const key = `${row.error_message}::${row.component_name ?? ''}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.count++;
        } else {
          grouped.set(key, {
            error_message: row.error_message,
            component_name: row.component_name,
            count: 1,
            last_seen: row.created_at,
          });
        }
      }

      return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
    },
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  });
}
