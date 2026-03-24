import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFinancePolicies, useUpdateFinancePolicies, useAuthorityDelegations, AuthorityDelegation } from '@/hooks/useEnterpriseData';
import { 
  Shield, 
  Wallet, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Save,
  Plus,
  Euro
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PolicyCenter = () => {
  const { data: policies, isLoading } = useFinancePolicies();
  const { data: delegations } = useAuthorityDelegations();
  const updatePolicies = useUpdateFinancePolicies();
  const { toast } = useToast();
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', maxInvoice: '', maxPayout: '' });

  // Local state for form
  const [formData, setFormData] = useState({
    min_cash_buffer_eur: 5000,
    critical_buffer_eur: 2000,
    pod_required_default: true,
    pod_required_above_eur: 500,
    invoice_auto_send_max_eur: 1000,
    payout_auto_approve_max_eur: 500,
    two_person_approval_above_eur: 5000,
    matching_confidence_threshold: 0.85,
    matching_auto_approve_threshold: 0.95,
    payout_requires_contract: true,
    iban_change_cooldown_days: 7,
    iban_verification_required: true,
    hold_auto_escalate_days: 3,
    base_currency: 'EUR',
  });

  useEffect(() => {
    if (policies) {
      setFormData({
        min_cash_buffer_eur: policies.min_cash_buffer_eur || 5000,
        critical_buffer_eur: policies.critical_buffer_eur || 2000,
        pod_required_default: policies.pod_required_default ?? true,
        pod_required_above_eur: policies.pod_required_above_eur || 500,
        invoice_auto_send_max_eur: policies.invoice_auto_send_max_eur || 1000,
        payout_auto_approve_max_eur: policies.payout_auto_approve_max_eur || 500,
        two_person_approval_above_eur: policies.two_person_approval_above_eur || 5000,
        matching_confidence_threshold: policies.matching_confidence_threshold || 0.85,
        matching_auto_approve_threshold: policies.matching_auto_approve_threshold || 0.95,
        payout_requires_contract: policies.payout_requires_contract ?? true,
        iban_change_cooldown_days: policies.iban_change_cooldown_days || 7,
        iban_verification_required: policies.iban_verification_required ?? true,
        hold_auto_escalate_days: policies.hold_auto_escalate_days || 3,
        base_currency: policies.base_currency || 'EUR',
      });
    }
  }, [policies]);

  const handleSave = () => {
    updatePolicies.mutate(formData);
  };

  // Demo delegations
  const demoDelegations: AuthorityDelegation[] = [
    { id: '1', company_id: '', role: 'Admin', max_invoice_send_eur: undefined, max_payout_approve_eur: undefined, max_hold_resolve_eur: undefined, max_dispute_create_eur: undefined, can_publish_automations: true, can_modify_policies: true, can_export_audit: true, can_manage_legal_hold: true },
    { id: '2', company_id: '', role: 'Finance Manager', max_invoice_send_eur: 25000, max_payout_approve_eur: 10000, max_hold_resolve_eur: 5000, max_dispute_create_eur: undefined, can_publish_automations: true, can_modify_policies: false, can_export_audit: true, can_manage_legal_hold: false },
    { id: '3', company_id: '', role: 'Planner', max_invoice_send_eur: 5000, max_payout_approve_eur: 1000, max_hold_resolve_eur: undefined, max_dispute_create_eur: 2500, can_publish_automations: false, can_modify_policies: false, can_export_audit: false, can_manage_legal_hold: false },
    { id: '4', company_id: '', role: 'Medewerker', max_invoice_send_eur: 1000, max_payout_approve_eur: undefined, max_hold_resolve_eur: undefined, max_dispute_create_eur: 500, can_publish_automations: false, can_modify_policies: false, can_export_audit: false, can_manage_legal_hold: false },
  ];

  const displayDelegations = delegations?.length ? delegations : demoDelegations;

  return (
    <DashboardLayout 
      title="Policy Center" 
      description="Centraal beheer van finance policies en autorisatie limieten"
    >
      <div className="space-y-6">
        <Tabs defaultValue="policies">
          <TabsList>
            <TabsTrigger value="policies">Finance Policies</TabsTrigger>
            <TabsTrigger value="delegation">Delegation of Authority</TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="mt-4 space-y-6">
            {/* Buffer Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                  Buffer Thresholds
                </CardTitle>
                <CardDescription>Minimale cash buffers voor veilige operatie</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min_buffer">Minimum Cash Buffer</Label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="min_buffer"
                      type="number"
                      value={formData.min_cash_buffer_eur}
                      onChange={(e) => setFormData({ ...formData, min_cash_buffer_eur: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Waarschuwing als buffer hieronder zakt</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="critical_buffer">Critical Buffer</Label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="critical_buffer"
                      type="number"
                      value={formData.critical_buffer_eur}
                      onChange={(e) => setFormData({ ...formData, critical_buffer_eur: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Kritieke alert en payout blokkade</p>
                </div>
              </CardContent>
            </Card>

            {/* POD Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  POD Requirements
                </CardTitle>
                <CardDescription>Proof of Delivery vereisten per factuurbedrag</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>POD standaard vereist</Label>
                    <p className="text-xs text-muted-foreground">Alle orders vereisen POD voor facturatie</p>
                  </div>
                  <Switch
                    checked={formData.pod_required_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, pod_required_default: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>POD verplicht boven bedrag</Label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.pod_required_above_eur}
                      onChange={(e) => setFormData({ ...formData, pod_required_above_eur: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  Approval Thresholds
                </CardTitle>
                <CardDescription>Limieten voor automatische en handmatige goedkeuring</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Auto-send factuur max</Label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.invoice_auto_send_max_eur}
                      onChange={(e) => setFormData({ ...formData, invoice_auto_send_max_eur: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Tot dit bedrag automatisch versturen</p>
                </div>
                <div className="space-y-2">
                  <Label>Auto-approve payout max</Label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.payout_auto_approve_max_eur}
                      onChange={(e) => setFormData({ ...formData, payout_auto_approve_max_eur: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Tot dit bedrag automatisch goedkeuren</p>
                </div>
                <div className="space-y-2">
                  <Label>Two-person approval boven</Label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.two_person_approval_above_eur}
                      onChange={(e) => setFormData({ ...formData, two_person_approval_above_eur: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Boven dit bedrag 2 personen vereist</p>
                </div>
              </CardContent>
            </Card>

            {/* Payout Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  Payout & IBAN Rules
                </CardTitle>
                <CardDescription>Regels voor veilige uitbetalingen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Contract vereist voor payout</Label>
                      <p className="text-xs text-muted-foreground">Alleen uitbetalen met actief contract</p>
                    </div>
                    <Switch
                      checked={formData.payout_requires_contract}
                      onCheckedChange={(checked) => setFormData({ ...formData, payout_requires_contract: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IBAN verificatie vereist</Label>
                      <p className="text-xs text-muted-foreground">Wijzigingen vereisen verificatie</p>
                    </div>
                    <Switch
                      checked={formData.iban_verification_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, iban_verification_required: checked })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>IBAN cooldown (dagen)</Label>
                    <Input
                      type="number"
                      value={formData.iban_change_cooldown_days}
                      onChange={(e) => setFormData({ ...formData, iban_change_cooldown_days: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Wachtperiode na IBAN wijziging</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Hold auto-escalatie (dagen)</Label>
                    <Input
                      type="number"
                      value={formData.hold_auto_escalate_days}
                      onChange={(e) => setFormData({ ...formData, hold_auto_escalate_days: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Escaleer onopgeloste holds na X dagen</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Matching Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-cyan-500" />
                  Matching Thresholds
                </CardTitle>
                <CardDescription>Confidence levels voor automatische matching</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Minimum confidence voor match</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.matching_confidence_threshold}
                    onChange={(e) => setFormData({ ...formData, matching_confidence_threshold: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Matches onder dit niveau worden genegeerd</p>
                </div>
                <div className="space-y-2">
                  <Label>Auto-approve threshold</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.matching_auto_approve_threshold}
                    onChange={(e) => setFormData({ ...formData, matching_auto_approve_threshold: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Boven dit niveau automatisch goedkeuren</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updatePolicies.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Policies Opslaan
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="delegation" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Delegation of Authority
                  </CardTitle>
                  <CardDescription>Limieten en permissies per rol</CardDescription>
                </div>
                <Dialog open={showNewRoleDialog} onOpenChange={setShowNewRoleDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Rol Toevoegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Rol</DialogTitle>
                      <DialogDescription>Configureer autorisatie limieten voor deze rol</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="role-name">Rol naam</Label>
                        <Input 
                          id="role-name" 
                          placeholder="bijv. Senior Planner"
                          value={newRole.name}
                          onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="max-invoice">Max Invoice Send (€)</Label>
                          <Input 
                            id="max-invoice" 
                            type="number"
                            placeholder="5000"
                            value={newRole.maxInvoice}
                            onChange={(e) => setNewRole({ ...newRole, maxInvoice: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max-payout">Max Payout Approve (€)</Label>
                          <Input 
                            id="max-payout" 
                            type="number"
                            placeholder="1000"
                            value={newRole.maxPayout}
                            onChange={(e) => setNewRole({ ...newRole, maxPayout: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewRoleDialog(false)}>Annuleren</Button>
                      <Button onClick={() => {
                        toast({ title: "Rol toegevoegd", description: `${newRole.name || 'Nieuwe rol'} is aangemaakt.` });
                        setShowNewRoleDialog(false);
                        setNewRole({ name: '', maxInvoice: '', maxPayout: '' });
                      }}>
                        Toevoegen
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol</TableHead>
                      <TableHead>Max Invoice Send</TableHead>
                      <TableHead>Max Payout Approve</TableHead>
                      <TableHead>Max Hold Resolve</TableHead>
                      <TableHead>Automations</TableHead>
                      <TableHead>Policies</TableHead>
                      <TableHead>Audit Export</TableHead>
                      <TableHead>Legal Hold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayDelegations.map((del) => (
                      <TableRow key={del.id}>
                        <TableCell className="font-medium">{del.role}</TableCell>
                        <TableCell>
                          {del.max_invoice_send_eur ? `€${del.max_invoice_send_eur.toLocaleString()}` : <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Onbeperkt</Badge>}
                        </TableCell>
                        <TableCell>
                          {del.max_payout_approve_eur ? `€${del.max_payout_approve_eur.toLocaleString()}` : del.role === 'Admin' ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Onbeperkt</Badge> : <Badge variant="outline" className="text-muted-foreground">Geen</Badge>}
                        </TableCell>
                        <TableCell>
                          {del.max_hold_resolve_eur ? `€${del.max_hold_resolve_eur.toLocaleString()}` : del.role === 'Admin' ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Onbeperkt</Badge> : <Badge variant="outline" className="text-muted-foreground">Geen</Badge>}
                        </TableCell>
                        <TableCell>
                          {del.can_publish_automations ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {del.can_modify_policies ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {del.can_export_audit ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {del.can_manage_legal_hold ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Escalatie Regels</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Wanneer een actie boven de limiet van een gebruiker valt, wordt deze automatisch geëscaleerd naar een gebruiker met hogere autorisatie.
                        Acties boven €{formData.two_person_approval_above_eur.toLocaleString()} vereisen altijd goedkeuring van 2 personen.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PolicyCenter;
