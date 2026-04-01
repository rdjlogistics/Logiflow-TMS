import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'delay' | 'capacity' | 'compliance' | 'finance' | 'safety' | 'opportunity';

export interface ProactiveAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  createdAt: string;
  expiresAt?: string;
  entityType: 'trip' | 'driver' | 'vehicle' | 'customer' | 'invoice';
  entityId: string;
  actionRequired: boolean;
  suggestedActions: {
    label: string;
    action: string;
    params?: Record<string, unknown>;
  }[];
  aiConfidence: number;
  dismissed: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AlertSettings {
  enableDelayAlerts: boolean;
  enableCapacityAlerts: boolean;
  enableComplianceAlerts: boolean;
  enableFinanceAlerts: boolean;
  enableSafetyAlerts: boolean;
  enableOpportunityAlerts: boolean;
  delayThresholdMinutes: number;
  capacityThresholdPercent: number;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  enableDelayAlerts: true,
  enableCapacityAlerts: true,
  enableComplianceAlerts: true,
  enableFinanceAlerts: true,
  enableSafetyAlerts: true,
  enableOpportunityAlerts: true,
  delayThresholdMinutes: 15,
  capacityThresholdPercent: 85,
  soundEnabled: true
};

export function useProactiveAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('proactive-alerts', {
        body: { action: 'fetch', settings }
      });

      if (error) throw error;

      const newAlerts = (data?.alerts || []) as ProactiveAlert[];
      
      // Check for new critical alerts
      const newCritical = newAlerts.filter(
        a => a.severity === 'critical' && 
        !alerts.find(existing => existing.id === a.id)
      );

      if (newCritical.length > 0 && settings.soundEnabled) {
        playAlertSound();
      }

      for (const alert of newCritical) {
        toast({
          title: `⚠️ ${alert.title}`,
          description: alert.description,
          variant: "destructive"
        });
      }

      setAlerts(newAlerts);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Alert fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, settings, alerts, toast]);

  const dismissAlert = useCallback(async (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, dismissed: true } : a
    ));

    try {
      await supabase.functions.invoke('proactive-alerts', {
        body: { action: 'dismiss', alertId }
      });
    } catch (err) {
      console.error('Dismiss error:', err);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string, notes?: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, resolvedAt: new Date().toISOString(), resolvedBy: user?.id } : a
    ));

    try {
      await supabase.functions.invoke('proactive-alerts', {
        body: { action: 'resolve', alertId, notes }
      });

      toast({
        title: "Alert opgelost",
        description: "De alert is gemarkeerd als opgelost"
      });
    } catch (err) {
      console.error('Resolve error:', err);
    }
  }, [user?.id, toast]);

  const executeAction = useCallback(async (alertId: string, actionName: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    const action = alert.suggestedActions.find(a => a.action === actionName);
    if (!action) return false;

    try {
      const { error } = await supabase.functions.invoke('proactive-alerts', {
        body: { action: 'execute', alertId, actionName, params: action.params }
      });

      if (error) throw error;

      toast({
        title: "Actie uitgevoerd",
        description: `${action.label} is succesvol uitgevoerd`
      });

      // Auto-resolve after action
      await resolveAlert(alertId);

      return true;
    } catch (err) {
      console.error('Action execution error:', err);
      toast({
        title: "Actie mislukt",
        description: "Kon de actie niet uitvoeren",
        variant: "destructive"
      });
      return false;
    }
  }, [alerts, resolveAlert, toast]);

  const updateSettings = useCallback((newSettings: Partial<AlertSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Computed values
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.dismissed && !a.resolvedAt);
  const warningAlerts = alerts.filter(a => a.severity === 'warning' && !a.dismissed && !a.resolvedAt);
  const infoAlerts = alerts.filter(a => a.severity === 'info' && !a.dismissed && !a.resolvedAt);
  const activeAlerts = alerts.filter(a => !a.dismissed && !a.resolvedAt);
  const actionRequiredCount = activeAlerts.filter(a => a.actionRequired).length;

  return {
    alerts,
    activeAlerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    actionRequiredCount,
    isLoading,
    lastRefresh,
    settings,
    fetchAlerts,
    dismissAlert,
    resolveAlert,
    executeAction,
    updateSettings
  };
}

function playAlertSound() {
  try {
    const audio = new Audio('/sounds/alert.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore autoplay restrictions
    });
  } catch {
    // Sound not available
  }
}
