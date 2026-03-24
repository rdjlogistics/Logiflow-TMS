import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Save,
  Star,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  Scale,
  Box,
  FileText,
  Search,
} from "lucide-react";
import { useBookingWizard, type AddressData, type ShipmentData } from "@/hooks/useBookingWizard";
import type { ServiceProduct, SavedAddress, BookingTemplate } from "@/hooks/useCustomerPortal";
import { cn } from "@/lib/utils";

interface BookingWizardProps {
  customerId: string;
  tenantId: string | null;
  products: ServiceProduct[];
  savedAddresses: SavedAddress[];
  templates: BookingTemplate[];
  onSuccess: () => void;
}

const steps = [
  { id: 1, title: "Route", description: "Ophaal & afleveradres", icon: MapPin },
  { id: 2, title: "Details", description: "Dienst & lading", icon: Package },
  { id: 3, title: "Bevestigen", description: "Controleer & boek", icon: CheckCircle2 },
];

const AddressQualityIndicator = ({ quality }: { quality: 'unknown' | 'partial' | 'verified' }) => {
  const config = {
    unknown: { color: 'bg-muted text-muted-foreground', label: 'Niet gevalideerd' },
    partial: { color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400', label: 'Gedeeltelijk' },
    verified: { color: 'bg-green-500/20 text-green-700 dark:text-green-400', label: 'Geverifieerd' },
  };
  
  return (
    <Badge variant="secondary" className={cn("text-xs", config[quality].color)}>
      {config[quality].label}
    </Badge>
  );
};

export const BookingWizard = ({
  customerId,
  tenantId,
  products,
  savedAddresses,
  templates,
  onSuccess,
}: BookingWizardProps) => {
  const {
    state,
    lookupLoading,
    validateStep1,
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
  } = useBookingWizard(customerId, tenantId);

  // Calculate distance when addresses change
  useEffect(() => {
    if (state.pickup.city && state.delivery.city) {
      calculateDistance();
    }
  }, [state.pickup.city, state.delivery.city, calculateDistance]);

  const handleSubmit = async () => {
    const result = await submitBooking();
    if (result.success) {
      onSuccess();
    }
  };

  const renderAddressFields = (
    type: 'pickup' | 'delivery',
    data: AddressData,
    updateFn: (field: keyof AddressData, value: string | boolean) => void,
    lookupFn: () => void,
    quality: 'unknown' | 'partial' | 'verified',
    savedList: SavedAddress[],
    loadFromSaved: (addr: SavedAddress) => void
  ) => {
    const isPickup = type === 'pickup';
    const gradientFrom = isPickup ? 'from-emerald-500' : 'from-red-500';
    const gradientTo = isPickup ? 'to-green-500' : 'to-rose-500';
    const iconColor = isPickup ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
    const title = isPickup ? 'Ophaaladres' : 'Afleveradres';
    const bgColor = isPickup ? 'from-emerald-500/20 to-green-500/10' : 'from-red-500/20 to-rose-500/10';
    const borderColor = isPickup ? 'border-emerald-500/20' : 'border-red-500/20';

    const defaults = savedList.filter(a => isPickup ? a.is_pickup_default : a.is_delivery_default);
    const others = savedList.filter(a => !(isPickup ? a.is_pickup_default : a.is_delivery_default)).slice(0, 4);

    return (
      <Card className="relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className={cn("p-2.5 rounded-xl bg-gradient-to-br border", bgColor, borderColor)}>
                <MapPin className={cn("h-5 w-5", iconColor)} />
              </div>
              {title}
            </CardTitle>
            <AddressQualityIndicator quality={quality} />
          </div>
          
          {/* Saved Addresses Quick Select */}
          {(defaults.length > 0 || others.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {[...defaults, ...others].slice(0, 5).map((addr) => (
                <Button
                  key={addr.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => loadFromSaved(addr)}
                >
                  {addr.label}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Company & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Building className="h-3.5 w-3.5" />
                Bedrijfsnaam *
              </Label>
              <Input
                value={data.company}
                onChange={(e) => updateFn("company", e.target.value)}
                placeholder="Naam bedrijf"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5" />
                Contactpersoon
              </Label>
              <Input
                value={data.contactPerson}
                onChange={(e) => updateFn("contactPerson", e.target.value)}
                placeholder="Naam contact"
              />
            </div>
          </div>

          {/* Postcode & House Number with Lookup */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Postcode</Label>
              <Input
                value={data.postalCode}
                onChange={(e) => updateFn("postalCode", e.target.value)}
                onBlur={lookupFn}
                placeholder="1234 AB"
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Huisnummer</Label>
              <Input
                value={data.houseNumber}
                onChange={(e) => updateFn("houseNumber", e.target.value)}
                onBlur={lookupFn}
                placeholder="123"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">&nbsp;</Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={lookupFn}
                disabled={lookupLoading}
              >
                {lookupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-1" />
                    Zoeken
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Street & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Straat *</Label>
              <Input
                value={data.street}
                onChange={(e) => updateFn("street", e.target.value)}
                placeholder="Straatnaam"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Plaats *</Label>
              <Input
                value={data.city}
                onChange={(e) => updateFn("city", e.target.value)}
                placeholder="Plaatsnaam"
                required
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5" />
                Telefoon
              </Label>
              <Input
                value={data.phone}
                onChange={(e) => updateFn("phone", e.target.value)}
                placeholder="+31 6 12345678"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5" />
                E-mail
              </Label>
              <Input
                value={data.email}
                onChange={(e) => updateFn("email", e.target.value)}
                placeholder="email@voorbeeld.nl"
                type="email"
              />
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                {isPickup ? 'Ophaaldatum' : 'Leverdatum'} {isPickup ? '*' : '(optioneel)'}
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={data.flexible}
                  onCheckedChange={(checked) => updateFn("flexible", checked)}
                />
                <span className="text-sm text-muted-foreground">Flexibel tijdvenster</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Input
                  type="date"
                  value={data.date}
                  onChange={(e) => updateFn("date", e.target.value)}
                  required={isPickup}
                />
              </div>
              {!data.flexible && (
                <>
                  <div className="space-y-2">
                    <Input
                      type="time"
                      value={data.timeFrom}
                      onChange={(e) => updateFn("timeFrom", e.target.value)}
                      placeholder="Van"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="time"
                      value={data.timeTo}
                      onChange={(e) => updateFn("timeTo", e.target.value)}
                      placeholder="Tot"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Save to Address Book */}
          <div className="flex items-center gap-2 pt-2">
            <Switch
              checked={data.saveToAddressBook}
              onCheckedChange={(checked) => updateFn("saveToAddressBook", checked)}
            />
            <Label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Opslaan in adresboek
            </Label>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Templates Quick Select */}
      {templates.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sjablonen:</span>
              {templates.slice(0, 5).map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => loadFromTemplate(template)}
                >
                  {template.is_favorite && <Star className="h-3 w-3 mr-1 text-amber-500" />}
                  {template.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {renderAddressFields(
        'pickup',
        state.pickup,
        updatePickup,
        lookupPickupPostcode,
        state.addressQuality.pickup,
        savedAddresses,
        loadPickupFromAddress
      )}

      {renderAddressFields(
        'delivery',
        state.delivery,
        updateDelivery,
        lookupDeliveryPostcode,
        state.addressQuality.delivery,
        savedAddresses,
        loadDeliveryFromAddress
      )}

      {/* Distance Preview */}
      {state.estimatedDistance && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Geschatte afstand:</span>
              <Badge variant="secondary" className="text-lg font-bold">
                {state.estimatedDistance} km
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Service Selection */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5 text-primary" />
              Kies uw dienst
            </CardTitle>
            <CardDescription>Selecteer het type transport</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    state.shipment.selectedProductId === product.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => updateShipment("selectedProductId", product.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      state.shipment.selectedProductId === product.id 
                        ? "bg-primary/20" 
                        : "bg-muted"
                    )}>
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{product.customer_display_name || product.name}</h4>
                      {product.customer_description && (
                        <p className="text-sm text-muted-foreground">{product.customer_description}</p>
                      )}
                      {product.vehicle_type && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {product.vehicle_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Zendinggegevens
          </CardTitle>
          <CardDescription>Optionele details over uw lading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5" />
              Omschrijving lading
            </Label>
            <Textarea
              value={state.shipment.productDescription}
              onChange={(e) => updateShipment("productDescription", e.target.value)}
              placeholder="Beschrijf kort wat er vervoerd moet worden..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Box className="h-3.5 w-3.5" />
                Aantal colli
              </Label>
              <Input
                type="number"
                min="1"
                value={state.shipment.quantity}
                onChange={(e) => updateShipment("quantity", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Scale className="h-3.5 w-3.5" />
                Gewicht (kg)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={state.shipment.weightKg}
                onChange={(e) => updateShipment("weightKg", e.target.value)}
                placeholder="0.0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Volume (m³)</Label>
              <Input
                type="number"
                step="0.01"
                value={state.shipment.volumeM3}
                onChange={(e) => updateShipment("volumeM3", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Uw referentie</Label>
              <Input
                value={state.shipment.referenceNumber}
                onChange={(e) => updateShipment("referenceNumber", e.target.value)}
                placeholder="Optioneel"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Speciale instructies</Label>
            <Textarea
              value={state.shipment.specialInstructions}
              onChange={(e) => updateShipment("specialInstructions", e.target.value)}
              placeholder="Bijv. voorzichtig behandelen, stapelbaar, temperatuurgevoelig..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => {
    const selectedProduct = products.find(p => p.id === state.shipment.selectedProductId);
    
    return (
      <div className="space-y-6">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Overzicht Boeking
            </CardTitle>
            <CardDescription>Controleer uw gegevens voor het indienen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Route Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  Ophalen
                </h4>
                <div className="pl-5 space-y-1 text-sm">
                  <p className="font-medium">{state.pickup.company}</p>
                  <p className="text-muted-foreground">
                    {state.pickup.street} {state.pickup.houseNumber}
                  </p>
                  <p className="text-muted-foreground">
                    {state.pickup.postalCode} {state.pickup.city}
                  </p>
                  {state.pickup.date && (
                    <p className="font-medium text-primary">
                      {new Date(state.pickup.date).toLocaleDateString('nl-NL', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                      {!state.pickup.flexible && state.pickup.timeFrom && (
                        <> • {state.pickup.timeFrom} - {state.pickup.timeTo || '...'}</>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Afleveren
                </h4>
                <div className="pl-5 space-y-1 text-sm">
                  <p className="font-medium">{state.delivery.company}</p>
                  <p className="text-muted-foreground">
                    {state.delivery.street} {state.delivery.houseNumber}
                  </p>
                  <p className="text-muted-foreground">
                    {state.delivery.postalCode} {state.delivery.city}
                  </p>
                  {state.delivery.date && (
                    <p className="font-medium text-primary">
                      {new Date(state.delivery.date).toLocaleDateString('nl-NL', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Shipment Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {selectedProduct && (
                <div>
                  <p className="text-muted-foreground">Dienst</p>
                  <p className="font-medium">{selectedProduct.customer_display_name || selectedProduct.name}</p>
                </div>
              )}
              {state.shipment.quantity > 1 && (
                <div>
                  <p className="text-muted-foreground">Colli</p>
                  <p className="font-medium">{state.shipment.quantity}</p>
                </div>
              )}
              {state.shipment.weightKg && (
                <div>
                  <p className="text-muted-foreground">Gewicht</p>
                  <p className="font-medium">{state.shipment.weightKg} kg</p>
                </div>
              )}
              {state.estimatedDistance && (
                <div>
                  <p className="text-muted-foreground">Afstand</p>
                  <p className="font-medium">{state.estimatedDistance} km</p>
                </div>
              )}
            </div>

            {state.shipment.productDescription && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Omschrijving</p>
                <p>{state.shipment.productDescription}</p>
              </div>
            )}

            {state.shipment.specialInstructions && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Speciale instructies</p>
                <p>{state.shipment.specialInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 md:gap-4">
          {steps.map((step, index) => {
            const isActive = state.step === step.id;
            const isCompleted = state.step > step.id;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => isCompleted && goToStep(step.id)}
                  disabled={!isCompleted && !isActive}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isActive && "bg-primary-foreground text-primary",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "bg-muted-foreground/20"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs opacity-80">{step.description}</p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-8 md:w-12 h-0.5 mx-1",
                    state.step > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {state.step === 1 && renderStep1()}
        {state.step === 2 && renderStep2()}
        {state.step === 3 && renderStep3()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={state.step === 1 ? reset : prevStep}
          disabled={state.isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {state.step === 1 ? 'Annuleren' : 'Vorige'}
        </Button>

        {state.step < 3 ? (
          <Button onClick={nextStep}>
            Volgende
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={state.isSubmitting}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Indienen...
              </>
            ) : (
              <>
                <Truck className="mr-2 h-4 w-4" />
                Zending Boeken
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BookingWizard;
