import { useState } from "react";
import { 
  MapPin, 
  Package, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building,
  User,
  Phone,
  Calendar,
  Clock,
  Scale,
  Box,
  FileText,
  Truck,
  Star,
  Save,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingWizard, type AddressData, type ShipmentData } from "@/hooks/useBookingWizard";
import type { ServiceProduct, SavedAddress, BookingTemplate } from "@/hooks/useCustomerPortal";

interface ImperialBookingWizardProps {
  customerId: string;
  tenantId: string | null;
  products: ServiceProduct[];
  savedAddresses: SavedAddress[];
  templates: BookingTemplate[];
  onSuccess: () => void;
}

const steps = [
  { id: 1, label: "Route", icon: MapPin },
  { id: 2, label: "Lading", icon: Package },
  { id: 3, label: "Service", icon: Truck },
  { id: 4, label: "Overzicht", icon: CheckCircle2 },
];

export const ImperialBookingWizard = ({
  customerId,
  tenantId,
  products,
  savedAddresses,
  templates,
  onSuccess,
}: ImperialBookingWizardProps) => {
  const {
    state,
    lookupLoading,
    updatePickup,
    updateDelivery,
    updateShipment,
    lookupPickupPostcode,
    lookupDeliveryPostcode,
    submitBooking,
    loadFromTemplate,
    loadPickupFromAddress,
    loadDeliveryFromAddress,
  } = useBookingWizard(customerId, tenantId);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const canProceed = () => {
    if (currentStep === 1) {
      return state.pickup.company && state.pickup.city && state.delivery.company && state.delivery.city;
    }
    if (currentStep === 2) {
      return true; // Optional step
    }
    if (currentStep === 3) {
      return state.pickup.date;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitBooking();
    setSubmitting(false);
    if (result.success) {
      onSuccess();
    }
  };

  const renderAddressInput = (
    type: 'pickup' | 'delivery',
    data: AddressData,
    updateFn: (field: keyof AddressData, value: string | boolean) => void,
    lookupFn: () => void
  ) => {
    const isPickup = type === 'pickup';
    const colorClass = isPickup ? "portal-success" : "portal-danger";
    const title = isPickup ? "Ophalen" : "Afleveren";
    const relevantAddresses = savedAddresses.slice(0, 4);

    return (
      <div className="portal-glass p-4 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isPickup ? "bg-[hsl(var(--portal-success)/.15)]" : "bg-[hsl(var(--portal-danger)/.15)]"
          )}>
            <MapPin className={cn("h-5 w-5", isPickup ? "text-[hsl(var(--portal-success))]" : "text-[hsl(var(--portal-danger))]")} />
          </div>
          <div>
            <h3 className="font-semibold text-[hsl(var(--portal-text))]">{title}</h3>
            <p className="text-xs text-[hsl(var(--portal-text-muted))]">
              {isPickup ? "Waar halen we op?" : "Waar leveren we af?"}
            </p>
          </div>
        </div>

        {/* Quick Address Selection */}
        {relevantAddresses.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {relevantAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => isPickup ? loadPickupFromAddress(addr) : loadDeliveryFromAddress(addr)}
                className="px-3 py-1.5 rounded-lg bg-[hsl(var(--portal-surface))] text-sm text-[hsl(var(--portal-text-secondary))] hover:bg-[hsl(var(--portal-surface-hover))] whitespace-nowrap border border-[hsl(var(--portal-border))]"
              >
                {addr.label}
              </button>
            ))}
          </div>
        )}

        {/* Company */}
        <div>
          <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
            <Building className="h-3 w-3" />
            Bedrijfsnaam *
          </label>
          <input
            type="text"
            value={data.company}
            onChange={(e) => updateFn("company", e.target.value)}
            placeholder="Naam bedrijf"
            className="portal-input"
          />
        </div>

        {/* Postcode + House Number */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2">
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Postcode</label>
            <input
              type="text"
              value={data.postalCode}
              onChange={(e) => updateFn("postalCode", e.target.value.toUpperCase())}
              onBlur={lookupFn}
              placeholder="1234 AB"
              className="portal-input uppercase"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Huisnr.</label>
            <input
              type="text"
              value={data.houseNumber}
              onChange={(e) => updateFn("houseNumber", e.target.value)}
              onBlur={lookupFn}
              placeholder="123"
              className="portal-input"
            />
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">&nbsp;</label>
            <button
              onClick={lookupFn}
              disabled={lookupLoading}
              className="w-full h-[42px] rounded-xl bg-[hsl(var(--portal-primary)/.15)] text-[hsl(var(--portal-primary-glow))] text-sm font-medium"
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "🔍"}
            </button>
          </div>
        </div>

        {/* Street + City */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Straat *</label>
            <input
              type="text"
              value={data.street}
              onChange={(e) => updateFn("street", e.target.value)}
              placeholder="Straatnaam"
              className="portal-input"
            />
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Plaats *</label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => updateFn("city", e.target.value)}
              placeholder="Stad"
              className="portal-input"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              Contact
            </label>
            <input
              type="text"
              value={data.contactPerson}
              onChange={(e) => updateFn("contactPerson", e.target.value)}
              placeholder="Naam"
              className="portal-input"
            />
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Telefoon
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateFn("phone", e.target.value)}
              placeholder="+31 6..."
              className="portal-input"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 portal-animate-in">
      {/* Progress Steps */}
      <div className="portal-wizard-progress">
        {steps.map((step, idx) => (
          <div key={step.id} className="portal-wizard-step">
            <div 
              className={cn(
                "portal-wizard-dot",
                currentStep > step.id ? "completed" : 
                currentStep === step.id ? "active" : "pending"
              )}
              onClick={() => currentStep > step.id && setCurrentStep(step.id)}
              style={{ cursor: currentStep > step.id ? 'pointer' : 'default' }}
            >
              {currentStep > step.id ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <step.icon className="h-4 w-4" />
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                "portal-wizard-line",
                currentStep > step.id && "completed"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Route */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Templates */}
            {templates.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {templates.slice(0, 5).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => loadFromTemplate(template)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--portal-gold)/.1)] border border-[hsl(var(--portal-gold)/.2)] text-sm text-[hsl(var(--portal-gold))] whitespace-nowrap"
                  >
                    {template.is_favorite && <Star className="h-3 w-3" />}
                    {template.name}
                  </button>
                ))}
              </div>
            )}

            {renderAddressInput('pickup', state.pickup, updatePickup, lookupPickupPostcode)}
            {renderAddressInput('delivery', state.delivery, updateDelivery, lookupDeliveryPostcode)}
          </div>
        )}

        {/* Step 2: Shipment Details */}
        {currentStep === 2 && (
          <div className="portal-glass p-4 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--portal-primary)/.15)] flex items-center justify-center">
                <Package className="h-5 w-5 text-[hsl(var(--portal-primary-glow))]" />
              </div>
              <div>
                <h3 className="font-semibold text-[hsl(var(--portal-text))]">Lading</h3>
                <p className="text-xs text-[hsl(var(--portal-text-muted))]">Optioneel - help ons inschatten</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Omschrijving
              </label>
              <textarea
                value={state.shipment.productDescription}
                onChange={(e) => updateShipment("productDescription", e.target.value)}
                placeholder="Wat wordt er vervoerd?"
                rows={2}
                className="portal-input resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  Colli
                </label>
                <input
                  type="number"
                  min="1"
                  value={state.shipment.quantity}
                  onChange={(e) => updateShipment("quantity", parseInt(e.target.value) || 1)}
                  className="portal-input"
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
                  <Scale className="h-3 w-3" />
                  Kg
                </label>
                <input
                  type="number"
                  value={state.shipment.weightKg}
                  onChange={(e) => updateShipment("weightKg", e.target.value)}
                  placeholder="0"
                  className="portal-input"
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">m³</label>
                <input
                  type="number"
                  value={state.shipment.volumeM3}
                  onChange={(e) => updateShipment("volumeM3", e.target.value)}
                  placeholder="0"
                  className="portal-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Referentie</label>
              <input
                type="text"
                value={state.shipment.referenceNumber}
                onChange={(e) => updateShipment("referenceNumber", e.target.value)}
                placeholder="Uw referentienummer"
                className="portal-input"
              />
            </div>
          </div>
        )}

        {/* Step 3: Service Options */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Date/Time */}
            <div className="portal-glass p-4 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--portal-warning)/.15)] flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-[hsl(var(--portal-warning))]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--portal-text))]">Wanneer?</h3>
                  <p className="text-xs text-[hsl(var(--portal-text-muted))]">Kies ophaaldatum en tijdvenster</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Ophaaldatum *</label>
                <input
                  type="date"
                  value={state.pickup.date}
                  onChange={(e) => updatePickup("date", e.target.value)}
                  className="portal-input"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--portal-surface))]">
                <input
                  type="checkbox"
                  id="flexible"
                  checked={state.pickup.flexible}
                  onChange={(e) => updatePickup("flexible", e.target.checked)}
                  className="w-5 h-5 rounded accent-[hsl(var(--portal-gold))]"
                />
                <label htmlFor="flexible" className="flex-1">
                  <p className="font-medium text-[hsl(var(--portal-text))]">Flexibel tijdvenster</p>
                  <p className="text-xs text-[hsl(var(--portal-text-muted))]">Vaak €5-15 goedkoper</p>
                </label>
              </div>

              {!state.pickup.flexible && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Van
                    </label>
                    <input
                      type="time"
                      value={state.pickup.timeFrom}
                      onChange={(e) => updatePickup("timeFrom", e.target.value)}
                      className="portal-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--portal-text-muted))] mb-1 block">Tot</label>
                    <input
                      type="time"
                      value={state.pickup.timeTo}
                      onChange={(e) => updatePickup("timeTo", e.target.value)}
                      className="portal-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Service Selection */}
            {products.length > 0 && (
              <div className="portal-glass p-4 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Truck className="h-5 w-5 text-[hsl(var(--portal-primary-glow))]" />
                  <h3 className="font-semibold text-[hsl(var(--portal-text))]">Service</h3>
                </div>

                <div className="space-y-2">
                  {products.slice(0, 4).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => updateShipment("selectedProductId", product.id)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-colors",
                        state.shipment.selectedProductId === product.id
                          ? "bg-[hsl(var(--portal-primary)/.15)] border-[hsl(var(--portal-primary)/.3)]"
                          : "bg-[hsl(var(--portal-surface))] border-[hsl(var(--portal-border))] hover:border-[hsl(var(--portal-primary)/.2)]"
                      )}
                    >
                      <p className="font-medium text-[hsl(var(--portal-text))]">
                        {product.customer_display_name || product.name}
                      </p>
                      {product.customer_description && (
                        <p className="text-xs text-[hsl(var(--portal-text-muted))] mt-0.5">
                          {product.customer_description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Options */}
            <div className="portal-glass p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--portal-surface))]">
                <input
                  type="checkbox"
                  id="signature"
                  checked={state.delivery.flexible}
                  onChange={(e) => updateDelivery("flexible", e.target.checked)}
                  className="w-5 h-5 rounded accent-[hsl(var(--portal-gold))]"
                />
                <label htmlFor="signature" className="flex-1">
                  <p className="font-medium text-[hsl(var(--portal-text))]">Handtekening vereist</p>
                  <p className="text-xs text-[hsl(var(--portal-text-muted))]">Ontvanger moet tekenen</p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--portal-surface))]">
                <input
                  type="checkbox"
                  id="flexible"
                  checked={state.pickup.flexible}
                  onChange={(e) => updatePickup("flexible", e.target.checked)}
                  className="w-5 h-5 rounded accent-[hsl(var(--portal-gold))]"
                />
                <label htmlFor="flexible" className="flex-1 flex items-center gap-2">
                  <div>
                    <p className="font-medium text-[hsl(var(--portal-text))]">Flexibele levering</p>
                    <p className="text-xs text-[hsl(var(--portal-text-muted))]">Bezorging op alternatieve locatie</p>
                  </div>
                  <Shield className="h-4 w-4 text-[hsl(var(--portal-gold))] ml-auto" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="portal-glass-gold p-4">
              <h3 className="font-semibold text-[hsl(var(--portal-text))] mb-4">Overzicht</h3>
              
              {/* Route Summary */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[hsl(var(--portal-border))]">
                <div className="flex-1">
                  <p className="text-xs text-[hsl(var(--portal-text-muted))]">Van</p>
                  <p className="font-medium text-[hsl(var(--portal-text))]">{state.pickup.company}</p>
                  <p className="text-sm text-[hsl(var(--portal-text-secondary))]">{state.pickup.city}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-[hsl(var(--portal-gold))]" />
                <div className="flex-1 text-right">
                  <p className="text-xs text-[hsl(var(--portal-text-muted))]">Naar</p>
                  <p className="font-medium text-[hsl(var(--portal-text))]">{state.delivery.company}</p>
                  <p className="text-sm text-[hsl(var(--portal-text-secondary))]">{state.delivery.city}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--portal-text-muted))]">Datum</span>
                  <span className="text-[hsl(var(--portal-text))]">{state.pickup.date || "Niet ingesteld"}</span>
                </div>
                {state.shipment.quantity > 1 && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--portal-text-muted))]">Colli</span>
                    <span className="text-[hsl(var(--portal-text))]">{state.shipment.quantity}</span>
                  </div>
                )}
                {state.pickup.flexible && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--portal-text-muted))]">Tijdvenster</span>
                    <span className="text-[hsl(var(--portal-success))]">Flexibel ✓</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Breakdown (placeholder) */}
            <div className="portal-glass p-4">
              <h4 className="font-semibold text-[hsl(var(--portal-text))] mb-3">Kostenopbouw</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--portal-text-muted))]">Basis transport</span>
                  <span className="text-[hsl(var(--portal-text))]">€89,00</span>
                </div>
                {state.delivery.flexible && (
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--portal-text-muted))]">Handtekening</span>
                    <span className="text-[hsl(var(--portal-text))]">€5,00</span>
                  </div>
                )}
                {state.pickup.flexible && (
                  <div className="flex justify-between text-[hsl(var(--portal-success))]">
                    <span>Flexibel korting</span>
                    <span>-€10,00</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[hsl(var(--portal-border))] font-semibold">
                  <span className="text-[hsl(var(--portal-text))]">Totaal (excl. BTW)</span>
                  <span className="text-[hsl(var(--portal-gold))]">
                    €{state.pickup.flexible ? "79,00" : "89,00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Save as Template */}
            <div className="flex items-center gap-3 p-4 portal-glass">
              <input
                type="checkbox"
                id="saveTemplate"
                className="w-5 h-5 rounded accent-[hsl(var(--portal-gold))]"
              />
              <label htmlFor="saveTemplate" className="flex items-center gap-2">
                <Save className="h-4 w-4 text-[hsl(var(--portal-text-secondary))]" />
                <span className="text-[hsl(var(--portal-text))]">Opslaan als sjabloon</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {currentStep > 1 && (
          <button
            onClick={handleBack}
            className="flex-1 portal-btn-ghost flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug
          </button>
        )}
        
        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors",
              canProceed()
                ? "portal-btn-gold"
                : "bg-[hsl(var(--portal-surface))] text-[hsl(var(--portal-text-muted))] cursor-not-allowed"
            )}
          >
            Volgende
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 portal-btn-gold flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Bevestigen
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ImperialBookingWizard;
