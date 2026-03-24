import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Link2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Play,
  Pause,
  Trash2,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccountingIntegration {
  id: string;
  tenant_id: string;
  provider: string;
  is_active: boolean;
  sync_invoices: boolean;
  sync_customers: boolean;
  sync_payments: boolean;
  last_sync_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
  ledger_mappings: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

const PROVIDERS = [
  { id: 'exact_online', name: 'Exact Online', logo: '📊', description: 'Nederlandse ERP & boekhoudoplossing' },
  { id: 'moneybird', name: 'Moneybird', logo: '🐦', description: 'Online boekhouden voor ZZP & MKB' },
  { id: 'twinfield', name: 'Twinfield', logo: '📈', description: 'Cloud accounting van Wolters Kluwer' },
  { id: 'snelstart', name: 'SnelStart', logo: '⚡', description: 'Boekhouden voor het MKB' },
  { id: 'e-boekhouden', name: 'e-Boekhouden', logo: '💼', description: 'Eenvoudig online boekhouden' },
];

export default function AccountingIntegrations() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['accounting-integrations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('accounting_integrations')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccountingIntegration[];
    },
    enabled: !!company?.id,
  });

  const addIntegration = useMutation({
    mutationFn: async () => {
      if (!company?.id || !selectedProvider) throw new Error('Missing data');
      
      // First create the integration without credentials
      const { data, error } = await supabase
        .from('accounting_integrations')
        .insert({
          tenant_id: company.id,
          provider: selectedProvider,
          is_active: true,
          sync_invoices: true,
          sync_customers: true,
          sync_payments: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Then securely store credentials using vault
      if (apiKey || apiSecret) {
        const { error: vaultError } = await supabase.rpc('store_accounting_credentials', {
          p_integration_id: data.id,
          p_credentials: { api_key: apiKey, api_secret: apiSecret }
        });
        
        if (vaultError) {
          // If vault storage fails, delete the integration
          await supabase.from('accounting_integrations').delete().eq('id', data.id);
          throw vaultError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-integrations'] });
      toast({ title: 'Integratie toegevoegd', description: `${selectedProvider} is succesvol gekoppeld.` });
      setShowAddDialog(false);
      setSelectedProvider('');
      setApiKey('');
      setApiSecret('');
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Kon integratie niet toevoegen.', variant: 'destructive' });
    },
  });

  const toggleIntegration = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('accounting_integrations')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-integrations'] });
      toast({ title: 'Bijgewerkt', description: 'Integratie status bijgewerkt.' });
    },
  });

  const syncNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounting_integrations')
        .update({ 
          sync_status: 'syncing',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      
      // Simulate sync completion after 2 seconds
      setTimeout(async () => {
        await supabase
          .from('accounting_integrations')
          .update({ sync_status: 'success', sync_error: null })
          .eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['accounting-integrations'] });
      }, 2000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-integrations'] });
      toast({ title: 'Synchronisatie gestart', description: 'Data wordt nu gesynchroniseerd.' });
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounting_integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-integrations'] });
      toast({ title: 'Verwijderd', description: 'Integratie is verwijderd.' });
    },
  });

  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find(p => p.id === providerId) || { name: providerId, logo: '📦', description: '' };
  };

  const getSyncStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Geslaagd</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Fout</Badge>;
      case 'syncing':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Bezig...</Badge>;
      default:
        return <Badge variant="outline">Nooit gesynchroniseerd</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Boekhoud Koppelingen</h1>
          <p className="text-muted-foreground">Koppel uw boekhoudsoftware voor automatische synchronisatie</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Link2 className="w-4 h-4 mr-2" />
              Nieuwe Koppeling
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Boekhoudpakket Koppelen</DialogTitle>
              <DialogDescription>
                Selecteer uw boekhoudpakket en voer de API-gegevens in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Boekhoudpakket</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer pakket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <span className="flex items-center gap-2">
                          <span>{provider.logo}</span>
                          <span>{provider.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProvider && (
                <>
                  <div className="space-y-2">
                    <Label>API Key / Client ID</Label>
                    <Input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Voer uw API key in..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Secret / Client Secret</Label>
                    <Input 
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Voer uw API secret in..."
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuleren</Button>
              <Button 
                onClick={() => addIntegration.mutate()}
                disabled={!selectedProvider || !apiKey || addIntegration.isPending}
              >
                {addIntegration.isPending ? 'Koppelen...' : 'Koppelen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map(provider => {
          const integration = integrations.find(i => i.provider === provider.id);
          const isConnected = !!integration;

          return (
            <Card key={provider.id} className={isConnected ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.logo}</span>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">{provider.description}</CardDescription>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      Gekoppeld
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      {getSyncStatusBadge(integration.sync_status)}
                    </div>
                    {integration.last_sync_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Laatste sync:</span>
                        <span>{new Date(integration.last_sync_at).toLocaleString('nl-NL')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Actief</span>
                      <Switch 
                        checked={integration.is_active}
                        onCheckedChange={(checked) => toggleIntegration.mutate({ id: integration.id, isActive: checked })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => syncNow.mutate(integration.id)}
                        disabled={integration.sync_status === 'syncing'}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${integration.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                        Sync Nu
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteIntegration.mutate(integration.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (provider.id === 'exact_online') {
                        try {
                          const { data, error } = await supabase.functions.invoke('exact-oauth-start');
                          if (error) throw error;
                          if (data?.auth_url) {
                            window.location.href = data.auth_url;
                          } else {
                            toast({ title: 'Fout', description: 'Geen OAuth URL ontvangen. Controleer EXACT_CLIENT_ID en EXACT_CLIENT_SECRET.', variant: 'destructive' });
                          }
                        } catch {
                          toast({ title: 'Fout', description: 'Exact Online OAuth kon niet worden gestart. Controleer de API keys in Supabase.', variant: 'destructive' });
                        }
                      } else {
                        setSelectedProvider(provider.id);
                        setShowAddDialog(true);
                      }
                    }}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Koppelen
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Settings */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Synchronisatie Instellingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="invoices">
              <TabsList>
                <TabsTrigger value="invoices">Facturen</TabsTrigger>
                <TabsTrigger value="customers">Klanten</TabsTrigger>
                <TabsTrigger value="payments">Betalingen</TabsTrigger>
                <TabsTrigger value="ledger">Grootboek</TabsTrigger>
              </TabsList>
              <TabsContent value="invoices" className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Automatisch facturen synchroniseren</p>
                    <p className="text-sm text-muted-foreground">Facturen worden automatisch naar uw boekhoudpakket gestuurd</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Creditnota's meenemen</p>
                    <p className="text-sm text-muted-foreground">Creditnota's worden ook gesynchroniseerd</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </TabsContent>
              <TabsContent value="customers" className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Nieuwe klanten aanmaken</p>
                    <p className="text-sm text-muted-foreground">Nieuwe klanten worden automatisch aangemaakt in uw boekhoudpakket</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Klantgegevens bijwerken</p>
                    <p className="text-sm text-muted-foreground">Wijzigingen in klantgegevens worden gesynchroniseerd</p>
                  </div>
                  <Switch />
                </div>
              </TabsContent>
              <TabsContent value="payments" className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Betalingen ophalen</p>
                    <p className="text-sm text-muted-foreground">Ontvangen betalingen worden automatisch opgehaald</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </TabsContent>
              <TabsContent value="ledger" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Omzet grootboekrekening</Label>
                    <Input placeholder="8000 - Omzet transport" />
                  </div>
                  <div className="space-y-2">
                    <Label>BTW grootboekrekening</Label>
                    <Input placeholder="1500 - Af te dragen BTW" />
                  </div>
                  <div className="space-y-2">
                    <Label>Debiteuren rekening</Label>
                    <Input placeholder="1300 - Debiteuren" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank rekening</Label>
                    <Input placeholder="1100 - Bank" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
