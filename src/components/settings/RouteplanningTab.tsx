import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Route, Truck, Car, Bike, Clock, MapPin, Navigation, Zap, Package, Gauge, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface RouteSettings {
  route_service_time_minutes: number;
  route_eta_margin_before_minutes: number;
  route_eta_margin_after_minutes: number;
  route_start_location: string;
  route_end_location: string;
  route_vehicle_type: string;
  route_optimization_provider: string;
  route_speed_percentage: number;
  composite_route_product_id: string | null;
}

interface Product { id: string; name: string; }

interface RouteplanningTabProps {
  settings: RouteSettings;
  onSettingsChange: (updates: Partial<RouteSettings>) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const vehicleTypes = [
  { value: 'truck', label: 'Vrachtwagen', icon: Truck, desc: 'Zwaar transport' },
  { value: 'van', label: 'Bestelwagen', icon: Truck, desc: 'Pakketten & pallets' },
  { value: 'car', label: 'Auto', icon: Car, desc: 'Personenauto' },
  { value: 'bicycle', label: 'Fiets', icon: Bike, desc: 'Fietskoerier' },
];

const providers = [
  {
    value: 'smartroute', name: 'SmartRoute', url: 'smartroute.nl',
    features: ['Vrachtwagen, Auto, Bestelwagen, Fiets', 'Onbeperkt bestemmingen', 'Prioriteit: ophaal- vóór afleveradressen'],
    defaultSpeed: 85, speedHint: '85% ≈ personenauto',
  },
  {
    value: 'routexl', name: 'RouteXL', url: 'routexl.com',
    features: ['Auto, Bestelwagen, Fiets', 'Max. 100 bestemmingen', 'Prioriteit: tijden boven adressen'],
    defaultSpeed: 95, speedHint: '95% ≈ personenauto',
  },
];

export const RouteplanningTab = ({ settings, onSettingsChange }: RouteplanningTabProps) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('id, name').eq('is_active', true).order('name');
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  const selectedProvider = providers.find(p => p.value === settings.route_optimization_provider) || providers[0];

  return (
    <div className="space-y-4 md:space-y-6 mt-0">
      {/* Provider */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Optimalisatie Provider</CardTitle>
                <CardDescription>Kies de provider voor routeberekeningen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {providers.map((provider) => {
                const isSelected = settings.route_optimization_provider === provider.value;
                return (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => onSettingsChange({ route_optimization_provider: provider.value, route_speed_percentage: provider.defaultSpeed })}
                    className={cn(
                      "relative text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg shadow-primary/10"
                        : "border-border/30 hover:border-primary/30 bg-card/40 backdrop-blur-sm"
                    )}
                  >
                    {isSelected && <div className="absolute top-3 right-3"><div className="h-3 w-3 rounded-full bg-primary animate-pulse" /></div>}
                    <h3 className="font-semibold text-sm md:text-base mb-1">{provider.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{provider.url}</p>
                    <div className="space-y-1.5">
                      {provider.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-primary text-xs mt-0.5">•</span>
                          <span className="text-xs text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <Badge variant="secondary" className="text-xs bg-muted/50"><Gauge className="h-3 w-3 mr-1" />{provider.speedHint}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle & Speed */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Voertuig & Snelheid</CardTitle>
                <CardDescription>Type voertuig en snelheidscorrectie voor reisduur</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Type voertuig</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {vehicleTypes.map((vt) => {
                  const isSelected = settings.route_vehicle_type === vt.value;
                  const VIcon = vt.icon;
                  return (
                    <button
                      key={vt.value}
                      type="button"
                      onClick={() => onSettingsChange({ route_vehicle_type: vt.value })}
                      className={cn(
                        "flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl border-2 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border/30 hover:border-primary/30 bg-card/40 backdrop-blur-sm"
                      )}
                    >
                      <VIcon className={cn("h-5 w-5 md:h-6 md:w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-xs md:text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>{vt.label}</span>
                      <span className="text-[10px] md:text-xs text-muted-foreground">{vt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Snelheidspercentage</Label>
                <Badge variant="outline" className="font-mono text-sm">{settings.route_speed_percentage}%</Badge>
              </div>
              <Slider value={[settings.route_speed_percentage]} onValueChange={([val]) => onSettingsChange({ route_speed_percentage: val })} min={50} max={100} step={5} className="w-full" />
              <div className="flex items-start gap-2 p-3 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Met het snelheidspercentage kan een correctie worden toegepast op de berekende reisduur.
                  Bij {selectedProvider.name} komt {selectedProvider.defaultSpeed}% overeen met een personenauto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Time & ETA */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Servicetijd & Tijdvenster</CardTitle>
                <CardDescription>Gemiddelde stoptijd en ETA marge op Track & Trace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="service-time">Servicetijd (minuten per stop)</Label>
              <Input id="service-time" type="number" min={0} max={120} value={settings.route_service_time_minutes} onChange={(e) => onSettingsChange({ route_service_time_minutes: parseInt(e.target.value) || 0 })} className="max-w-[200px] text-base md:text-sm text-base" />
              <p className="text-xs text-muted-foreground">Gemiddelde tijd die nodig is voor een stop.</p>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-medium">Tijdvenster marge (ETA op Track & Trace)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eta-before" className="text-xs text-muted-foreground">Eerder (minuten)</Label>
                  <Input id="eta-before" type="number" min={0} max={180} value={settings.route_eta_margin_before_minutes} onChange={(e) => onSettingsChange({ route_eta_margin_before_minutes: parseInt(e.target.value) || 0 })} className="text-base md:text-sm text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eta-after" className="text-xs text-muted-foreground">Later (minuten)</Label>
                  <Input id="eta-after" type="number" min={0} max={180} value={settings.route_eta_margin_after_minutes} onChange={(e) => onSettingsChange({ route_eta_margin_after_minutes: parseInt(e.target.value) || 0 })} className="text-base md:text-sm text-base" />
                </div>
              </div>
              {(settings.route_eta_margin_before_minutes > 0 || settings.route_eta_margin_after_minutes > 0) && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Voorbeeld:</span> Bij een berekende ETA van 14:00 wordt op Track & Trace
                    weergegeven: <span className="font-mono font-medium text-primary">
                      {`${14 - Math.floor(settings.route_eta_margin_before_minutes / 60)}:${String(60 - (settings.route_eta_margin_before_minutes % 60)).padStart(2, '0').replace('60','00')} — ${14 + Math.floor(settings.route_eta_margin_after_minutes / 60)}:${String(settings.route_eta_margin_after_minutes % 60).padStart(2, '0')}`}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start & End Location */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Start & Eindlocatie</CardTitle>
                <CardDescription>Waar beginnen en eindigen de routes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[
                { key: 'route_start_location', label: 'Startlocatie', options: [
                  { value: 'first_stop', label: 'Eerste bestemming', desc: 'Route start bij eerste stop' },
                  { value: 'company_address', label: 'Eigen adres', desc: 'Route start bij uw bedrijfsadres' },
                ]},
                { key: 'route_end_location', label: 'Eindlocatie', options: [
                  { value: 'last_stop', label: 'Laatste bestemming', desc: 'Route eindigt bij laatste stop' },
                  { value: 'company_address', label: 'Eigen adres', desc: 'Route eindigt bij uw bedrijfsadres' },
                ]},
              ].map(section => (
                <div key={section.key} className="space-y-3">
                  <Label className="text-sm font-medium">{section.label}</Label>
                  <div className="space-y-2">
                    {section.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onSettingsChange({ [section.key]: option.value } as any)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border-2 transition-all",
                          (settings as any)[section.key] === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border/30 hover:border-primary/30 bg-card/40 backdrop-blur-sm"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className={cn("h-4 w-4", (settings as any)[section.key] === option.value ? "text-primary" : "text-muted-foreground")} />
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Composite Routes */}
      <div>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Samengestelde Routes</CardTitle>
                <CardDescription>Product voor orders die worden samengevoegd tot één route</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product voor samengestelde route</Label>
              <Select value={settings.composite_route_product_id || 'none'} onValueChange={(val) => onSettingsChange({ composite_route_product_id: val === 'none' ? null : val })}>
                <SelectTrigger className="max-w-md text-base md:text-sm">
                  <SelectValue placeholder="Geen product geselecteerd" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen specifiek product</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kies geen product? Dan worden samengestelde routes geboekt op het product van de originele orders.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
