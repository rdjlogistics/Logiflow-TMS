import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Mail, AlertCircle, ChevronDown, User, Truck, Package, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
}

interface Vehicle {
  id: string;
  license_plate: string;
  brand: string | null;
  model: string | null;
}

interface Driver {
  id: string;
  name: string;
  user_id: string | null;
  status: string;
}

interface Carrier {
  id: string;
  company_name: string;
  email: string | null;
  has_app_access: boolean;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
}

interface OrderDetailsData {
  order_date: string;
  order_time: string;
  customer_id: string;
  contact_person: string;
  product_id: string;
  carrier_id: string;
  vehicle_id: string;
  driver_id: string;
  remarks_waybill: string;
  remarks_invoice: string;
  remarks_purchase_invoice: string;
  remarks_internal: string;
  confirmation_email: string;
}

interface OrderDetailsPanelProps {
  data: OrderDetailsData;
  onChange: (data: OrderDetailsData) => void;
  errors?: Record<string, string>;
  onSendTransportOrder?: (carrierEmail: string, carrierName: string) => void;
}

const OrderDetailsPanel = React.forwardRef<HTMLDivElement, OrderDetailsPanelProps>(
  ({ data, onChange, errors = {}, onSendTransportOrder }, ref) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarksOpen, setRemarksOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customersRes, vehiclesRes, carriersRes, driversRes, productsRes] = await Promise.all([
          supabase.from('customers').select('id, company_name, contact_name, email').order('company_name'),
          supabase.from('vehicles').select('id, license_plate, brand, model').eq('is_active', true).order('license_plate'),
          supabase.from('carriers').select('id, company_name, email, is_active').order('company_name'),
          supabase.from('drivers').select('id, name, user_id, status').eq('status', 'active').order('name'),
          supabase.from('products').select('id, name').eq('is_active', true).order('sort_order'),
        ]);

        if (customersRes.data) setCustomers(customersRes.data);
        if (vehiclesRes.data) setVehicles(vehiclesRes.data);
        if (productsRes.data) setProducts(productsRes.data);
        
        const driversData = driversRes?.data || [];
        if (driversData.length > 0) setDrivers(driversData);
        
        const driverUserIds = new Set(
          driversData.filter((d: any) => d.user_id).map((d: any) => d.id)
        );
        
        if (carriersRes.data) {
          setCarriers(
            carriersRes.data.map((c: any) => ({
              ...c,
              has_app_access: driverUserIds.has(c.id),
            }))
          );
        }
        if (vehiclesRes.error) console.error('Vehicles fetch error:', vehiclesRes.error);
        if (driversRes.error) console.error('Drivers fetch error:', driversRes.error);
        if (customersRes.error) console.error('Customers fetch error:', customersRes.error);
        if (carriersRes.error) console.error('Carriers fetch error:', carriersRes.error);
        if (productsRes.error) console.error('Products fetch error:', productsRes.error);
      } catch (err) {
        console.error('Error fetching order form data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = useCallback((field: keyof OrderDetailsData, value: string) => {
    onChange({ ...data, [field]: value });
  }, [data, onChange]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === data.customer_id),
    [customers, data.customer_id]
  );

  const hasRemarks = data.remarks_waybill || data.remarks_invoice || data.remarks_purchase_invoice || data.remarks_internal;

  // Desktop-optimized: compact inputs (h-10 lg:h-9), mobile stays h-12
  const inputClasses = "h-12 lg:h-10 text-base lg:text-sm rounded-xl border-border/60 bg-background/80 backdrop-blur-sm touch-manipulation transition-all duration-150 focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const selectTriggerClasses = "h-12 lg:h-10 text-base lg:text-sm rounded-xl border-border/60 bg-background/80 backdrop-blur-sm touch-manipulation transition-all duration-150 focus:ring-2 focus:ring-primary/30";
  const textareaClasses = "min-h-[80px] lg:min-h-[64px] text-base lg:text-sm rounded-xl border-border/60 bg-background/80 backdrop-blur-sm resize-none touch-manipulation focus:ring-2 focus:ring-primary/30";
  const labelClasses = "text-xs lg:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide";

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-border/40 bg-card/95 backdrop-blur-xl shadow-lg rounded-2xl ring-1 ring-border/20">
        <CardHeader className="relative pb-3 px-4 lg:px-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span>Order details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 lg:px-3 pb-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getFieldError = (field: string) => errors[field];
  const hasError = (field: string) => Boolean(errors[field]);

  return (
    <Card ref={ref} className="relative overflow-hidden border-border/40 bg-card/95 backdrop-blur-xl shadow-lg rounded-2xl ring-1 ring-border/20">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />
      
      <CardHeader className="relative pb-2 px-4 lg:px-3 pt-4 lg:pt-3">
        <CardTitle className="text-base lg:text-sm font-semibold flex items-center gap-2.5">
          <div className="p-2 lg:p-1.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shrink-0 shadow-sm">
            <Calendar className="h-4 w-4 lg:h-3.5 lg:w-3.5 text-primary" />
          </div>
          <span>Order details</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative space-y-4 lg:space-y-3 px-4 lg:px-3 pb-5 lg:pb-4">
        {/* Datum & Tijd */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-2">
          <div className="space-y-1.5 lg:space-y-1 min-w-0">
            <Label className={labelClasses}>Datum</Label>
            <div className="relative min-w-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="date"
                value={data.order_date}
                onChange={(e) => handleChange('order_date', e.target.value)}
                className={cn(inputClasses, "pl-10 lg:pl-9 pr-3 appearance-none text-left [text-align-last:left]")}
              />
            </div>
          </div>
          <div className="space-y-1.5 lg:space-y-1 min-w-0">
            <Label className={labelClasses}>Tijd</Label>
            <div className="relative min-w-0">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="time"
                value={data.order_time}
                onChange={(e) => handleChange('order_time', e.target.value)}
                className={cn(inputClasses, "pl-10 lg:pl-9 pr-3 appearance-none text-left [text-align-last:left]")}
              />
            </div>
          </div>
        </div>

        {/* Klant */}
        <div className="space-y-1.5 lg:space-y-1">
          <Label className={cn(labelClasses, hasError('customer_id') && "text-destructive")}>
            Klant {hasError('customer_id') && <span className="text-destructive">*</span>}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground pointer-events-none z-10" />
            <Select value={data.customer_id} onValueChange={(v) => handleChange('customer_id', v)}>
              <SelectTrigger className={cn(selectTriggerClasses, "pl-10 lg:pl-9", hasError('customer_id') && "border-destructive focus:ring-destructive/30")}>
                <SelectValue placeholder="Selecteer klant..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 backdrop-blur-xl">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id} className="py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation">
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasError('customer_id') && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {getFieldError('customer_id')}
            </p>
          )}
        </div>

        {/* Contactpersoon */}
        <div className="space-y-1.5 lg:space-y-1">
          <Label className={labelClasses}>Contactpersoon</Label>
          <Input
            value={data.contact_person}
            onChange={(e) => handleChange('contact_person', e.target.value)}
            placeholder={selectedCustomer?.contact_name || "Naam contactpersoon"}
            className={inputClasses}
          />
        </div>

        {/* Product & Charter */}
        <div className="grid grid-cols-2 gap-3 lg:gap-2">
          <div className="space-y-1.5 lg:space-y-1">
            <Label className={labelClasses}>Product</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground pointer-events-none z-10" />
              <Select value={data.product_id} onValueChange={(v) => handleChange('product_id', v)}>
                <SelectTrigger className={cn(selectTriggerClasses, "pl-10 lg:pl-9")}>
                  <SelectValue placeholder="Kies..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 backdrop-blur-xl">
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id} className="py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation">
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 lg:space-y-1">
            <Label className={labelClasses}>Charter</Label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground pointer-events-none z-10" />
              <Select value={data.carrier_id} onValueChange={(v) => handleChange('carrier_id', v)}>
                <SelectTrigger className={cn(selectTriggerClasses, "pl-10 lg:pl-9 pr-10")}>
                  <SelectValue placeholder="Kies..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 backdrop-blur-xl">
                  <SelectItem value="eigen" className="py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation">
                    Eigen vervoer
                  </SelectItem>
                  {carriers.map((carrier) => (
                    <SelectItem 
                      key={carrier.id} 
                      value={carrier.id} 
                      className={cn("py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation", !carrier.is_active && "opacity-50")}
                      disabled={!carrier.is_active}
                    >
                      <span className="flex items-center gap-2">
                        {carrier.has_app_access && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        {carrier.company_name}
                        {!carrier.is_active && <span className="text-xs text-muted-foreground ml-1">(inactief)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {data.carrier_id && data.carrier_id !== 'eigen' && onSendTransportOrder && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary z-10"
                        onClick={() => {
                          const carrier = carriers.find(c => c.id === data.carrier_id);
                          if (carrier) {
                            onSendTransportOrder(carrier.email || '', carrier.company_name);
                          }
                        }}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Transportopdracht versturen</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Voertuig & Eigen Chauffeur */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-2">
          <div className="space-y-1.5 lg:space-y-1">
            <Label className={labelClasses}>Voertuig</Label>
            <Select value={data.vehicle_id} onValueChange={(v) => handleChange('vehicle_id', v)}>
              <SelectTrigger className={selectTriggerClasses}>
                <SelectValue placeholder="Selecteer voertuig..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 backdrop-blur-xl">
                {vehicles.length === 0 && (
                  <SelectItem value="__empty" disabled className="py-3 lg:py-1.5 text-base lg:text-xs text-muted-foreground">
                    Geen voertuigen beschikbaar
                  </SelectItem>
                )}
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id} className="py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation">
                    {vehicle.license_plate} {vehicle.brand && `- ${vehicle.brand}`} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 lg:space-y-1">
            <Label className={labelClasses}>Eigen chauffeur</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground pointer-events-none z-10" />
              <Select value={data.driver_id} onValueChange={(v) => handleChange('driver_id', v)}>
                <SelectTrigger className={cn(selectTriggerClasses, "pl-10 lg:pl-9")}>
                  <SelectValue placeholder="Selecteer eigen chauffeur..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 backdrop-blur-xl">
                  <SelectItem value="none" className="py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation text-muted-foreground">
                     Geen eigen chauffeur
                  </SelectItem>
                  {drivers.length === 0 && (
                    <SelectItem value="__empty_driver" disabled className="py-3 lg:py-1.5 text-base lg:text-xs text-muted-foreground">
                      Geen eigen chauffeurs beschikbaar
                    </SelectItem>
                  )}
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id} className="py-3 lg:py-1.5 text-base lg:text-xs touch-manipulation">
                      <span className="flex items-center gap-2">
                        {driver.user_id && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Heeft portaal-toegang" />}
                        {driver.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Opmerkingen - Collapsible */}
        <Collapsible open={remarksOpen} onOpenChange={setRemarksOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 lg:py-2 px-3 lg:px-2.5 -mx-3 lg:-mx-2.5 bg-muted/30 rounded-xl touch-manipulation active:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 lg:h-3.5 lg:w-3.5 text-muted-foreground" />
              <span className="text-sm lg:text-xs font-medium">Opmerkingen</span>
              {hasRemarks && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", remarksOpen && "rotate-180")} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 lg:space-y-2 pt-3 lg:pt-2">
            <div className="space-y-1.5 lg:space-y-1">
              <Label className={labelClasses}>Vrachtbrief</Label>
              <Textarea value={data.remarks_waybill} onChange={(e) => handleChange('remarks_waybill', e.target.value)} className={textareaClasses} placeholder="Opmerkingen voor vrachtbrief..." />
            </div>
            <div className="space-y-1.5 lg:space-y-1">
              <Label className={labelClasses}>Factuur</Label>
              <Textarea value={data.remarks_invoice} onChange={(e) => handleChange('remarks_invoice', e.target.value)} className={textareaClasses} placeholder="Opmerkingen voor factuur..." />
            </div>
            <div className="space-y-1.5 lg:space-y-1">
              <Label className={labelClasses}>Inkoopfactuur</Label>
              <Textarea value={data.remarks_purchase_invoice} onChange={(e) => handleChange('remarks_purchase_invoice', e.target.value)} className={textareaClasses} placeholder="Opmerkingen voor inkoopfactuur..." />
            </div>
            <div className="space-y-1.5 lg:space-y-1">
              <Label className={labelClasses}>Intern</Label>
              <Textarea value={data.remarks_internal} onChange={(e) => handleChange('remarks_internal', e.target.value)} className={textareaClasses} placeholder="Interne opmerkingen..." />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Email bevestiging */}
        <div className="space-y-1.5 lg:space-y-1">
          <Label className={cn(labelClasses, "flex items-center gap-1.5")}>
            <Mail className="h-3.5 w-3.5" />
            Bevestiging e-mail
          </Label>
          <Input
            type="email"
            value={data.confirmation_email}
            onChange={(e) => handleChange('confirmation_email', e.target.value)}
            placeholder={selectedCustomer?.email || "email@voorbeeld.nl"}
            className={inputClasses}
          />
        </div>
      </CardContent>
    </Card>
  );
});

OrderDetailsPanel.displayName = "OrderDetailsPanel";

export default OrderDetailsPanel;
