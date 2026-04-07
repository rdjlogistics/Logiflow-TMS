import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Fuel, Plus, Search, TrendingUp, TrendingDown, Euro, Droplets, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const FuelManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const transactions: any[] = [];

  const fuelStats = {
    totalLiters: 0, totalCost: 0, avgPricePerLiter: 0, avgConsumption: 0, transactionCount: 0,
    comparison: { liters: 0, cost: 0, price: 0 },
  };

  const getFuelTypeBadge = (type: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      diesel: { label: 'Diesel', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      adblue: { label: 'AdBlue', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      petrol: { label: 'Benzine', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
    };
    const cfg = map[type] || { label: type, cls: '' };
    return <Badge className={cfg.cls}>{cfg.label}</Badge>;
  };

  const statItems = [
    { label: 'Totaal liters', value: fuelStats.totalLiters.toLocaleString(), icon: Droplets, accent: 'text-blue-500' },
    { label: 'Totale kosten', value: `€${fuelStats.totalCost.toLocaleString()}`, icon: Euro, accent: 'text-emerald-500' },
    { label: 'Gem. prijs/L', value: `€${fuelStats.avgPricePerLiter.toFixed(2)}`, icon: Fuel, accent: 'text-amber-500' },
    { label: 'Gem. verbruik', value: `${fuelStats.avgConsumption} L/100km`, icon: TrendingUp, accent: 'text-purple-500' },
    { label: 'Transacties', value: fuelStats.transactionCount, icon: Calendar, accent: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      {/* Compact Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {statItems.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={cn('h-3.5 w-3.5', s.accent)} />
              <span className="text-[10px] text-muted-foreground truncate">{s.label}</span>
            </div>
            <p className={cn('text-lg font-semibold tabular-nums leading-none', s.accent)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <Card className="border-border/20 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Brandstoftransacties
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Zoek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Toevoegen</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Brandstof registreren</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Voertuig</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Selecteer voertuig" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-vehicles" disabled>Geen voertuigen — voeg eerst een voertuig toe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Brandstoftype</Label>
                        <Select defaultValue="diesel">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="adblue">AdBlue</SelectItem>
                            <SelectItem value="petrol">Benzine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Liters</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Prijs per liter (€)</Label>
                        <Input type="number" step="0.01" placeholder="1.65" />
                      </div>
                      <div className="grid gap-2">
                        <Label>KM stand</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tankstation</Label>
                      <Input placeholder="Shell, BP, TotalEnergies..." />
                    </div>
                    <Button className="w-full" onClick={() => { toast({ title: 'Brandstoftransactie opgeslagen' }); setIsAddDialogOpen(false); }}>
                      Opslaan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Fuel className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nog geen brandstoftransacties</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Voeg je eerste tanking toe om verbruik bij te houden</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Datum</TableHead>
                      <TableHead>Voertuig</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Liters</TableHead>
                      <TableHead className="text-right">Prijs/L</TableHead>
                      <TableHead className="text-right">Totaal</TableHead>
                      <TableHead className="text-right">KM</TableHead>
                      <TableHead>Locatie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium text-sm">{format(new Date(tx.transaction_date), 'd MMM HH:mm', { locale: nl })}</TableCell>
                        <TableCell><span className="font-mono text-sm">{tx.vehicle.license_plate}</span></TableCell>
                        <TableCell>{getFuelTypeBadge(tx.fuel_type)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{tx.liters} L</TableCell>
                        <TableCell className="text-right font-mono text-sm">€{tx.price_per_liter.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-sm">€{tx.total_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{tx.odometer_reading.toLocaleString()}</TableCell>
                        <TableCell><span className="flex items-center gap-1 text-muted-foreground text-sm"><MapPin className="h-3 w-3" />{tx.station_location}</span></TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="rounded-xl border border-border/20 bg-card/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-sm">{tx.vehicle.license_plate}</span>
                        <span className="text-xs text-muted-foreground ml-2">{tx.vehicle.brand}</span>
                      </div>
                      {getFuelTypeBadge(tx.fuel_type)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{format(new Date(tx.transaction_date), 'd MMM', { locale: nl })}</span>
                      <span className="font-mono font-semibold">€{tx.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{tx.liters}L</span>
                      <span>€{tx.price_per_liter.toFixed(2)}/L</span>
                      <span className="ml-auto flex items-center gap-1"><MapPin className="h-3 w-3" />{tx.station_location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FuelManagement;
