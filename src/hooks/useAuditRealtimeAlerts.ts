import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuditAlert {
  source: string;
  action: string;
  tableName: string;
  userId: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
}

const SENSITIVE_TABLES = ['external_api_keys', 'sso_configs', 'fuel_cards', 'accounting_integrations'];
const RATE_WINDOW_MS = 60_000;
const RATE_THRESHOLD = 5;

export const useAuditRealtimeAlerts = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const [alertCount, setAlertCount] = useState(0);
  const [lastAlert, setLastAlert] = useState<AuditAlert | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);
  const userEventsRef = useRef<Map<string, number[]>>(new Map());

  const resetNewEventCount = useCallback(() => setNewEventCount(0), []);

  const checkRateLimit = useCallback((userId: string | null): boolean => {
    if (!userId) return false;
    const now = Date.now();
    const map = userEventsRef.current;
    const timestamps = map.get(userId) ?? [];
    const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    recent.push(now);
    map.set(userId, recent);
    return recent.length > RATE_THRESHOLD;
  }, []);

  const classifyEvent = useCallback(
    (source: string, action: string, tableName: string, userId: string | null): AuditAlert | null => {
      // Rule 1: Financial DELETE
      if (source === 'financial' && action?.toUpperCase() === 'DELETE') {
        return {
          source, action, tableName, userId,
          priority: 'urgent',
          message: `⚠️ DELETE operatie op financiële tabel "${tableName}"`,
          timestamp: new Date().toISOString(),
        };
      }

      // Rule 2: Sensitive table access
      if (SENSITIVE_TABLES.some((t) => tableName?.toLowerCase().includes(t))) {
        return {
          source, action, tableName, userId,
          priority: 'high',
          message: `🔒 Toegang tot gevoelige entiteit "${tableName}"`,
          timestamp: new Date().toISOString(),
        };
      }

      // Rule 3: Rate limit
      if (checkRateLimit(userId)) {
        return {
          source, action, tableName, userId,
          priority: 'high',
          message: `🚨 Hoge frequentie activiteit van gebruiker ${userId?.slice(0, 8)}...`,
          timestamp: new Date().toISOString(),
        };
      }

      // Rule 4: Null user on financial logs
      if (source === 'financial' && !userId) {
        return {
          source, action, tableName, userId,
          priority: 'medium',
          message: `⚠️ Financiële actie zonder gebruiker-ID: "${action}"`,
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    },
    [checkRateLimit]
  );

  const handleAlert = useCallback(
    (alert: AuditAlert) => {
      setAlertCount((c) => c + 1);
      setLastAlert(alert);

      const variant = alert.priority === 'urgent' ? 'destructive' as const : 'default' as const;
      toast({
        title: alert.priority === 'urgent' ? '🚨 Verdachte activiteit' : '⚠️ Security Alert',
        description: alert.message,
        variant,
      });

      // Fire-and-forget email notification for urgent/high alerts
      if (alert.priority === 'urgent' || alert.priority === 'high') {
        supabase.functions.invoke('send-audit-alert-email', { body: alert }).catch((e) => console.warn('Audit alert email mislukt:', e));
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(`audit-realtime-alerts-${Date.now()}`);

    // Financial audit log
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'financial_audit_log' },
      (payload) => {
        const r = payload.new as any;
        queryClient.invalidateQueries({ queryKey: ['financial-audit-logs'] });
        setNewEventCount((c) => c + 1);
        const alert = classifyEvent('financial', r.action, r.table_name, r.user_id);
        if (alert) handleAlert(alert);
      }
    );

    // Customer portal audit log
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'customer_portal_audit_log' },
      (payload) => {
        const r = payload.new as any;
        queryClient.invalidateQueries({ queryKey: ['portal-audit-logs'] });
        setNewEventCount((c) => c + 1);
        const alert = classifyEvent('portal', r.action, r.entity_type, r.actor_user_id);
        if (alert) handleAlert(alert);
      }
    );

    // ChatGPT audit logs
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chatgpt_audit_logs' },
      (payload) => {
        const r = payload.new as any;
        queryClient.invalidateQueries({ queryKey: ['chatgpt-audit-logs'] });
        setNewEventCount((c) => c + 1);
        const alert = classifyEvent('ai', r.action_type, r.target_entity ?? '', r.user_id);
        if (alert) handleAlert(alert);
      }
    );

    // Document access log
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'driver_document_access_log' },
      (payload) => {
        const r = payload.new as any;
        queryClient.invalidateQueries({ queryKey: ['document-access-logs'] });
        setNewEventCount((c) => c + 1);
        const alert = classifyEvent('documents', r.action, r.document_type, r.driver_user_id);
        if (alert) handleAlert(alert);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, classifyEvent, handleAlert]);

  return { alertCount, lastAlert, newEventCount, resetNewEventCount };
};
