import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Zap,
  Clock,
  MessageSquare,
  Save,
  RefreshCw,
  Brain,
  Bell,
  Users,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AutomationConfig {
  id: string;
  is_active: boolean;
  min_confidence_auto_send: number;
  min_confidence_auto_assign: number;
  double_check_enabled: boolean;
  max_drivers_per_trip: number;
  response_timeout_minutes: number;
  fallback_to_manual: boolean;
  notification_channels: string[];
  working_hours_start: string;
  working_hours_end: string;
}

const defaultConfig: AutomationConfig = {
  id: '',
  is_active: true,
  min_confidence_auto_send: 0,
  min_confidence_auto_assign: 0,
  double_check_enabled: false,
  max_drivers_per_trip: 1,
  response_timeout_minutes: 5,
  fallback_to_manual: false,
  notification_channels: ['push'],
  working_hours_start: '00:00',
  working_hours_end: '23:59',
};

export function DispatchAutomationConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AutomationConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch config
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['dispatch-automation-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_automation_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const loadedConfig: AutomationConfig = {
          id: data.id,
          is_active: data.is_active ?? false,
          min_confidence_auto_send: data.min_confidence_auto_send ?? 70,
          min_confidence_auto_assign: data.min_confidence_auto_assign ?? 90,
          double_check_enabled: data.double_check_enabled ?? true,
          max_drivers_per_trip: data.max_drivers_per_trip ?? 3,
          response_timeout_minutes: data.response_timeout_minutes ?? 30,
          fallback_to_manual: data.fallback_to_manual ?? true,
          notification_channels: data.notification_channels || defaultConfig.notification_channels,
          working_hours_start: data.working_hours_start || '07:00',
          working_hours_end: data.working_hours_end || '19:00',
        };
        setConfig(loadedConfig);
        return loadedConfig;
      }
      return defaultConfig;
    },
  });

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: AutomationConfig) => {
      const payload = {
        is_active: newConfig.is_active,
        min_confidence_auto_send: newConfig.min_confidence_auto_send,
        min_confidence_auto_assign: newConfig.min_confidence_auto_assign,
        double_check_enabled: newConfig.double_check_enabled,
        max_drivers_per_trip: newConfig.max_drivers_per_trip,
        response_timeout_minutes: newConfig.response_timeout_minutes,
        fallback_to_manual: newConfig.fallback_to_manual,
        notification_channels: newConfig.notification_channels,
        working_hours_start: newConfig.working_hours_start,
        working_hours_end: newConfig.working_hours_end,
        updated_at: new Date().toISOString(),
      };

      if (savedConfig?.id) {
        const { error } = await supabase
          .from('dispatch_automation_config')
          .update(payload)
          .eq('id', savedConfig.id);

        if (error) throw error;
      } else {
        const { data: profile } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('is_primary', true)
          .single();

        const { error } = await supabase
          .from('dispatch_automation_config')
          .insert({
            tenant_id: profile?.company_id,
            ...payload,
          } as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: '✅ Instellingen Opgeslagen',
        description: 'Automatisering configuratie is bijgewerkt',
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['dispatch-automation-config'] });
    },
    onError: (error) => {
      toast({
        title: 'Fout bij Opslaan',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
    },
  });

  const updateConfig = (updates: Partial<AutomationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Main Settings */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Automatisering Instellingen
          </CardTitle>
          <CardDescription>
            Configureer hoe de AI dispatch automatisering werkt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-semibold">AI Auto-Dispatch</Label>
                <p className="text-sm text-muted-foreground">Schakel automatische toewijzing in</p>
              </div>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => updateConfig({ is_active: checked })}
            />
          </div>

          <Separator />

          {/* Auto-Send Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Auto-Send Threshold
              </Label>
              <Badge variant="outline">{config.min_confidence_auto_send}%</Badge>
            </div>
            <Slider
              value={[config.min_confidence_auto_send]}
              onValueChange={([value]) => updateConfig({ min_confidence_auto_send: value })}
              min={50}
              max={100}
              step={5}
              disabled={!config.is_active}
            />
            <p className="text-xs text-muted-foreground">
              WhatsApp wordt automatisch verstuurd als AI confidence ≥ {config.min_confidence_auto_send}%
            </p>
          </div>

          {/* Auto-Assign Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Auto-Assign Threshold
              </Label>
              <Badge variant="outline">{config.min_confidence_auto_assign}%</Badge>
            </div>
            <Slider
              value={[config.min_confidence_auto_assign]}
              onValueChange={([value]) => updateConfig({ min_confidence_auto_assign: value })}
              min={50}
              max={100}
              step={5}
              disabled={!config.is_active}
            />
            <p className="text-xs text-muted-foreground">
              Ritten worden automatisch toegewezen als AI confidence ≥ {config.min_confidence_auto_assign}%
            </p>
          </div>

          <Separator />

          {/* Double Check */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Dubbele Bevestiging</Label>
              <p className="text-xs text-muted-foreground">Vraag chauffeur om extra bevestiging</p>
            </div>
            <Switch
              checked={config.double_check_enabled}
              onCheckedChange={(checked) => updateConfig({ double_check_enabled: checked })}
              disabled={!config.is_active}
            />
          </div>

          {/* Fallback to Manual */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Fallback naar Handmatig</Label>
              <p className="text-xs text-muted-foreground">Escaleer als automatisering faalt</p>
            </div>
            <Switch
              checked={config.fallback_to_manual}
              onCheckedChange={(checked) => updateConfig({ fallback_to_manual: checked })}
              disabled={!config.is_active}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeouts & Notifications */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Tijden & Notificaties
          </CardTitle>
          <CardDescription>
            Configureer timeouts en notificatie-instellingen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeouts & Retries */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Response Timeout
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.response_timeout_minutes}
                  onChange={(e) => updateConfig({ response_timeout_minutes: parseInt(e.target.value) || 30 })}
                  min={5}
                  max={120}
                  disabled={!config.is_active}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minuten</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Max Chauffeurs
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.max_drivers_per_trip}
                  onChange={(e) => updateConfig({ max_drivers_per_trip: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                  disabled={!config.is_active}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">per rit</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Working Hours */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Werkuren
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={config.working_hours_start}
                  onChange={(e) => updateConfig({ working_hours_start: e.target.value })}
                  disabled={!config.is_active}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Eind</Label>
                <Input
                  type="time"
                  value={config.working_hours_end}
                  onChange={(e) => updateConfig({ working_hours_end: e.target.value })}
                  disabled={!config.is_active}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              AI dispatch is alleen actief binnen deze uren
            </p>
          </div>

          <Separator />

          {/* Notification Channels */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificatie Kanalen
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {['email', 'push', 'sms', 'whatsapp'].map((channel) => (
                <Button
                  key={channel}
                  variant={config.notification_channels.includes(channel) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const channels = config.notification_channels.includes(channel)
                      ? config.notification_channels.filter(c => c !== channel)
                      : [...config.notification_channels, channel];
                    updateConfig({ notification_channels: channels });
                  }}
                  className="justify-start"
                >
                  {channel === 'email' && '📧'}
                  {channel === 'push' && '🔔'}
                  {channel === 'sms' && '💬'}
                  {channel === 'whatsapp' && '📱'}
                  <span className="ml-2 capitalize">{channel}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate(config)}
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Opslaan
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => {
                  if (savedConfig) setConfig(savedConfig);
                  setHasChanges(false);
                }}
              >
                Annuleer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}