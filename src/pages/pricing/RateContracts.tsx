import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRateContractEngine, RateContract, Zone, Accessorial } from "@/hooks/useRateContractEngine";
import { EditContractDialog } from "@/components/pricing/EditContractDialog";
import { EditZoneDialog } from "@/components/pricing/EditZoneDialog";
import { EditAccessorialDialog } from "@/components/pricing/EditAccessorialDialog";
import { ContractLanesDialog } from "@/components/pricing/ContractLanesDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { 
  FileText, Plus, Search, MapPin, Euro, 
  CheckCircle, Clock, Edit, Copy, Trash2,
  AlertTriangle, Loader2, Route, Shield, 
  Calendar, ChevronRight, Filter
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { nl } from "date-fns/locale";

type ContractFilter = 'all' | 'active' | 'draft' | 'expiring' | 'expired';

const RateContracts = () => {
  const [activeTab, setActiveTab] = useState("contracts");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractFilter, setContractFilter] = useState<ContractFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"contract" | "zone" | "accessorial">("contract");
  
  const [editContractOpen, setEditContractOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RateContract | null>(null);
  const [editZoneOpen, setEditZoneOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [editAccessorialOpen, setEditAccessorialOpen] = useState(false);
  const [selectedAccessorial, setSelectedAccessorial] = useState<Accessorial | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'contract' | 'zone' | 'accessorial'; id: string; name: string } | null>(null);
  
  const [lanesDialogOpen, setLanesDialogOpen] = useState(false);
  const [lanesContract, setLanesContract] = useState<RateContract | null>(null);
  
  const [contractForm, setContractForm] = useState({ name: '', contract_type: 'customer' as 'customer' | 'carrier', effective_from: '', effective_to: '' });
  const [zoneForm, setZoneForm] = useState({ name: '', match_type: 'postcode_range' as 'postcode_range' | 'city' | 'country' | 'geo_polygon' });
  const [accessorialForm, setAccessorialForm] = useState({ code: '', name: '', calc_type: 'fixed' as 'fixed' | 'per_km' | 'per_stop' | 'per_min' | 'percent', amount: 0 });

  const { 
    contracts, zones, accessorials, ratingResults, isLoading,
    createContract, createZone, createAccessorial,
    updateContract, updateZone, updateAccessorial,
    deleteContract, deleteZone, deleteAccessorial,
    duplicateContract, duplicateZone, updateContractStatus
  } = useRateContractEngine();

  // Contract filtering with business logic
  const filteredContracts = useMemo(() => {
    let filtered = contracts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.counterparty_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const now = new Date();
    switch (contractFilter) {
      case 'active':
        filtered = filtered.filter(c => c.status === 'active');
        break;
      case 'draft':
        filtered = filtered.filter(c => c.status === 'draft');
        break;
      case 'expiring':
        filtered = filtered.filter(c => 
          c.effective_to && differenceInDays(new Date(c.effective_to), now) <= 30 && differenceInDays(new Date(c.effective_to), now) > 0
        );
        break;
      case 'expired':
        filtered = filtered.filter(c => 
          c.effective_to && isPast(new Date(c.effective_to))
        );
        break;
    }
    return filtered;
  }, [contracts, searchTerm, contractFilter]);

  const filteredZones = zones.filter(z => z.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAccessorials = accessorials.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const pendingApproval = contracts.filter(c => c.approval_status === 'pending').length;
  const expiringContracts = contracts.filter(c => 
    c.effective_to && differenceInDays(new Date(c.effective_to), new Date()) <= 30 && differenceInDays(new Date(c.effective_to), new Date()) > 0
  ).length;

  const handleCreateItem = async () => {
    try {
      if (createType === 'contract') {
        await createContract.mutateAsync({
          name: contractForm.name,
          contract_type: contractForm.contract_type,
          effective_from: contractForm.effective_from || new Date().toISOString(),
          effective_to: contractForm.effective_to || null,
        });
        setContractForm({ name: '', contract_type: 'customer', effective_from: '', effective_to: '' });
      } else if (createType === 'zone') {
        await createZone.mutateAsync({ name: zoneForm.name, match_type: zoneForm.match_type });
        setZoneForm({ name: '', match_type: 'postcode_range' });
      } else if (createType === 'accessorial') {
        await createAccessorial.mutateAsync({
          code: accessorialForm.code, name: accessorialForm.name,
          calc_type: accessorialForm.calc_type, amount: accessorialForm.amount,
        });
        setAccessorialForm({ code: '', name: '', calc_type: 'fixed', amount: 0 });
      }
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleApproveContract = async (contract: RateContract) => {
    await updateContractStatus.mutateAsync({ id: contract.id, approval_status: 'approved' });
  };

  const handleActivateContract = async (contract: RateContract) => {
    await updateContractStatus.mutateAsync({ id: contract.id, status: 'active', approval_status: 'approved' });
  };

  const handleDeleteClick = (type: 'contract' | 'zone' | 'accessorial', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'contract') await deleteContract.mutateAsync(deleteTarget.id);
      else if (deleteTarget.type === 'zone') await deleteZone.mutateAsync(deleteTarget.id);
      else if (deleteTarget.type === 'accessorial') await deleteAccessorial.mutateAsync(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleSaveContract = async (data: Partial<RateContract> & { id: string }) => {
    await updateContract.mutateAsync(data);
    setEditContractOpen(false);
    setSelectedContract(null);
  };

  const handleSaveZone = async (data: Partial<Zone> & { id: string }) => {
    await updateZone.mutateAsync(data);
    setEditZoneOpen(false);
    setSelectedZone(null);
  };

  const handleSaveAccessorial = async (data: Partial<Accessorial> & { id: string }) => {
    await updateAccessorial.mutateAsync(data);
    setEditAccessorialOpen(false);
    setSelectedAccessorial(null);
  };

  const getContractExpiryInfo = (contract: RateContract) => {
    if (!contract.effective_to) return null;
    const daysLeft = differenceInDays(new Date(contract.effective_to), new Date());
    if (daysLeft < 0) return { label: 'Verlopen', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
    if (daysLeft <= 7) return { label: `${daysLeft}d`, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20 animate-pulse' };
    if (daysLeft <= 30) return { label: `${daysLeft}d`, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Actief</Badge>;
      case "draft": return <Badge className="bg-muted text-muted-foreground border-border">Concept</Badge>;
      case "expired": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Verlopen</Badge>;
      case "archived": return <Badge variant="outline" className="text-muted-foreground">Gearchiveerd</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Goedgekeurd</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />In afwachting</Badge>;
      case "rejected": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Afgewezen</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border-border">Concept</Badge>;
    }
  };

  const isDeleting = deleteContract.isPending || deleteZone.isPending || deleteAccessorial.isPending;
  const isCopying = duplicateContract.isPending || duplicateZone.isPending;

  // Transport default accessorials
  const prefillAccessorial = (type: string) => {
    const defaults: Record<string, { code: string; name: string; calc_type: 'fixed' | 'per_km' | 'per_stop' | 'per_min' | 'percent'; amount: number }> = {
      waiting: { code: 'WACHT', name: 'Wachttijd', calc_type: 'per_min', amount: 0.75 },
      liftgate: { code: 'KLEP', name: 'Laadklep gebruik', calc_type: 'fixed', amount: 25 },
      adr: { code: 'ADR', name: 'ADR toeslag (gevaarlijke stoffen)', calc_type: 'percent', amount: 15 },
      pallet_swap: { code: 'PWISSEL', name: 'Palletwissel', calc_type: 'fixed', amount: 7.50 },
      weekend: { code: 'WEEKEND', name: 'Weekend toeslag', calc_type: 'percent', amount: 50 },
      night: { code: 'NACHT', name: 'Nachtlevering', calc_type: 'percent', amount: 25 },
    };
    const d = defaults[type];
    if (d) setAccessorialForm(d);
  };

  return (
    <DashboardLayout title="Tarieven & Contracten" description="Rate & Contract Engine voor revenue assurance">
      {/* Elite Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Actieve Contracten', value: activeContracts, icon: FileText, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
          { label: 'In Afwachting', value: pendingApproval, icon: Clock, gradient: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-500' },
          { label: 'Verloopt Binnenkort', value: expiringContracts, icon: AlertTriangle, gradient: 'from-destructive/20 to-destructive/5', iconColor: 'text-destructive' },
          { label: 'Zones & Toeslagen', value: zones.length + accessorials.length, icon: MapPin, gradient: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} variant="glass" className="overflow-hidden">
            <CardContent className="p-4 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground leading-tight">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border/30">
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            {/* Tabs - horizontally scrollable on mobile */}
            <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="min-w-max">
                  <TabsTrigger value="contracts" className="gap-1.5 text-xs sm:text-sm">
                    <FileText className="h-3.5 w-3.5" />Contracten
                  </TabsTrigger>
                  <TabsTrigger value="zones" className="gap-1.5 text-xs sm:text-sm">
                    <MapPin className="h-3.5 w-3.5" />Zones
                  </TabsTrigger>
                  <TabsTrigger value="accessorials" className="gap-1.5 text-xs sm:text-sm">
                    <Euro className="h-3.5 w-3.5" />Toeslagen
                  </TabsTrigger>
                  <TabsTrigger value="monitor" className="gap-1.5 text-xs sm:text-sm">
                    <Shield className="h-3.5 w-3.5" />Monitor
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Search + Filter + Create */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Zoeken..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={() => {
                setCreateType(activeTab === "zones" ? "zone" : activeTab === "accessorials" ? "accessorial" : "contract");
                setShowCreateDialog(true);
              }}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nieuw</span>
              </Button>
            </div>

            {/* Quick filters for contracts */}
            {activeTab === "contracts" && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-6 px-6">
                {([
                  { key: 'all', label: 'Alle', count: contracts.length },
                  { key: 'active', label: 'Actief', count: activeContracts },
                  { key: 'draft', label: 'Concept', count: contracts.filter(c => c.status === 'draft').length },
                  { key: 'expiring', label: 'Verloopt', count: expiringContracts },
                  { key: 'expired', label: 'Verlopen', count: contracts.filter(c => c.effective_to && isPast(new Date(c.effective_to))).length },
                ] as { key: ContractFilter; label: string; count: number }[]).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setContractFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      contractFilter === f.key 
                        ? 'bg-primary/10 text-primary border-primary/30' 
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    }`}
                  >
                    {f.label}
                    {f.count > 0 && <span className="text-[10px] opacity-70">({f.count})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* === CONTRACTS TAB === */}
              {activeTab === "contracts" && (
                filteredContracts.length === 0 ? (
                  <EmptyStateElite
                    icon={FileText}
                    title="Nog geen contracten"
                    description="Maak je eerste contract aan om te beginnen met tariefbeheer."
                    actionLabel="Nieuw Contract"
                    onAction={() => { setCreateType("contract"); setShowCreateDialog(true); }}
                  />
                ) : (
                  <>
                    {/* Mobile card layout */}
                    <div className="md:hidden space-y-2">
                      {filteredContracts.map((contract) => {
                        const expiryInfo = getContractExpiryInfo(contract);
                        return (
                          <div key={contract.id} className="p-3.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm active:scale-[0.98] transition-transform">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm truncate">{contract.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {contract.contract_type === 'customer' ? 'Klant' : 'Charter'} · v{contract.version}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {getStatusBadge(contract.status)}
                                {expiryInfo && (
                                  <Badge className={`${expiryInfo.bg} ${expiryInfo.color} text-[10px]`}>
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{expiryInfo.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                              {getApprovalBadge(contract.approval_status)}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(contract.effective_from), "d MMM yy", { locale: nl })}
                                {contract.effective_to && <> → {format(new Date(contract.effective_to), "d MMM yy", { locale: nl })}</>}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 border-t border-border/20 pt-2.5 -mx-1">
                              {contract.status === 'draft' && contract.approval_status === 'pending' && (
                                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-green-600" onClick={() => handleApproveContract(contract)}>
                                  <CheckCircle className="h-3.5 w-3.5" />Goedkeuren
                                </Button>
                              )}
                              {contract.approval_status === 'approved' && contract.status === 'draft' && (
                                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary" onClick={() => handleActivateContract(contract)}>
                                  <Shield className="h-3.5 w-3.5" />Activeren
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => { setLanesContract(contract); setLanesDialogOpen(true); }}>
                                <Route className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedContract(contract); setEditContractOpen(true); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateContract.mutateAsync(contract.id)} disabled={isCopying}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick('contract', contract.id, contract.name)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30">
                            <TableHead>Naam</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Goedkeuring</TableHead>
                            <TableHead>Geldigheid</TableHead>
                            <TableHead>Versie</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredContracts.map((contract) => {
                            const expiryInfo = getContractExpiryInfo(contract);
                            return (
                              <TableRow key={contract.id} className="border-border/20">
                                <TableCell className="font-medium">{contract.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{contract.contract_type === 'customer' ? 'Klant' : 'Charter'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    {getStatusBadge(contract.status)}
                                    {expiryInfo && (
                                      <Badge className={`${expiryInfo.bg} ${expiryInfo.color} text-[10px]`}>
                                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{expiryInfo.label}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{getApprovalBadge(contract.approval_status)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(contract.effective_from), "d MMM yy", { locale: nl })}
                                  {contract.effective_to && <> → {format(new Date(contract.effective_to), "d MMM yy", { locale: nl })}</>}
                                </TableCell>
                                <TableCell>v{contract.version}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-0.5">
                                    {contract.status === 'draft' && contract.approval_status === 'pending' && (
                                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-green-600" onClick={() => handleApproveContract(contract)}>
                                        <CheckCircle className="h-3.5 w-3.5" />Goedkeuren
                                      </Button>
                                    )}
                                    {contract.approval_status === 'approved' && contract.status === 'draft' && (
                                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary" onClick={() => handleActivateContract(contract)}>
                                        <Shield className="h-3.5 w-3.5" />Activeren
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLanesContract(contract); setLanesDialogOpen(true); }}>
                                      <Route className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedContract(contract); setEditContractOpen(true); }}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateContract.mutateAsync(contract.id)} disabled={isCopying}>
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick('contract', contract.id, contract.name)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )
              )}

              {/* === ZONES TAB === */}
              {activeTab === "zones" && (
                filteredZones.length === 0 ? (
                  <EmptyStateElite icon={MapPin} title="Nog geen zones" description="Definieer zones voor je tariefstructuur." actionLabel="Nieuwe Zone" onAction={() => { setCreateType("zone"); setShowCreateDialog(true); }} />
                ) : (
                  <>
                    <div className="md:hidden space-y-2">
                      {filteredZones.map((zone) => (
                        <div key={zone.id} className="p-3.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm truncate">{zone.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {zone.match_type === 'postcode_range' ? 'Postcode' : zone.match_type === 'city' ? 'Stad' : zone.match_type === 'country' ? 'Land' : 'Geo-polygon'}
                                </p>
                              </div>
                            </div>
                            <Badge variant={zone.is_active ? "default" : "secondary"} className="text-[10px]">
                              {zone.is_active ? "Actief" : "Inactief"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 border-t border-border/20 pt-2 -mx-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => { setSelectedZone(zone); setEditZoneOpen(true); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateZone.mutateAsync(zone.id)} disabled={isCopying}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick('zone', zone.id, zone.name)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30">
                            <TableHead>Zone Naam</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredZones.map((zone) => (
                            <TableRow key={zone.id} className="border-border/20">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />{zone.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {zone.match_type === 'postcode_range' ? 'Postcode' : zone.match_type === 'city' ? 'Stad' : zone.match_type === 'country' ? 'Land' : 'Geo-polygon'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={zone.is_active ? "default" : "secondary"}>{zone.is_active ? "Actief" : "Inactief"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedZone(zone); setEditZoneOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateZone.mutateAsync(zone.id)} disabled={isCopying}><Copy className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick('zone', zone.id, zone.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )
              )}

              {/* === ACCESSORIALS TAB === */}
              {activeTab === "accessorials" && (
                filteredAccessorials.length === 0 ? (
                  <EmptyStateElite icon={Euro} title="Nog geen toeslagen" description="Definieer toeslagen voor extra services." actionLabel="Nieuwe Toeslag" onAction={() => { setCreateType("accessorial"); setShowCreateDialog(true); }} />
                ) : (
                  <>
                    <div className="md:hidden space-y-2">
                      {filteredAccessorials.map((acc) => (
                        <div key={acc.id} className="p-3.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <h4 className="font-semibold text-sm">{acc.name}</h4>
                              <p className="text-xs text-muted-foreground font-mono">{acc.code}</p>
                            </div>
                            <p className="text-lg font-bold">
                              {acc.calc_type === 'percent' ? `${acc.amount}%` : `€${acc.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Badge variant="outline" className="text-[10px]">
                              {acc.applies_to === 'customer' ? 'Klant' : acc.applies_to === 'carrier' ? 'Charter' : 'Beide'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {acc.calc_type === 'fixed' ? 'Vast' : acc.calc_type === 'per_km' ? '/km' : acc.calc_type === 'per_stop' ? '/stop' : acc.calc_type === 'per_min' ? '/min' : '%'}
                            </Badge>
                            <Badge variant={acc.is_active ? "default" : "secondary"} className="text-[10px]">
                              {acc.is_active ? "Actief" : "Inactief"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 border-t border-border/20 pt-2 -mx-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => { setSelectedAccessorial(acc); setEditAccessorialOpen(true); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick('accessorial', acc.id, acc.name)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30">
                            <TableHead>Code</TableHead>
                            <TableHead>Naam</TableHead>
                            <TableHead>Toepassing</TableHead>
                            <TableHead>Berekening</TableHead>
                            <TableHead className="text-right">Bedrag</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAccessorials.map((acc) => (
                            <TableRow key={acc.id} className="border-border/20">
                              <TableCell className="font-mono font-medium">{acc.code}</TableCell>
                              <TableCell>{acc.name}</TableCell>
                              <TableCell><Badge variant="outline">{acc.applies_to === 'customer' ? 'Klant' : acc.applies_to === 'carrier' ? 'Charter' : 'Beide'}</Badge></TableCell>
                              <TableCell><Badge variant="secondary">{acc.calc_type === 'fixed' ? 'Vast' : acc.calc_type === 'per_km' ? '/km' : acc.calc_type === 'per_stop' ? '/stop' : acc.calc_type === 'per_min' ? '/min' : '%'}</Badge></TableCell>
                              <TableCell className="text-right font-medium">{acc.calc_type === 'percent' ? `${acc.amount}%` : `€${acc.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`}</TableCell>
                              <TableCell><Badge variant={acc.is_active ? "default" : "secondary"}>{acc.is_active ? "Actief" : "Inactief"}</Badge></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedAccessorial(acc); setEditAccessorialOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick('accessorial', acc.id, acc.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )
              )}

              {/* === RATING MONITOR TAB === */}
              {activeTab === "monitor" && (
                ratingResults.length === 0 ? (
                  <EmptyStateElite icon={Shield} title="Nog geen rating resultaten" description="Rating resultaten verschijnen hier zodra orders worden geprijsd." />
                ) : (
                  <>
                    <div className="md:hidden space-y-2">
                      {ratingResults.map((result) => {
                        const marginAmount = result.sell_total_excl - result.buy_total_excl;
                        const marginPercent = result.sell_total_excl > 0 ? (marginAmount / result.sell_total_excl) * 100 : 0;
                        const warnings = result.warnings_json as string[];
                        return (
                          <div key={result.id} className="p-3.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-medium">{result.order_id.slice(0, 8)}</span>
                              <Badge variant={marginPercent >= 25 ? "default" : marginPercent >= 20 ? "secondary" : "destructive"}>
                                {marginPercent.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Verkoop: €{result.sell_total_excl.toLocaleString('nl-NL')}</span>
                              <span className="text-muted-foreground">Inkoop: €{result.buy_total_excl.toLocaleString('nl-NL')}</span>
                            </div>
                            {warnings && warnings.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-amber-500">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="text-xs">{warnings.length} waarschuwing(en)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30">
                            <TableHead>Order ID</TableHead>
                            <TableHead className="text-right">Verkoop</TableHead>
                            <TableHead className="text-right">Inkoop</TableHead>
                            <TableHead className="text-right">Marge</TableHead>
                            <TableHead>Waarschuwingen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ratingResults.map((result) => {
                            const marginAmount = result.sell_total_excl - result.buy_total_excl;
                            const marginPercent = result.sell_total_excl > 0 ? (marginAmount / result.sell_total_excl) * 100 : 0;
                            const warnings = result.warnings_json as string[];
                            return (
                              <TableRow key={result.id} className="border-border/20">
                                <TableCell className="font-mono font-medium">{result.order_id.slice(0, 8)}</TableCell>
                                <TableCell className="text-right">€{result.sell_total_excl.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right text-muted-foreground">€{result.buy_total_excl.toLocaleString('nl-NL')}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={marginPercent >= 25 ? "default" : marginPercent >= 20 ? "secondary" : "destructive"}>
                                    {marginPercent.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {warnings && warnings.length > 0 ? (
                                    <div className="flex items-center gap-1 text-amber-500">
                                      <AlertTriangle className="h-4 w-4" /><span className="text-xs">{warnings.length}</span>
                                    </div>
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createType === "contract" ? "Nieuw Contract" : createType === "zone" ? "Nieuwe Zone" : "Nieuwe Toeslag"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {createType === "contract" && (
              <>
                <div className="space-y-2">
                  <Label>Naam</Label>
                  <Input placeholder="Contract naam" value={contractForm.name} onChange={(e) => setContractForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={contractForm.contract_type} onValueChange={(v) => setContractForm(prev => ({ ...prev, contract_type: v as 'customer' | 'carrier' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Klant</SelectItem>
                      <SelectItem value="carrier">Charter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Geldig vanaf</Label>
                    <Input type="date" value={contractForm.effective_from} onChange={(e) => setContractForm(prev => ({ ...prev, effective_from: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Geldig tot</Label>
                    <Input type="date" value={contractForm.effective_to} onChange={(e) => setContractForm(prev => ({ ...prev, effective_to: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
            {createType === "zone" && (
              <>
                <div className="space-y-2">
                  <Label>Zone Naam</Label>
                  <Input placeholder="Zone naam" value={zoneForm.name} onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <Select value={zoneForm.match_type} onValueChange={(v) => setZoneForm(prev => ({ ...prev, match_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postcode_range">Postcode Range</SelectItem>
                      <SelectItem value="city">Stad</SelectItem>
                      <SelectItem value="country">Land</SelectItem>
                      <SelectItem value="geo_polygon">Geo-polygon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {createType === "accessorial" && (
              <>
                {/* Quick prefill buttons for transport defaults */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Snelkeuze (transport standaarden)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'waiting', label: 'Wachttijd' },
                      { key: 'liftgate', label: 'Laadklep' },
                      { key: 'adr', label: 'ADR' },
                      { key: 'pallet_swap', label: 'Palletwissel' },
                      { key: 'weekend', label: 'Weekend' },
                      { key: 'night', label: 'Nacht' },
                    ].map(d => (
                      <button key={d.key} onClick={() => prefillAccessorial(d.key)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input placeholder="LIFT" value={accessorialForm.code} onChange={(e) => setAccessorialForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} maxLength={10} className="uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label>Naam</Label>
                    <Input placeholder="Laadklep gebruik" value={accessorialForm.name} onChange={(e) => setAccessorialForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Berekening</Label>
                    <Select value={accessorialForm.calc_type} onValueChange={(v) => setAccessorialForm(prev => ({ ...prev, calc_type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Vast bedrag</SelectItem>
                        <SelectItem value="per_km">Per kilometer</SelectItem>
                        <SelectItem value="per_stop">Per stop</SelectItem>
                        <SelectItem value="per_min">Per minuut</SelectItem>
                        <SelectItem value="percent">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrag</Label>
                    <Input type="number" step="0.01" placeholder="25.00" value={accessorialForm.amount} onChange={(e) => setAccessorialForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreateItem} disabled={createContract.isPending || createZone.isPending || createAccessorial.isPending}>
              {(createContract.isPending || createZone.isPending || createAccessorial.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialogs */}
      <EditContractDialog open={editContractOpen} onOpenChange={setEditContractOpen} contract={selectedContract} onSave={handleSaveContract} isLoading={updateContract.isPending} />
      <EditZoneDialog open={editZoneOpen} onOpenChange={setEditZoneOpen} zone={selectedZone} onSave={handleSaveZone} isLoading={updateZone.isPending} />
      <EditAccessorialDialog open={editAccessorialOpen} onOpenChange={setEditAccessorialOpen} accessorial={selectedAccessorial} onSave={handleSaveAccessorial} isLoading={updateAccessorial.isPending} />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`${deleteTarget?.type === 'contract' ? 'Contract' : deleteTarget?.type === 'zone' ? 'Zone' : 'Toeslag'} verwijderen`}
        description={`Weet je zeker dat je "${deleteTarget?.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      <ContractLanesDialog open={lanesDialogOpen} onOpenChange={setLanesDialogOpen} contract={lanesContract} zones={zones} />
    </DashboardLayout>
  );
};

// Elite Empty State component
function EmptyStateElite({ icon: Icon, title, description, actionLabel, onAction }: {
  icon: React.ElementType; title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 border border-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />{actionLabel}
        </Button>
      )}
    </div>
  );
}

export default RateContracts;
