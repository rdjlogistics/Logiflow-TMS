import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { 
  MapPin, 
  Package, 
  Settings2,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Loader2,
  Route,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateSubmission } from "@/hooks/usePortalShipments";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useCustomerLocations } from "@/hooks/useCustomerLocations";
import { usePortalOrderTemplates } from "@/hooks/usePortalOrderTemplates";
import { supabase } from "@/integrations/supabase/client";
import { 
  useBookingForm, 
  StopCard, 
  CapacityIndicator, 
  BookingOptions, 
  BookingSummary 
} from "@/components/portal/b2b/booking";

type Step = 'route' | 'options' | 'confirm';

const steps: { id: Step; label: string; icon: typeof MapPin }[] = [
  { id: 'route', label: 'Route & Lading', icon: Route },
  { id: 'options', label: 'Opties', icon: Settings2 },
  { id: 'confirm', label: 'Bevestigen', icon: Check },
];



const B2BBook = () => {
  const navigate = useNavigate();
  const { customerId, customer, loading: portalLoading } = usePortalAuth();
  const { createSubmission, loading: submitting } = useCreateSubmission();
  const [currentStep, setCurrentStep] = useState<Step>('route');

  const {
    formData,
    addStop,
    removeStop,
    updateStop,
    addCargoItem,
    updateCargoItem,
    removeCargoItem,
    updateFormData,
    cargoStats,
    capacityUsage,
    recommendedVehicle,
    selectedVehicle,
    activeVehicle,
    selectVehicle,
    validation,
    hasDraft,
    clearDraft,
  } = useBookingForm();

  const { locations: savedLocations, fetchLocations, createLocation } = useCustomerLocations(customerId || undefined);
  const { templates: recurringTemplates, loading: templatesLoading, fetchTemplates, createTemplate } = usePortalOrderTemplates(customerId || undefined);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    if (customerId) {
      fetchLocations();
      fetchTemplates();
      supabase.from('customers').select('tenant_id').eq('id', customerId).single().then(({ data }) => {
        if (data?.tenant_id) setTenantId(data.tenant_id);
      });
    }
  }, [customerId, fetchLocations, fetchTemplates]);

  // Show draft restored toast once on mount
  useEffect(() => {
    if (hasDraft) {
      toast.info("Concept hersteld", { description: "Je vorige invoer is automatisch geladen." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Geen klantaccount gevonden", { description: "Neem contact op met support." });
      return;
    }
    if (!validation.isValid) {
      toast.error("Controleer de gegevens", { description: validation.errors[0] });
      return;
    }

    try {
      const firstPickup = formData.stops.find(s => s.type === 'pickup');
      const lastDelivery = [...formData.stops].reverse().find(s => s.type === 'delivery');

      // Build address fallbacks to avoid empty NOT NULL fields
      const pickupAddress = firstPickup?.street || [firstPickup?.postcode, firstPickup?.houseNumber].filter(Boolean).join(' ') || 'Ophaaladres';
      const deliveryAddress = lastDelivery?.street || [lastDelivery?.postcode, lastDelivery?.houseNumber].filter(Boolean).join(' ') || 'Afleveradres';

      const submission = await createSubmission({
        pickupCompany: firstPickup?.company || 'Ophaaladres',
        pickupAddress,
        pickupPostalCode: firstPickup?.postcode || '',
        pickupCity: firstPickup?.city || 'Onbekend',
        pickupHouseNumber: firstPickup?.houseNumber || '',
        pickupContactPerson: firstPickup?.contact || '',
        pickupPhone: firstPickup?.phone || '',
        pickupDate: firstPickup?.date || new Date().toISOString().split('T')[0],
        pickupTimeFrom: firstPickup?.timeWindowFrom || '08:00',
        pickupTimeTo: firstPickup?.timeWindowTo || '17:00',
        deliveryCompany: lastDelivery?.company || 'Afleveradres',
        deliveryAddress,
        deliveryPostalCode: lastDelivery?.postcode || '',
        deliveryCity: lastDelivery?.city || 'Onbekend',
        deliveryHouseNumber: lastDelivery?.houseNumber || '',
        deliveryContactPerson: lastDelivery?.contact || '',
        deliveryPhone: lastDelivery?.phone || '',
        deliveryDate: lastDelivery?.date || undefined,
        deliveryTimeFrom: lastDelivery?.timeWindowFrom,
        deliveryTimeTo: lastDelivery?.timeWindowTo,
        productDescription: formData.stops.flatMap(s => s.loadItems).map(i => i.description).filter(Boolean).join(', ') || 'Diverse goederen',
        quantity: cargoStats.totalItems,
        weightKg: cargoStats.totalWeight,
        volumeM3: cargoStats.totalVolume,
        specialInstructions: formData.generalNotes,
        referenceNumber: formData.customerReference,
        serviceType: formData.serviceLevel,
          metadata: {
            stops: formData.stops.map(s => ({
              type: s.type,
              company: s.company,
              contact: s.contact,
              phone: s.phone,
              postcode: s.postcode,
              houseNumber: s.houseNumber,
              street: s.street,
              city: s.city,
              country: s.country,
              notes: s.notes,
              reference: s.reference,
              timeWindowFrom: s.timeWindowFrom,
              timeWindowTo: s.timeWindowTo,
              date: s.date,
              loadItems: s.loadItems,
              unloadItems: s.unloadItems,
            })),
            vehicleRequirements: formData.vehicleRequirements,
            selectedVehicle: activeVehicle ? {
              id: activeVehicle.id,
              label: activeVehicle.label,
              category: activeVehicle.category,
              maxVolumeM3: activeVehicle.maxVolumeM3,
              maxPayloadKg: activeVehicle.maxPayloadKg,
              loadingMeters: activeVehicle.loadingMeters,
              palletCapacity: activeVehicle.palletCapacity,
              hasTailLift: activeVehicle.hasTailLift,
            } : null,
            serviceLevel: formData.serviceLevel,
            priority: formData.priority,
            requiresSignature: formData.requiresSignature,
            requiresPhoto: formData.requiresPhoto,
            insurance: formData.insurance,
            insuranceValue: formData.insuranceValue,
            trackingNotifications: formData.trackingNotifications,
            costCenter: formData.costCenter,
            projectCode: formData.projectCode,
            poNumber: formData.poNumber,
            internalNotes: formData.internalNotes,
          },
      }, customerId!);

      clearDraft();

      // Save as template if requested
      if (formData.saveAsTemplate && formData.templateName && tenantId) {
        try {
          await createTemplate({
            name: formData.templateName,
            customer_id: customerId!,
            company_id: tenantId,
            pickup_address: firstPickup?.street || '',
            pickup_city: firstPickup?.city || '',
            pickup_postal_code: firstPickup?.postcode || '',
            delivery_address: lastDelivery?.street || '',
            delivery_city: lastDelivery?.city || '',
            delivery_postal_code: lastDelivery?.postcode || '',
            cargo_description: formData.stops.flatMap(s => s.loadItems).map(i => i.description).filter(Boolean).join(', ') || '',
            weight_kg: cargoStats.totalWeight || undefined,
            is_active: true,
          });
        } catch (e) {
          console.warn('Template save failed:', e);
        }
      }

      toast.success("Zending aangemaakt!", {
        description: `Ordernummer: ${submission.orderNumber}`,
        action: {
          label: "Bekijk zending",
          onClick: () => navigate("/portal/b2b/shipments"),
        },
        duration: 8000,
      });
    } catch (error: any) {
      console.error('Submit error:', JSON.stringify(error, null, 2));
      const errorMsg = error?.message || error?.details || error?.hint || 'Onbekende fout';
      toast.error("Fout bij aanmaken zending", { description: String(errorMsg) });
    }
  };

  const nextStep = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <B2BLayout companyName={customer?.companyName || "Klantenportaal"}>
      <div className="max-w-6xl mx-auto pb-24 sm:pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-gold" />
            Nieuwe Multi-Stop Zending
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maak een flexibele route met meerdere ophaal- en afleveradressen
          </p>
        </div>

        {/* Progress — Premium Glassmorphism Stepper */}
        <div className="animate-fade-in "relative mb-6 sm:mb-8 overflow-hidden rounded-2xl bg-card/40 backdrop-blur-xl border border-border/30 p-4 sm:p-6"
        >
          {/* Mesh gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />

          <div className="relative flex items-center justify-between sm:justify-center">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              const isFuture = index > currentStepIndex;
              const isClickable = index <= currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1 sm:flex-none last:flex-none">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative"
                    >
                      {/* Glow ring for active */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-full bg-primary/30"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}

                      <button
                        onClick={() => isClickable && setCurrentStep(step.id)}
                        disabled={!isClickable}
                        className={cn(
                          "relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-500 z-10 touch-manipulation active:scale-[0.95]",
                          isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 cursor-pointer",
                          isActive && "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/40",
                          isFuture && "bg-muted/80 border-2 border-border text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          >
                            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                        ) : (
                          <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>

                    {/* Label */}
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className={cn(
                        "text-[10px] sm:text-xs font-medium transition-colors text-center max-w-[4rem] sm:max-w-none leading-tight",
                        isActive && "text-primary",
                        isCompleted && "text-emerald-600 dark:text-emerald-400",
                        isFuture && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </motion.span>
                  </div>

                  {/* Animated connector line */}
                  {index < steps.length - 1 && (
                    <div className="relative flex-1 h-0.5 mx-2 sm:w-16 sm:mx-4 mb-5 sm:mb-6 sm:flex-none">
                      <div className="absolute inset-0 bg-border/60 rounded-full" />
                      <div className="animate-fade-in {cn(
                          "absolute inset-0 origin-left rounded-full",
                          isCompleted ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-primary to-primary/60"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Route Step */}
            {currentStep === 'route' && (
              <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Stops List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Stops ({formData.stops.length})
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addStop('pickup')}
                        className="text-xs touch-manipulation active:scale-[0.97]"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ophalen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addStop('delivery')}
                        className="text-xs touch-manipulation active:scale-[0.97]"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Afleveren
                      </Button>
                    </div>
                  </div>

                  
                    {formData.stops.map((stop, index) => (
                      <StopCard
                        key={stop.id}
                        stop={stop}
                        index={index}
                        totalStops={formData.stops.length}
                        onUpdate={(updates) => updateStop(stop.id, updates)}
                        onRemove={() => removeStop(stop.id)}
                        onAddCargo={() => addCargoItem(stop.id)}
                        onUpdateCargo={(itemId, updates) => updateCargoItem(stop.id, itemId, updates)}
                        onRemoveCargo={(itemId) => removeCargoItem(stop.id, itemId)}
                        canRemove={formData.stops.length > 2}
                        savedLocations={savedLocations}
                        onSaveToAddressBook={tenantId && customerId ? async (s) => {
                          const result = await createLocation({
                            tenant_id: tenantId,
                            customer_id: customerId,
                            label: s.company || s.city,
                            company_name: s.company || undefined,
                            contact_name: s.contact || undefined,
                            contact_phone: s.phone || undefined,
                            address_line: s.street,
                            house_number: s.houseNumber || undefined,
                            postcode: s.postcode,
                            city: s.city,
                            access_notes: s.notes || undefined,
                          });
                          if (result) fetchLocations();
                        } : undefined}
                      />
                    ))}
                  
                </div>

                {/* Capacity Sidebar */}
                <div className="lg:sticky lg:top-20 lg:self-start">
                  <CapacityIndicator
                    cargoStats={cargoStats}
                    capacityUsage={capacityUsage}
                    recommendedVehicle={recommendedVehicle}
                    selectedVehicle={selectedVehicle}
                    onSelectVehicle={(v) => selectVehicle(v.id)}
                    cargoItems={formData.stops.flatMap(s => s.loadItems)}
                  />
                </div>
              </div>
            )}

            {/* Options Step */}
            {currentStep === 'options' && (
              <div className="max-w-2xl mx-auto">
                <BookingOptions
                  formData={formData}
                  onUpdate={updateFormData}
                  onSaveAsRecurring={tenantId && customerId ? async (name: string) => {
                    const pickupStop = formData.stops.find(s => s.type === 'pickup');
                    const deliveryStop = [...formData.stops].reverse().find(s => s.type === 'delivery');
                    const result = await createTemplate({
                      name,
                      customer_id: customerId,
                      company_id: tenantId,
                      recurrence_type: 'once',
                      pickup_address: pickupStop ? `${pickupStop.street} ${pickupStop.houseNumber}`.trim() : undefined,
                      pickup_city: pickupStop?.city || undefined,
                      pickup_postal_code: pickupStop?.postcode || undefined,
                      delivery_address: deliveryStop ? `${deliveryStop.street} ${deliveryStop.houseNumber}`.trim() : undefined,
                      delivery_city: deliveryStop?.city || undefined,
                      delivery_postal_code: deliveryStop?.postcode || undefined,
                      cargo_description: formData.stops.flatMap(s => s.loadItems).map(i => i.description).filter(Boolean).join(', ') || undefined,
                      weight_kg: cargoStats.totalWeight || undefined,
                      is_active: true,
                    });
                    if (result) fetchTemplates();
                    return !!result;
                  } : undefined}
                  existingTemplates={recurringTemplates}
                  templatesLoading={templatesLoading}
                />
              </div>
            )}

            {/* Confirm Step */}
            {currentStep === 'confirm' && (
              <div className="max-w-2xl mx-auto">
                <BookingSummary
                  formData={formData}
                  cargoStats={cargoStats}
                  validation={validation}
                  activeVehicle={activeVehicle}
                />
              </div>
            )}
          </div>
        

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 lg:relative lg:mt-8 p-4 bg-background/95 backdrop-blur-md border-t border-border/50 lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0 flex justify-between gap-3 z-20">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="flex-1 sm:flex-none sm:w-40 touch-manipulation active:scale-[0.97]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Terug
          </Button>
          <Button
            onClick={nextStep}
            disabled={submitting || (isLastStep && !validation.isValid)}
            className="flex-1 sm:flex-none sm:w-48 touch-manipulation active:scale-[0.97]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Zending Aanmaken
              </>
            ) : (
              <>
                Volgende
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </B2BLayout>
  );
};

export default B2BBook;
