import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { usePortalAuth, useNotificationPreferences, useCustomerSettings } from "@/hooks/usePortalAuth";
import { usePortalCostCenters } from "@/hooks/usePortalCostCenters";
import { usePortalTeamMembers } from "@/hooks/usePortalTeamMembers";
import { LoadingState } from "@/components/portal/shared/LoadingState";
import { 
  Building2,
  Users,
  Bell,
  FileText,
  Save,
  Plus,
  Trash2,
  MapPin,
  Loader2,
  Check,
  CheckCircle2,
  Mail,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { cn } from "@/lib/utils";

const B2BSettings = () => {
  const { customer, loading: customerLoading } = usePortalAuth();
  const { preferences, loading: prefsLoading, saving: prefsSaving, updatePreference } = useNotificationPreferences();
  const { updateCustomerProfile, saving: profileSaving } = useCustomerSettings();
  const { lookupPostcode, loading: postcodeLoading } = usePostcodeLookup();
  
  // Database hooks for cost centers and team members
  const { 
    costCenters, 
    isLoading: costCentersLoading, 
    createCostCenter, 
    deleteCostCenter,
    isCreating: isCreatingCostCenter 
  } = usePortalCostCenters(customer?.id);
  
  const { 
    teamMembers, 
    isLoading: teamMembersLoading, 
    inviteMember, 
    revokeMember,
    resendInvite,
    isInviting 
  } = usePortalTeamMembers(customer?.id);
  
  const [autoFilled, setAutoFilled] = useState(false);
  const [lastLookup, setLastLookup] = useState<string>("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showCostCenterDialog, setShowCostCenterDialog] = useState(false);
  const [newCostCenter, setNewCostCenter] = useState({ name: '', code: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user' | 'viewer'>('user');
  
  const [companyData, setCompanyData] = useState({
    name: '',
    kvk: '',
    vat: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Sync customer data when loaded
  useEffect(() => {
    if (customer) {
      setCompanyData({
        name: customer.companyName || '',
        kvk: '', // Not stored in customer table
        vat: customer.vatNumber || '',
        address: customer.address || '',
        postalCode: customer.postalCode || '',
        city: customer.city || '',
        phone: customer.phone || '',
        email: customer.email || '',
      });
    }
  }, [customer]);

  const handleFieldChange = (field: string, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Dutch postcode auto-complete
  const handlePostcodeLookup = useCallback(async () => {
    const cleaned = companyData.postalCode.replace(/\s/g, '').toUpperCase();
    
    if (
      cleaned.length === 6 && 
      /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned)
    ) {
      const lookupKey = cleaned;
      
      if (lookupKey !== lastLookup) {
        setLastLookup(lookupKey);
        const result = await lookupPostcode(cleaned);
        
        if (result) {
          const updates: Partial<typeof companyData> = {};
          if (result.street && !companyData.address) {
            updates.address = result.street;
          }
          if (result.city && !companyData.city) {
            updates.city = result.city;
          }
          if (Object.keys(updates).length > 0) {
            setCompanyData(prev => ({ ...prev, ...updates }));
            setAutoFilled(true);
            setHasChanges(true);
            setTimeout(() => setAutoFilled(false), 3000);
          }
        }
      }
    }
  }, [companyData.postalCode, companyData.address, companyData.city, lastLookup, lookupPostcode]);

  const handlePostcodeBlur = () => {
    const formatted = formatDutchPostcode(companyData.postalCode);
    if (formatted !== companyData.postalCode) {
      setCompanyData(prev => ({ ...prev, postalCode: formatted }));
      setHasChanges(true);
    }
    handlePostcodeLookup();
  };

  const handleSave = async () => {
    const result = await updateCustomerProfile({
      companyName: companyData.name,
      vatNumber: companyData.vat,
      address: companyData.address,
      postalCode: companyData.postalCode,
      city: companyData.city,
      phone: companyData.phone,
      email: companyData.email,
    });
    
    if (result.error) {
      toast.error("Fout bij opslaan", { description: result.error });
    } else {
      toast.success("Instellingen opgeslagen");
      setHasChanges(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof preferences, value: boolean) => {
    updatePreference(key, value);
    toast.success("Notificatie-instellingen opgeslagen");
  };

  if (customerLoading) {
    return (
      <B2BLayout companyName="Laden...">
        <LoadingState message="Instellingen laden..." />
      </B2BLayout>
    );
  }

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"}>
      <motion.div className="max-w-4xl mx-auto space-y-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Instellingen</h1>
            <p className="text-sm text-muted-foreground">Beheer je bedrijfsgegevens en voorkeuren</p>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              Niet opgeslagen
            </Badge>
          )}
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Bedrijf</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Gebruikers</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaties</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Facturatie</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Bedrijfsgegevens</CardTitle>
                <CardDescription>Je officiële bedrijfsinformatie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bedrijfsnaam</Label>
                    <Input 
                      value={companyData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>KvK Nummer</Label>
                    <Input 
                      value={companyData.kvk}
                      onChange={(e) => handleFieldChange('kvk', e.target.value)}
                      placeholder="Niet beschikbaar"
                    />
                  </div>
                </div>
                <div>
                  <Label>BTW Nummer</Label>
                  <Input 
                    value={companyData.vat}
                    onChange={(e) => handleFieldChange('vat', e.target.value)}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      Postcode
                      <span className="text-[10px] text-primary/70 font-normal">(auto)</span>
                    </Label>
                    <div className="relative">
                      <Input 
                        value={companyData.postalCode}
                        onChange={(e) => handleFieldChange('postalCode', e.target.value.toUpperCase())}
                        onBlur={handlePostcodeBlur}
                        placeholder="1234 AB"
                        maxLength={7}
                      />
                      {postcodeLoading && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {autoFilled && !postcodeLoading && (
                        <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="flex items-center gap-1.5">
                      Adres
                      {autoFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </Label>
                    <Input 
                      value={companyData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className={cn(autoFilled && "border-green-500/30 bg-green-500/5")}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      Stad
                      {autoFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </Label>
                    <Input 
                      value={companyData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className={cn(autoFilled && "border-green-500/30 bg-green-500/5")}
                    />
                  </div>
                  <div>
                    <Label>Telefoon</Label>
                    <Input 
                      value={companyData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input 
                    type="email"
                    value={companyData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Kostenplaatsen</CardTitle>
                <CardDescription>Organiseer je zendingen per afdeling</CardDescription>
              </CardHeader>
              <CardContent>
                {costCentersLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : costCenters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nog geen kostenplaatsen</p>
                ) : (
                  <div className="space-y-2">
                    {costCenters.map(cc => (
                      <div key={cc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{cc.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{cc.code}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive" 
                          onClick={() => deleteCostCenter(cc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full mt-3 gap-2" onClick={() => setShowCostCenterDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Kostenplaats toevoegen
                </Button>
              </CardContent>
            </Card>

            <Button 
              onClick={handleSave} 
              className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
              disabled={profileSaving || !hasChanges}
            >
              {profileSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasChanges ? (
                <Save className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {profileSaving ? 'Opslaan...' : hasChanges ? 'Opslaan' : 'Opgeslagen'}
            </Button>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Gebruikers</CardTitle>
                  <CardDescription>Beheer toegang tot het portaal</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setShowInviteDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Uitnodigen
                </Button>
              </CardHeader>
              <CardContent>
                {teamMembersLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nog geen teamleden uitgenodigd</p>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.status === 'accepted' ? 'default' : 'outline'}>
                            {member.status === 'accepted' ? 'Actief' : 'Uitgenodigd'}
                          </Badge>
                          <Badge variant="outline">{member.role}</Badge>
                          {member.status === 'pending' && (
                            <Button variant="ghost" size="icon" onClick={() => resendInvite(member.id)}>
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => revokeMember(member.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">E-mail notificaties</CardTitle>
                  {(prefsLoading || prefsSaving) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <CardDescription>Kies welke updates je wilt ontvangen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Zending updates</p>
                    <p className="text-xs text-muted-foreground">Ontvang updates bij statuswijzigingen</p>
                  </div>
                  <Switch 
                    checked={preferences.emailShipmentUpdates}
                    onCheckedChange={(v) => handleNotificationChange('emailShipmentUpdates', v)}
                    disabled={prefsLoading || prefsSaving}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Bezorgbevestigingen</p>
                    <p className="text-xs text-muted-foreground">E-mail bij succesvolle bezorging</p>
                  </div>
                  <Switch 
                    checked={preferences.emailDeliveryConfirmation}
                    onCheckedChange={(v) => handleNotificationChange('emailDeliveryConfirmation', v)}
                    disabled={prefsLoading || prefsSaving}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Facturen</p>
                    <p className="text-xs text-muted-foreground">Ontvang facturen per e-mail</p>
                  </div>
                  <Switch 
                    checked={preferences.emailInvoices}
                    onCheckedChange={(v) => handleNotificationChange('emailInvoices', v)}
                    disabled={prefsLoading || prefsSaving}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Marketing</p>
                    <p className="text-xs text-muted-foreground">Nieuws en aanbiedingen</p>
                  </div>
                  <Switch 
                    checked={preferences.emailMarketing}
                    onCheckedChange={(v) => handleNotificationChange('emailMarketing', v)}
                    disabled={prefsLoading || prefsSaving}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Factuuradres</CardTitle>
                <CardDescription>Waar moeten facturen naartoe worden gestuurd?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{companyData.name || 'Bedrijfsnaam'}</p>
                    <p className="text-xs text-muted-foreground">
                      {companyData.address || 'Adres'}, {companyData.postalCode} {companyData.city}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Betalingsvoorwaarden</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Betalingstermijn</p>
                    <p className="font-semibold">30 dagen</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Betaalmethode</p>
                    <p className="font-semibold">Automatische incasso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Cost Center Dialog */}
      <Dialog open={showCostCenterDialog} onOpenChange={setShowCostCenterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kostenplaats toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe kostenplaats toe om zendingen te organiseren.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input 
                placeholder="bijv. Finance"
                value={newCostCenter.name}
                onChange={(e) => setNewCostCenter(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input 
                placeholder="bijv. FIN"
                value={newCostCenter.code}
                onChange={(e) => setNewCostCenter(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                maxLength={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCostCenterDialog(false)}>Annuleren</Button>
            <Button 
              disabled={isCreatingCostCenter}
              onClick={() => {
                if (newCostCenter.name && newCostCenter.code && customer?.id) {
                  createCostCenter({
                    customer_id: customer.id,
                    code: newCostCenter.code,
                    name: newCostCenter.name
                  });
                  setNewCostCenter({ name: '', code: '' });
                  setShowCostCenterDialog(false);
                } else {
                  toast.error("Vul alle velden in");
                }
              }}>
              {isCreatingCostCenter ? "Bezig..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker uitnodigen</DialogTitle>
            <DialogDescription>
              Nodig een nieuwe gebruiker uit om toegang te krijgen tot het portaal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-mailadres</Label>
              <Input 
                type="email"
                placeholder="naam@bedrijf.nl"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'user' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Gebruiker</SelectItem>
                  <SelectItem value="viewer">Viewer (alleen lezen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Annuleren</Button>
            <Button 
              disabled={isInviting}
              onClick={() => {
                if (inviteEmail && customer?.id) {
                  inviteMember({
                    customer_id: customer.id,
                    email: inviteEmail,
                    role: inviteRole
                  });
                  setInviteEmail('');
                  setInviteRole('user');
                  setShowInviteDialog(false);
                } else {
                  toast.error("Vul een e-mailadres in");
                }
              }}>
              {isInviting ? "Bezig..." : "Uitnodigen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </B2BLayout>
  );
};

export default B2BSettings;
