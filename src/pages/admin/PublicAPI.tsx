import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Code,
  Book,
  Shield,
  Clock,
  Activity
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExternalApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { id: 'trips:read', name: 'Ritten lezen', description: 'Lees toegang tot ritten/orders' },
  { id: 'trips:write', name: 'Ritten schrijven', description: 'Nieuwe ritten aanmaken en bewerken' },
  { id: 'customers:read', name: 'Klanten lezen', description: 'Lees toegang tot klantgegevens' },
  { id: 'customers:write', name: 'Klanten schrijven', description: 'Klanten aanmaken en bewerken' },
  { id: 'invoices:read', name: 'Facturen lezen', description: 'Lees toegang tot facturen' },
  { id: 'invoices:write', name: 'Facturen schrijven', description: 'Facturen aanmaken' },
  { id: 'drivers:read', name: 'Chauffeurs lezen', description: 'Lees toegang tot chauffeurs' },
  { id: 'vehicles:read', name: 'Voertuigen lezen', description: 'Lees toegang tot voertuigen' },
  { id: 'tracking:read', name: 'Tracking lezen', description: 'Real-time locatie tracking' },
  { id: 'webhooks:manage', name: 'Webhooks beheren', description: 'Webhooks aanmaken en beheren' },
];

const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/trips',
    description: 'Lijst alle ritten op',
    scope: 'trips:read',
    example: `curl -X GET "https://api.yourtms.com/v1/trips" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
  },
  {
    method: 'POST',
    path: '/api/v1/trips',
    description: 'Maak een nieuwe rit aan',
    scope: 'trips:write',
    example: `curl -X POST "https://api.yourtms.com/v1/trips" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "uuid",
    "pickup_address": "Amsterdam",
    "delivery_address": "Rotterdam",
    "pickup_date": "2026-01-15"
  }'`,
  },
  {
    method: 'GET',
    path: '/api/v1/trips/{id}',
    description: 'Haal specifieke rit op',
    scope: 'trips:read',
    example: `curl -X GET "https://api.yourtms.com/v1/trips/{id}" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/api/v1/customers',
    description: 'Lijst alle klanten op',
    scope: 'customers:read',
    example: `curl -X GET "https://api.yourtms.com/v1/customers" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/api/v1/tracking/{trip_id}',
    description: 'Real-time tracking van een rit',
    scope: 'tracking:read',
    example: `curl -X GET "https://api.yourtms.com/v1/tracking/{trip_id}" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: 'POST',
    path: '/api/v1/webhooks',
    description: 'Registreer een webhook',
    scope: 'webhooks:manage',
    example: `curl -X POST "https://api.yourtms.com/v1/webhooks" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["trip.created", "trip.completed"]
  }'`,
  },
];

export default function PublicAPI() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState('60');
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['external-api-keys', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('external_api_keys')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExternalApiKey[];
    },
    enabled: !!company?.id,
  });

  const createApiKey = useMutation({
    mutationFn: async () => {
      if (!company?.id || !keyName) throw new Error('Missing data');
      
      // Generate a random API key
      const randomKey = `tms_${crypto.randomUUID().replace(/-/g, '')}`;
      const keyPrefix = randomKey.substring(0, 12);
      
      const { data, error } = await supabase
        .from('external_api_keys')
        .insert({
          tenant_id: company.id,
          name: keyName,
          key_hash: randomKey, // In production, this should be hashed
          key_prefix: keyPrefix,
          scopes: selectedScopes,
          rate_limit_per_minute: parseInt(rateLimit),
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, fullKey: randomKey };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-api-keys'] });
      setNewlyCreatedKey(data.fullKey);
      toast({ title: 'API Key aangemaakt', description: 'Kopieer de sleutel nu - deze wordt niet meer getoond!' });
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Kon API key niet aanmaken.', variant: 'destructive' });
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_api_keys')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-api-keys'] });
      toast({ title: 'Verwijderd', description: 'API key is verwijderd.' });
    },
  });

  const toggleScope = (scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Gekopieerd!', description: 'Naar klembord gekopieerd.' });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500';
      case 'POST': return 'bg-green-500';
      case 'PUT': return 'bg-yellow-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Publieke API</h1>
          <p className="text-muted-foreground">Beheer API keys en bekijk documentatie</p>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            Documentatie
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Gebruik
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) {
                setNewlyCreatedKey(null);
                setKeyName('');
                setSelectedScopes([]);
                setRateLimit('60');
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nieuwe API Key Aanmaken</DialogTitle>
                  <DialogDescription>
                    Maak een nieuwe API key aan met specifieke rechten.
                  </DialogDescription>
                </DialogHeader>
                
                {newlyCreatedKey ? (
                  <div className="space-y-4 py-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        ⚠️ Kopieer deze sleutel nu! Deze wordt niet meer getoond.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                          {newlyCreatedKey}
                        </code>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(newlyCreatedKey)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Naam</Label>
                      <Input 
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="bijv. Production API, Webshop Integration"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Rate Limit (requests/minuut)</Label>
                      <Input 
                        type="number"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(e.target.value)}
                        min="1"
                        max="1000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rechten (Scopes)</Label>
                      <ScrollArea className="h-48 border rounded-lg p-3">
                        <div className="space-y-3">
                          {AVAILABLE_SCOPES.map(scope => (
                            <div key={scope.id} className="flex items-start space-x-3">
                              <Checkbox 
                                id={scope.id}
                                checked={selectedScopes.includes(scope.id)}
                                onCheckedChange={() => toggleScope(scope.id)}
                              />
                              <div className="grid gap-0.5 leading-none">
                                <label htmlFor={scope.id} className="text-sm font-medium cursor-pointer">
                                  {scope.name}
                                </label>
                                <p className="text-xs text-muted-foreground">{scope.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {newlyCreatedKey ? (
                    <Button onClick={() => {
                      setShowCreateDialog(false);
                      setNewlyCreatedKey(null);
                    }}>
                      Sluiten
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuleren</Button>
                      <Button 
                        onClick={() => createApiKey.mutate()}
                        disabled={!keyName || selectedScopes.length === 0 || createApiKey.isPending}
                      >
                        {createApiKey.isPending ? 'Aanmaken...' : 'Aanmaken'}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* API Keys List */}
          <div className="grid gap-4">
            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nog geen API keys aangemaakt</p>
                </CardContent>
              </Card>
            ) : (
              apiKeys.map(key => (
                <Card key={key.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge variant={key.is_active ? 'default' : 'secondary'}>
                            {key.is_active ? 'Actief' : 'Inactief'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-mono">{key.key_prefix}...</span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {key.scopes.length} rechten
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {key.rate_limit_per_minute}/min
                          </span>
                          {key.last_used_at && (
                            <span>
                              Laatst gebruikt: {new Date(key.last_used_at).toLocaleDateString('nl-NL')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {key.scopes.map(scope => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteApiKey.mutate(key.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                API Referentie
              </CardTitle>
              <CardDescription>
                Basis URL: <code className="bg-muted px-2 py-1 rounded">https://api.yourtms.com/v1</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Authenticatie</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Gebruik een Bearer token in de Authorization header:
                </p>
                <code className="block bg-background p-3 rounded text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </code>
              </div>
            </CardContent>
          </Card>

          {API_ENDPOINTS.map((endpoint, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge className={`${getMethodColor(endpoint.method)} text-white`}>
                    {endpoint.method}
                  </Badge>
                  <code className="font-mono text-sm">{endpoint.path}</code>
                  <Badge variant="outline" className="ml-auto">
                    {endpoint.scope}
                  </Badge>
                </div>
                <CardDescription>{endpoint.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {endpoint.example}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(endpoint.example)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Vandaag</CardDescription>
                <CardTitle className="text-3xl">1,234</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">API requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Deze maand</CardDescription>
                <CardTitle className="text-3xl">45,678</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">API requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Succes rate</CardDescription>
                <CardTitle className="text-3xl">99.8%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Laatste 30 dagen</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recente API Activiteit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: '2 min geleden', method: 'GET', path: '/trips', status: 200, key: 'Production API' },
                  { time: '5 min geleden', method: 'POST', path: '/trips', status: 201, key: 'Production API' },
                  { time: '8 min geleden', method: 'GET', path: '/customers', status: 200, key: 'Webshop' },
                  { time: '12 min geleden', method: 'GET', path: '/tracking/123', status: 200, key: 'Production API' },
                  { time: '15 min geleden', method: 'GET', path: '/trips', status: 429, key: 'Test API' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getMethodColor(log.method)} text-white text-xs`}>
                        {log.method}
                      </Badge>
                      <code className="text-sm">{log.path}</code>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant={log.status < 400 ? 'outline' : 'destructive'}>
                        {log.status}
                      </Badge>
                      <span>{log.key}</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
