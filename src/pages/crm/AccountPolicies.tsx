import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { 
  Shield, 
  Building2, 
  Settings2, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Save,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountPolicy {
  id: string;
  account_id: string;
  tracking_privacy_km: number | null;
  pod_required: boolean | null;
  auto_invoice: boolean | null;
  waiting_time_auto: boolean | null;
  payment_terms_days: number | null;
  min_margin_percent_override: number | null;
  max_credit_limit: number | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ARCHIVED';
  approved_at: string | null;
  customer?: {
    id: string;
    company_name: string;
  };
}

const AccountPolicies = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<AccountPolicy | null>(null);
  const [editedPolicy, setEditedPolicy] = useState<Partial<AccountPolicy>>({});

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['account-policies', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('account_policy_overrides')
        .select(`
          *,
          customer:customers (id, company_name)
        `)
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccountPolicy[];
    },
    enabled: !!company?.id,
  });

  const updatePolicy = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<AccountPolicy> }) => {
      const { error } = await supabase
        .from('account_policy_overrides')
        .update({
          ...data.updates,
          status: 'PENDING_APPROVAL', // Require approval for changes
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-policies'] });
      toast({ title: 'Policy bijgewerkt', description: 'Wacht op goedkeuring' });
      setSelectedPolicy(null);
    },
  });

  const approvePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('account_policy_overrides')
        .update({
          status: 'ACTIVE',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-policies'] });
      toast({ title: 'Policy goedgekeurd' });
    },
  });

  const filteredPolicies = policies.filter(p =>
    p.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: policies.length,
    active: policies.filter(p => p.status === 'ACTIVE').length,
    pending: policies.filter(p => p.status === 'PENDING_APPROVAL').length,
    draft: policies.filter(p => p.status === 'DRAFT').length,
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      ACTIVE: { label: 'Actief', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
      PENDING_APPROVAL: { label: 'Wacht op goedkeuring', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
      DRAFT: { label: 'Concept', color: 'bg-gray-500/10 text-gray-600 border-gray-500/30', icon: Settings2 },
      ARCHIVED: { label: 'Gearchiveerd', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: AlertTriangle },
    };
    return configs[status] || configs.DRAFT;
  };

  const handleOpenEdit = (policy: AccountPolicy) => {
    setSelectedPolicy(policy);
    setEditedPolicy({
      tracking_privacy_km: policy.tracking_privacy_km,
      pod_required: policy.pod_required,
      auto_invoice: policy.auto_invoice,
      waiting_time_auto: policy.waiting_time_auto,
      payment_terms_days: policy.payment_terms_days,
      min_margin_percent_override: policy.min_margin_percent_override,
      max_credit_limit: policy.max_credit_limit,
    });
  };

  const handleSave = () => {
    if (!selectedPolicy) return;
    updatePolicy.mutate({ id: selectedPolicy.id, updates: editedPolicy });
  };

  return (
    <DashboardLayout title="Account Policies" description="Klant-specifieke regels en commandments beheren">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Totaal Policies</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Actief</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Wacht op Goedkeuring</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gray-500/20">
                  <Settings2 className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                  <p className="text-xs text-muted-foreground">Concept</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek klanten..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Policies List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">Geen policies gevonden</p>
              <p className="text-sm text-muted-foreground mt-1">Policies worden automatisch aangemaakt bij klantconfiguratie</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPolicies.map((policy) => {
              const statusConfig = getStatusConfig(policy.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <Card 
                  key={policy.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => handleOpenEdit(policy)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">{policy.customer?.company_name}</CardTitle>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px]', statusConfig.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">POD Vereist</span>
                        <span className="font-medium">{policy.pod_required ? 'Ja' : 'Nee'}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">Auto Factuur</span>
                        <span className="font-medium">{policy.auto_invoice ? 'Ja' : 'Nee'}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">Betaaltermijn</span>
                        <span className="font-medium">{policy.payment_terms_days || 30} dagen</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">Min Marge</span>
                        <span className="font-medium">{policy.min_margin_percent_override || '-'}%</span>
                      </div>
                    </div>
                    
                    {policy.status === 'PENDING_APPROVAL' && (
                      <Button 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={(e) => { e.stopPropagation(); approvePolicy.mutate(policy.id); }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Goedkeuren
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedPolicy?.customer?.company_name}</SheetTitle>
            <SheetDescription>Policy instellingen bewerken</SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>POD Vereist</Label>
                  <p className="text-xs text-muted-foreground">Handtekening/foto verplicht bij aflevering</p>
                </div>
                <Switch 
                  checked={editedPolicy.pod_required ?? false}
                  onCheckedChange={(checked) => setEditedPolicy(prev => ({ ...prev, pod_required: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Facturatie</Label>
                  <p className="text-xs text-muted-foreground">Automatisch factureren na aflevering</p>
                </div>
                <Switch 
                  checked={editedPolicy.auto_invoice ?? false}
                  onCheckedChange={(checked) => setEditedPolicy(prev => ({ ...prev, auto_invoice: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Wachttijd</Label>
                  <p className="text-xs text-muted-foreground">Automatisch wachttijd berekenen</p>
                </div>
                <Switch 
                  checked={editedPolicy.waiting_time_auto ?? false}
                  onCheckedChange={(checked) => setEditedPolicy(prev => ({ ...prev, waiting_time_auto: checked }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tracking Privacy (km)</Label>
                <Input 
                  type="number"
                  value={editedPolicy.tracking_privacy_km ?? ''}
                  onChange={(e) => setEditedPolicy(prev => ({ ...prev, tracking_privacy_km: Number(e.target.value) }))}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">Afstand waarbinnen live tracking zichtbaar is</p>
              </div>

              <div className="space-y-2">
                <Label>Betaaltermijn (dagen)</Label>
                <Input 
                  type="number"
                  value={editedPolicy.payment_terms_days ?? ''}
                  onChange={(e) => setEditedPolicy(prev => ({ ...prev, payment_terms_days: Number(e.target.value) }))}
                  placeholder="30"
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Marge (%)</Label>
                <Input 
                  type="number"
                  value={editedPolicy.min_margin_percent_override ?? ''}
                  onChange={(e) => setEditedPolicy(prev => ({ ...prev, min_margin_percent_override: Number(e.target.value) }))}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">AI blokkeert offertes onder dit percentage</p>
              </div>

              <div className="space-y-2">
                <Label>Max Kredietlimiet (€)</Label>
                <Input 
                  type="number"
                  value={editedPolicy.max_credit_limit ?? ''}
                  onChange={(e) => setEditedPolicy(prev => ({ ...prev, max_credit_limit: Number(e.target.value) }))}
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={updatePolicy.isPending}
              >
                {updatePolicy.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Opslaan (vereist goedkeuring)
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default AccountPolicies;
