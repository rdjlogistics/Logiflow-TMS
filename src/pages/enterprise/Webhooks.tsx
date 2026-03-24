import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Webhook, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const WEBHOOK_EVENTS = [
  { name: "Order Status Updates", description: "POST bij status wijzigingen" },
  { name: "Invoice Created", description: "Notificatie bij nieuwe facturen" },
  { name: "POD Uploaded", description: "Afleveringsbewijs beschikbaar" },
  { name: "Driver Location", description: "Real-time chauffeur positie updates" },
];

const Webhooks = () => {
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleCreate = () => {
    if (!webhookUrl.trim()) {
      toast({ title: "URL vereist", description: "Voer een geldige webhook URL in.", variant: "destructive" });
      return;
    }
    toast({ title: "Webhook geconfigureerd ✓", description: `Events worden gestuurd naar ${webhookUrl}` });
    setWebhookUrl("");
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
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" /> Toevoegen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Webhooks;
