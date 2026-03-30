import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Mail,
  Phone,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Send,
  Smartphone,
  Users,
  Truck,
  Package,
  Loader2,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface NotificationChannel {
  id: string;
  type: 'whatsapp' | 'sms' | 'email' | 'push';
  name: string;
  isActive: boolean;
  apiKey?: string;
  phoneNumber?: string;
}

interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
}

interface NotificationTemplate {
  id: string;
  event: string;
  channels: string[];
  messageTemplate: string;
  isActive: boolean;
}

const availableChannels = ['whatsapp', 'sms', 'email', 'push'];

export default function NotificationChannels() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [logs] = useState<NotificationLog[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  
  // Template edit dialog state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Channel config dialog state
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);

  const stats = {
    sent24h: logs.length,
    delivered: logs.filter(l => l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    deliveryRate: logs.length > 0 ? Math.round((logs.filter(l => l.status === 'delivered').length / logs.length) * 100) : 0,
  };

  const getChannelIcon = (type: NotificationChannel['type']) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'sms':
        return <Phone className="h-5 w-5 text-blue-500" />;
      case 'email':
        return <Mail className="h-5 w-5 text-purple-500" />;
      case 'push':
        return <Bell className="h-5 w-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: NotificationLog['status']) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Afgeleverd</Badge>;
      case 'sent':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Verzonden</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Mislukt</Badge>;
    }
  };

  const toggleChannel = (id: string) => {
    setChannels(channels.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ));
    toast.success('Kanaal status bijgewerkt');
  };

  const toggleTemplate = (id: string) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
    toast.success('Template status bijgewerkt');
  };

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      order_confirmed: 'Order Bevestigd',
      driver_assigned: 'Chauffeur Toegewezen',
      in_transit: 'Onderweg',
      arriving_soon: 'Bijna Aangekomen',
      delivered: 'Afgeleverd',
      invoice_sent: 'Factuur Verzonden',
    };
    return labels[event] || event;
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate({ ...template });
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setTemplates(prev => prev.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    ));
    
    setSaving(false);
    setShowTemplateDialog(false);
    setEditingTemplate(null);
    toast.success('Template opgeslagen');
  };

  const handleAddTemplate = () => {
    const newTemplate: NotificationTemplate = {
      id: Date.now().toString(),
      event: 'custom_event',
      channels: ['email'],
      messageTemplate: '',
      isActive: false,
    };
    setEditingTemplate(newTemplate);
    setShowTemplateDialog(true);
  };

  const handleConfigureChannel = (channel: NotificationChannel) => {
    setEditingChannel({ ...channel });
    setShowChannelDialog(true);
  };

  const handleSaveChannel = async () => {
    if (!editingChannel) return;
    
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setChannels(prev => prev.map(c => 
      c.id === editingChannel.id ? editingChannel : c
    ));
    
    setSaving(false);
    setShowChannelDialog(false);
    setEditingChannel(null);
    toast.success('Kanaal configuratie opgeslagen');
  };

  const toggleTemplateChannel = (channel: string) => {
    if (!editingTemplate) return;
    
    const channels = editingTemplate.channels.includes(channel)
      ? editingTemplate.channels.filter(c => c !== channel)
      : [...editingTemplate.channels, channel];
    
    setEditingTemplate({ ...editingTemplate, channels });
  };

  return (
    <DashboardLayout title="Notificatie Kanalen" description="WhatsApp, SMS en Email integraties">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sent24h}</p>
                  <p className="text-sm text-muted-foreground">Verzonden (24u)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                  <p className="text-sm text-muted-foreground">Afgeleverd</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Mislukt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.deliveryRate}%</p>
                  <p className="text-sm text-muted-foreground">Afleverpercentage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="channels">
          <TabsList>
            <TabsTrigger value="channels">Kanalen</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="logs">Verzendlog</TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-4">
            {channels.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Bell className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Geen kanalen geconfigureerd</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Configureer je eerste notificatiekanaal (WhatsApp, SMS, Email of Push) om automatische berichten te versturen.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {channels.map(channel => (
                  <Card key={channel.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-muted">
                            {getChannelIcon(channel.type)}
                          </div>
                          <div>
                            <h3 className="font-medium">{channel.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{channel.type}</p>
                            {channel.phoneNumber && (
                              <p className="text-sm font-mono mt-1">{channel.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                        <Switch 
                          checked={channel.isActive}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                          {channel.isActive ? 'Actief' : 'Inactief'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleConfigureChannel(channel)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configureren
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business API</CardTitle>
                <CardDescription>Configureer uw WhatsApp Business integratie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>WhatsApp Business Account ID</Label>
                    <Input placeholder="Uw account ID" />
                  </div>
                  <div className="space-y-2">
                    <Label>API Token</Label>
                    <Input type="password" placeholder="••••••••••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefoonnummer</Label>
                    <Input placeholder="+31612345678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input disabled value="https://api.voorbeeld.nl/webhooks/whatsapp" />
                  </div>
                </div>
                <Button>Opslaan & Testen</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Notificatie Templates</CardTitle>
                    <CardDescription>Automatische berichten per event</CardDescription>
                  </div>
                  <Button onClick={handleAddTemplate}>
                    Template Toevoegen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Kanalen</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {template.event === 'delivered' && <Package className="h-4 w-4 text-green-500" />}
                            {template.event === 'in_transit' && <Truck className="h-4 w-4 text-blue-500" />}
                            {template.event === 'order_confirmed' && <CheckCircle className="h-4 w-4 text-primary" />}
                            {template.event === 'driver_assigned' && <Users className="h-4 w-4 text-purple-500" />}
                            {template.event === 'arriving_soon' && <Clock className="h-4 w-4 text-amber-500" />}
                            {template.event === 'invoice_sent' && <Mail className="h-4 w-4 text-gray-500" />}
                            <span className="font-medium">{getEventLabel(template.event)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {template.channels.map(ch => (
                              <Badge key={ch} variant="outline" className="text-xs">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {template.messageTemplate}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={template.isActive}
                            onCheckedChange={() => toggleTemplate(template.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Bewerken
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Verzendlog</CardTitle>
                <CardDescription>Recente notificaties en hun status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kanaal</TableHead>
                      <TableHead>Ontvanger</TableHead>
                      <TableHead>Bericht</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verzonden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline">{log.channel}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                        <TableCell>
                          <p className="text-sm truncate max-w-xs">{log.message}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {format(log.sentAt, "d MMM HH:mm", { locale: nl })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Template Bewerken' : 'Nieuwe Template'}
            </DialogTitle>
            <DialogDescription>
              Configureer de notificatie template
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event</Label>
                <Input
                  value={getEventLabel(editingTemplate.event)}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Kanalen</Label>
                <div className="flex flex-wrap gap-3">
                  {availableChannels.map(channel => (
                    <div key={channel} className="flex items-center space-x-2">
                      <Checkbox
                        id={`channel-${channel}`}
                        checked={editingTemplate.channels.includes(channel)}
                        onCheckedChange={() => toggleTemplateChannel(channel)}
                      />
                      <Label htmlFor={`channel-${channel}`} className="capitalize">
                        {channel}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bericht Template</Label>
                <Textarea
                  value={editingTemplate.messageTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, messageTemplate: e.target.value })}
                  rows={4}
                  placeholder="Gebruik {{variabele}} voor dynamische waarden"
                />
                <p className="text-xs text-muted-foreground">
                  Beschikbare variabelen: {'{{order_id}}'}, {'{{customer_name}}'}, {'{{driver_name}}'}, {'{{tracking_url}}'}, {'{{delivery_date}}'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Actief</Label>
                  <p className="text-sm text-muted-foreground">Template inschakelen</p>
                </div>
                <Switch
                  checked={editingTemplate.isActive}
                  onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, isActive: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Config Dialog */}
      <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kanaal Configureren</DialogTitle>
            <DialogDescription>
              Configureer de instellingen voor {editingChannel?.name}
            </DialogDescription>
          </DialogHeader>
          {editingChannel && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={editingChannel.name}
                  onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                />
              </div>
              {editingChannel.type === 'whatsapp' && (
                <div className="space-y-2">
                  <Label>Telefoonnummer</Label>
                  <Input
                    value={editingChannel.phoneNumber || ''}
                    onChange={(e) => setEditingChannel({ ...editingChannel, phoneNumber: e.target.value })}
                    placeholder="+31612345678"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={editingChannel.apiKey || ''}
                  onChange={(e) => setEditingChannel({ ...editingChannel, apiKey: e.target.value })}
                  placeholder="••••••••••••••••"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Actief</Label>
                  <p className="text-sm text-muted-foreground">Kanaal inschakelen</p>
                </div>
                <Switch
                  checked={editingChannel.isActive}
                  onCheckedChange={(v) => setEditingChannel({ ...editingChannel, isActive: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveChannel} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}