import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Euro, 
  FileText, 
  Calculator, 
  TrendingUp,
  Upload,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FuelIndexUpdateDialog } from "@/components/rates/FuelIndexUpdateDialog";

// Mock data for rate cards
const mockRateCards = [
  {
    id: "1",
    name: "Standard NL",
    customer: "Algemeen",
    validFrom: "2024-01-01",
    validTo: "2024-12-31",
    status: "active",
    lanes: 24,
    currency: "EUR"
  },
  {
    id: "2",
    name: "Premium DE-NL",
    customer: "DHL Express",
    validFrom: "2024-03-01",
    validTo: "2024-08-31",
    status: "active",
    lanes: 12,
    currency: "EUR"
  },
  {
    id: "3",
    name: "Economy BE",
    customer: "PostNL",
    validFrom: "2024-01-01",
    validTo: "2024-06-30",
    status: "expired",
    lanes: 8,
    currency: "EUR"
  }
];

const mockLaneRates = [
  {
    id: "1",
    origin: "Amsterdam",
    destination: "Rotterdam",
    distance: 78,
    baseRate: 125.00,
    perKm: 1.15,
    minCharge: 85.00,
    fuelSurcharge: 12,
  },
  {
    id: "2",
    origin: "Utrecht",
    destination: "Eindhoven",
    distance: 92,
    baseRate: 145.00,
    perKm: 1.20,
    minCharge: 95.00,
    fuelSurcharge: 12,
  },
  {
    id: "3",
    origin: "Den Haag",
    destination: "Maastricht",
    distance: 210,
    baseRate: 285.00,
    perKm: 1.10,
    minCharge: 150.00,
    fuelSurcharge: 15,
  }
];

const RateManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editLaneDialogOpen, setEditLaneDialogOpen] = useState(false);
  const [selectedLane, setSelectedLane] = useState<typeof mockLaneRates[0] | null>(null);
  const [editRateCardDialogOpen, setEditRateCardDialogOpen] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<typeof mockRateCards[0] | null>(null);
  const [fuelIndexDialogOpen, setFuelIndexDialogOpen] = useState(false);
  const [newRateCard, setNewRateCard] = useState({
    name: '',
    customer: '',
    validFrom: '',
    validTo: '',
    currency: 'EUR'
  });
  
  // Calculator state
  const [calcOrigin, setCalcOrigin] = useState("");
  const [calcDestination, setCalcDestination] = useState("");
  const [calcDistance, setCalcDistance] = useState("");
  const [calcWeight, setCalcWeight] = useState("");
  const [calcResult, setCalcResult] = useState({
    baseRate: 0,
    kmRate: 0,
    fuelSurcharge: 0,
    total: 0
  });

  const handleCreateRateCard = () => {
    if (!newRateCard.name) {
      toast({
        title: "Vul een naam in",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Tariefkaart aangemaakt",
      description: `${newRateCard.name} is succesvol opgeslagen.`,
    });
    setNewRateCard({ name: '', customer: '', validFrom: '', validTo: '', currency: 'EUR' });
    setIsAddDialogOpen(false);
  };

  const handleExport = () => {
    const csvContent = `Tariefkaarten Export
    
Naam,Klant,Geldig vanaf,Geldig tot,Lanes,Status
${mockRateCards.map(card => 
  `${card.name},${card.customer},${card.validFrom},${card.validTo},${card.lanes},${card.status}`
).join('\n')}

Lane Tarieven:
Origine,Bestemming,Afstand,Basistarief,Per km,Min. bedrag,Brandstof %
${mockLaneRates.map(lane => 
  `${lane.origin},${lane.destination},${lane.distance},€${lane.baseRate},€${lane.perKm},€${lane.minCharge},${lane.fuelSurcharge}%`
).join('\n')}
`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarieven-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export voltooid",
      description: "Tarieven export is succesvol gedownload.",
    });
  };

  const handleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleEditLane = (laneId: string) => {
    const lane = mockLaneRates.find(l => l.id === laneId);
    if (lane) {
      setSelectedLane(lane);
      setEditLaneDialogOpen(true);
    }
  };

  const handleCopyLane = (lane: typeof mockLaneRates[0]) => {
    const laneText = `${lane.origin} → ${lane.destination}: €${lane.baseRate} + €${lane.perKm}/km`;
    navigator.clipboard.writeText(laneText);
    toast({
      title: "Lane gekopieerd",
      description: `${lane.origin} → ${lane.destination} is gekopieerd naar klembord.`,
    });
  };

  const handleEditRateCard = (cardId: string) => {
    const card = mockRateCards.find(c => c.id === cardId);
    if (card) {
      setSelectedRateCard(card);
      setEditRateCardDialogOpen(true);
    }
  };

  const handleSaveLane = () => {
    toast({
      title: "Lane opgeslagen",
      description: `${selectedLane?.origin} → ${selectedLane?.destination} is bijgewerkt.`,
    });
    setEditLaneDialogOpen(false);
    setSelectedLane(null);
  };

  const handleSaveRateCard = () => {
    toast({
      title: "Tariefkaart opgeslagen",
      description: `${selectedRateCard?.name} is bijgewerkt.`,
    });
    setEditRateCardDialogOpen(false);
    setSelectedRateCard(null);
  };

  const handleCalculate = () => {
    const distance = parseFloat(calcDistance) || 0;
    const baseRate = 85; // Minimum charge
    const perKm = 1.18; // Average per km rate
    const fuelSurchargePercent = 12.5;
    
    const kmRate = distance * perKm;
    const subtotal = Math.max(baseRate, kmRate);
    const fuelSurcharge = subtotal * (fuelSurchargePercent / 100);
    const total = subtotal + fuelSurcharge;
    
    setCalcResult({
      baseRate: baseRate,
      kmRate: kmRate,
      fuelSurcharge: fuelSurcharge,
      total: total
    });
    
    toast({
      title: "Berekening voltooid",
      description: `Geschat tarief: €${total.toFixed(2)}`,
    });
  };

  const filteredRateCards = mockRateCards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout 
      title="Tariefbeheer" 
      description="Beheer tariefkaarten, lane rates en prijscalculaties"
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Tariefkaarten</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 deze maand</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gemiddeld Tarief</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€1.18/km</div>
              <p className="text-xs text-muted-foreground">+5% vs vorig kwartaal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lane Routes</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Actieve routes</p>
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
              <TabsTrigger value="lane-rates">Lane Tarieven</TabsTrigger>
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
              <Button variant="outline" size="icon" onClick={handleFilter} className={isFilterOpen ? "bg-accent" : ""}>
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Tariefkaart
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Tariefkaart</DialogTitle>
                    <DialogDescription>
                      Maak een nieuwe tariefkaart aan voor een klant of algemeen gebruik.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Naam</Label>
                      <Input id="name" placeholder="bijv. Standard NL 2024" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Klant</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer klant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Algemeen</SelectItem>
                          <SelectItem value="dhl">DHL Express</SelectItem>
                          <SelectItem value="postnl">PostNL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="validFrom">Geldig vanaf</Label>
                        <Input id="validFrom" type="date" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="validTo">Geldig tot</Label>
                        <Input id="validTo" type="date" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="currency">Valuta</Label>
                      <Select defaultValue="EUR">
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
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button onClick={handleCreateRateCard}>Aanmaken</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="rate-cards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tariefkaarten Overzicht</CardTitle>
                <CardDescription>
                  Beheer alle tariefkaarten en hun geldigheid
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Geldig vanaf</TableHead>
                      <TableHead>Geldig tot</TableHead>
                      <TableHead>Lanes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRateCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.name}</TableCell>
                        <TableCell>{card.customer}</TableCell>
                        <TableCell>{card.validFrom}</TableCell>
                        <TableCell>{card.validTo}</TableCell>
                        <TableCell>{card.lanes}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={card.status === "active" ? "default" : "secondary"}
                          >
                            {card.status === "active" ? "Actief" : "Verlopen"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditRateCard(card.id)}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lane-rates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lane Tarieven</CardTitle>
                <CardDescription>
                  Route-specifieke tarieven en prijzen per kilometer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origine</TableHead>
                      <TableHead>Bestemming</TableHead>
                      <TableHead>Afstand (km)</TableHead>
                      <TableHead>Basistarief</TableHead>
                      <TableHead>Per km</TableHead>
                      <TableHead>Min. bedrag</TableHead>
                      <TableHead>Brandstof %</TableHead>
                      <TableHead className="w-[100px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockLaneRates.map((lane) => (
                      <TableRow key={lane.id}>
                        <TableCell className="font-medium">{lane.origin}</TableCell>
                        <TableCell>{lane.destination}</TableCell>
                        <TableCell>{lane.distance}</TableCell>
                        <TableCell>€{lane.baseRate.toFixed(2)}</TableCell>
                        <TableCell>€{lane.perKm.toFixed(2)}</TableCell>
                        <TableCell>€{lane.minCharge.toFixed(2)}</TableCell>
                        <TableCell>{lane.fuelSurcharge}%</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditLane(lane.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCopyLane(lane)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tarief Calculator</CardTitle>
                <CardDescription>
                  Bereken snel een prijs voor een specifieke route
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Origine</Label>
                      <Input 
                        placeholder="bijv. Amsterdam" 
                        value={calcOrigin}
                        onChange={(e) => setCalcOrigin(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Bestemming</Label>
                      <Input 
                        placeholder="bijv. Rotterdam" 
                        value={calcDestination}
                        onChange={(e) => setCalcDestination(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Afstand (km)</Label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={calcDistance}
                        onChange={(e) => setCalcDistance(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Gewicht (kg)</Label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={calcWeight}
                        onChange={(e) => setCalcWeight(e.target.value)}
                      />
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
                <CardDescription>
                  Beheer brandstoftoeslagen, seizoenstoeslagen en andere extra kosten
                </CardDescription>
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
                      <Upload className="h-4 w-4 mr-2" />
                      Index bijwerken
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold">Andere Toeslagen</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span>Weekendtoeslag</span>
                        <Badge>25%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span>Avondlevering (na 18:00)</span>
                        <Badge>15%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span>ADR Toeslag</span>
                        <Badge>€45.00</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span>Lift vereist</span>
                        <Badge>€35.00</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Lane Dialog */}
        <Dialog open={editLaneDialogOpen} onOpenChange={setEditLaneDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Lane Bewerken</DialogTitle>
              <DialogDescription>
                {selectedLane?.origin} → {selectedLane?.destination}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Origine</Label>
                  <Input defaultValue={selectedLane?.origin} />
                </div>
                <div className="grid gap-2">
                  <Label>Bestemming</Label>
                  <Input defaultValue={selectedLane?.destination} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Basistarief (€)</Label>
                  <Input type="number" step="0.01" defaultValue={selectedLane?.baseRate} />
                </div>
                <div className="grid gap-2">
                  <Label>Per km (€)</Label>
                  <Input type="number" step="0.01" defaultValue={selectedLane?.perKm} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Minimum bedrag (€)</Label>
                  <Input type="number" step="0.01" defaultValue={selectedLane?.minCharge} />
                </div>
                <div className="grid gap-2">
                  <Label>Brandstoftoeslag (%)</Label>
                  <Input type="number" step="0.1" defaultValue={selectedLane?.fuelSurcharge} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLaneDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveLane}>Opslaan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Rate Card Dialog */}
        <Dialog open={editRateCardDialogOpen} onOpenChange={setEditRateCardDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tariefkaart Bewerken</DialogTitle>
              <DialogDescription>
                {selectedRateCard?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Naam</Label>
                <Input defaultValue={selectedRateCard?.name} />
              </div>
              <div className="grid gap-2">
                <Label>Klant</Label>
                <Input defaultValue={selectedRateCard?.customer} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Geldig vanaf</Label>
                  <Input type="date" defaultValue={selectedRateCard?.validFrom} />
                </div>
                <div className="grid gap-2">
                  <Label>Geldig tot</Label>
                  <Input type="date" defaultValue={selectedRateCard?.validTo} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select defaultValue={selectedRateCard?.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="expired">Verlopen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRateCardDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveRateCard}>Opslaan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fuel Index Update Dialog */}
        <FuelIndexUpdateDialog
          open={fuelIndexDialogOpen}
          onOpenChange={setFuelIndexDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default RateManagement;
