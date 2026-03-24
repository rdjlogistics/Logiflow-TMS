import { motion } from 'framer-motion';
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
  {
    id: 'bestelbus',
    label: 'Bestelbus',
    description: 'Tot 3.5 ton',
    icon: Package,
  },
  {
    id: 'bakwagen',
    label: 'Bakwagen',
    description: '3.5 - 7.5 ton',
    icon: Truck,
  },
  {
    id: 'vrachtwagen',
    label: 'Vrachtwagen',
    description: '7.5 - 18 ton',
    icon: Truck,
  },
  {
    id: 'trekker',
    label: 'Trekker + trailer',
    description: '40+ ton',
    icon: Container,
  },
  {
    id: 'touringcar',
    label: 'Touringcar',
    description: 'Personenvervoer',
    icon: Bus,
  },
];

export const StepVehiclePreference = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const selectedTypes = data.vehicleTypes;

  const toggleType = (id: string) => {
    const current = [...selectedTypes];
    const index = current.indexOf(id);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    updateData({ vehicleTypes: current });
  };

  const canProceed = selectedTypes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8"
    >
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
        >
          <span>Stap {currentStep + 1} van 15</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Voertuigvoorkeur
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Met welk type voertuig heb je ervaring? Selecteer alles dat van toepassing is.
        </motion.p>
      </div>

      {/* Vehicle selection grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-1 space-y-3 mb-8"
      >
        {VEHICLE_TYPES.map((vehicle, index) => {
          const isSelected = selectedTypes.includes(vehicle.id);
          const Icon = vehicle.icon;

          return (
            <motion.button
              key={vehicle.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              onClick={() => toggleType(vehicle.id)}
              className={cn(
                "w-full p-4 rounded-2xl flex items-center gap-4 transition-all",
                isSelected
                  ? "bg-primary/20 border-2 border-primary"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isSelected ? "bg-primary/30" : "bg-white/10"
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  "font-semibold",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {vehicle.label}
                </p>
                <p className="text-sm text-muted-foreground">{vehicle.description}</p>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                isSelected
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              )}>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Selection summary */}
      {selectedTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center text-sm text-muted-foreground"
        >
          {selectedTypes.length} voertuig{selectedTypes.length !== 1 ? 'en' : ''} geselecteerd
        </motion.div>
      )}

      {/* Buttons */}
      <div className="space-y-3">
        <OnboardingButton
          onClick={() => setCurrentStep(currentStep + 1)}
          disabled={!canProceed}
        />
        <OnboardingButton
          onClick={() => setCurrentStep(currentStep - 1)}
          variant="ghost"
        >
          Terug
        </OnboardingButton>
      </div>
    </motion.div>
  );
};
