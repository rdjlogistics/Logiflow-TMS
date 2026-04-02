import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Webhook, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const WEBHOOK_EVENTS = [
  { name: "Order Status Updates", description: "POST bij status wijzigingen" },
  { name: "Invoice Created", description: "Notificatie bij nieuwe facturen" },
  { name: "POD Uploaded", description: "Afleveringsbewijs beschikbaar" },
  { name: "Driver Location", description: "Real-time chauffeur positie updates" },
];

const Webhooks = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { companyId } = useCompany();

  const handleCreate = async () => {
    if (!webhookUrl.trim()) {
      toast({ title: "URL vereist", description: "Voer een geldige webhook URL in.", variant: "destructive" });
      return;
    }
    if (!companyId) {
      toast({ title: "Fout", description: "Geen bedrijf gevonden.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("notification_channels").insert({
        tenant_id: companyId,
        channel_type: "webhook",
        name: `Webhook ${new Date().toLocaleDateString("nl-NL")}`,
        config_json: { url: webhookUrl, events: WEBHOOK_EVENTS.map(e => e.name) },
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Webhook opgeslagen ✓", description: `Events worden gestuurd naar ${webhookUrl}` });
      setWebhookUrl("");
    } catch (err: any) {
      toast({ title: "Fout bij opslaan", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title="Webhooks">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Webhook Subscriptions</CardTitle>
          </div>
          <CardDescription>Ontvang real-time notificaties bij events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {WEBHOOK_EVENTS.map((evt) => (
              <div key={evt.name} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">{evt.name}</p>
                  <p className="text-sm text-muted-foreground">{evt.description}</p>
                </div>
                <Badge variant="secondary">Beschikbaar</Badge>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="https://jouw-domein.nl/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="flex-1" />
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Toevoegen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Webhooks;
