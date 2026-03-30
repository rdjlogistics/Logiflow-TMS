import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { TripStatus } from "@/types/supabase-helpers";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, History, Eye, Edit3 } from "lucide-react";
import { motion, Reorder, useDragControls } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { notifyCustomerStatusChange } from "@/lib/customerNotifications";
import { useToastFeedback } from "@/hooks/useToastFeedback";
import { useUnsavedChangesWarning } from "@/hooks/useAutoSave";
import { geocodeAddress } from "@/utils/geocoding";
import { useCreditControl } from "@/hooks/useCreditControl";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useAutoPrice } from "@/hooks/useAutoPrice";
import OrderDetailsPanel from "@/components/orders/OrderDetailsPanel";
import DestinationCard, { DestinationData } from "@/components/orders/DestinationCard";
import PricingPanel, { PricingData } from "@/components/orders/PricingPanel";
import PricingAdviceWidget from "@/components/orders/PricingAdviceWidget";
import OrderActionBar from "@/components/orders/OrderActionBar";
import OrderRouteDialog from "@/components/orders/OrderRouteDialog";
import OrderTimelineSheet from "@/components/orders/OrderTimelineSheet";
import OrderDocumentDialog from "@/components/orders/OrderDocumentDialog";
import OrderAttachmentDialog from "@/components/orders/OrderAttachmentDialog";
import OrderCompleteDialog from "@/components/orders/OrderCompleteDialog";
import OrderVerifyDialog from "@/components/orders/OrderVerifyDialog";
import { DispatchOrderDialog } from "@/components/orders/DispatchOrderDialog";
import { SendTransportOrderDialog } from "@/components/orders/SendTransportOrderDialog";
import { CreditWarningBanner } from "@/components/orders/CreditWarningBanner";
import OrderDetailView from "@/components/orders/OrderDetailView";
import OrderGoodsDialog from "@/components/orders/OrderGoodsDialog";
import { capitalizeCity } from "@/lib/date-utils";

const createEmptyDestination = (): DestinationData => ({
  id: crypto.randomUUID(),
  stop_type: 'pickup',
  address_book_id: '',
  country: 'Nederland',
  postal_code: '',
  house_number: '',
  street: '',
  street_line_2: '',
  city: '',
  customer_reference: '',
  waybill_number: '',
  pickup_date: new Date().toISOString().split('T')[0],
  time_window_start: '08:00',
  time_window_end: '17:00',
  company_name: '',
  contact_name: '',
  phone: '',
  notes: '',
  save_to_address_book: false,
});

// Wrapper component for drag-and-drop reordering
const ReorderableDestination = ({ 
  dest, index, onChange, onRemove, canRemove, showCopyToDelivery, onCopyToDelivery 
}: {
  dest: DestinationData;
  index: number;
  onChange: (data: DestinationData) => void;
  onRemove: () => void;
  canRemove: boolean;
  showCopyToDelivery: boolean;
  onCopyToDelivery: () => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item 
      value={dest} 
      dragListener={false} 
      dragControls={dragControls}
      className="list-none"
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.15)", zIndex: 50 }}
    >
      <DestinationCard
        index={index}
        data={dest}
        onChange={onChange}
        onRemove={onRemove}
        canRemove={canRemove}
        showCopyToDelivery={showCopyToDelivery}
        onCopyToDelivery={onCopyToDelivery}
        dragHandleProps={{
          onPointerDown: (e) => dragControls.start(e),
          style: { touchAction: 'none' },
        }}
      />
    </Reorder.Item>
  );
};

const OrderForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId || searchParams.get('id');
  const feedback = useToastFeedback();
  const { checkCustomerCredit } = useCreditControl();

  const { calculate: calculateAutoPrice, result: autoPriceResult, isCalculating: isAutoPricing, clearResult: clearAutoPrice } = useAutoPrice();
  const [isAutoPriceApplied, setIsAutoPriceApplied] = useState(false);
  const [isAutoPriceDismissed, setIsAutoPriceDismissed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string>();
  const [driverEmail, setDriverEmail] = useState<string>();
  const [driverPhone, setDriverPhone] = useState<string>();
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<string>('gepland');
  
  // Dialog states
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [showTimelineSheet, setShowTimelineSheet] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showDispatchDialog, setShowDispatchDialog] = useState(false);
  const [showGoodsDialog, setShowGoodsDialog] = useState(false);
  const [showTransportOrderDialog, setShowTransportOrderDialog] = useState(false);
  const [transportOrderCarrierEmail, setTransportOrderCarrierEmail] = useState('');
  const [transportOrderCarrierName, setTransportOrderCarrierName] = useState('');
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [isDestScrolled, setIsDestScrolled] = useState(false);
  const [initialCarrierId, setInitialCarrierId] = useState<string>('');
  const [initialDriverId, setInitialDriverId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // Unsaved changes warning
  useUnsavedChangesWarning(isDirty);

  // Order details state
  const [orderDetails, setOrderDetails] = useState({
    order_date: new Date().toISOString().split('T')[0],
    order_time: '08:00',
    customer_id: '',
    contact_person: '',
    product_id: '',
    carrier_id: '',
    vehicle_id: '',
    driver_id: '',
    remarks_waybill: '',
    remarks_invoice: '',
    remarks_purchase_invoice: '',
    remarks_internal: '',
    confirmation_email: '',
  });

  // Destinations state
  const [destinations, setDestinations] = useState<DestinationData[]>([
    { ...createEmptyDestination(), stop_type: 'pickup' },
    { ...createEmptyDestination(), stop_type: 'delivery' },
  ]);

  // Pricing state
  const [pricing, setPricing] = useState<PricingData>({
    distance_km: 0,
    stops: 2,
    hours: 0,
    wait_time_minutes: 0,
    load_unload_minutes: 0,
    purchase_distance_km: 0,
    purchase_hours: 0,
    quantity: 1,
    total_weight: '',
    dimensions: '',
    product_lines: [],
    sales_other_costs: 0,
    sales_discount_pct: 0,
    price_locked: false,
    purchase_other_costs: 0,
    purchase_price_locked: false,
  });

  // Credit check for selected customer
  const creditCheck = useMemo(() => {
    if (!orderDetails.customer_id) return undefined;
    const salesTotal = pricing.product_lines.reduce((sum, line) => sum + line.sales_subtotal, 0) + pricing.sales_other_costs;
    return checkCustomerCredit(orderDetails.customer_id, salesTotal);
  }, [orderDetails.customer_id, pricing.product_lines, pricing.sales_other_costs, checkCustomerCredit]);

  // Load existing order if editing
  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId]);

  const loadOrder = async (id: string) => {
    const { data: order, error } = await supabase
      .from('trips')
      .select('*, route_stops(*)')
      .eq('id', id)
      .single();

    if (error || !order) {
      feedback.error("Order niet gevonden");
      navigate('/orders');
      return;
    }

    setOrderNumber(order.order_number || '');
    setOrderStatus(order.status);

    // Fetch customer email
    if (order.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('email')
        .eq('id', order.customer_id)
        .single();
      setCustomerEmail(customer?.email || undefined);
    }

    // Fetch driver email if assigned
    if (order.driver_id) {
      const { data: driver } = await supabase
        .from('drivers')
        .select('email, phone')
        .eq('id', order.driver_id)
        .single();
      setDriverEmail(driver?.email || undefined);
      setDriverPhone(driver?.phone || undefined);
    }

    setOrderDetails({
      order_date: order.trip_date,
      order_time: '08:00',
      customer_id: order.customer_id || '',
      contact_person: '',
      product_id: '',
      carrier_id: order.carrier_id || '',
      vehicle_id: order.vehicle_id || '',
      driver_id: order.driver_id || '',
      remarks_waybill: order.remarks_waybill || '',
      remarks_invoice: order.remarks_invoice || '',
      remarks_purchase_invoice: order.remarks_purchase_invoice || '',
      remarks_internal: order.remarks_internal || '',
      confirmation_email: order.confirmation_email || '',
    });
    setInitialCarrierId(order.carrier_id || '');
    setInitialDriverId(order.driver_id || '');

    // Load destinations from route_stops
    if (order.route_stops && order.route_stops.length > 0) {
      const loadedDestinations: DestinationData[] = order.route_stops
        .sort((a: any, b: any) => a.stop_order - b.stop_order)
        .map((stop: any) => ({
          id: stop.id,
          stop_type: stop.stop_type === 'pickup' ? 'pickup' : stop.stop_type === 'delivery' ? 'delivery' : 'both',
          address_book_id: '',
          country: 'Nederland',
          postal_code: stop.postal_code || '',
          house_number: stop.house_number || '',
          street: stop.house_number ? (stop.address || '') : (stop.address || ''),
          street_line_2: '',
          city: stop.city || '',
          customer_reference: stop.customer_reference || '',
          waybill_number: stop.waybill_number || '',
          pickup_date: stop.estimated_arrival?.split('T')[0] || order.trip_date,
          time_window_start: stop.time_window_start || '08:00',
          time_window_end: stop.time_window_end || '17:00',
          company_name: stop.company_name || '',
          contact_name: stop.contact_name || '',
          phone: stop.phone || '',
          notes: stop.notes || '',
          save_to_address_book: false,
          latitude: stop.latitude || null,
          longitude: stop.longitude || null,
        }));
      setDestinations(loadedDestinations);
    }

    // Load pricing
    setPricing(prev => ({
      ...prev,
      distance_km: Number(order.sales_distance_km) || 0,
      stops: order.route_stops?.length || 2,
      hours: Number(order.travel_hours) || 0,
      wait_time_minutes: Number(order.wait_time_minutes) || 0,
      load_unload_minutes: Number(order.load_unload_minutes) || 0,
      purchase_distance_km: Number(order.purchase_distance_km) || 0,
      total_weight: order.total_weight_kg?.toString() || '',
      dimensions: order.dimensions || '',
      sales_other_costs: Number(order.sales_other_costs) || 0,
      sales_discount_pct: Number(order.sales_discount_pct) || 0,
      price_locked: order.price_locked || false,
      purchase_other_costs: Number(order.purchase_other_costs) || 0,
      purchase_price_locked: order.purchase_price_locked || false,
    }));

    // Data is loaded, not dirty yet
    setIsDirty(false);
  };

  const handleAddDestination = () => {
    setDestinations([...destinations, createEmptyDestination()]);
    setPricing(prev => ({ ...prev, stops: prev.stops + 1 }));
    setIsDirty(true);
  };

  const handleRemoveDestination = (index: number) => {
    if (destinations.length > 2) {
      const newDestinations = destinations.filter((_, i) => i !== index);
      setDestinations(newDestinations);
      setPricing(prev => ({ ...prev, stops: prev.stops - 1 }));
      setIsDirty(true);
    }
  };

  const handleDestinationChange = (index: number, data: DestinationData) => {
    const newDestinations = [...destinations];
    newDestinations[index] = data;
    setDestinations(newDestinations);
    setIsDirty(true);
  };

  // Copy pickup address to first delivery destination
  const handleCopyToDelivery = (sourceIndex: number) => {
    const source = destinations[sourceIndex];
    const deliveryIndex = destinations.findIndex((d, i) => 
      i !== sourceIndex && (d.stop_type === 'delivery' || d.stop_type === 'both')
    );
    
    if (deliveryIndex === -1) {
      feedback.warning("Geen afleverbestemming gevonden", "Voeg eerst een afleveradres toe");
      return;
    }

    const newDestinations = [...destinations];
    newDestinations[deliveryIndex] = {
      ...newDestinations[deliveryIndex],
      // Copy address fields
      country: source.country,
      postal_code: source.postal_code,
      house_number: source.house_number,
      street: source.street,
      street_line_2: source.street_line_2,
      city: source.city,
      company_name: source.company_name,
      contact_name: source.contact_name,
      phone: source.phone,
      address_book_id: source.address_book_id,
    };
    
    setDestinations(newDestinations);
    
    const destLabel = `Bestemming ${deliveryIndex + 1}`;
    const addressPreview = source.city || source.postal_code || 'adres';
    feedback.info("Adres gekopieerd", `${addressPreview} → ${destLabel} (aflevering)`);
  };

  const handleCalculateRoute = async () => {
    if (isCalculatingRoute) return;
    
    // Validate destinations have addresses
    const validDestinations = destinations.filter(d => 
      (d.street && d.city) || (d.postal_code && d.house_number)
    );

    if (validDestinations.length < 2) {
      feedback.warning("Onvoldoende adressen", "Voeg minimaal 2 adressen toe met straat/stad of postcode/huisnummer");
      return;
    }

    setIsCalculatingRoute(true);
    feedback.info("Route wordt berekend...", "Even geduld aub");

    try {
      // Get Mapbox token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-mapbox-token");
      
      if (tokenError || !tokenData?.token) {
        feedback.error("Mapbox token niet beschikbaar");
        return;
      }

      // Geocode all destinations with fallback
      const geocodedDestinations = await Promise.all(
        validDestinations.map(async (dest) => {
          try {
            // Try street address first
            let address = dest.street 
              ? `${dest.street} ${dest.house_number}, ${dest.city}`.trim()
              : `${dest.postal_code} ${dest.house_number}`.trim();
            
            let result = await geocodeAddress(address, dest.postal_code, dest.city);
            
            // Fallback: try with just postal code and city
            if (!result && dest.postal_code && dest.city) {
              result = await geocodeAddress(`${dest.postal_code} ${dest.city}`, dest.postal_code, dest.city);
            }
            
            // Fallback: try with just city
            if (!result && dest.city) {
              result = await geocodeAddress(dest.city, '', dest.city);
            }
            
            return {
              ...dest,
              coordinates: result ? [result.longitude, result.latitude] : null
            };
          } catch (e) {
            console.warn("Geocoding failed for destination:", dest, e);
            return { ...dest, coordinates: null };
          }
        })
      );

      // Filter out destinations that couldn't be geocoded
      const withCoords = geocodedDestinations.filter(d => d.coordinates);
      
      if (withCoords.length < 2) {
        feedback.error("Kan adressen niet vinden", "Controleer de ingevoerde adressen (postcode, straat, woonplaats)");
        return;
      }

      // Build coordinates string for Mapbox Directions API
      const coordinatesStr = withCoords
        .map(d => `${d.coordinates![0]},${d.coordinates![1]}`)
        .join(';');

      // Call Mapbox Directions API for all waypoints
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesStr}?access_token=${tokenData.token}&overview=false`
      );

      if (!response.ok) {
        throw new Error("Directions request failed");
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round(route.distance / 1000 * 10) / 10; // meters to km, 1 decimal
        const durationMinutes = Math.round(route.duration / 60); // seconds to minutes
        const durationHours = Math.round(durationMinutes / 60 * 10) / 10; // to hours, 1 decimal

        // Update pricing AND recalculate product line subtotals
        setPricing(prev => {
          const newPricing = {
            ...prev,
            distance_km: distanceKm,
            purchase_distance_km: distanceKm,
            hours: durationHours,
            purchase_hours: durationHours,
            stops: validDestinations.length,
          };
          
          // Recalculate product line subtotals with new values
          newPricing.product_lines = prev.product_lines.map(line => {
            if (!line.is_active) {
              return { ...line, sales_subtotal: 0, purchase_subtotal: 0 };
            }

            let salesMultiplier = 1;
            let purchaseMultiplier = 1;
            
            switch (line.pricing_model) {
              case 'per_km':
                salesMultiplier = distanceKm;
                purchaseMultiplier = distanceKm;
                break;
              case 'per_stop':
                salesMultiplier = validDestinations.length;
                purchaseMultiplier = validDestinations.length;
                break;
              case 'per_hour':
                salesMultiplier = durationHours;
                purchaseMultiplier = durationHours;
                break;
              case 'per_wait_minute':
                salesMultiplier = prev.wait_time_minutes;
                purchaseMultiplier = prev.wait_time_minutes;
                break;
              case 'per_ride':
              case 'fixed':
                salesMultiplier = 1;
                purchaseMultiplier = 1;
                break;
            }

            return {
              ...line,
              sales_subtotal: line.sales_rate * salesMultiplier,
              purchase_subtotal: line.purchase_rate * purchaseMultiplier,
            };
          });
          
          return newPricing;
        });

        feedback.info("Route berekend", `${distanceKm} km, ${durationHours} uur, ${validDestinations.length} stops - Tarieven herberekend`);

        // Trigger auto-price calculation if customer is set
        if (orderDetails.customer_id && !isAutoPriceDismissed) {
          const pickup = validDestinations[0];
          const delivery = validDestinations[validDestinations.length - 1];
          calculateAutoPrice({
            customer_id: orderDetails.customer_id,
            pickup_postal_code: pickup?.postal_code,
            pickup_city: pickup?.city,
            delivery_postal_code: delivery?.postal_code,
            delivery_city: delivery?.city,
            distance_km: distanceKm,
            stops: validDestinations.length,
            pickup_date: pickup?.pickup_date,
          });
          setIsAutoPriceApplied(false);
        }
      } else {
        feedback.error("Geen route gevonden", "Controleer de adressen");
      }
    } catch (error: any) {
      console.error("Route calculation error:", error);
      feedback.error("Fout bij routeberekening", error.message || "Probeer het opnieuw");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Status transition validator
  const validateStatusTransition = (targetStatus: string): string[] => {
    const missing: string[] = [];
    const STATUS_ORDER = ['draft', 'aanvraag', 'offerte', 'gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'];
    const targetIndex = STATUS_ORDER.indexOf(targetStatus);
    const geplandIndex = STATUS_ORDER.indexOf('gepland');

    if (targetIndex >= geplandIndex) {
      if (!orderDetails.customer_id) missing.push('Klant');
      if (!orderDetails.order_date) missing.push('Datum');
      const addressedDests = destinations.filter(d => d.street || d.city);
      if (addressedDests.length < 2) missing.push('Minimaal 2 stops met adres (ophalen + afleveren)');
    }

    if (targetStatus === 'gecontroleerd') {
      const incomplete = destinations.filter(d => !d.street || !d.house_number || !d.postal_code || !d.city);
      if (incomplete.length > 0) {
        missing.push(`Volledig adres voor alle stops (straat, huisnummer, postcode, plaats) — ${incomplete.length} stop(s) onvolledig`);
      }
    }

    return missing;
  };

  const { canAddOrder } = usePlanLimits();

  const saveOrder = async (closeAfterSave: boolean = false) => {
    if (isSubmitting) return; // Guard against double-click

    // Plan limit check for new orders only
    if (!orderId && !canAddOrder()) {
      feedback.error("Orderlimiet bereikt", "Je hebt het maximale aantal orders voor deze maand bereikt. Upgrade je pakket om meer orders aan te maken.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user for tenant_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        feedback.error("Je moet ingelogd zijn om orders te maken");
        setIsSubmitting(false);
        return;
      }

      // Validate required fields
      if (!orderDetails.customer_id) {
        feedback.validationError("Selecteer een klant");
        setIsSubmitting(false);
        return;
      }

      const pickupDest = destinations.find(d => d.stop_type === 'pickup' || d.stop_type === 'both');
      const deliveryDest = destinations.find(d => d.stop_type === 'delivery' || d.stop_type === 'both');

      if (!pickupDest || !deliveryDest) {
        feedback.validationError("Voeg minimaal een ophaal- en afleverlocatie toe");
        setIsSubmitting(false);
        return;
      }

      // Calculate totals
      const salesSubtotal = pricing.product_lines.reduce((sum, line) => sum + line.sales_subtotal, 0) + pricing.sales_other_costs;
      const salesAfterDiscount = salesSubtotal * (1 - pricing.sales_discount_pct / 100);
      const salesVat = salesAfterDiscount * 0.21;
      const salesTotalIncVat = salesAfterDiscount + salesVat;
      const purchaseTotal = pricing.product_lines.reduce((sum, line) => sum + line.purchase_subtotal, 0) + pricing.purchase_other_costs;
      const grossProfit = salesAfterDiscount - purchaseTotal;
      const profitMargin = salesAfterDiscount > 0 ? (grossProfit / salesAfterDiscount) * 100 : 0;

      // Validate addresses
      const pickupAddress = `${pickupDest.street} ${pickupDest.house_number}`.trim();
      const deliveryAddress = `${deliveryDest.street} ${deliveryDest.house_number}`.trim();
      
      if (!pickupAddress && !pickupDest.city) {
        feedback.validationError("Vul een ophaaladres in");
        setIsSubmitting(false);
        return;
      }
      
      if (!deliveryAddress && !deliveryDest.city) {
        feedback.validationError("Vul een afleveradres in");
        setIsSubmitting(false);
        return;
      }

      // Get user's company_id from user_companies table, fallback to first available company
      let companyId: string | null = null;
      
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      companyId = userCompany?.company_id || null;
      
      // Fallback: get first available company if user has no explicit company link
      if (!companyId) {
        const { data: firstCompany } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        companyId = firstCompany?.id || null;
      }
      
      if (!companyId) {
        feedback.error("Geen bedrijf beschikbaar", "Er is nog geen bedrijf aangemaakt in het systeem.");
        setIsSubmitting(false);
        return;
      }

      const orderData = {
        trip_date: orderDetails.order_date,
        customer_id: orderDetails.customer_id,
        carrier_id: orderDetails.carrier_id && orderDetails.carrier_id !== 'eigen' ? orderDetails.carrier_id : null,
        vehicle_id: orderDetails.vehicle_id || null,
        driver_id: orderDetails.driver_id && orderDetails.driver_id !== 'none' ? orderDetails.driver_id : null,
        company_id: companyId,
        pickup_address: pickupAddress || pickupDest.city || 'Ophaaladres',
        pickup_city: pickupDest.city,
        pickup_postal_code: pickupDest.postal_code,
        delivery_address: deliveryAddress || deliveryDest.city || 'Afleveradres',
        delivery_city: deliveryDest.city,
        delivery_postal_code: deliveryDest.postal_code,
        remarks_waybill: orderDetails.remarks_waybill,
        remarks_invoice: orderDetails.remarks_invoice,
        remarks_purchase_invoice: orderDetails.remarks_purchase_invoice,
        remarks_internal: orderDetails.remarks_internal,
        confirmation_email: orderDetails.confirmation_email,
        sales_distance_km: pricing.distance_km,
        purchase_distance_km: pricing.purchase_distance_km,
        travel_hours: pricing.hours,
        wait_time_minutes: pricing.wait_time_minutes,
        load_unload_minutes: pricing.load_unload_minutes,
        total_weight_kg: pricing.total_weight ? parseFloat(pricing.total_weight) : null,
        dimensions: pricing.dimensions,
        sales_subtotal: salesAfterDiscount,
        sales_vat: salesVat,
        sales_total: salesTotalIncVat,
        sales_discount_pct: pricing.sales_discount_pct,
        sales_other_costs: pricing.sales_other_costs,
        purchase_subtotal: purchaseTotal,
        purchase_other_costs: pricing.purchase_other_costs,
        purchase_total: purchaseTotal,
        gross_profit: grossProfit,
        profit_margin_pct: profitMargin,
        price_locked: pricing.price_locked,
        purchase_price_locked: pricing.purchase_price_locked,
      };

      // Auto-transition logic
      let shouldAutoTransition = false;
      let statusOverride: string | undefined;
      
      if (orderId) {
        const driverAssigned = orderData.driver_id || (orderDetails.carrier_id && orderDetails.carrier_id !== 'eigen');
        shouldAutoTransition = !!(driverAssigned && ['aanvraag', 'draft'].includes(orderStatus));
        
        if (shouldAutoTransition) {
          const transitionMissing = validateStatusTransition('gepland');
          if (transitionMissing.length > 0) {
            feedback.warning("Order opgeslagen, maar status niet gewijzigd", "Vul eerst in: " + transitionMissing.join(", "));
            shouldAutoTransition = false;
          } else {
            statusOverride = 'gepland';
          }
        }
      } else {
        statusOverride = 'gepland';
      }

      // Build stops array for RPC
      const stopsForRpc = destinations.map((dest, index) => ({
        stop_type: dest.stop_type,
        address: `${dest.street} ${dest.house_number}`.trim(),
        house_number: dest.house_number || null,
        postal_code: dest.postal_code,
        city: dest.city,
        company_name: dest.company_name,
        contact_name: dest.contact_name,
        phone: dest.phone,
        customer_reference: dest.customer_reference,
        waybill_number: dest.waybill_number,
        time_window_start: dest.time_window_start || null,
        time_window_end: dest.time_window_end || null,
        notes: dest.notes,
        save_to_address_book: dest.save_to_address_book || false,
        latitude: dest.latitude || null,
        longitude: dest.longitude || null,
      }));

      // Build product lines for RPC
      const productLinesForRpc = pricing.product_lines
        .filter(line => line.product_id)
        .map(line => ({
          product_id: line.product_id,
          sales_rate_override: line.sales_rate,
          purchase_rate_override: line.purchase_rate,
          sales_subtotal: line.sales_subtotal,
          purchase_subtotal: line.purchase_subtotal,
          is_active: line.is_active,
        }));

      // Single atomic RPC call — trip + stops + product lines in one transaction
      const rpcPayload = {
        ...orderData,
        ...(statusOverride ? { status: statusOverride } : {}),
      };

      const { data: rpcResult, error: rpcError } = await supabase.rpc('save_order_with_stops', {
        p_order_id: orderId || null as any,
        p_order_data: rpcPayload,
        p_stops: stopsForRpc,
        p_product_lines: productLinesForRpc,
      });

      if (rpcError) throw rpcError;
      
      const result = rpcResult as { success: boolean; order_id?: string; order_number?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Onbekende fout bij opslaan');
      }

      let savedOrderId = result.order_id;

      if (!orderId && result.order_number) {
        setOrderNumber(result.order_number);
      }

      // Post-save side effects (non-blocking)
      if (orderId && shouldAutoTransition && savedOrderId) {
        try {
          await supabase.from('order_events').insert({
            order_id: savedOrderId,
            event_type: 'STATUS_UPDATED',
            payload: { old_value: orderStatus, new_value: 'gepland', source: 'driver_assigned_auto' },
            actor_user_id: user.id,
          });
        } catch { /* non-blocking */ }
        setOrderStatus('gepland');

        notifyCustomerStatusChange(orderDetails.customer_id, savedOrderId, 'gepland', orderNumber);

        if (orderDetails.customer_id) {
          supabase.functions.invoke('send-order-confirmation', {
            body: {
              tripId: savedOrderId,
              customerEmail: orderDetails.confirmation_email || '',
              customerName: orderDetails.contact_person || '',
              orderNumber: orderNumber || savedOrderId.slice(0, 8),
              pickupAddress: orderData.pickup_address || '',
              pickupCity: orderData.pickup_city || '',
              pickupDate: orderData.trip_date || '',
              pickupTimeWindow: null,
              deliveryAddress: orderData.delivery_address || '',
              deliveryCity: orderData.delivery_city || '',
              deliveryDate: null,
              deliveryTimeWindow: null,
              specialInstructions: orderData.remarks_internal || null,
            },
          }).catch((err) => console.error('[OrderForm] Confirmation email failed:', err));
        }
      }

      // Save addresses to address book if requested (non-blocking side effect)
      for (const dest of destinations) {
        if (dest.save_to_address_book && dest.street) {
          try {
            await supabase.from('address_book').insert({
              label: dest.company_name || `${dest.street}, ${dest.city}`,
              company_name: dest.company_name,
              contact_name: dest.contact_name,
              phone: dest.phone,
              street: dest.street,
              house_number: dest.house_number,
              postal_code: dest.postal_code,
              city: dest.city,
              country: dest.country,
            });
          } catch { /* non-blocking */ }
        }
      }

      orderId ? feedback.updated("Order") : feedback.created("Order");

      // Check if carrier_id changed — notify about transport order (wrapped in try/catch to not block save)
      try {
        const newCarrierId = orderDetails.carrier_id;
        if (newCarrierId && newCarrierId !== 'eigen' && newCarrierId !== initialCarrierId) {
          const { data: carrierData } = await supabase
            .from('carriers')
            .select('company_name, email')
            .eq('id', newCarrierId)
            .single();
          
          const { data: driverData } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', newCarrierId)
            .maybeSingle();
          
          if (driverData?.user_id) {
            feedback.info("Transportopdracht verstuurd", "Order verschijnt automatisch in de Chauffeurs App");
          } else if (carrierData) {
            setTransportOrderCarrierEmail(carrierData.email || '');
            setTransportOrderCarrierName(carrierData.company_name || '');
            setShowTransportOrderDialog(true);
          }
          setInitialCarrierId(newCarrierId);
        }
      } catch (carrierErr) {
        console.warn('Carrier check failed (non-blocking):', carrierErr);
      }

      setIsDirty(false);

      // Auto push notification when driver is newly assigned
      const newDriverId = orderDetails.driver_id;
      if (newDriverId && newDriverId !== 'none' && newDriverId !== initialDriverId) {
        setInitialDriverId(newDriverId);
        try {
          const currentOrderId = savedOrderId || orderId;
          if (currentOrderId) {
            supabase.functions.invoke('send-push-notification', {
              body: {
                driver_id: newDriverId,
                title: `Nieuwe rit: ${orderNumber}`,
                body: `U heeft een nieuwe rit toegewezen gekregen.`,
                data: { trip_id: currentOrderId, type: 'trip_assigned' },
              },
            }).then(({ error }) => {
              if (error) console.warn('Push notification failed (non-blocking):', error);
            });
          }
        } catch { /* non-blocking */ }
      }

      // If driver is assigned and has a phone: show SMS action toast
      if (driverPhone && orderDetails.driver_id && orderDetails.driver_id !== 'none') {
        try {
          import('sonner').then(({ toast: sonnerToast }) => {
            const phone = driverPhone.replace(/[^0-9+]/g, '');
            const pickupCity = destinations[0]?.city || '';
            const deliveryCity = destinations.length > 1 ? destinations[destinations.length - 1]?.city || '' : '';
            const smsMsg = `Rit ${orderNumber}${pickupCity ? ` | ${pickupCity}` : ''}${deliveryCity ? ` → ${deliveryCity}` : ''}`;
            sonnerToast.success('Order opgeslagen', {
              description: `Chauffeur toegewezen. SMS sturen?`,
              action: {
                label: 'SMS sturen',
                onClick: () => {
                  window.open(`sms:${phone}?body=${encodeURIComponent(smsMsg)}`, '_self');
                },
              },
              duration: 8000,
            });
          });
        } catch { /* non-blocking */ }
      }

      if (closeAfterSave) {
        // For new orders, navigate to the edit page of the newly created order
        if (!orderId && savedOrderId) {
          navigate(`/orders/edit/${savedOrderId}`, { replace: true });
        } else {
          navigate('/orders');
        }
      } else if (!orderId && savedOrderId) {
        navigate(`/orders/edit/${savedOrderId}`, { replace: true });
      }
    } catch (error: any) {
      const message = error?.message || 'Onbekende fout';
      feedback.error('Opslaan mislukt', message);
      console.error("Order save error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDuplicate = async () => {
    // Reset order ID to create a new order
    setOrderNumber('');
    navigate('/orders/edit', { replace: true });
    feedback.info("Order gedupliceerd", "Sla op om een nieuwe order aan te maken");
  };

  const handleConvertToQuote = async () => {
    if (!orderId) return;
    
    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: "offerte" })
        .eq("id", orderId);

      if (error) throw error;

      // Log the status change event
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "STATUS_UPDATED",
        payload: { old_value: orderStatus, new_value: "offerte", source: "convert_to_quote" },
        actor_user_id: userId,
      });

      setOrderStatus("offerte");
      feedback.info("Omgezet naar offerte", "De order is nu een offerte");
    } catch (error: any) {
      feedback.error("Fout", error.message);
    }
  };

  const handleOrderComplete = async () => {
    // Reload order data from DB to sync state after OrderCompleteDialog's DB update
    if (orderId) {
      const { data } = await supabase.from('trips').select('status').eq('id', orderId).maybeSingle();
      if (data) setOrderStatus(data.status);
    } else {
      setOrderStatus("afgerond");
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted/30 text-muted-foreground',
    aanvraag: 'bg-amber-100 text-amber-800',
    offerte: 'bg-cyan-100 text-cyan-800',
    gepland: 'bg-gray-100 text-gray-800',
    onderweg: 'bg-blue-100 text-blue-800',
    afgeleverd: 'bg-green-100 text-green-800',
    afgerond: 'bg-blue-200 text-blue-900',
    gecontroleerd: 'bg-purple-100 text-purple-800',
    gefactureerd: 'bg-gray-100 text-gray-600',
    geannuleerd: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Concept',
    aanvraag: 'Aanvraag',
    offerte: 'Offerte',
    gepland: 'Gepland',
    onderweg: 'Onderweg',
    afgeleverd: 'Afgeleverd',
    afgerond: 'Afgemeld',
    gecontroleerd: 'Gecontroleerd',
    gefactureerd: 'Gefactureerd',
    geannuleerd: 'Geannuleerd',
  };

  // (validateStatusTransition is defined above saveOrder)

  const handleMarkVerified = () => {
    if (!orderId) return;
    const missing = validateStatusTransition('gecontroleerd');
    if (missing.length > 0) {
      feedback.validationError("Kan status niet wijzigen. Vul eerst in: " + missing.join(", "));
      return;
    }
    setShowVerifyDialog(true);
  };

  const handleVerifyConfirm = async () => {
    if (!orderId) return;
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'gecontroleerd' satisfies TripStatus })
        .eq('id', orderId);
      if (error) throw error;

      const userId = (await supabase.auth.getUser()).data.user?.id;
      try {
        await supabase.from('order_events').insert({
          order_id: orderId,
          event_type: 'STATUS_UPDATED',
          payload: { old_value: orderStatus, new_value: 'gecontroleerd', source: 'manual_verify' },
          actor_user_id: userId,
        });
      } catch { /* non-blocking */ }

      setOrderStatus('gecontroleerd');
      setShowVerifyDialog(false);
      feedback.info("Order gecontroleerd", "De order kan nu worden gefactureerd");

      // Notify B2B customer
      notifyCustomerStatusChange(orderDetails.customer_id || null, orderId, 'gecontroleerd', orderNumber);
    } catch (error: any) {
      feedback.error("Fout", error.message);
    }
  };

  return (
    <DashboardLayout 
      title={orderId ? `Order bewerken - ${orderNumber || 'Nieuw'}` : 'Nieuwe order'}
      description={orderId ? `Status: ${statusLabels[orderStatus] || orderStatus}` : 'Vul de ordergegevens in'}
    >
      {/* Dynamic bottom padding based on actual action bar height */}
      <div style={{ paddingBottom: 'calc(var(--action-bar-h, 5rem) + 1.5rem)' }}>
        {/* Header with status - Mobile optimized */}
        {orderId && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <Badge className={`${statusColors[orderStatus]} text-xs sm:text-sm px-2.5 py-1`}>
              {statusLabels[orderStatus] || orderStatus}
            </Badge>
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              Order #{orderNumber}
            </span>
          </div>
        )}

        {/* Credit Warning Banner */}
        <CreditWarningBanner creditCheck={creditCheck} className="mb-4" />

        {/* Main content — Row 1: Details + Destinations, Row 2: Pricing full-width */}
        <div className="space-y-8 pb-[env(safe-area-inset-bottom,0px)]">
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
            
            {/* Order Details — sticky sidebar on desktop, collapsed on mobile */}
            <motion.div 
              className="lg:col-span-3 order-2 lg:order-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.08 }}
            >
              <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)] lg:overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" style={{ WebkitOverflowScrolling: 'touch' } as any}>
                <OrderDetailsPanel
                  data={orderDetails}
                  onChange={(v) => { setOrderDetails(v); setIsDirty(true); }}
                  onSendTransportOrder={(email, name) => {
                    if (!orderId) {
                      feedback.warning("Sla de order eerst op");
                      return;
                    }
                    setTransportOrderCarrierEmail(email);
                    setTransportOrderCarrierName(name);
                    setShowTransportOrderDialog(true);
                  }}
                />
              </div>
            </motion.div>

            {/* Destinations — col-span-9 for maximum breathing room */}
            <motion.div 
              className="lg:col-span-9 order-1 lg:order-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Track & Trace — prominent mini-card */}
              {orderId && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowTimelineSheet(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 hover:border-primary/40 hover:shadow-md transition-all group touch-manipulation active:scale-[0.99]"
                  >
                    <div className="p-2 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors">
                      <History className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-semibold text-foreground">Track & Trace</span>
                      <span className="text-[11px] text-muted-foreground ml-2">Order #{orderNumber}</span>
                    </div>
                    <Badge className={`${statusColors[orderStatus]} text-[10px] px-2 py-0.5`}>
                      {statusLabels[orderStatus] || orderStatus}
                    </Badge>
                  </button>
                </div>
              )}

              <Card className="h-full border-border/40 bg-card backdrop-blur-sm shadow-lg ring-1 ring-border/20 hover:shadow-lg hover:translate-y-0 transition-none">
                {/* Sticky header + progress dots */}
                <div className={`sticky top-0 z-10 bg-card rounded-t-2xl transition-shadow duration-200 ${isDestScrolled ? 'shadow-sm border-b border-border/40' : ''}`}>
                  <CardHeader className="pb-2 px-3 sm:px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-semibold">Bestemmingen</CardTitle>
                    {orderId && (
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="ml-auto mr-2">
                        <TabsList className="h-8">
                          <TabsTrigger value="edit" className="text-xs gap-1 h-7 px-2.5">
                            <Edit3 className="h-3 w-3" />
                            Bewerken
                          </TabsTrigger>
                          <TabsTrigger value="overview" className="text-xs gap-1 h-7 px-2.5">
                            <Eye className="h-3 w-3" />
                            Overzicht
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}
                  </CardHeader>
                  {/* Progress dots */}
                  {destinations.length > 2 && activeTab === 'edit' && (
                    <div className="flex items-center gap-1.5 px-4 sm:px-6 pb-2 overflow-x-auto">
                      {(destinations.length <= 8 ? destinations : destinations.slice(0, 8)).map((dest, i) => {
                        const dotColor = dest.stop_type === 'pickup' ? 'bg-primary' 
                          : dest.stop_type === 'both' ? 'bg-purple-500' 
                          : 'bg-blue-500';
                        return (
                          <div
                            key={dest.id}
                            className={`rounded-full shrink-0 transition-all duration-200 ${dotColor} w-2 h-2`}
                            title={`Stop ${i + 1}: ${dest.stop_type}`}
                          />
                        );
                      })}
                      {destinations.length > 8 && (
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">+{destinations.length - 8}</span>
                      )}
                    </div>
                  )}
                </div>
                <CardContent className="px-2 sm:px-5 flex flex-col">
                  {activeTab === 'edit' ? (
                    <>
                      <ScrollArea 
                        className="h-[45vh] sm:h-[55vh] lg:h-[calc(100vh-340px)]" 
                        style={{ WebkitOverflowScrolling: 'touch' } as any}
                        onScrollCapture={(e) => {
                          const target = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
                          if (target) setIsDestScrolled(target.scrollTop > 0);
                        }}
                      >
                        <div className="space-y-4 pr-2 sm:pr-3">
                          <Reorder.Group 
                            axis="y" 
                            values={destinations} 
                            onReorder={(newOrder) => {
                              setDestinations(newOrder);
                              setIsDirty(true);
                            }}
                            className="space-y-4"
                          >
                            {destinations.map((dest, index) => (
                              <ReorderableDestination
                                key={dest.id}
                                dest={dest}
                                index={index}
                                onChange={(data) => handleDestinationChange(index, data)}
                                onRemove={() => handleRemoveDestination(index)}
                                canRemove={destinations.length > 2}
                                showCopyToDelivery={dest.stop_type === 'pickup' || dest.stop_type === 'both'}
                                onCopyToDelivery={() => handleCopyToDelivery(index)}
                              />
                            ))}
                          </Reorder.Group>
                        </div>
                      </ScrollArea>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        className="mt-4"
                      >
                        <Button 
                          onClick={handleAddDestination} 
                          variant="outline"
                          className="w-full gap-2 h-12 sm:h-10 text-sm font-semibold touch-manipulation border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary shadow-none"
                        >
                          <Plus className="h-4 w-4" />
                          Nieuwe bestemming
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <ScrollArea className="h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-260px)]">
                      <OrderDetailView tripId={orderId!} />
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Separator between sections */}
          <div className="py-2">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          </div>

          {/* Row 2 — Pricing full-width */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
          >
            <PricingPanel
              data={pricing}
              onChange={(v) => { setPricing(v); setIsDirty(true); }}
              onCalculateRoute={handleCalculateRoute}
              isCalculating={isCalculatingRoute}
              layout="fullwidth"
              autoPriceResult={isAutoPriceDismissed ? null : autoPriceResult}
              isAutoPricing={isAutoPricing}
              isAutoPriceApplied={isAutoPriceApplied}
              onApplyAutoPrice={() => {
                if (!autoPriceResult?.calculated) return;
                // Apply the auto-calculated price as a fixed product line
                setPricing(prev => {
                  const newLines = prev.product_lines.map(line => {
                    if (line.pricing_model === 'per_ride' || line.pricing_model === 'fixed') {
                      return { ...line, sales_rate: autoPriceResult.sellPrice, is_active: true, sales_subtotal: autoPriceResult.sellPrice };
                    }
                    return { ...line, is_active: false, sales_subtotal: 0 };
                  });
                  // If no fixed line exists, set on the first line
                  const hasFixed = newLines.some(l => (l.pricing_model === 'per_ride' || l.pricing_model === 'fixed') && l.is_active);
                  if (!hasFixed && newLines.length > 0) {
                    newLines[0] = { ...newLines[0], sales_rate: autoPriceResult.sellPrice, is_active: true, sales_subtotal: autoPriceResult.sellPrice };
                  }
                  return { ...prev, product_lines: newLines };
                });
                setIsAutoPriceApplied(true);
                setIsDirty(true);
                feedback.info("Contractprijs toegepast", `€${autoPriceResult.sellPrice.toFixed(2)} — ${autoPriceResult.contractName}`);
              }}
              onDismissAutoPrice={() => {
                setIsAutoPriceDismissed(true);
                clearAutoPrice();
              }}
            />
          </motion.div>

          {/* AI Pricing Intelligence Widget */}
          {pricing.distance_km > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.25 }}
            >
              <PricingAdviceWidget
                afstand_km={pricing.distance_km}
                gewicht_kg={pricing.total_weight ? parseFloat(pricing.total_weight) || 0 : 0}
                urgentie="normaal"
                datum={orderDetails.order_date ? new Date(orderDetails.order_date) : new Date()}
                currentPrice={(() => {
                  const sub = pricing.product_lines.reduce((s, l) => s + l.sales_subtotal, 0) + pricing.sales_other_costs;
                  return sub * (1 - pricing.sales_discount_pct / 100);
                })()}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <OrderActionBar
        onSave={() => saveOrder(false)}
        onSaveAndClose={() => saveOrder(true)}
        onConvertToQuote={handleConvertToQuote}
        onMarkComplete={() => orderId && setShowCompleteDialog(true)}
        onDuplicate={handleDuplicate}
        onShowRoute={() => setShowRouteDialog(true)}
        onCreateDocument={() => orderId && setShowDocumentDialog(true)}
        onAttachDocument={() => orderId && setShowAttachmentDialog(true)}
        onShowTimeline={() => orderId && setShowTimelineSheet(true)}
        onDispatchOrder={() => orderId && setShowDispatchDialog(true)}
        onShowGoods={() => orderId && setShowGoodsDialog(true)}
        onMarkVerified={['afgeleverd', 'afgerond'].includes(orderStatus) ? handleMarkVerified : undefined}
        onSendToDriver={async () => {
          if (!orderId || !orderDetails.driver_id || orderDetails.driver_id === 'none') return;
          try {
            const { data, error } = await supabase.functions.invoke('send-push-notification', {
              body: {
                driver_id: orderDetails.driver_id,
                title: `Nieuwe rit: ${orderNumber}`,
                body: `U heeft een nieuwe rit toegewezen gekregen.`,
                data: { trip_id: orderId, type: 'trip_assigned' },
              },
            });
            if (error) throw error;
            if (data?.fallback_channel) {
              feedback.sent(`Notificatie via ${data.fallback_channel === "whatsapp" ? "WhatsApp" : "SMS"}`);
            } else if (data?.success === false) {
              feedback.warning("Chauffeur heeft geen push of telefoonnummer", data.message);
            } else {
              feedback.sent("Notificatie naar chauffeur");
            }
          } catch (err: any) {
            feedback.error("Kon notificatie niet versturen", err.message);
          }
        }}
        hasDriverWithPortal={!!orderDetails.driver_id && orderDetails.driver_id !== 'none'}
        driverPhone={driverPhone}
        onWhatsAppDriver={() => {
          if (!driverPhone) return;
          const phone = driverPhone.replace(/[^0-9+]/g, '');
          const pickupCity = destinations[0]?.city || '';
          const deliveryCity = destinations.length > 1 ? destinations[destinations.length - 1]?.city || '' : '';
          const msg = `Rit ${orderNumber}${pickupCity ? ` | ${pickupCity}` : ''}${deliveryCity ? ` → ${deliveryCity}` : ''}`;
          window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank');
        }}
        onSmsDriver={() => {
          if (!driverPhone) return;
          const phone = driverPhone.replace(/[^0-9+]/g, '');
          const pickupCity = destinations[0]?.city || '';
          const deliveryCity = destinations.length > 1 ? destinations[destinations.length - 1]?.city || '' : '';
          const msg = `Rit ${orderNumber}${pickupCity ? ` | ${pickupCity}` : ''}${deliveryCity ? ` → ${deliveryCity}` : ''}`;
          window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_self');
        }}
        isSubmitting={isSubmitting}
        isEditMode={!!orderId}
      />

      {/* Dialogs */}
      <OrderRouteDialog
        open={showRouteDialog}
        onOpenChange={setShowRouteDialog}
        destinations={destinations}
      />

      {orderId && (
        <>
          <OrderTimelineSheet
            open={showTimelineSheet}
            onOpenChange={setShowTimelineSheet}
            orderId={orderId}
          />

          <OrderDocumentDialog
            open={showDocumentDialog}
            onOpenChange={setShowDocumentDialog}
            orderId={orderId || ''}
            orderNumber={orderNumber}
            orderDate={orderDetails.order_date}
            customerEmail={customerEmail}
            driverEmail={driverEmail}
          />

          <OrderAttachmentDialog
            open={showAttachmentDialog}
            onOpenChange={setShowAttachmentDialog}
            orderId={orderId}
          />

          <OrderCompleteDialog
            open={showCompleteDialog}
            onOpenChange={setShowCompleteDialog}
            orderId={orderId}
            customerId={orderDetails.customer_id || null}
            orderNumber={orderNumber || null}
            onComplete={handleOrderComplete}
          />

          <OrderVerifyDialog
            open={showVerifyDialog}
            onOpenChange={setShowVerifyDialog}
            onConfirm={handleVerifyConfirm}
          />

          <DispatchOrderDialog
            open={showDispatchDialog}
            onOpenChange={setShowDispatchDialog}
            order={{
              id: orderId,
              order_number: orderNumber,
              pickup_address: destinations[0]?.street || '',
              pickup_city: destinations[0]?.city || null,
              delivery_address: destinations[destinations.length - 1]?.street || '',
              delivery_city: destinations[destinations.length - 1]?.city || null,
              trip_date: orderDetails.order_date,
              purchase_total: pricing.product_lines.reduce((sum, line) => sum + (line.purchase_subtotal || 0), 0) + (pricing.purchase_other_costs || 0),
            }}
            onSuccess={() => {
              feedback.sent("Order");
            }}
          />
        </>
      )}

      {/* Transport Order Dialog */}
      {orderId && (
        <SendTransportOrderDialog
          open={showTransportOrderDialog}
          onOpenChange={setShowTransportOrderDialog}
          orderId={orderId}
          orderNumber={orderNumber}
          carrierEmail={transportOrderCarrierEmail}
          carrierName={transportOrderCarrierName}
        />
      )}

      {/* Goods Dialog */}
      <OrderGoodsDialog
        open={showGoodsDialog}
        onOpenChange={setShowGoodsDialog}
        tripId={orderId}
        destinations={destinations}
      />
    </DashboardLayout>
  );
};

export default OrderForm;
