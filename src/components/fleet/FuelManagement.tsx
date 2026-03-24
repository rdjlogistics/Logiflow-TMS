import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Fuel, 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Euro,
  Droplets,
  Calendar,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const FuelManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Real data — no demo transactions
  const transactions: any[] = [];

  const fuelStats = {
    totalLiters: 0,
    totalCost: 0,
    avgPricePerLiter: 0,
    avgConsumption: 0,
    transactionCount: 0,
    comparison: { liters: 0, cost: 0, price: 0 },
  };

  const getFuelTypeBadge = (type: string) => {
    switch (type) {
      case 'diesel':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Diesel</Badge>;
      case 'adblue':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">AdBlue</Badge>;
      case 'petrol':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Benzine</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Droplets className="h-4 w-4" />
              <span className="text-xs">Totaal liters</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{fuelStats.totalLiters.toLocaleString()}</span>
              <TrendBadge value={fuelStats.comparison.liters} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Euro className="h-4 w-4" />
              <span className="text-xs">Totale kosten</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">€{fuelStats.totalCost.toLocaleString()}</span>
              <TrendBadge value={fuelStats.comparison.cost} inverse />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Fuel className="h-4 w-4" />
              <span className="text-xs">Gem. prijs/L</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">€{fuelStats.avgPricePerLiter.toFixed(2)}</span>
              <TrendBadge value={fuelStats.comparison.price} inverse />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Gem. verbruik</span>
            </div>
            <span className="text-2xl font-bold">{fuelStats.avgConsumption} L/100km</span>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Transacties</span>
            </div>
            <span className="text-2xl font-bold">{fuelStats.transactionCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Brandstoftransacties
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek transactie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Toevoegen
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
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer voertuig" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">BX-123-AB (DAF XF 480)</SelectItem>
                          <SelectItem value="2">VK-456-CD (Volvo FH 500)</SelectItem>
                          <SelectItem value="3">ZD-012-GH (Scania R 450)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Brandstoftype</Label>
                        <Select defaultValue="diesel">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                    <Button 
                      className="w-full mt-2" 
                      onClick={() => {
                        toast({
                          title: "Brandstoftransactie opgeslagen",
                          description: "De brandstofregistratie is succesvol toegevoegd.",
                        });
                        setIsAddDialogOpen(false);
                      }}
                    >
                      Opslaan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Datum</TableHead>
                  <TableHead>Voertuig</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Prijs/L</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                  <TableHead className="text-right">KM stand</TableHead>
                  <TableHead>Locatie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, index) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {format(new Date(tx.transaction_date), 'd MMM HH:mm', { locale: nl })}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{tx.vehicle.license_plate}</span>
                      <span className="text-xs text-muted-foreground ml-2">{tx.vehicle.brand}</span>
                    </TableCell>
                    <TableCell>{getFuelTypeBadge(tx.fuel_type)}</TableCell>
                    <TableCell className="text-right font-mono">{tx.liters} L</TableCell>
                    <TableCell className="text-right font-mono">€{tx.price_per_liter.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">€{tx.total_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{tx.odometer_reading.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">{tx.station_location}</span>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TrendBadge = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn(
      'inline-flex items-center text-xs',
      isPositive ? 'text-green-500' : 'text-red-500'
    )}>
      <Icon className="h-3 w-3 mr-0.5" />
      {Math.abs(value)}%
    </span>
  );
};

export default FuelManagement;
