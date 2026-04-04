import React, { useState } from "react";
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
import { useRateContractEngine, RateContract, Zone, Accessorial } from "@/hooks/useRateContractEngine";
import { EditContractDialog } from "@/components/pricing/EditContractDialog";
import { EditZoneDialog } from "@/components/pricing/EditZoneDialog";
import { EditAccessorialDialog } from "@/components/pricing/EditAccessorialDialog";
import { ContractLanesDialog } from "@/components/pricing/ContractLanesDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { EmptyState } from "@/components/pricing/EmptyState";
import { 
  FileText, Plus, Search, MapPin, Euro, 
  CheckCircle, Clock, Edit, Copy, Trash2,
  AlertTriangle, Loader2, Route
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const RateContracts = () => {
  const [activeTab, setActiveTab] = useState("contracts");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"contract" | "zone" | "accessorial">("contract");
  
  // Edit dialog states
  const [editContractOpen, setEditContractOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RateContract | null>(null);
  const [editZoneOpen, setEditZoneOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [editAccessorialOpen, setEditAccessorialOpen] = useState(false);
  const [selectedAccessorial, setSelectedAccessorial] = useState<Accessorial | null>(null);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'contract' | 'zone' | 'accessorial'; id: string; name: string } | null>(null);
  
  // Contract Lanes dialog state
  const [lanesDialogOpen, setLanesDialogOpen] = useState(false);
  const [lanesContract, setLanesContract] = useState<RateContract | null>(null);
  
  // Form state for create dialogs
  const [contractForm, setContractForm] = useState({ name: '', contract_type: 'customer' as 'customer' | 'carrier', effective_from: '', effective_to: '' });
  const [zoneForm, setZoneForm] = useState({ name: '', match_type: 'postcode_range' as 'postcode_range' | 'city' | 'country' | 'geo_polygon' });
  const [accessorialForm, setAccessorialForm] = useState({ code: '', name: '', calc_type: 'fixed' as 'fixed' | 'per_km' | 'per_stop' | 'per_min' | 'percent', amount: 0 });

  const { 
    contracts, zones, accessorials, ratingResults, isLoading,
    createContract, createZone, createAccessorial,
    updateContract, updateZone, updateAccessorial,
    deleteContract, deleteZone, deleteAccessorial,
    duplicateContract, duplicateZone
  } = useRateContractEngine();

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
        await createZone.mutateAsync({
          name: zoneForm.name,
          match_type: zoneForm.match_type,
        });
        setZoneForm({ name: '', match_type: 'postcode_range' });
      } else if (createType === 'accessorial') {
        await createAccessorial.mutateAsync({
          code: accessorialForm.code,
          name: accessorialForm.name,
          calc_type: accessorialForm.calc_type,
          amount: accessorialForm.amount,
        });
        setAccessorialForm({ code: '', name: '', calc_type: 'fixed', amount: 0 });
      }
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  // Edit handlers
  const handleEditContract = (contract: RateContract) => {
    setSelectedContract(contract);
    setEditContractOpen(true);
  };

  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    setEditZoneOpen(true);
  };

  const handleEditAccessorial = (accessorial: Accessorial) => {
    setSelectedAccessorial(accessorial);
    setEditAccessorialOpen(true);
  };

  // Copy handlers
  const handleCopyContract = async (id: string) => {
    await duplicateContract.mutateAsync(id);
  };

  const handleCopyZone = async (id: string) => {
    await duplicateZone.mutateAsync(id);
  };

  // Delete handlers
  const handleDeleteClick = (type: 'contract' | 'zone' | 'accessorial', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'contract') {
        await deleteContract.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === 'zone') {
        await deleteZone.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === 'accessorial') {
        await deleteAccessorial.mutateAsync(deleteTarget.id);
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Save handlers for edit dialogs
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Actief</Badge>;
      case "draft": return <Badge variant="secondary">Concept</Badge>;
      case "expired": return <Badge variant="outline" className="text-muted-foreground">Verlopen</Badge>;
      case "archived": return <Badge variant="outline">Gearchiveerd</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge variant="outline" className="text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Goedgekeurd</Badge>;
      case "pending": return <Badge variant="outline" className="text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Wacht op goedkeuring</Badge>;
      case "rejected": return <Badge variant="destructive">Afgewezen</Badge>;
      default: return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.counterparty_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredZones = zones.filter(z =>
    z.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAccessorials = accessorials.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isDeleting = deleteContract.isPending || deleteZone.isPending || deleteAccessorial.isPending;
  const isCopying = duplicateContract.isPending || duplicateZone.isPending;

  return (
    <DashboardLayout title="Tarieven & Contracten" description="Rate & Contract Engine voor revenue assurance">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actieve Contracten</p>
                <p className="text-2xl font-bold">{contracts.filter(c => c.status === 'active').length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wacht op Goedkeuring</p>
                <p className="text-2xl font-bold text-amber-500">{contracts.filter(c => c.approval_status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Zones</p>
                <p className="text-2xl font-bold">{zones.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toeslagen</p>
                <p className="text-2xl font-bold">{accessorials.length}</p>
              </div>
              <Euro className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="contracts">Contracten</TabsTrigger>
                <TabsTrigger value="zones">Zones</TabsTrigger>
                <TabsTrigger value="accessorials">Toeslagen</TabsTrigger>
                <TabsTrigger value="monitor">Rating Monitor</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Zoeken..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button onClick={() => {
                setCreateType(activeTab === "zones" ? "zone" : activeTab === "accessorials" ? "accessorial" : "contract");
                setShowCreateDialog(true);
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuw
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Contracts Tab */}
              {activeTab === "contracts" && (
                contracts.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nog geen contracten"
                    description="Maak je eerste contract aan om te beginnen met tariefbeheer."
                    actionLabel="Nieuw Contract"
                    onAction={() => { setCreateType("contract"); setShowCreateDialog(true); }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Goedkeuring</TableHead>
                        <TableHead>Geldig</TableHead>
                        <TableHead>Versie</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {contract.contract_type === 'customer' ? 'Klant' : 'Charter'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          <TableCell>{getApprovalBadge(contract.approval_status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(contract.effective_from), "d MMM yy", { locale: nl })}
                            {contract.effective_to && (
                              <> → {format(new Date(contract.effective_to), "d MMM yy", { locale: nl })}</>
                            )}
                          </TableCell>
                          <TableCell>v{contract.version}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setLanesContract(contract); setLanesDialogOpen(true); }} title="Tariefroutes">
                                <Route className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditContract(contract)} title="Bewerken">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleCopyContract(contract.id)} disabled={isCopying} title="Kopiëren">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('contract', contract.id, contract.name)} title="Verwijderen">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}

              {/* Zones Tab */}
              {activeTab === "zones" && (
                zones.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="Nog geen zones"
                    description="Definieer geografische zones voor je tariefstructuur."
                    actionLabel="Nieuwe Zone"
                    onAction={() => { setCreateType("zone"); setShowCreateDialog(true); }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zone Naam</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Regels</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredZones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              {zone.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {zone.match_type === 'postcode_range' ? 'Postcode' : 
                               zone.match_type === 'city' ? 'Stad' :
                               zone.match_type === 'country' ? 'Land' : 'Geo-polygon'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {JSON.stringify(zone.match_rules_json).slice(0, 50)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={zone.is_active ? "default" : "secondary"}>
                              {zone.is_active ? "Actief" : "Inactief"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditZone(zone)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleCopyZone(zone.id)} disabled={isCopying}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('zone', zone.id, zone.name)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}

              {/* Accessorials Tab */}
              {activeTab === "accessorials" && (
                accessorials.length === 0 ? (
                  <EmptyState
                    icon={Euro}
                    title="Nog geen toeslagen"
                    description="Definieer toeslagen voor extra services en kosten."
                    actionLabel="Nieuwe Toeslag"
                    onAction={() => { setCreateType("accessorial"); setShowCreateDialog(true); }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Naam</TableHead>
                        <TableHead>Toepassing</TableHead>
                        <TableHead>Berekening</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead>Bewijs</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccessorials.map((acc) => (
                        <TableRow key={acc.id}>
                          <TableCell className="font-mono font-medium">{acc.code}</TableCell>
                          <TableCell>{acc.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {acc.applies_to === 'customer' ? 'Klant' : 
                               acc.applies_to === 'carrier' ? 'Charter' : 'Beide'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {acc.calc_type === 'fixed' ? 'Vast' : 
                               acc.calc_type === 'per_km' ? 'Per km' :
                               acc.calc_type === 'per_stop' ? 'Per stop' :
                               acc.calc_type === 'per_min' ? 'Per minuut' : 'Percentage'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {acc.calc_type === 'percent' ? `${acc.amount}%` : `€${acc.amount.toFixed(2)}`}
                          </TableCell>
                          <TableCell>
                            {acc.requires_proof ? (
                              <Badge variant="outline" className="text-amber-500">Vereist</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={acc.is_active ? "default" : "secondary"}>
                              {acc.is_active ? "Actief" : "Inactief"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditAccessorial(acc)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('accessorial', acc.id, acc.name)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}

              {/* Rating Monitor Tab */}
              {activeTab === "monitor" && (
                ratingResults.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="Nog geen rating resultaten"
                    description="Rating resultaten verschijnen hier zodra orders worden geprijsd."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                        const marginPercent = result.sell_total_excl > 0 
                          ? (marginAmount / result.sell_total_excl) * 100 
                          : 0;
                        const warnings = result.warnings_json as string[];
                        
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="font-mono font-medium">{result.order_id.slice(0, 8)}</TableCell>
                            <TableCell className="text-right">€{result.sell_total_excl.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-muted-foreground">€{result.buy_total_excl.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={marginPercent >= 25 ? "default" : marginPercent >= 20 ? "secondary" : "destructive"}>
                                {marginPercent.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {warnings && warnings.length > 0 ? (
                                <div className="flex items-center gap-1 text-amber-500">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="text-xs">{warnings.length}</span>
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
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createType === "contract" ? "Nieuw Contract" :
               createType === "zone" ? "Nieuwe Zone" : "Nieuwe Toeslag"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createType === "contract" && (
              <>
                <div className="space-y-2">
                  <Label>Naam</Label>
                  <Input 
                    placeholder="Contract naam" 
                    value={contractForm.name}
                    onChange={(e) => setContractForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={contractForm.contract_type} 
                    onValueChange={(v) => setContractForm(prev => ({ ...prev, contract_type: v as 'customer' | 'carrier' }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Klant</SelectItem>
                      <SelectItem value="carrier">Charter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Geldig vanaf</Label>
                    <Input 
                      type="date" 
                      value={contractForm.effective_from}
                      onChange={(e) => setContractForm(prev => ({ ...prev, effective_from: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Geldig tot</Label>
                    <Input 
                      type="date" 
                      value={contractForm.effective_to}
                      onChange={(e) => setContractForm(prev => ({ ...prev, effective_to: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}
            {createType === "zone" && (
              <>
                <div className="space-y-2">
                  <Label>Zone Naam</Label>
                  <Input 
                    placeholder="Zone naam" 
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <Select 
                    value={zoneForm.match_type} 
                    onValueChange={(v) => setZoneForm(prev => ({ ...prev, match_type: v as any }))}
                  >
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input 
                      placeholder="LIFT" 
                      value={accessorialForm.code}
                      onChange={(e) => setAccessorialForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      maxLength={10}
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Naam</Label>
                    <Input 
                      placeholder="Laadklep gebruik" 
                      value={accessorialForm.name}
                      onChange={(e) => setAccessorialForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Berekening</Label>
                    <Select 
                      value={accessorialForm.calc_type} 
                      onValueChange={(v) => setAccessorialForm(prev => ({ ...prev, calc_type: v as any }))}
                    >
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
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="25.00" 
                      value={accessorialForm.amount}
                      onChange={(e) => setAccessorialForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuleren</Button>
            <Button 
              onClick={handleCreateItem}
              disabled={createContract.isPending || createZone.isPending || createAccessorial.isPending}
            >
              {(createContract.isPending || createZone.isPending || createAccessorial.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialogs */}
      <EditContractDialog
        open={editContractOpen}
        onOpenChange={setEditContractOpen}
        contract={selectedContract}
        onSave={handleSaveContract}
        isLoading={updateContract.isPending}
      />

      <EditZoneDialog
        open={editZoneOpen}
        onOpenChange={setEditZoneOpen}
        zone={selectedZone}
        onSave={handleSaveZone}
        isLoading={updateZone.isPending}
      />

      <EditAccessorialDialog
        open={editAccessorialOpen}
        onOpenChange={setEditAccessorialOpen}
        accessorial={selectedAccessorial}
        onSave={handleSaveAccessorial}
        isLoading={updateAccessorial.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`${deleteTarget?.type === 'contract' ? 'Contract' : deleteTarget?.type === 'zone' ? 'Zone' : 'Toeslag'} verwijderen`}
        description={`Weet je zeker dat je "${deleteTarget?.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      {/* Contract Lanes Dialog */}
      <ContractLanesDialog
        open={lanesDialogOpen}
        onOpenChange={setLanesDialogOpen}
        contract={lanesContract}
        zones={zones}
      />
    </DashboardLayout>
  );
};

export default RateContracts;
