import { useState } from 'react';
/* eslint-disable react-hooks/rules-of-hooks */
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, Users, Settings, Key, Loader2, Copy, Send, RefreshCw, Globe, CheckCircle2 } from 'lucide-react';

const PORTAL_URL = typeof window !== 'undefined' ? `${window.location.origin}/carrier` : '/carrier';

interface CarrierPortalAccessTabProps {
  carrierId: string;
  tenantId: string;
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

type RightsValue = 'rates_all' | 'no_rates_all' | 'rates_own' | 'no_rates_own';

function parseRights(showRates: boolean, scope: string): RightsValue {
  if (showRates && scope === 'all_orders') return 'rates_all';
  if (!showRates && scope === 'all_orders') return 'no_rates_all';
  if (showRates && scope === 'own_orders_only') return 'rates_own';
  return 'no_rates_own';
}

function splitRights(value: RightsValue): { showRates: boolean; scope: string } {
  switch (value) {
    case 'rates_all': return { showRates: true, scope: 'all_orders' };
    case 'no_rates_all': return { showRates: false, scope: 'all_orders' };
    case 'rates_own': return { showRates: true, scope: 'own_orders_only' };
    case 'no_rates_own': return { showRates: false, scope: 'own_orders_only' };
  }
}

export const CarrierPortalAccessTab = ({ carrierId, tenantId }: CarrierPortalAccessTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRights, setNewRights] = useState<RightsValue>('no_rates_all');
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Fetch contacts with portal access info
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['carrier-contacts-portal', carrierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrier_contacts')
        .select('id, name, email, phone, role, is_primary, portal_access, portal_role, user_id, portal_scope, show_purchase_rates')
        .eq('carrier_id', carrierId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch portal settings
  const { data: portalSettings } = useQuery({
    queryKey: ['carrier-portal-settings', carrierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrier_portal_settings')
        .select('*')
        .eq('carrier_id', carrierId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Upsert portal settings
  const settingsMutation = useMutation({
    mutationFn: async (settings: Record<string, boolean>) => {
      const { error } = await supabase
        .from('carrier_portal_settings')
        .upsert({
          carrier_id: carrierId,
          tenant_id: tenantId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'carrier_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-portal-settings', carrierId] });
      toast({ title: 'Instellingen opgeslagen' });
    },
  });

  // Toggle portal access
  const toggleAccessMutation = useMutation({
    mutationFn: async ({ contactId, access }: { contactId: string; access: boolean }) => {
      const { error } = await supabase
        .from('carrier_contacts')
        .update({ portal_access: access })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-contacts-portal', carrierId] });
    },
  });

  // Update rights (combined scope + show_purchase_rates)
  const updateRightsMutation = useMutation({
    mutationFn: async ({ contactId, rights }: { contactId: string; rights: RightsValue }) => {
      const { showRates, scope } = splitRights(rights);
      const { error } = await supabase
        .from('carrier_contacts')
        .update({ 
          show_purchase_rates: showRates,
          portal_scope: scope,
        })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-contacts-portal', carrierId] });
      toast({ title: 'Rechten bijgewerkt' });
    },
  });

  // Create user account
  const createUserMutation = useMutation({
    mutationFn: async ({ contactId, email, password, rights }: { contactId: string; email: string; password: string; rights: RightsValue }) => {
      const { showRates, scope } = splitRights(rights);
      const { data, error } = await supabase.functions.invoke('create-carrier-user', {
        body: { contactId, email, password, carrierId, tenantId, portalScope: scope, showPurchaseRates: showRates },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-contacts-portal', carrierId] });
      toast({ title: 'Gebruiker aangemaakt', description: 'De contactpersoon kan nu inloggen op het portaal.' });
    },
    onError: (err: any) => {
      toast({ title: 'Fout', description: err.message || 'Kon gebruiker niet aanmaken', variant: 'destructive' });
    },
  });

  // Send credentials email
  const sendCredentialsMutation = useMutation({
    mutationFn: async ({ contactId, email, password }: { contactId: string; email: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('send-carrier-credentials', {
        body: { contactId, email, password, carrierId, tenantId, portalUrl: PORTAL_URL },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Inloggegevens verstuurd', description: 'Het charter ontvangt een e-mail met inloggegevens.' });
    },
    onError: (err: any) => {
      toast({ title: 'Fout bij versturen', description: err.message || 'E-mail kon niet verstuurd worden', variant: 'destructive' });
    },
  });

  const handleSettingToggle = (key: string, value: boolean) => {
    settingsMutation.mutate({
      show_purchase_rates: portalSettings?.show_purchase_rates ?? false,
      show_documents: portalSettings?.show_documents ?? false,
      allow_document_upload: portalSettings?.allow_document_upload ?? false,
      auto_internal_documents: portalSettings?.auto_internal_documents ?? true,
      [key]: value,
    });
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword(12);
    setNewPassword(pwd);
    setCopiedPassword(false);
  };

  const handleCopyPassword = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    toast({ title: 'Wachtwoord gekopieerd' });
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCreateAndSend = async (send: boolean) => {
    if (!createDialog || !newEmail || newPassword.length < 8) return;
    
    await createUserMutation.mutateAsync({
      contactId: createDialog,
      email: newEmail,
      password: newPassword,
      rights: newRights,
    });

    if (send) {
      await sendCredentialsMutation.mutateAsync({
        contactId: createDialog,
        email: newEmail,
        password: newPassword,
      });
    }

    setCreateDialog(null);
    setNewEmail('');
    setNewPassword('');
    setNewRights('no_rates_all');
  };

  const hasMultipleContacts = (contacts?.length || 0) > 1;

  return (
    <div className="space-y-4">
      {/* Portal URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" /> Portaal URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={PORTAL_URL} readOnly className="font-mono text-sm bg-muted text-base" />
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(PORTAL_URL);
                toast({ title: 'URL gekopieerd' });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Deel deze URL met charters om in te loggen op het portaal.
          </p>
        </CardContent>
      </Card>

      {/* Portal Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Portaal Instellingen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_docs">Documenten tonen</Label>
            <Switch
              id="show_docs"
              checked={portalSettings?.show_documents ?? false}
              onCheckedChange={(v) => handleSettingToggle('show_documents', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allow_upload">Documenten uploaden toestaan</Label>
            <Switch
              id="allow_upload"
              checked={portalSettings?.allow_document_upload ?? false}
              onCheckedChange={(v) => handleSettingToggle('allow_document_upload', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto_internal">Uploads automatisch als intern opslaan</Label>
            <Switch
              id="auto_internal"
              checked={portalSettings?.auto_internal_documents ?? true}
              onCheckedChange={(v) => handleSettingToggle('auto_internal_documents', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts with Portal Access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Portaal Toegang
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !contacts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Voeg eerst contactpersonen toe aan dit charter.
            </p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, idx) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{contact.name}</p>
                      {contact.is_primary && <Badge variant="outline" className="text-[10px]">Primair</Badge>}
                      {contact.user_id && contact.portal_access && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Portaal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{contact.email || contact.phone || '—'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {contact.user_id ? (
                      <>
                        <Select
                          value={parseRights(contact.show_purchase_rates ?? false, contact.portal_scope ?? 'all_orders')}
                          onValueChange={(v) => updateRightsMutation.mutate({ contactId: contact.id, rights: v as RightsValue })}
                        >
                          <SelectTrigger className="w-[260px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rates_all">Met inkooptarieven – alle orders</SelectItem>
                            <SelectItem value="no_rates_all">Zonder inkooptarieven – alle orders</SelectItem>
                            {hasMultipleContacts && (
                              <>
                                <SelectItem value="rates_own">Met inkooptarieven – alleen eigen orders</SelectItem>
                                <SelectItem value="no_rates_own">Zonder inkooptarieven – alleen eigen orders</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <Switch
                          checked={contact.portal_access ?? false}
                          onCheckedChange={(v) => toggleAccessMutation.mutate({ contactId: contact.id, access: v })}
                        />
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCreateDialog(contact.id);
                          setNewEmail(contact.email || '');
                          setNewPassword('');
                          setNewRights('no_rates_all');
                          setCopiedPassword(false);
                        }}
                      >
                        <Key className="h-3.5 w-3.5 mr-1" /> Account aanmaken
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={!!createDialog} onOpenChange={() => setCreateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portaal Account Aanmaken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mailadres (gebruikersnaam)</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="chauffeur@voorbeeld.nl"
              />
            </div>
            <div className="space-y-2">
              <Label>Wachtwoord</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setCopiedPassword(false); }}
                  placeholder="Minimaal 8 tekens"
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleGeneratePassword} title="Nieuw wachtwoord genereren">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  disabled={!newPassword}
                  title="Kopieer wachtwoord"
                >
                  {copiedPassword ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rechten</Label>
              <Select value={newRights} onValueChange={(v) => setNewRights(v as RightsValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rates_all">Toegang met inkooptarieven – alle orders</SelectItem>
                  <SelectItem value="no_rates_all">Toegang zonder inkooptarieven – alle orders</SelectItem>
                  <SelectItem value="rates_own">Toegang met inkooptarieven – alleen eigen orders</SelectItem>
                  <SelectItem value="no_rates_own">Toegang zonder inkooptarieven – alleen eigen orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Portal URL info */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Portaal URL</p>
              <p className="text-sm font-mono">{PORTAL_URL}</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialog(null)}>Annuleren</Button>
            <Button
              variant="outline"
              disabled={!newEmail || newPassword.length < 8 || createUserMutation.isPending}
              onClick={() => handleCreateAndSend(false)}
            >
              {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
            <Button
              disabled={!newEmail || newPassword.length < 8 || createUserMutation.isPending || sendCredentialsMutation.isPending}
              onClick={() => handleCreateAndSend(true)}
            >
              {(createUserMutation.isPending || sendCredentialsMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
