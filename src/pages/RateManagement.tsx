import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Plus, Euro, FileText, Calculator, TrendingUp,
  Download, Search, Filter, MoreHorizontal, Edit, Copy, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FuelIndexUpdateDialog } from "@/components/rates/FuelIndexUpdateDialog";
import { useRateContractEngine, type RateContract } from "@/hooks/useRateContractEngine";
import { FeatureGate } from "@/components/subscription/FeatureGate";

const RateManagement = () => {
  const { toast } = useToast();
  const {
    contracts, contractsLoading,
    accessorials, surchargeRules,
    createContract, updateContract, updateContractStatus,
  } = useRateContractEngine();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editRateCardDialogOpen, setEditRateCardDialogOpen] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<RateContract | null>(null);
  const [fuelIndexDialogOpen, setFuelIndexDialogOpen] = useState(false);

  // New rate card form state
  const [newName, setNewName] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');
  const [newCurrency, setNewCurrency] = useState('EUR');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editValidFrom, setEditValidFrom] = useState('');
  const [editValidTo, setEditValidTo] = useState('');
  const [editStatus, setEditStatus] = useState('');
  
  // Calculator state
  const [calcOrigin, setCalcOrigin] = useState("");
  const [calcDestination, setCalcDestination] = useState("");
  const [calcDistance, setCalcDistance] = useState("");
  const [calcWeight, setCalcWeight] = useState("");
  const [calcResult, setCalcResult] = useState({
    baseRate: 0, kmRate: 0, fuelSurcharge: 0, total: 0
  });

  const handleCreateRateCard = () => {
    if (!newName) {
      toast({ title: "Vul een naam in", variant: "destructive" });
      return;
    }
    createContract.mutate({
      name: newName,
      contract_type: 'customer',
      counterparty_id: '',
      effective_from: newValidFrom || new Date().toISOString(),
      effective_to: newValidTo || null,
      currency: newCurrency,
    }, {
      onSuccess: () => {
        setNewName(''); setNewValidFrom(''); setNewValidTo(''); setNewCurrency('EUR');
        setIsAddDialogOpen(false);
      }
    });
  };

  const handleEditRateCard = (card: RateContract) => {
    setSelectedRateCard(card);
    setEditName(card.name);
    setEditValidFrom(card.effective_from?.split('T')[0] || '');
    setEditValidTo(card.effective_to?.split('T')[0] || '');
    setEditStatus(card.status);
    setEditRateCardDialogOpen(true);
  };

  const handleSaveRateCard = () => {
    if (!selectedRateCard) return;
    updateContract.mutate({
      id: selectedRateCard.id,
      name: editName,
      effective_from: editValidFrom,
      effective_to: editValidTo || null,
      status: editStatus as RateContract['status'],
    }, {
      onSuccess: () => {
        setEditRateCardDialogOpen(false);
        setSelectedRateCard(null);
      }
    });
  };

  const handleExport = () => {
    const csvContent = `Tariefkaarten Export\n\nNaam,Type,Status,Geldig vanaf,Geldig tot,Valuta\n${filteredContracts.map(c => 
      `${c.name},${c.contract_type},${c.status},${c.effective_from},${c.effective_to || ''},${c.currency}`
    ).join('\n')}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarieven-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export voltooid", description: "Tarieven export is succesvol gedownload." });
  };

  const handleCalculate = () => {
    const distance = parseFloat(calcDistance) || 0;
    const baseRate = 85;
    const perKm = 1.18;
    const fuelSurchargePercent = 12.5;
    const kmRate = distance * perKm;
    const subtotal = Math.max(baseRate, kmRate);
    const fuelSurcharge = subtotal * (fuelSurchargePercent / 100);
    const total = subtotal + fuelSurcharge;
    setCalcResult({ baseRate, kmRate, fuelSurcharge, total });
    toast({ title: "Berekening voltooid", description: `Geschat tarief: €${total.toFixed(2)}` });
  };

  const activeContracts = contracts.filter(c => c.status === 'active');

  const filteredContracts = contracts.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout 
      title="Tariefbeheer" 
      description="Beheer tariefkaarten, lane rates en prijscalculaties"
    >
      <FeatureGate feature="rate_contracts">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Contracten</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContracts.length}</div>
              <p className="text-xs text-muted-foreground">Totaal: {contracts.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toeslagen</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accessorials.length}</div>
              <p className="text-xs text-muted-foreground">Geconfigureerd</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Surcharge Regels</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{surchargeRules.length}</div>
              <p className="text-xs text-muted-foreground">Actieve regels</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Brandstoftoeslag</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.5%</div>
              <p className="text-xs text-muted-foreground">Huidige index</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="rate-cards" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <TabsList>
              <TabsTrigger value="rate-cards">Tariefkaarten</TabsTrigger>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="surcharges">Toeslagen</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Zoeken..." 
                  className="pl-8 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)} className={isFilterOpen ? "bg-accent" : ""}>
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuw Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nieuw Tariefcontract</DialogTitle>
                    <DialogDescription>
                      Maak een nieuw tariefcontract aan.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Naam</Label>
                      <Input id="name" placeholder="bijv. Standard NL 2024" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="validFrom">Geldig vanaf</Label>
                        <Input id="validFrom" type="date" value={newValidFrom} onChange={e => setNewValidFrom(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="validTo">Geldig tot</Label>
                        <Input id="validTo" type="date" value={newValidTo} onChange={e => setNewValidTo(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="currency">Valuta</Label>
                      <Select value={newCurrency} onValueChange={setNewCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="USD">USD - Dollar</SelectItem>
                          <SelectItem value="GBP">GBP - Pond</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuleren</Button>
                    <Button onClick={handleCreateRateCard} disabled={createContract.isPending}>
                      {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Aanmaken
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="rate-cards" className="space-y-4">
            {isFilterOpen && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-4 items-center">
                    <Label>Status:</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="active">Actief</SelectItem>
                        <SelectItem value="draft">Concept</SelectItem>
                        <SelectItem value="expired">Verlopen</SelectItem>
                        <SelectItem value="archived">Gearchiveerd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Tariefcontracten</CardTitle>
                <CardDescription>
                  Beheer alle tariefcontracten en hun geldigheid
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Geldig vanaf</TableHead>
                      <TableHead>Geldig tot</TableHead>
                      <TableHead>Valuta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {card.contract_type === 'customer' ? 'Klant' : 'Vervoerder'}
                          </Badge>
                        </TableCell>
                        <TableCell>{card.effective_from?.split('T')[0]}</TableCell>
                        <TableCell>{card.effective_to?.split('T')[0] || '—'}</TableCell>
                        <TableCell>{card.currency}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={card.status === "active" ? "default" : "secondary"}
                          >
                            {card.status === "active" ? "Actief" : card.status === "draft" ? "Concept" : card.status === "expired" ? "Verlopen" : card.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditRateCard(card)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredContracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Geen contracten gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tarief Calculator</CardTitle>
                <CardDescription>Bereken snel een prijs voor een specifieke route</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Origine</Label>
                      <Input placeholder="bijv. Amsterdam" value={calcOrigin} onChange={(e) => setCalcOrigin(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Bestemming</Label>
                      <Input placeholder="bijv. Rotterdam" value={calcDestination} onChange={(e) => setCalcDestination(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Afstand (km)</Label>
                      <Input type="number" placeholder="0" value={calcDistance} onChange={(e) => setCalcDistance(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Gewicht (kg)</Label>
                      <Input type="number" placeholder="0" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value)} />
                    </div>
                    <Button className="w-full" onClick={handleCalculate}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Bereken Tarief
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Resultaat</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Basistarief:</span>
                        <span>€{calcResult.baseRate.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kilometertarief:</span>
                        <span>€{calcResult.kmRate.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brandstoftoeslag:</span>
                        <span>€{calcResult.fuelSurcharge.toFixed(2)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Totaal:</span>
                        <span>€{calcResult.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="surcharges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Toeslagen Configuratie</CardTitle>
                <CardDescription>Beheer brandstoftoeslagen, seizoenstoeslagen en andere extra kosten</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Brandstoftoeslag</h4>
                    <div className="grid gap-2">
                      <Label>Huidige index (%)</Label>
                      <Input type="number" defaultValue="12.5" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Referentie dieselprijs (€/L)</Label>
                      <Input type="number" defaultValue="1.45" step="0.01" />
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFuelIndexDialogOpen(true)}>
                      Index bijwerken
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Geconfigureerde Toeslagen ({accessorials.length})</h4>
                    <div className="space-y-2">
                      {accessorials.slice(0, 5).map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span>{acc.name}</span>
                          <Badge>{acc.calc_type === 'fixed' ? `€${acc.amount}` : acc.calc_type === 'percent' ? `${acc.amount}%` : `€${acc.amount}/${acc.calc_type.replace('per_', '')}`}</Badge>
                        </div>
                      ))}
                      {accessorials.length === 0 && (
                        <p className="text-sm text-muted-foreground">Geen toeslagen geconfigureerd</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Rate Card Dialog */}
        <Dialog open={editRateCardDialogOpen} onOpenChange={setEditRateCardDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Contract Bewerken</DialogTitle>
              <DialogDescription>{selectedRateCard?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Naam</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Geldig vanaf</Label>
                  <Input type="date" value={editValidFrom} onChange={e => setEditValidFrom(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Geldig tot</Label>
                  <Input type="date" value={editValidTo} onChange={e => setEditValidTo(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Concept</SelectItem>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="expired">Verlopen</SelectItem>
                    <SelectItem value="archived">Gearchiveerd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRateCardDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveRateCard} disabled={updateContract.isPending}>
                {updateContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FuelIndexUpdateDialog 
          open={fuelIndexDialogOpen} 
          onOpenChange={setFuelIndexDialogOpen}
          onUpdate={async (newIndex, newPrice) => {
            // Find or create fuel surcharge rule and update payload_json
            const fuelRule = surchargeRules.find((r: any) => r.surcharge_type === 'fuel');
            if (fuelRule) {
              const { error } = await supabase
                .from('surcharge_rules')
                .update({
                  payload_json: {
                    ...(fuelRule.payload_json as any || {}),
                    fuel_index: newIndex,
                    reference_price: newPrice,
                    updated_at: new Date().toISOString(),
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq('id', fuelRule.id);
              if (error) throw error;
            } else {
              toast({ title: 'Geen brandstoftoeslag regel gevonden', description: 'Maak eerst een brandstoftoeslag regel aan in Toeslagen Configuratie.', variant: 'destructive' });
            }
          }}
        />
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default RateManagement;
