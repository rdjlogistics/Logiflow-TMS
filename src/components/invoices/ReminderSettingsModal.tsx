import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings2, 
  Mail, 
  MessageSquare, 
  Phone,
  Clock,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ReminderSettingsModalProps {
  customerId?: string;
  customerName?: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReminderSettings {
  id?: string;
  customer_id: string | null;
  company_id: string;
  is_global: boolean | null;
  days_after_first: number | null;
  days_after_second: number | null;
  days_after_third: number | null;
  email_enabled: boolean | null;
  whatsapp_enabled: boolean | null;
  sms_enabled: boolean | null;
  auto_enabled: boolean | null;
  max_reminders: number | null;
}

const DEFAULT_SETTINGS: Omit<ReminderSettings, "customer_id" | "company_id"> = {
  is_global: false as boolean | null,
  days_after_first: 7 as number | null,
  days_after_second: 14 as number | null,
  days_after_third: 21 as number | null,
  email_enabled: true as boolean | null,
  whatsapp_enabled: false as boolean | null,
  sms_enabled: false as boolean | null,
  auto_enabled: true as boolean | null,
  max_reminders: 3 as number | null,
};

export function ReminderSettingsModal({
  customerId,
  customerName,
  companyId,
  open,
  onOpenChange,
}: ReminderSettingsModalProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ReminderSettings>({
    ...DEFAULT_SETTINGS,
    customer_id: customerId || null,
    company_id: companyId,
    is_global: !customerId,
  });

  // Fetch existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["reminder-settings", customerId, companyId],
    queryFn: async () => {
      let query = supabase
        .from("invoice_reminder_settings")
        .select("*")
        .eq("company_id", companyId);

      if (customerId) {
        query = query.eq("customer_id", customerId);
      } else {
        query = query.eq("is_global", true);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data;
    },
    enabled: open,
  });

  // Update local state when existing settings are loaded
  useEffect(() => {
    if (existingSettings) {
      setSettings({
        ...existingSettings,
        customer_id: customerId || null,
      });
    } else {
      setSettings({
        ...DEFAULT_SETTINGS,
        customer_id: customerId || null,
        company_id: companyId,
        is_global: !customerId,
      });
    }
  }, [existingSettings, customerId, companyId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: ReminderSettings) => {
      if (newSettings.id) {
        // Update existing
        const { error } = await supabase
          .from("invoice_reminder_settings")
          .update({
            days_after_first: newSettings.days_after_first,
            days_after_second: newSettings.days_after_second,
            days_after_third: newSettings.days_after_third,
            email_enabled: newSettings.email_enabled,
            whatsapp_enabled: newSettings.whatsapp_enabled,
            sms_enabled: newSettings.sms_enabled,
            auto_enabled: newSettings.auto_enabled,
            max_reminders: newSettings.max_reminders,
          })
          .eq("id", newSettings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("invoice_reminder_settings")
          .insert({
            customer_id: newSettings.customer_id,
            company_id: newSettings.company_id,
            is_global: newSettings.is_global,
            days_after_first: newSettings.days_after_first,
            days_after_second: newSettings.days_after_second,
            days_after_third: newSettings.days_after_third,
            email_enabled: newSettings.email_enabled,
            whatsapp_enabled: newSettings.whatsapp_enabled,
            sms_enabled: newSettings.sms_enabled,
            auto_enabled: newSettings.auto_enabled,
            max_reminders: newSettings.max_reminders,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Instellingen opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["reminder-settings"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Fout bij opslaan instellingen");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Herinnering Instellingen
          </DialogTitle>
          <DialogDescription>
            {customerId 
              ? `Configureer herinneringen voor ${customerName}`
              : "Configureer standaard herinnering instellingen voor alle klanten"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Auto Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatische herinneringen</Label>
              <p className="text-xs text-muted-foreground">
                Verstuur herinneringen automatisch volgens schema
              </p>
            </div>
            <Switch
              checked={settings.auto_enabled ?? false}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, auto_enabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* Channel Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Kanalen</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email</span>
                </div>
                <Switch
                  checked={settings.email_enabled ?? false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, email_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span className="text-sm">WhatsApp</span>
                </div>
                <Switch
                  checked={settings.whatsapp_enabled ?? false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, whatsapp_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">SMS</span>
                </div>
                <Switch
                  checked={settings.sms_enabled ?? false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, sms_enabled: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Timing Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Timing (dagen na vervaldatum)</Label>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first" className="text-xs text-muted-foreground">
                  1e herinnering
                </Label>
                <Input
                  id="first"
                  type="number"
                  min={1}
                  max={30}
                  value={settings.days_after_first ?? 7}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      days_after_first: parseInt(e.target.value) || 7
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="second" className="text-xs text-muted-foreground">
                  2e herinnering
                </Label>
                <Input
                  id="second"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.days_after_second ?? 14}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      days_after_second: parseInt(e.target.value) || 14
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="third" className="text-xs text-muted-foreground">
                  3e herinnering
                </Label>
                <Input
                  id="third"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.days_after_third ?? 21}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      days_after_third: parseInt(e.target.value) || 21
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Max Reminders */}
          <div className="space-y-2">
            <Label htmlFor="maxReminders">Maximum aantal herinneringen</Label>
            <Input
              id="maxReminders"
              type="number"
              min={1}
              max={10}
              value={settings.max_reminders ?? 3}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  max_reminders: parseInt(e.target.value) || 3
                }))
              }
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Stop automatisch na dit aantal herinneringen
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              "Opslaan..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
