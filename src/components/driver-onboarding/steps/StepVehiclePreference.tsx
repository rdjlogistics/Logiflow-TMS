import { Truck, Bus, Package, Container, CheckCircle2 } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { cn } from '@/lib/utils';

interface VehicleType {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const VEHICLE_TYPES: VehicleType[] = [
  { id: 'bestelbus', label: 'Bestelbus', description: 'Tot 3.5 ton', icon: Package },
  { id: 'bakwagen', label: 'Bakwagen', description: '3.5 - 7.5 ton', icon: Truck },
  { id: 'vrachtwagen', label: 'Vrachtwagen', description: '7.5 - 18 ton', icon: Truck },
  { id: 'trekker', label: 'Trekker + trailer', description: '40+ ton', icon: Container },
  { id: 'touringcar', label: 'Touringcar', description: 'Personenvervoer', icon: Bus },
];

export const StepVehiclePreference = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const selectedTypes = data.vehicleTypes;

  const toggleType = (id: string) => {
    const current = [...selectedTypes];
    const index = current.indexOf(id);
    if (index >= 0) current.splice(index, 1);
    else current.push(id);
    updateData({ vehicleTypes: current });
  };

  const canProceed = selectedTypes.length > 0;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Voertuigvoorkeur
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Met welk type voertuig heb je ervaring? Selecteer alles dat van toepassing is.
        </p>
      </div>

      <div className="flex-1 space-y-3 mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {VEHICLE_TYPES.map((vehicle, index) => {
          const isSelected = selectedTypes.includes(vehicle.id);
          const Icon = vehicle.icon;
          return (
            <button
              key={vehicle.id}
              onClick={() => toggleType(vehicle.id)}
              className={cn(
                "w-full p-4 rounded-2xl flex items-center gap-4 transition-all animate-fade-in-up",
                isSelected ? "bg-primary/20 border-2 border-primary" : "bg-white/5 border border-white/10 hover:bg-white/10"
              )}
              style={{ animationDelay: `${0.3 + index * 0.05}s` }}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", isSelected ? "bg-primary/30" : "bg-white/10")}>
                <Icon className={cn("w-6 h-6", isSelected ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn("font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>{vehicle.label}</p>
                <p className="text-sm text-muted-foreground">{vehicle.description}</p>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
              )}>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTypes.length > 0 && (
        <div className="mb-6 text-center text-sm text-muted-foreground animate-fade-in">
          {selectedTypes.length} voertuig{selectedTypes.length !== 1 ? 'en' : ''} geselecteerd
        </div>
      )}

      <div className="space-y-3">
        <OnboardingButton onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed} />
        <OnboardingButton onClick={() => setCurrentStep(currentStep - 1)} variant="ghost">
          Terug
        </OnboardingButton>
      </div>
    </div>
  );
};
