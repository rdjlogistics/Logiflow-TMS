import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { calculateRouteDistance } from "@/utils/geocoding";

export interface AddressData {
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  flexible: boolean;
  saveToAddressBook: boolean;
}

export interface ShipmentData {
  productDescription: string;
  quantity: number;
  weightKg: string;
  volumeM3: string;
  specialInstructions: string;
  referenceNumber: string;
  selectedProductId: string | null;
}

export interface WizardState {
  step: number;
  pickup: AddressData;
  delivery: AddressData;
  shipment: ShipmentData;
  estimatedPrice: number | null;
  estimatedDistance: number | null;
  isSubmitting: boolean;
  addressQuality: {
    pickup: 'unknown' | 'partial' | 'verified';
    delivery: 'unknown' | 'partial' | 'verified';
  };
}

const initialAddress: AddressData = {
  company: "",
  contactPerson: "",
  phone: "",
  email: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "NL",
  date: "",
  timeFrom: "",
  timeTo: "",
  flexible: true,
  saveToAddressBook: false,
};

const initialShipment: ShipmentData = {
  productDescription: "",
  quantity: 1,
  weightKg: "",
  volumeM3: "",
  specialInstructions: "",
  referenceNumber: "",
  selectedProductId: null,
};

const initialState: WizardState = {
  step: 1,
  pickup: { ...initialAddress },
  delivery: { ...initialAddress },
  shipment: { ...initialShipment },
  estimatedPrice: null,
  estimatedDistance: null,
  isSubmitting: false,
  addressQuality: {
    pickup: 'unknown',
    delivery: 'unknown',
  },
};

// NL Postcode validation
const isValidDutchPostcode = (postcode: string): boolean => {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();
  return /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned);
};

// Phone validation (+31)
const isValidDutchPhone = (phone: string): boolean => {
  if (!phone) return true; // Optional
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+31|0031|0)[1-9][0-9]{8}$/.test(cleaned);
};

// Generate idempotency key
const generateIdempotencyKey = (customerId: string, reference: string): string => {
  const timestamp = Math.floor(Date.now() / 60000); // Bucket per minute
  return `${customerId}-${reference || 'noref'}-${timestamp}`;
};

export const useBookingWizard = (customerId: string | null, tenantId: string | null) => {
  const { toast } = useToast();
  const { lookupPostcode, loading: lookupLoading } = usePostcodeLookup();
  
  const [state, setState] = useState<WizardState>(initialState);

  // Update pickup data
  const updatePickup = useCallback((field: keyof AddressData, value: string | boolean) => {
    setState(prev => ({
      ...prev,
      pickup: { ...prev.pickup, [field]: value },
    }));
  }, []);

  // Update delivery data
  const updateDelivery = useCallback((field: keyof AddressData, value: string | boolean) => {
    setState(prev => ({
      ...prev,
      delivery: { ...prev.delivery, [field]: value },
    }));
  }, []);

  // Update shipment data
  const updateShipment = useCallback((field: keyof ShipmentData, value: string | number | null) => {
    setState(prev => ({
      ...prev,
      shipment: { ...prev.shipment, [field]: value },
    }));
  }, []);

  // Lookup postcode for pickup
  const lookupPickupPostcode = useCallback(async () => {
    if (!state.pickup.postalCode || !state.pickup.houseNumber) return;
    
    const result = await lookupPostcode(state.pickup.postalCode, state.pickup.houseNumber);
    if (result) {
      setState(prev => ({
        ...prev,
        pickup: {
          ...prev.pickup,
          street: result.street || prev.pickup.street,
          city: result.city || prev.pickup.city,
          postalCode: formatDutchPostcode(prev.pickup.postalCode),
        },
        addressQuality: {
          ...prev.addressQuality,
          pickup: result.street && result.city ? 'verified' : 'partial',
        },
      }));
    } else {
      setState(prev => ({
        ...prev,
        addressQuality: { ...prev.addressQuality, pickup: 'partial' },
      }));
    }
  }, [state.pickup.postalCode, state.pickup.houseNumber, lookupPostcode]);

  // Lookup postcode for delivery
  const lookupDeliveryPostcode = useCallback(async () => {
    if (!state.delivery.postalCode || !state.delivery.houseNumber) return;
    
    const result = await lookupPostcode(state.delivery.postalCode, state.delivery.houseNumber);
    if (result) {
      setState(prev => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          street: result.street || prev.delivery.street,
          city: result.city || prev.delivery.city,
          postalCode: formatDutchPostcode(prev.delivery.postalCode),
        },
        addressQuality: {
          ...prev.addressQuality,
          delivery: result.street && result.city ? 'verified' : 'partial',
        },
      }));
    } else {
      setState(prev => ({
        ...prev,
        addressQuality: { ...prev.addressQuality, delivery: 'partial' },
      }));
    }
  }, [state.delivery.postalCode, state.delivery.houseNumber, lookupPostcode]);

  // Calculate distance when addresses are complete
  const calculateDistance = useCallback(async () => {
    const { pickup, delivery } = state;
    
    if (!pickup.street || !pickup.city || !delivery.street || !delivery.city) {
      return;
    }

    try {
      const result = await calculateRouteDistance(
        `${pickup.street} ${pickup.houseNumber}`,
        pickup.postalCode,
        pickup.city,
        `${delivery.street} ${delivery.houseNumber}`,
        delivery.postalCode,
        delivery.city
      );

      if (result) {
        setState(prev => ({
          ...prev,
          estimatedDistance: result.distance_km,
        }));
      }
    } catch (err) {
      console.error("Error calculating distance:", err);
    }
  }, [state.pickup, state.delivery]);

  // Validation for step 1
  const validateStep1 = useMemo(() => {
    const { pickup, delivery } = state;
    
    const errors: string[] = [];
    
    if (!pickup.company) errors.push("Ophaal bedrijfsnaam is verplicht");
    if (!pickup.street) errors.push("Ophaal straat is verplicht");
    if (!pickup.city) errors.push("Ophaal plaats is verplicht");
    if (!pickup.date) errors.push("Ophaaldatum is verplicht");
    
    if (pickup.postalCode && pickup.country === 'NL' && !isValidDutchPostcode(pickup.postalCode)) {
      errors.push("Ophaal postcode formaat ongeldig (bijv. 1234 AB)");
    }
    
    if (pickup.phone && !isValidDutchPhone(pickup.phone)) {
      errors.push("Ophaal telefoonnummer formaat ongeldig");
    }
    
    if (!delivery.company) errors.push("Aflever bedrijfsnaam is verplicht");
    if (!delivery.street) errors.push("Aflever straat is verplicht");
    if (!delivery.city) errors.push("Aflever plaats is verplicht");
    
    if (delivery.postalCode && delivery.country === 'NL' && !isValidDutchPostcode(delivery.postalCode)) {
      errors.push("Aflever postcode formaat ongeldig (bijv. 1234 AB)");
    }
    
    if (delivery.phone && !isValidDutchPhone(delivery.phone)) {
      errors.push("Aflever telefoonnummer formaat ongeldig");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [state.pickup, state.delivery]);

  // Validation for step 2
  const validateStep2 = useMemo(() => {
    const errors: string[] = [];
    // No required fields in step 2, but could add product selection validation
    return { isValid: true, errors };
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    if (state.step === 1 && !validateStep1.isValid) {
      toast({
        title: "Validatiefout",
        description: validateStep1.errors[0],
        variant: "destructive",
      });
      return false;
    }
    
    if (state.step === 2 && !validateStep2.isValid) {
      toast({
        title: "Validatiefout",
        description: validateStep2.errors[0],
        variant: "destructive",
      });
      return false;
    }

    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 3) }));
    return true;
  }, [state.step, validateStep1, validateStep2, toast]);

  // Go to previous step
  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step: Math.max(1, Math.min(step, 3)) }));
  }, []);

  // Submit booking
  const submitBooking = useCallback(async (): Promise<{ success: boolean; submissionId?: string }> => {
    if (!customerId) {
      toast({
        title: "Geen klantprofiel",
        description: "U bent niet gekoppeld aan een klantprofiel.",
        variant: "destructive",
      });
      return { success: false };
    }

    const { pickup, delivery, shipment } = state;
    const idempotencyKey = generateIdempotencyKey(customerId, shipment.referenceNumber);

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Check for duplicate submission
      const { data: existingSubmission } = await supabase
        .from("customer_submissions")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingSubmission) {
        toast({
          title: "Dubbele boeking",
          description: "Deze zending is al ingediend. Controleer uw zendingen.",
          variant: "destructive",
        });
        return { success: false };
      }

      // Create submission
      const submissionData = {
        customer_id: customerId,
        // Pickup
        pickup_company: pickup.company,
        pickup_address: `${pickup.street} ${pickup.houseNumber}`.trim(),
        pickup_postal_code: pickup.postalCode || null,
        pickup_city: pickup.city,
        pickup_country: pickup.country || 'NL',
        pickup_contact_person: pickup.contactPerson || null,
        pickup_phone: pickup.phone || null,
        pickup_email: pickup.email || null,
        pickup_date: pickup.date,
        pickup_time_from: pickup.timeFrom || null,
        pickup_time_to: pickup.timeTo || null,
        pickup_flexible: pickup.flexible,
        house_number_pickup: pickup.houseNumber || null,
        // Delivery
        delivery_company: delivery.company,
        delivery_address: `${delivery.street} ${delivery.houseNumber}`.trim(),
        delivery_postal_code: delivery.postalCode || null,
        delivery_city: delivery.city,
        delivery_country: delivery.country || 'NL',
        delivery_contact_person: delivery.contactPerson || null,
        delivery_phone: delivery.phone || null,
        delivery_email: delivery.email || null,
        delivery_date: delivery.date || null,
        delivery_time_from: delivery.timeFrom || null,
        delivery_time_to: delivery.timeTo || null,
        delivery_flexible: delivery.flexible,
        house_number_delivery: delivery.houseNumber || null,
        // Shipment
        product_description: shipment.productDescription || null,
        quantity: shipment.quantity || 1,
        weight_kg: shipment.weightKg ? parseFloat(shipment.weightKg) : null,
        volume_m3: shipment.volumeM3 ? parseFloat(shipment.volumeM3) : null,
        special_instructions: shipment.specialInstructions || null,
        reference_number: shipment.referenceNumber || null,
        product_id: shipment.selectedProductId || null,
        // Meta
        idempotency_key: idempotencyKey,
        estimated_price: state.estimatedPrice,
        distance_km: state.estimatedDistance,
        status: 'pending',
      };

      const { data: submission, error } = await supabase
        .from("customer_submissions")
        .insert(submissionData)
        .select("id")
        .single();

      if (error) throw error;

      // Save addresses to address book if requested
      if (pickup.saveToAddressBook && customerId) {
        await supabase.from("customer_address_book").insert({
          customer_id: customerId,
          tenant_id: tenantId,
          label: pickup.company,
          company_name: pickup.company,
          contact_name: pickup.contactPerson || null,
          phone: pickup.phone || null,
          street: pickup.street,
          house_number: pickup.houseNumber || null,
          postal_code: pickup.postalCode || null,
          city: pickup.city,
          country: pickup.country || 'NL',
          address_quality: state.addressQuality.pickup,
        } as never);
      }

      if (delivery.saveToAddressBook && customerId) {
        await supabase.from("customer_address_book").insert({
          customer_id: customerId,
          tenant_id: tenantId,
          label: delivery.company,
          company_name: delivery.company,
          contact_name: delivery.contactPerson || null,
          phone: delivery.phone || null,
          street: delivery.street,
          house_number: delivery.houseNumber || null,
          postal_code: delivery.postalCode || null,
          city: delivery.city,
          country: delivery.country || 'NL',
          address_quality: state.addressQuality.delivery,
        } as never);
      }

      // Log audit event
      await supabase.from("customer_portal_audit_log").insert({
        tenant_id: tenantId,
        customer_id: customerId,
        entity_type: 'submission',
        entity_id: submission.id,
        action: 'SHIPMENT_CREATE',
        actor_type: 'customer',
      } as never);

      toast({
        title: "Zending ingediend!",
        description: "Uw aanvraag is ontvangen. U hoort zo snel mogelijk van ons.",
      });

      // Reset form
      setState(initialState);

      return { success: true, submissionId: submission.id };
    } catch (err) {
      console.error("Error submitting booking:", err);
      toast({
        title: "Fout bij indienen",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [customerId, tenantId, state, toast]);

  // Load from template
  const loadFromTemplate = useCallback((template: { payload_json: Record<string, unknown> }) => {
    const payload = template.payload_json;
    
    if (payload.pickup) {
      const p = payload.pickup as Partial<AddressData>;
      setState(prev => ({
        ...prev,
        pickup: { ...prev.pickup, ...p, date: '', saveToAddressBook: false },
      }));
    }
    
    if (payload.delivery) {
      const d = payload.delivery as Partial<AddressData>;
      setState(prev => ({
        ...prev,
        delivery: { ...prev.delivery, ...d, date: '', saveToAddressBook: false },
      }));
    }
    
    if (payload.shipment) {
      const s = payload.shipment as Partial<ShipmentData>;
      setState(prev => ({
        ...prev,
        shipment: { ...prev.shipment, ...s, referenceNumber: '' },
      }));
    }

    toast({
      title: "Sjabloon geladen",
      description: "De gegevens zijn ingevuld. Controleer en vul de datum in.",
    });
  }, [toast]);

  // Load from saved address
  const loadPickupFromAddress = useCallback((address: {
    company_name: string | null;
    contact_name: string | null;
    phone: string | null;
    street: string;
    house_number: string | null;
    postal_code: string | null;
    city: string;
    country: string;
  }) => {
    setState(prev => ({
      ...prev,
      pickup: {
        ...prev.pickup,
        company: address.company_name || '',
        contactPerson: address.contact_name || '',
        phone: address.phone || '',
        street: address.street,
        houseNumber: address.house_number || '',
        postalCode: address.postal_code || '',
        city: address.city,
        country: address.country || 'NL',
      },
      addressQuality: { ...prev.addressQuality, pickup: 'verified' },
    }));
  }, []);

  const loadDeliveryFromAddress = useCallback((address: {
    company_name: string | null;
    contact_name: string | null;
    phone: string | null;
    street: string;
    house_number: string | null;
    postal_code: string | null;
    city: string;
    country: string;
  }) => {
    setState(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        company: address.company_name || '',
        contactPerson: address.contact_name || '',
        phone: address.phone || '',
        street: address.street,
        houseNumber: address.house_number || '',
        postalCode: address.postal_code || '',
        city: address.city,
        country: address.country || 'NL',
      },
      addressQuality: { ...prev.addressQuality, delivery: 'verified' },
    }));
  }, []);

  // Reset wizard
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    lookupLoading,
    validateStep1,
    validateStep2,
    updatePickup,
    updateDelivery,
    updateShipment,
    lookupPickupPostcode,
    lookupDeliveryPostcode,
    calculateDistance,
    nextStep,
    prevStep,
    goToStep,
    submitBooking,
    loadFromTemplate,
    loadPickupFromAddress,
    loadDeliveryFromAddress,
    reset,
  };
};

export default useBookingWizard;
