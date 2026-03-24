import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Zap, Euro, Save, RefreshCw, Star, TrendingUp, Ban, AlertTriangle } from 'lucide-react';

type CompensationType = 'fixed' | 'hourly' | 'per_trip' | 'per_km';

interface PlanningSettingsData {
  id: string;
  enable_auto_approve: boolean;
  auto_approve_min_score: number;
  enable_surge_pricing: boolean;
  surge_hours_threshold: number;
  surge_bonus_percentage: number;
  early_cancel_hours: number;
  early_cancel_penalty: number;
  no_show_penalty: number;
  default_compensation_type: CompensationType;
  default_show_compensation: boolean;
  require_approval_above_amount: number | null;
  require_approval_for_negative_margin: boolean;
}

export function PlanningSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PlanningSettingsData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: fetchedSettings, isLoading } = useQuery({
    queryKey: ['planning-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlanningSettingsData | null;
    },
  });

  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    } else if (!isLoading) {
      setSettings({
        id: '',
        enable_auto_approve: false,
        auto_approve_min_score: 80,
        enable_surge_pricing: false,
        surge_hours_threshold: 24,
        surge_bonus_percentage: 15,
        early_cancel_hours: 24,
        early_cancel_penalty: 25,
        no_show_penalty: 50,
        default_compensation_type: 'fixed',
        default_show_compensation: true,
        require_approval_above_amount: null,
        require_approval_for_negative_margin: true,
      });
    }
  }, [fetchedSettings, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (data: Omit<PlanningSettingsData, 'id'>) => {
      if (settings?.id) {
        const { error } = await supabase.from('planning_settings').update(data).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('planning_settings').insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-settings'] });
      toast({ title: 'Instellingen opgeslagen', description: 'De planning instellingen zijn bijgewerkt.' });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({ title: 'Fout bij opslaan', description: error.message, variant: 'destructive' });
    },
  });

  const updateSetting = <K extends keyof PlanningSettingsData>(key: K, value: PlanningSettingsData[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!settings) return;
    const { id, ...data } = settings;
    saveMutation.mutate(data);
  };

  const handleReset = () => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
      setHasChanges(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {hasChanges && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
                <span className="font-medium text-sm md:text-base">Onopgeslagen wijzigingen</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleReset} className="flex-1 sm:flex-none">Annuleren</Button>
                <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 sm:flex-none">
                  {saveMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Opslaan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Approve */}
      <Card variant="glass">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Automatische Goedkeuring</CardTitle>
              <CardDescription className="text-xs md:text-sm">Keur aanmeldingen automatisch goed</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-sm">Auto-approve inschakelen</Label>
              <p className="text-xs md:text-sm text-muted-foreground">Chauffeurs met hoge scores automatisch goedkeuren</p>
            </div>
            <Switch checked={settings.enable_auto_approve} onCheckedChange={(checked) => updateSetting('enable_auto_approve', checked)} />
          </div>
          {settings.enable_auto_approve && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-sm">Minimale score</Label>
                <div className="flex items-center gap-3 md:gap-4">
                  <Input type="number" min={0} max={100} value={settings.auto_approve_min_score} onChange={(e) => updateSetting('auto_approve_min_score', parseInt(e.target.value) || 0)} className="w-20 md:w-24 h-9" />
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${settings.auto_approve_min_score}%` }} />
                    </div>
                  </div>
                  <Star className="h-5 w-5 text-amber-500 shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground">Score van {settings.auto_approve_min_score}+ wordt automatisch goedgekeurd</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Surge Pricing */}
      <Card variant="glass">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Surge Pricing</CardTitle>
              <CardDescription className="text-xs md:text-sm">Bonus voor last-minute ritten</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-sm">Surge pricing inschakelen</Label>
              <p className="text-xs md:text-sm text-muted-foreground">Automatisch bonus toevoegen</p>
            </div>
            <Switch checked={settings.enable_surge_pricing} onCheckedChange={(checked) => updateSetting('enable_surge_pricing', checked)} />
          </div>
          {settings.enable_surge_pricing && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Threshold (uren)</Label>
                  <Input type="number" min={1} max={168} value={settings.surge_hours_threshold} onChange={(e) => updateSetting('surge_hours_threshold', parseInt(e.target.value) || 24)} className="h-9" />
                  <p className="text-xs text-muted-foreground hidden md:block">Binnen {settings.surge_hours_threshold}u</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Bonus (%)</Label>
                  <Input type="number" min={0} max={100} value={settings.surge_bonus_percentage} onChange={(e) => updateSetting('surge_bonus_percentage', parseInt(e.target.value) || 0)} className="h-9" />
                  <p className="text-xs text-muted-foreground hidden md:block">+{settings.surge_bonus_percentage}% extra</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card variant="glass">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Ban className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Annuleringsbeleid</CardTitle>
              <CardDescription className="text-xs md:text-sm">Strafpunten voor annuleringen</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Threshold (uren)</Label>
              <Input type="number" min={1} max={168} value={settings.early_cancel_hours} onChange={(e) => updateSetting('early_cancel_hours', parseInt(e.target.value) || 24)} className="h-9" />
              <p className="text-xs text-muted-foreground">Binnen {settings.early_cancel_hours}u</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Annulering penalty</Label>
              <div className="relative">
                <Input type="number" min={0} max={100} value={settings.early_cancel_penalty} onChange={(e) => updateSetting('early_cancel_penalty', parseInt(e.target.value) || 0)} className="h-9 pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">punten</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">No-show penalty</Label>
              <div className="relative">
                <Input type="number" min={0} max={100} value={settings.no_show_penalty} onChange={(e) => updateSetting('no_show_penalty', parseInt(e.target.value) || 0)} className="h-9 pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">punten</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Compensation */}
      <Card variant="glass">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Euro className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg">Standaard Vergoeding</CardTitle>
              <CardDescription className="text-xs md:text-sm">Instellingen voor nieuwe shifts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm">Vergoedingstype</Label>
              <Select value={settings.default_compensation_type} onValueChange={(value) => updateSetting('default_compensation_type', value as CompensationType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Vast bedrag</SelectItem>
                  <SelectItem value="hourly">Per uur</SelectItem>
                  <SelectItem value="per_trip">Per rit</SelectItem>
                  <SelectItem value="per_km">Per kilometer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm">Toon vergoeding</Label>
                <p className="text-xs text-muted-foreground">Zichtbaar bij nieuwe shifts</p>
              </div>
              <Switch checked={settings.default_show_compensation} onCheckedChange={(checked) => updateSetting('default_show_compensation', checked)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Goedkeuring boven (€)</Label>
              <Input type="number" min={0} placeholder="Geen limiet" value={settings.require_approval_above_amount || ''} onChange={(e) => updateSetting('require_approval_above_amount', e.target.value ? parseInt(e.target.value) : null)} className="h-9" />
              <p className="text-xs text-muted-foreground">Boven dit bedrag: handmatige goedkeuring</p>
            </div>
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm">Blokkeer bij negatieve marge</Label>
                <p className="text-xs text-muted-foreground">Geen auto-approve bij verlies</p>
              </div>
              <Switch checked={settings.require_approval_for_negative_margin} onCheckedChange={(checked) => updateSetting('require_approval_for_negative_margin', checked)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>Ongedaan maken</Button>
        <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
          {saveMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Opslaan
        </Button>
      </div>
    </div>
  );
}
