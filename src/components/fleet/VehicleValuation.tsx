import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingDown, Car, Gauge, Wrench, Search,
  ArrowUpDown, Check, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFleetManagement, useUpdateVehicle, Vehicle } from '@/hooks/useFleetManagement';
import {
  calculateDepreciation,
  calculateTCO,
  formatEuro,
  DepreciationResult,
  TCOBreakdown,
} from '@/lib/vehicleValuation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type SortKey = 'value' | 'age' | 'tco';

export default function VehicleValuation() {
  const { vehicles, vehiclesLoading } = useFleetManagement();
  const updateVehicle = useUpdateVehicle();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('value');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  // Fetch total maintenance cost per vehicle
  const { data: maintenanceCosts = {} } = useQuery({
    queryKey: ['vehicle-maintenance-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('vehicle_id, cost');
      if (error) throw error;
      const costs: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        costs[r.vehicle_id] = (costs[r.vehicle_id] || 0) + (r.cost || 0);
      });
      return costs;
    },
  });

  // Calculate valuations
  const valuations = useMemo(() => {
    return vehicles
      .filter((v) => v.is_active)
      .map((v) => {
        const hasPrice = v.purchase_price != null && v.purchase_price > 0;
        const hasYear = v.year_of_manufacture != null;
        const depreciation: DepreciationResult | null =
          hasPrice && hasYear
            ? calculateDepreciation(v.purchase_price!, v.year_of_manufacture!, v.mileage_km)
            : null;
        const tco: TCOBreakdown | null =
          hasPrice && hasYear
            ? calculateTCO(
                v.purchase_price!,
                v.year_of_manufacture!,
                v.mileage_km,
                maintenanceCosts[v.id] || 0,
              )
            : null;
        return { vehicle: v, depreciation, tco, maintenanceCost: maintenanceCosts[v.id] || 0 };
      });
  }, [vehicles, maintenanceCosts]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = valuations.filter(
      (v) =>
        v.vehicle.license_plate.toLowerCase().includes(q) ||
        (v.vehicle.brand || '').toLowerCase().includes(q) ||
        (v.vehicle.model || '').toLowerCase().includes(q),
    );
    // Sort
    list.sort((a, b) => {
      if (sortBy === 'value') return (b.depreciation?.currentValue || 0) - (a.depreciation?.currentValue || 0);
      if (sortBy === 'age') return (b.depreciation?.vehicleAge || 0) - (a.depreciation?.vehicleAge || 0);
      return (a.tco?.totalPerMonth || 0) - (b.tco?.totalPerMonth || 0);
    });
    return list;
  }, [valuations, search, sortBy]);

  // Fleet summary
  const summary = useMemo(() => {
    const withValue = valuations.filter((v) => v.depreciation);
    const totalValue = withValue.reduce((s, v) => s + (v.depreciation?.currentValue || 0), 0);
    const avgTCO =
      withValue.length > 0
        ? Math.round(withValue.reduce((s, v) => s + (v.tco?.totalPerMonth || 0), 0) / withValue.length)
        : 0;
    const avgAge =
      withValue.length > 0
        ? +(withValue.reduce((s, v) => s + (v.depreciation?.vehicleAge || 0), 0) / withValue.length).toFixed(1)
        : 0;
    const totalPurchase = withValue.reduce((s, v) => s + (v.vehicle.purchase_price || 0), 0);
    return { totalValue, avgTCO, avgAge, totalPurchase, count: withValue.length, total: valuations.length };
  }, [valuations]);

  const handleSavePrice = (vehicleId: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) return;
    updateVehicle.mutate({ id: vehicleId, purchase_price: price } as any);
    setEditingId(null);
    setEditPrice('');
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'value', label: 'Waarde' },
    { key: 'age', label: 'Leeftijd' },
    { key: 'tco', label: 'TCO' },
  ];

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Vlootwaarde', value: formatEuro(summary.totalValue), sub: `${summary.count}/${summary.total} voertuigen`, color: 'text-emerald-500' },
          { label: 'Gem. TCO/mnd', value: formatEuro(summary.avgTCO), sub: 'per voertuig', color: 'text-blue-500' },
          { label: 'Gem. leeftijd', value: `${summary.avgAge} jr`, sub: `${summary.count} voertuigen`, color: 'text-amber-500' },
          { label: 'Totaal aanschaf', value: formatEuro(summary.totalPurchase), sub: 'investering', color: 'text-purple-500' },
        ].map((card, i) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-xl p-4"
          >
            <p className={cn('text-xl md:text-2xl font-bold tabular-nums', card.color)}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            <p className="text-[10px] text-muted-foreground/60">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op kenteken, merk, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-12 rounded-2xl backdrop-blur-xl bg-card/40 border-border/20"
          />
        </div>
        <div className="flex gap-1.5">
          {sortOptions.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={sortBy === opt.key ? 'default' : 'outline'}
              onClick={() => setSortBy(opt.key)}
              className="rounded-xl text-xs gap-1"
            >
              <ArrowUpDown className="h-3 w-3" />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Vehicle Cards */}
      <div className="space-y-3">
        {filtered.map((item, i) => {
          const v = item.vehicle;
          const dep = item.depreciation;
          const tco = item.tco;
          const isEditing = editingId === v.id;

          return (
            <div
              key={v.id}
              className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-bold text-sm tracking-tight">{v.license_plate}</span>
                      {v.year_of_manufacture && (
                        <Badge variant="outline" className="text-[10px] px-1.5">{v.year_of_manufacture}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[v.brand, v.model].filter(Boolean).join(' ') || 'Onbekend voertuig'}
                    </p>
                  </div>
                  {dep && (
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-emerald-500 tabular-nums">{formatEuro(dep.currentValue)}</p>
                      <p className="text-[10px] text-muted-foreground">inruilwaarde</p>
                    </div>
                  )}
                </div>

                {/* Purchase price — editable if not set */}
                {!v.purchase_price && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full rounded-xl border-dashed text-xs gap-1.5"
                    onClick={() => { setEditingId(v.id); setEditPrice(''); }}
                  >
                    <Pencil className="h-3 w-3" />
                    Aanschafprijs invoeren
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2 mt-3">
                    <Input
                      type="number"
                      placeholder="Aanschafprijs €"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="h-9 rounded-xl text-sm"
                      autoFocus
                    />
                    <Button size="sm" className="rounded-xl shrink-0" onClick={() => handleSavePrice(v.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Depreciation bar + details */}
              {dep && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Visual bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Restwaarde {Math.round(dep.residualPct * 100)}%</span>
                      <span>Afschrijving {formatEuro(dep.depreciationTotal)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                      <div}
                        className={cn(
                          'h-full rounded-full',
                          dep.residualPct > 0.5
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : dep.residualPct > 0.25
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400',
                        )}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatPill icon={Gauge} label="KM stand" value={v.mileage_km ? `${(v.mileage_km / 1000).toFixed(0)}k` : '–'} />
                    <StatPill icon={TrendingDown} label="Afschr./mnd" value={formatEuro(dep.depreciationPerMonth)} />
                    <StatPill icon={Wrench} label="Onderhoud" value={formatEuro(item.maintenanceCost)} />
                  </div>

                  {/* TCO */}
                  {tco && (
                    <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Total Cost of Ownership</span>
                        <span className="text-sm font-bold text-primary tabular-nums">{formatEuro(tco.totalPerMonth)}/mnd</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>Afschrijving</span>
                        <span className="text-right tabular-nums">{formatEuro(tco.depreciationPerMonth)}</span>
                        <span>Onderhoud</span>
                        <span className="text-right tabular-nums">{formatEuro(tco.maintenancePerMonth)}</span>
                      </div>
                      {tco.totalPerKm != null && (
                        <p className="text-[10px] text-muted-foreground/60 pt-1">
                          TCO per km: €{tco.totalPerKm.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Geen voertuigen gevonden
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-2 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
      <p className="text-xs font-semibold tabular-nums">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
