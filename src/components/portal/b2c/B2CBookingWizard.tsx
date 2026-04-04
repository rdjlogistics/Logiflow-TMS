import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Package, 
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateSubmission } from "@/hooks/usePortalShipments";
import { usePostcodeLookup } from "@/hooks/usePostcodeLookup";

interface B2CBookingWizardProps {
  onComplete?: (data: any) => void;
  customerId?: string;
}

type Step = 'from' | 'to' | 'package' | 'confirm';

const steps: { id: Step; label: string; icon: any }[] = [
  { id: 'from', label: 'Ophalen', icon: MapPin },
  { id: 'to', label: 'Bezorgen', icon: MapPin },
  { id: 'package', label: 'Pakket', icon: Package },
  { id: 'confirm', label: 'Bevestig', icon: Check },
];


export const B2CBookingWizard = ({ onComplete, customerId }: B2CBookingWizardProps) => {
  const navigate = useNavigate();
  const { createSubmission, loading: submitting } = useCreateSubmission();
  const { lookupPostcode, loading: lookingUp } = usePostcodeLookup();
  
  const [currentStep, setCurrentStep] = useState<Step>('from');
  const [lookupFromCity, setLookupFromCity] = useState('');
  const [lookupToCity, setLookupToCity] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    fromPostcode: '',
    fromHouseNumber: '',
    fromStreet: '',
    fromCity: '',
    toPostcode: '',
    toHouseNumber: '',
    toStreet: '',
    toCity: '',
    description: '',
    size: 'medium',
    pickupDate: todayStr,
  });

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePostcodeLookup = async (type: 'from' | 'to') => {
    const postcode = type === 'from' ? formData.fromPostcode : formData.toPostcode;
    const houseNumber = type === 'from' ? formData.fromHouseNumber : formData.toHouseNumber;
    
    if (postcode && houseNumber) {
      const result = await lookupPostcode(postcode, houseNumber);
      if (result) {
        if (type === 'from') {
          setLookupFromCity(result.city);
          setFormData(prev => ({
            ...prev,
            fromStreet: result.street,
            fromCity: result.city,
          }));
        } else {
          setLookupToCity(result.city);
          setFormData(prev => ({
            ...prev,
            toStreet: result.street,
            toCity: result.city,
          }));
        }
      }
    }
  };

  const fromCityMismatch = lookupFromCity && formData.fromCity && formData.fromCity.toLowerCase() !== lookupFromCity.toLowerCase();
  const toCityMismatch = lookupToCity && formData.toCity && formData.toCity.toLowerCase() !== lookupToCity.toLowerCase();

  const nextStep = async () => {
    if (isLastStep) {
      try {
        const submission = await createSubmission({
          pickupCompany: 'Ophaaladres',
          pickupAddress: formData.fromStreet,
          pickupPostalCode: formData.fromPostcode,
          pickupCity: formData.fromCity || 'Onbekend',
          pickupHouseNumber: formData.fromHouseNumber,
          pickupDate: formData.pickupDate,
          deliveryCompany: 'Afleveradres',
          deliveryAddress: formData.toStreet,
          deliveryPostalCode: formData.toPostcode,
          deliveryCity: formData.toCity || 'Onbekend',
          deliveryHouseNumber: formData.toHouseNumber,
          productDescription: `${formData.size} pakket${formData.description ? ': ' + formData.description : ''}`,
          quantity: 1,
          serviceType: 'standard',
        }, customerId!);

        toast.success("Zending aangemaakt!", {
          description: `Ordernummer: ${submission.orderNumber}`,
          action: {
            label: "Bekijk zending",
            onClick: () => navigate("/portal/b2c"),
          },
          duration: 8000,
        });
        onComplete?.(submission);
      } catch (error) {
        toast.error("Fout bij aanmaken zending", {
          description: "Probeer het opnieuw of neem contact op."
        });
      }
    } else {
      // Trigger postcode lookup when leaving address steps
      if (currentStep === 'from') {
        await handlePostcodeLookup('from');
      } else if (currentStep === 'to') {
        await handlePostcodeLookup('to');
      }
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'from':
        return formData.fromPostcode && formData.fromHouseNumber;
      case 'to':
        return formData.toPostcode && formData.toHouseNumber;
      case 'package':
        return formData.size;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress - Enhanced with animation */}
      <div className="flex items-center justify-between mb-8" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemax={steps.length}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = step.id === currentStep;
          
          return (
            <div key={step.id} className="flex items-center">
              <motion.div 
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                  isCompleted ? "bg-gold text-gold-foreground shadow-glow-gold" :
                  isCurrent ? "bg-primary text-primary-foreground" :
                  "bg-muted/50 text-muted-foreground"
                )}
                initial={false}
                aria-label={`Stap ${index + 1}: ${step.label}${isCompleted ? ' (voltooid)' : isCurrent ? ' (huidige stap)' : ''}`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <motion.div 
                  className={cn(
                    "w-8 sm:w-12 h-1 mx-1 rounded-full transition-colors",
                    index < currentStepIndex ? "bg-gold" : "bg-muted/50"
                  )}
                  initial={false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Title */}
      <h1 className="text-2xl font-display font-bold mb-6">
        {currentStep === 'from' && "Waar ophalen?"}
        {currentStep === 'to' && "Waar bezorgen?"}
        {currentStep === 'package' && "Wat verstuur je?"}
        {currentStep === 'confirm' && "Bevestig je zending"}
      </h1>

      {/* Step Content */}
      <div className="space-y-4 mb-8">
        {currentStep === 'from' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Postcode
                  <span className="text-[10px] text-primary/70">(auto)</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="1234 AB"
                    value={formData.fromPostcode}
                    onChange={(e) => updateField('fromPostcode', e.target.value.toUpperCase())}
                    onBlur={() => handlePostcodeLookup('from')}
                    className="h-12 text-base pr-10"
                    maxLength={7}
                  />
                  {lookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {formData.fromStreet && formData.fromCity && !lookingUp && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Huisnummer</Label>
                <Input
                  placeholder="123"
                  value={formData.fromHouseNumber}
                  onChange={(e) => updateField('fromHouseNumber', e.target.value)}
                  onBlur={() => formData.fromPostcode && handlePostcodeLookup('from')}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Straat
                {formData.fromStreet && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </Label>
              <Input
                placeholder="Wordt automatisch ingevuld"
                value={formData.fromStreet}
                onChange={(e) => updateField('fromStreet', e.target.value)}
                className={cn("h-12 text-base", formData.fromStreet && "border-green-500/30 bg-green-500/5")}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Stad
                {formData.fromCity && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </Label>
              <Input
                placeholder="Wordt automatisch ingevuld"
                value={formData.fromCity}
                onChange={(e) => updateField('fromCity', e.target.value)}
                className={cn("h-12 text-base", formData.fromCity && "border-green-500/30 bg-green-500/5")}
              />
              {fromCityMismatch && (
                <p className="text-xs text-yellow-600 mt-1">⚠ Postcode geeft stad "{lookupFromCity}" aan, u heeft "{formData.fromCity}" ingevuld</p>
              )}
            </div>
          </>
        )}

        {currentStep === 'to' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Postcode
                  <span className="text-[10px] text-primary/70">(auto)</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="1234 AB"
                    value={formData.toPostcode}
                    onChange={(e) => updateField('toPostcode', e.target.value.toUpperCase())}
                    onBlur={() => handlePostcodeLookup('to')}
                    className="h-12 text-base pr-10"
                    maxLength={7}
                  />
                  {lookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {formData.toStreet && formData.toCity && !lookingUp && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Huisnummer</Label>
                <Input
                  placeholder="123"
                  value={formData.toHouseNumber}
                  onChange={(e) => updateField('toHouseNumber', e.target.value)}
                  onBlur={() => formData.toPostcode && handlePostcodeLookup('to')}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Straat
                {formData.toStreet && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </Label>
              <Input
                placeholder="Wordt automatisch ingevuld"
                value={formData.toStreet}
                onChange={(e) => updateField('toStreet', e.target.value)}
                className={cn("h-12 text-base", formData.toStreet && "border-green-500/30 bg-green-500/5")}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Stad
                {formData.toCity && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </Label>
              <Input
                placeholder="Wordt automatisch ingevuld"
                value={formData.toCity}
                onChange={(e) => updateField('toCity', e.target.value)}
                className={cn("h-12 text-base", formData.toCity && "border-green-500/30 bg-green-500/5")}
              />
              {toCityMismatch && (
                <p className="text-xs text-yellow-600 mt-1">⚠ Postcode geeft stad "{lookupToCity}" aan, u heeft "{formData.toCity}" ingevuld</p>
              )}
            </div>
          </>
        )}

        {currentStep === 'package' && (
          <>
            <Label className="text-sm font-medium">Pakketgrootte</Label>
            <RadioGroup
              value={formData.size}
              onValueChange={(value) => updateField('size', value)}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { value: 'small', label: 'Klein', desc: 'Brievenbus' },
                { value: 'medium', label: 'Medium', desc: 'Schoenendoos' },
                { value: 'large', label: 'Groot', desc: 'Verhuisdoos' },
              ].map(option => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                      formData.size === option.value
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <Package className={cn(
                      "h-8 w-8 mb-2",
                      formData.size === option.value ? "text-gold" : "text-muted-foreground"
                    )} />
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-[10px] text-muted-foreground">{option.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="pt-4">
              <Label className="text-xs text-muted-foreground">Omschrijving (optioneel)</Label>
              <Textarea
                placeholder="Bijv. 'Boeken' of 'Elektronica'"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="resize-none h-20"
              />
            </div>
          </>
        )}

        {currentStep === 'confirm' && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ophalen</p>
                  <p className="font-medium">
                    {formData.fromPostcode} {formData.fromHouseNumber}
                  </p>
                  {formData.fromCity && (
                    <p className="text-sm text-muted-foreground">{formData.fromCity}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bezorgen</p>
                  <p className="font-medium">
                    {formData.toPostcode} {formData.toHouseNumber}
                  </p>
                  {formData.toCity && (
                    <p className="text-sm text-muted-foreground">{formData.toCity}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pakket</p>
                  <p className="font-medium capitalize">{formData.size}</p>
                  {formData.description && (
                    <p className="text-sm text-muted-foreground">{formData.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gold/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gold" />
                <div>
                  <p className="font-medium">Standaard bezorging</p>
                  <p className="text-xs text-muted-foreground">1-2 werkdagen</p>
                </div>
              </div>
              <p className="text-xl font-display font-bold text-gold">€6,95</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions - Touch Optimized */}
      <div className="flex gap-3">
        {currentStepIndex > 0 && (
          <motion.div className="flex-1">
            <Button
              variant="outline"
              onClick={prevStep}
              className="w-full h-14 rounded-2xl text-base touch-manipulation"
              aria-label="Vorige stap"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Terug
            </Button>
          </motion.div>
        )}
        <motion.div className="flex-1">
          <Button
            onClick={nextStep}
            disabled={!canProceed() || submitting}
            className={cn(
              "w-full h-14 rounded-2xl text-base touch-manipulation",
              isLastStep 
                ? "bg-gold hover:bg-gold/90 text-gold-foreground shadow-glow-gold" 
                : "bg-primary hover:bg-primary/90"
            )}
            aria-label={isLastStep ? "Zending bevestigen en betalen" : "Naar volgende stap"}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isLastStep ? "Bevestig & Betaal" : "Volgende"}
                {!isLastStep && <ChevronRight className="h-5 w-5 ml-2" />}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default B2CBookingWizard;
