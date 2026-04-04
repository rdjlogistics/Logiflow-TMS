import { Car, Truck, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding, DriverCategory } from '../OnboardingContext';
import { cn } from '@/lib/utils';

interface CategoryOption {
  id: DriverCategory;
  title: string;
  subtitle: string;
  description: string;
  licenses: string;
  icon: React.ElementType;
  cpcRequired: boolean;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'light',
    title: 'Personenbusje / Bestelbus',
    subtitle: 'Rijbewijs B of BE',
    description: 'Voor voertuigen tot 3.500 kg (bestelbus, personenbusje)',
    licenses: 'B, BE',
    icon: Car,
    cpcRequired: false,
  },
  {
    id: 'heavy',
    title: 'Vrachtwagen / Touringcar',
    subtitle: 'Rijbewijs C, CE of D',
    description: 'Voor voertuigen boven 3.500 kg (bakwagen, vrachtwagen, trekker, touringcar)',
    licenses: 'C, C1, CE, D, DE',
    icon: Truck,
    cpcRequired: true,
  },
];

export const StepDriverCategory = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const selected = data.driverCategory;

  const handleSelect = (category: DriverCategory) => {
    updateData({ driverCategory: category });
  };

  const canProceed = selected !== null;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Type chauffeur
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Welk type voertuig ga je besturen? Dit bepaalt welke documenten je nodig hebt.
        </p>
      </div>

      <div className="flex-1 space-y-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {CATEGORIES.map((category, index) => {
          const isSelected = selected === category.id;
          const Icon = category.icon;

          return (
            <button
              key={category.id}
              onClick={() => handleSelect(category.id)}
              className={cn(
                "w-full p-5 rounded-2xl text-left transition-all border-2 animate-fade-in-up",
                isSelected
                  ? "bg-primary/20 border-primary"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-primary/30" : "bg-white/10"
                )}>
                  <Icon className={cn("w-7 h-7", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("font-bold text-lg", isSelected ? "text-foreground" : "text-muted-foreground")}>
                      {category.title}
                    </span>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-sm text-primary/80 font-medium mb-1">{category.subtitle}</p>
                  <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium",
                    category.cpcRequired ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                  )}>
                    {category.cpcRequired ? (
                      <><AlertCircle className="w-3 h-3" />Chauffeurskaart (CPC) verplicht</>
                    ) : (
                      <><CheckCircle2 className="w-3 h-3" />Geen CPC nodig</>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-400 font-medium mb-1">Wetswijziging juli 2026</p>
            <p className="text-xs text-blue-300/80">
              Vanaf juli 2026 hebben ook bestelbussen boven 2.500 kg (zoals Sprinters) 
              een tachograaf nodig. Dan is ook een chauffeurskaart (CPC) verplicht. 
              Kleine bussen zoals Caddy's zijn uitgezonderd.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <OnboardingButton onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed} />
        <OnboardingButton onClick={() => setCurrentStep(currentStep - 1)} variant="ghost">
          Terug
        </OnboardingButton>
      </div>
    </div>
  );
};
