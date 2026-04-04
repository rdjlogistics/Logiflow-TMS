import { useFuelStations } from '@/hooks/useFuelStations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fuel, TrendingDown, TrendingUp, ArrowRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function FuelStationsWidget() {
  const navigate = useNavigate();
  const { stations, selectedFuelType } = useFuelStations();

  // Get cheapest stations
  const sortedByPrice = [...stations]
    .filter(s => s.prices[selectedFuelType] !== null)
    .sort((a, b) => (a.prices[selectedFuelType] ?? Infinity) - (b.prices[selectedFuelType] ?? Infinity))
    .slice(0, 3);

  // Calculate average price
  const stationsWithPrice = stations.filter(s => s.prices[selectedFuelType] !== null);
  const avgPrice = stationsWithPrice.length > 0
    ? stationsWithPrice.reduce((sum, s) => sum + (s.prices[selectedFuelType] ?? 0), 0) / stationsWithPrice.length
    : 0;

  // Get price range
  const minPrice = sortedByPrice[0]?.prices[selectedFuelType] ?? 0;
  const maxPrice = stationsWithPrice.length > 0
    ? Math.max(...stationsWithPrice.map(s => s.prices[selectedFuelType] ?? 0))
    : 0;
  const priceDiff = maxPrice - minPrice;

  return (
    <div
    >
      <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-amber-500/5">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Fuel className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Tankstations</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Laagste prijzen in de buurt
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="uppercase text-[10px]">
              {selectedFuelType}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                <span className="text-[10px] text-muted-foreground">Laagste</span>
              </div>
              <p className="font-bold text-green-500">€{minPrice.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <span className="text-[10px] text-muted-foreground block mb-1">Gem.</span>
              <p className="font-bold">€{avgPrice.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-red-500" />
                <span className="text-[10px] text-muted-foreground">Hoogste</span>
              </div>
              <p className="font-bold text-red-500">€{maxPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Top 3 Cheapest */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Voordeligste stations</p>
            {sortedByPrice.map((station, index) => (
              <div
                key={station.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
                    index === 0 ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{station.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {station.city}
                    </div>
                  </div>
                </div>
                <p className={cn(
                  "font-bold",
                  index === 0 ? "text-green-500" : ""
                )}>
                  €{(station.prices[selectedFuelType] ?? 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Savings Info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm">Potentiële besparing</span>
            </div>
            <span className="font-bold text-green-500">
              €{(priceDiff * 50).toFixed(0)}/tank
            </span>
          </div>

          {/* CTA */}
          <Button 
            className="w-full group"
            onClick={() => navigate('/fuel-stations')}
          >
            Bekijk alle tankstations
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
