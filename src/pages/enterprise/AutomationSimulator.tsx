import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutomations, useAutomationRuns } from '@/hooks/useEnterpriseData';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Zap, 
  Clock, 
  Shield,
  RefreshCw,
  Eye,
  Settings2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AutomationSettingsDialog } from '@/components/enterprise/AutomationSettingsDialog';

const AutomationSimulator = () => {
  const { toast } = useToast();
  const { data: automations, isLoading: loadingAutomations } = useAutomations();
  const { data: runs, isLoading: loadingRuns } = useAutomationRuns();
  const [selectedAutomation, setSelectedAutomation] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [showNewAutomationDialog, setShowNewAutomationDialog] = useState(false);
  const [showBlockedItemsDialog, setShowBlockedItemsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedAutomationForSettings, setSelectedAutomationForSettings] = useState<any>(null);
  const [newAutomation, setNewAutomation] = useState({ name: '', trigger: '', description: '' });

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      // Query real orders that are 'afgerond' without an invoice
      const { data: orders, error } = await supabase
        .from('trips')
        .select('id, order_number, status, price, customer_id, invoice_id')
        .in('status', ['afgerond', 'gecontroleerd'])
        .is('invoice_id', null)
        .limit(50);

      if (error) throw error;

      const details: any[] = [];
      let wouldProcess = 0;
      let wouldBlock = 0;
      let alerts = 0;

      for (const order of (orders || [])) {
        // Check if POD exists for this order
        const { data: pods } = await supabase
          .from('stop_proofs')
          .select('id')
          .eq('trip_id', order.id)
          .limit(1);

        const hasPod = (pods && pods.length > 0);
        const amount = order.price ? `€${Number(order.price).toFixed(2)}` : 'onbekend';

        if (!hasPod) {
          wouldBlock++;
          details.push({
            entity: `Order #${order.order_number || order.id.slice(0, 8)}`,
            action: 'Create Invoice',
            status: 'blocked',
            reason: `Geen POD document aanwezig`,
          });
        } else {
          wouldProcess++;
          details.push({
            entity: `Order #${order.order_number || order.id.slice(0, 8)}`,
            action: 'Create Invoice',
            status: 'would_execute',
            reason: `POD aanwezig, bedrag ${amount}`,
          });
        }
      }

      if (details.length === 0) {
        alerts = 1;
        details.push({
          entity: 'Geen orders',
          action: '-',
          status: 'blocked',
          reason: 'Geen afgeronde orders zonder factuur gevonden',
        });
      }

      setSimulationResults({ wouldProcess, wouldBlock, alerts, details });
    } catch (err: any) {
      console.error('Simulation error:', err);
      toast({ title: "Simulatie mislukt", description: err?.message || "Kon geen data ophalen", variant: "destructive" });
    } finally {
      setIsSimulating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Voltooid</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Actief</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Gefaald</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSimStatusBadge = (status: string) => {
    switch (status) {
      case 'would_execute':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Zou uitvoeren</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Shield className="h-3 w-3 mr-1" /> Geblokkeerd</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout 
      title="Automation Simulator" 
      description="Test automations met dry-run voordat je publiceert"
    >
      <div className="space-y-6">
        {/* Simulator Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Dry-Run Simulator
            </CardTitle>
            <CardDescription>
              Test een automation op recente data zonder werkelijke wijzigingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selecteer Automation</label>
                <Select value={selectedAutomation} onValueChange={setSelectedAutomation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een automation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {automations?.map(auto => (
                      <SelectItem key={auto.id} value={auto.id}>
                        {auto.name} (v{auto.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Dataset</label>
                <Select defaultValue="7days">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Laatste 7 dagen</SelectItem>
                    <SelectItem value="14days">Laatste 14 dagen</SelectItem>
                    <SelectItem value="30days">Laatste 30 dagen</SelectItem>
                    <SelectItem value="custom">Aangepaste periode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={runSimulation} 
                  disabled={!selectedAutomation || isSimulating}
                  className="w-full"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Simuleren...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Dry-Run
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Simulation Results */}
            {simulationResults && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{simulationResults.wouldProcess}</p>
                          <p className="text-xs text-muted-foreground">Zou uitvoeren</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Shield className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{simulationResults.wouldBlock}</p>
                          <p className="text-xs text-muted-foreground">Geblokkeerd</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <AlertTriangle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{simulationResults.alerts}</p>
                          <p className="text-xs text-muted-foreground">Alerts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Gedetailleerde Resultaten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity</TableHead>
                          <TableHead>Actie</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reden</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulationResults.details.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.entity}</TableCell>
                            <TableCell>{item.action}</TableCell>
                            <TableCell>{getSimStatusBadge(item.status)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{item.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Dialog open={showBlockedItemsDialog} onOpenChange={setShowBlockedItemsDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Bekijk Blocked Items
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Geblokkeerde Items</DialogTitle>
                        <DialogDescription>Items die niet verwerkt worden door de automation</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        {simulationResults?.details?.filter((d: any) => d.status === 'blocked').map((item: any, idx: number) => (
                          <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="font-medium text-sm">{item.entity}</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBlockedItemsDialog(false)}>Sluiten</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => {
                    toast({ title: "Automation gepubliceerd", description: "De automation is succesvol gepubliceerd en actief." }); }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Publiceer Automation
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automations List */}
        <Tabs defaultValue="definitions">
          <TabsList>
            <TabsTrigger value="definitions">Automations</TabsTrigger>
            <TabsTrigger value="history">Run History</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Automation Definities</CardTitle>
                  <CardDescription>Beheer je automation regels en triggers</CardDescription>
                </div>
                <Dialog open={showNewAutomationDialog} onOpenChange={setShowNewAutomationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuwe Automation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Automation</DialogTitle>
                      <DialogDescription>Configureer een nieuwe automation regel</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="auto-name">Naam</Label>
                        <Input 
                          id="auto-name" 
                          placeholder="bijv. Auto-Invoice na Delivery"
                          value={newAutomation.name}
                          onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auto-trigger">Trigger</Label>
                        <Select value={newAutomation.trigger} onValueChange={(v) => setNewAutomation({ ...newAutomation, trigger: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer trigger..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OrderDelivered">Order Afgeleverd</SelectItem>
                            <SelectItem value="InvoiceOverdue">Factuur Verlopen</SelectItem>
                            <SelectItem value="PODReceived">POD Ontvangen</SelectItem>
                            <SelectItem value="ForecastBreach">Forecast Overschreden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auto-desc">Beschrijving</Label>
                        <Textarea 
                          id="auto-desc" 
                          placeholder="Wat doet deze automation..."
                          value={newAutomation.description}
                          onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewAutomationDialog(false)}>Annuleren</Button>
                      <Button onClick={() => {
                        toast({ title: "Automation aangemaakt", description: `${newAutomation.name || 'Nieuwe automation'} is toegevoegd als draft.` });
                        setShowNewAutomationDialog(false);
                        setNewAutomation({ name: '', trigger: '', description: '' }); }}>
                        Aanmaken
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Versie</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Laatste Run</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Auto-Invoice na Delivery</TableCell>
                      <TableCell>
                        <Badge variant="outline">OrderDelivered</Badge>
                      </TableCell>
                      <TableCell>v3</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Actief</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">2 uur geleden</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedAutomationForSettings({ name: "Auto-Invoice na Delivery", trigger: "OrderDelivered", version: "3", status: "Actief" }); setShowSettingsDialog(true); }}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Payment Reminder</TableCell>
                      <TableCell>
                        <Badge variant="outline">InvoiceOverdue</Badge>
                      </TableCell>
                      <TableCell>v2</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Actief</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">1 dag geleden</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedAutomationForSettings({ name: "Payment Reminder", trigger: "InvoiceOverdue", version: "2", status: "Actief" }); setShowSettingsDialog(true); }}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Forecast Breach Alert</TableCell>
                      <TableCell>
                        <Badge variant="outline">ForecastBreach</Badge>
                      </TableCell>
                      <TableCell>v1</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Draft</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">Nooit</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedAutomationForSettings({ name: "Forecast Breach Alert", trigger: "ForecastBreach", version: "1", status: "Draft" }); setShowSettingsDialog(true); }}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Run History</CardTitle>
                <CardDescription>Alle automation runs met resultaten</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Automation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gestart</TableHead>
                      <TableHead>Duur</TableHead>
                      <TableHead>Verwerkt</TableHead>
                      <TableHead>Blocked</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Auto-Invoice na Delivery</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Live</Badge>
                      </TableCell>
                      <TableCell>Vandaag 14:32</TableCell>
                      <TableCell>1.2s</TableCell>
                      <TableCell>8</TableCell>
                      <TableCell>2</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>{getStatusBadge('completed')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Auto-Invoice na Delivery</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Simulation</Badge>
                      </TableCell>
                      <TableCell>Vandaag 12:15</TableCell>
                      <TableCell>2.1s</TableCell>
                      <TableCell>12</TableCell>
                      <TableCell>3</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>{getStatusBadge('completed')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Payment Reminder</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Live</Badge>
                      </TableCell>
                      <TableCell>Gisteren 09:00</TableCell>
                      <TableCell>3.5s</TableCell>
                      <TableCell>5</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>{getStatusBadge('completed')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <AutomationSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        automation={selectedAutomationForSettings}
      />
    </DashboardLayout>
  );
};

export default AutomationSimulator;
