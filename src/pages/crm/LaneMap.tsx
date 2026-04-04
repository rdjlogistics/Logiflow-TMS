import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCharterGrowth } from '@/hooks/useCharterGrowth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Map, 
  TrendingUp, 
  Building2, 
  ArrowRight, 
  Plus,
  Search,
  Filter,
  RefreshCw,
  Route,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LaneMap = () => {
  const { lanes, lanesLoading, createLane } = useCharterGrowth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('map');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  
  // New state for customer linking
  const [showLinkCustomerDialog, setShowLinkCustomerDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);

  // Load customers when dialog opens
  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, company_name')
      .eq('is_active', true)
      .order('company_name')
      .limit(100);
    setCustomers(data || []);
  };

  const handleStatusFilter = (status: string, checked: boolean) => {
    if (checked) {
      setStatusFilters([...statusFilters, status]);
    } else {
      setStatusFilters(statusFilters.filter(s => s !== status));
    }
  };

  const filteredLanes = lanes.filter(lane => {
    const matchesSearch = lane.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lane.origin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lane.destination_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilters.length === 0) return matchesSearch;
    
    const hasMatchingStatus = lane.account_lane_profiles?.some(p => 
      statusFilters.includes(p.status)
    );
    
    return matchesSearch && hasMatchingStatus;
  });

  // Calculate stats
  const totalLanes = lanes.length;
  const activeLanes = lanes.filter(l => 
    l.account_lane_profiles?.some(p => p.status === 'ACTIVE')
  ).length;
  const prospectLanes = lanes.filter(l => 
    l.account_lane_profiles?.some(p => p.status === 'PROSPECT')
  ).length;

  const getSelectedLane = () => lanes.find(l => l.id === selectedLane);

  return (
    <DashboardLayout title="Lane Portfolio" description="Beheer uw transport lanes en klantrelaties">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLanes}</p>
                  <p className="text-xs text-muted-foreground">Totaal Lanes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{activeLanes}</p>
                  <p className="text-xs text-muted-foreground">Actieve Lanes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{prospectLanes}</p>
                  <p className="text-xs text-muted-foreground">Prospect Lanes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20">
                  <Truck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {lanes.reduce((acc, l) => acc + (l.account_lane_profiles?.length || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Klant-Lane Relaties</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek lanes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(statusFilters.length > 0 && "border-primary bg-primary/10")}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {statusFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {statusFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Filter op status</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filter-active"
                        checked={statusFilters.includes('ACTIVE')}
                        onCheckedChange={(checked) => handleStatusFilter('ACTIVE', !!checked)}
                      />
                      <Label htmlFor="filter-active" className="text-sm">Actief</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filter-prospect"
                        checked={statusFilters.includes('PROSPECT')}
                        onCheckedChange={(checked) => handleStatusFilter('PROSPECT', !!checked)}
                      />
                      <Label htmlFor="filter-prospect" className="text-sm">Prospect</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="filter-paused"
                        checked={statusFilters.includes('PAUSED')}
                        onCheckedChange={(checked) => handleStatusFilter('PAUSED', !!checked)}
                      />
                      <Label htmlFor="filter-paused" className="text-sm">Gepauzeerd</Label>
                    </div>
                  </div>
                  {statusFilters.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setStatusFilters([])}
                    >
                      Filters wissen
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-primary-glow"
              onClick={() => createLane.mutate({ origin_name: 'Nieuwe Origin', destination_name: 'Nieuwe Bestemming' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Lane
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              Kaart Weergave
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <Route className="h-4 w-4" />
              Lijst Weergave
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="h-[400px] bg-muted/30 flex items-center justify-center rounded-lg border-2 border-dashed border-border/50">
                  <div className="text-center">
                    <Map className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">Lane heatmap visualisatie</p>
                    <p className="text-xs text-muted-foreground mt-1">Integratie met kaart-component beschikbaar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Lanes List */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Lanes ({filteredLanes.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    {lanesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredLanes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Geen lanes gevonden</p>
                      </div>
                    ) : (
                      filteredLanes.map((lane) => (
                        <button
                          key={lane.id}
                          onClick={() => setSelectedLane(lane.id)}
                          className={cn(
                            'w-full flex items-center justify-between p-4 border-b border-border/40 text-left hover:bg-muted/50 transition-colors',
                            selectedLane === lane.id && 'bg-primary/5 border-l-2 border-l-primary'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-muted">
                              <Route className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{lane.origin_name}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{lane.destination_name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {lane.account_lane_profiles && lane.account_lane_profiles.length > 0 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {lane.account_lane_profiles.length} klanten
                                  </Badge>
                                )}
                                {lane.tags?.map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lane Detail */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Lane Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLane && getSelectedLane() ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{getSelectedLane()?.origin_name}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">{getSelectedLane()?.destination_name}</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-3">Gekoppelde Klanten</h4>
                        {getSelectedLane()?.account_lane_profiles?.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Geen klanten gekoppeld</p>
                        ) : (
                          <div className="space-y-2">
                            {getSelectedLane()?.account_lane_profiles?.map((profile) => (
                              <div key={profile.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{profile.customer?.company_name}</span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    profile.status === 'ACTIVE' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                                    profile.status === 'PROSPECT' && 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                                    profile.status === 'PAUSED' && 'bg-gray-500/10 text-gray-600 border-gray-500/30'
                                  )}
                                >
                                  {profile.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button className="w-full mt-4" onClick={() => setShowLinkCustomerDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Klant Koppelen
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Selecteer een lane om details te zien</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Link Customer Dialog */}
        <Dialog open={showLinkCustomerDialog} onOpenChange={(open) => { setShowLinkCustomerDialog(open); if (open) loadCustomers(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Klant Koppelen aan Lane</DialogTitle>
              <DialogDescription>
                Koppel een klant aan {getSelectedLane()?.origin_name} → {getSelectedLane()?.destination_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <span className="font-medium">{getSelectedLane()?.origin_name}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{getSelectedLane()?.destination_name}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Klant selecteren</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een klant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="_none" disabled>Geen klanten gevonden</SelectItem>
                    ) : (
                      customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="PROSPECT">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                    <SelectItem value="ACTIVE">Actief</SelectItem>
                    <SelectItem value="PAUSED">Gepauzeerd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowLinkCustomerDialog(false);
                setSelectedCustomerId('');
              }}>Annuleren</Button>
              <Button 
                onClick={async () => {
                  if (!selectedLane || !selectedCustomerId) return;
                  setLinkingCustomer(true);
                  try {
                    const { error } = await supabase
                      .from('account_lane_profiles')
                      .insert({
                        account_id: selectedCustomerId!,
                        lane_id: selectedLane,
                        tenant_id: (await supabase.rpc('get_user_company', { p_user_id: (await supabase.auth.getUser()).data.user?.id ?? '' })).data ?? '',
                        status: 'PROSPECT',
                      } as any);
                    if (error) throw error;
                    toast({ 
                      title: "Klant gekoppeld ✓", 
                      description: `Klant is succesvol gekoppeld aan de lane.` 
                    });
                    setShowLinkCustomerDialog(false);
                    setSelectedCustomerId('');
                  } catch (err: any) {
                    console.error('Link customer error:', err);
                    toast({ title: "Koppelen mislukt", description: err?.message || "Fout bij koppelen", variant: "destructive" });
                  } finally {
                    setLinkingCustomer(false);
                  }
                }}
                disabled={linkingCustomer || !selectedCustomerId}
              >
                {linkingCustomer ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Koppelen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LaneMap;
