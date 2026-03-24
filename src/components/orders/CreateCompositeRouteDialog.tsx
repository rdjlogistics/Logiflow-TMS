import React, { useState, useEffect, useRef } from 'react';
import type { TripStatus } from "@/types/supabase-helpers";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Route,
  Loader2,
  CheckCircle2,
  MapPin,
  Calendar,
  Package,
  Truck,
  Sparkles,
  Brain,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { BaseMap, BaseMapRef } from '@/components/map/BaseMap';
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';

interface SelectedOrder {
  id: string;
  order_number: string | null;
  trip_date: string;
  status: string;
  customer_id: string | null;
  pickup_city?: string | null;
  pickup_address?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  delivery_city?: string | null;
  delivery_address?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  customers?: { company_name: string } | null;
  sales_total?: number | null;
  product_id?: string | null;
}

interface Product {
  id: string;
  name: string;
}

interface CreateCompositeRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: SelectedOrder[];
  onSuccess: () => void;
}

const CreateCompositeRouteDialog: React.FC<CreateCompositeRouteDialogProps> = ({
  open,
  onOpenChange,
  selectedOrders,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { data: tenantSettings } = useTenantSettings();
  const mapRef = useRef<BaseMapRef>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [routeDate, setRouteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isCreating, setIsCreating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch products
  useEffect(() => {
    if (!open) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setProducts(data || []);
    };
    fetchProducts();
  }, [open]);

  // Auto-select composite product from tenant settings
  useEffect(() => {
    if (tenantSettings && (tenantSettings as any).composite_route_product_id) {
      setSelectedProductId((tenantSettings as any).composite_route_product_id);
    } else if (selectedOrders.length > 0 && selectedOrders[0].product_id) {
      setSelectedProductId(selectedOrders[0].product_id);
    }
  }, [tenantSettings, selectedOrders]);

  // Add markers to map when it loads
  const handleMapLoad = async (map: mapboxgl.Map) => {
    const mb = await loadMapboxGL();
    const bounds = new mb.LngLatBounds();
    let hasCoords = false;

    selectedOrders.forEach((order, idx) => {
      const color = `hsl(${(idx * 60) % 360}, 70%, 50%)`;

      if (order.pickup_latitude && order.pickup_longitude) {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-center';
        el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:10px;color:white;font-weight:bold;`;
        el.textContent = '▲';
        mapRef.current?.addMarker([order.pickup_longitude, order.pickup_latitude], el);
        bounds.extend([order.pickup_longitude, order.pickup_latitude]);
        hasCoords = true;
      }

      if (order.delivery_latitude && order.delivery_longitude) {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-center';
        el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:10px;color:white;font-weight:bold;`;
        el.textContent = '▼';
        mapRef.current?.addMarker([order.delivery_longitude, order.delivery_latitude], el);
        bounds.extend([order.delivery_longitude, order.delivery_latitude]);
        hasCoords = true;
      }
    });

    if (hasCoords) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 12 });
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // 1. Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (!userCompany) throw new Error('Geen bedrijf gevonden');

      // 2. Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_order_number');

      // 3. Create composite trip
      const firstOrder = selectedOrders[0];
      const { data: compositeTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          order_number: orderNumber,
          trip_date: routeDate,
          status: 'gepland' satisfies TripStatus,
          is_composite: true,
          pickup_address: firstOrder.pickup_address || 'Samengestelde route',
          pickup_city: firstOrder.pickup_city || 'Divers',
          delivery_address: 'Samengestelde route',
          delivery_city: 'Divers',
          company_id: userCompany.company_id,
          product_id: selectedProductId || null,
          sales_total: selectedOrders.reduce((sum, o) => sum + (o.sales_total || 0), 0),
        } as any)
        .select()
        .single();

      if (tripError) throw tripError;

      // 4. Update child trips with parent_trip_id
      const childIds = selectedOrders.map(o => o.id);
      const { error: updateError } = await supabase
        .from('trips')
        .update({ parent_trip_id: compositeTrip.id } as any)
        .in('id', childIds);

      if (updateError) throw updateError;

      // 5. Copy all route_stops from child trips to composite
      const { data: childStops } = await supabase
        .from('route_stops')
        .select('*')
        .in('trip_id', childIds)
        .order('stop_order');

      if (childStops && childStops.length > 0) {
        const newStops = childStops.map((stop, idx) => ({
          trip_id: compositeTrip.id,
          stop_order: idx + 1,
          stop_type: stop.stop_type,
          address: stop.address,
          postal_code: stop.postal_code,
          city: stop.city,
          country: stop.country,
          latitude: stop.latitude,
          longitude: stop.longitude,
          time_window_start: stop.time_window_start,
          time_window_end: stop.time_window_end,
          contact_name: stop.contact_name,
          customer_reference: stop.customer_reference,
          waybill_number: stop.waybill_number,
        }));

        const { data: insertedStops } = await supabase.from('route_stops').insert(newStops).select();

        // 6. AI Route Optimization - optimize stop order
        if (insertedStops && insertedStops.length >= 2) {
          setIsOptimizing(true);
          try {
            const aiStops = insertedStops
              .filter((s: any) => s.latitude && s.longitude)
              .map((s: any) => ({
                id: s.id,
                address: s.address || '',
                city: s.city || '',
                postalCode: s.postal_code || '',
                latitude: s.latitude,
                longitude: s.longitude,
                timeWindow: s.time_window_start && s.time_window_end ? {
                  from: new Date(s.time_window_start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
                  to: new Date(s.time_window_end).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
                } : undefined,
                priority: s.stop_type === 'pickup' ? 'high' as const : 'medium' as const,
              }));

            if (aiStops.length >= 2) {
              const { data: optimized, error: optError } = await supabase.functions.invoke('ai-route-optimizer', {
                body: {
                  stops: aiStops,
                  vehicleType: (tenantSettings as any)?.route_vehicle_type || 'van',
                  serviceTimeMinutes: (tenantSettings as any)?.route_service_time_minutes ?? 15,
                  speedPercentage: (tenantSettings as any)?.route_speed_percentage ?? 85,
                  departureTime: `${routeDate}T08:00:00`,
                },
              });

              if (!optError && optimized?.stops) {
                // Update stop_order based on AI-optimized sequence
                const updates = optimized.stops.map((optStop: any, idx: number) => 
                  supabase
                    .from('route_stops')
                    .update({ stop_order: idx + 1 })
                    .eq('id', optStop.id)
                    .eq('trip_id', compositeTrip.id)
                );
                await Promise.all(updates);

                const saved = optimized.savings;
                setOptimizationResult(
                  `${saved?.timeSaved || 0} min en ${(saved?.distanceSaved || 0).toFixed(1)} km bespaard`
                );
              }
            }
          } catch (optErr) {
            console.warn('AI route optimization failed, using original order:', optErr);
          } finally {
            setIsOptimizing(false);
          }
        }
      }

      setIsSuccess(true);
      toast({
        title: 'Samengestelde route aangemaakt',
        description: optimizationResult
          ? `Route ${orderNumber} met ${selectedOrders.length} orders — AI: ${optimizationResult}`
          : `Route ${orderNumber} met ${selectedOrders.length} orders`,
      });

      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('Error creating composite route:', error);
      toast({
        title: 'Fout bij aanmaken route',
        description: error.message || 'Probeer opnieuw',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setIsSuccess(false);
      setIsCreating(false);
      setIsOptimizing(false);
      setOptimizationResult(null);
    }
  }, [open]);

  const totalStops = selectedOrders.length * 2; // Rough estimate
  const totalRevenue = selectedOrders.reduce((sum, o) => sum + (o.sales_total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl backdrop-blur-xl bg-card/95 border-border/40 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Route className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold">Samenvoegen tot route</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {selectedOrders.length} orders → 1 samengestelde route
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Preview */}
          <div className="rounded-xl overflow-hidden border border-border/30 h-[200px]">
            <BaseMap
              ref={mapRef}
              style="dark"
              zoom={7}
              showGeolocate={false}
              showNavigation={false}
              onLoad={handleMapLoad}
              className="w-full h-full"
            />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center">
              <Package className="h-4 w-4 mx-auto text-primary mb-1" />
              <div className="text-lg font-bold">{selectedOrders.length}</div>
              <div className="text-[10px] text-muted-foreground">Orders</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center">
              <MapPin className="h-4 w-4 mx-auto text-primary mb-1" />
              <div className="text-lg font-bold">~{totalStops}</div>
              <div className="text-[10px] text-muted-foreground">Stops</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center">
              <Truck className="h-4 w-4 mx-auto text-success mb-1" />
              <div className="text-lg font-bold">€{totalRevenue.toFixed(0)}</div>
              <div className="text-[10px] text-muted-foreground">Omzet</div>
            </div>
          </div>

          {/* Order List */}
          <ScrollArea className="h-[160px]">
            <div className="space-y-1.5 pr-4">
              <AnimatePresence>
                {selectedOrders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: `hsl(${(idx * 60) % 360}, 70%, 50%)` }}
                      />
                      <div>
                        <span className="text-sm font-medium">{order.order_number || '-'}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {order.customers?.company_name || '-'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.pickup_city || '-'} → {order.delivery_city || '-'}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <Separator className="opacity-30" />

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Route datum
              </Label>
              <Input
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                className="h-9 text-sm bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                Product
              </Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-9 text-sm bg-background/60">
                  <SelectValue placeholder="Selecteer product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Annuleren
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || isSuccess || selectedOrders.length < 2}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 gap-2 min-w-[180px]"
          >
            {isSuccess ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {optimizationResult ? `Geoptimaliseerd!` : 'Aangemaakt!'}
              </motion.div>
            ) : isOptimizing ? (
              <>
                <Brain className="h-4 w-4 animate-pulse" />
                AI optimaliseert route...
              </>
            ) : isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Samenvoegen...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Samenvoegen & optimaliseren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCompositeRouteDialog;
