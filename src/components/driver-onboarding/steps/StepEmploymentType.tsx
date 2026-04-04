import { Building2, User, CheckCircle2, Shield } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding, EmploymentType } from '../OnboardingContext';
import { cn } from '@/lib/utils';

interface EmploymentOption {
  id: EmploymentType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  documentsRequired: string[];
}

const OPTIONS: EmploymentOption[] = [
  {
    id: 'employed',
    title: 'In loondienst',
    subtitle: 'Bij een transportbedrijf',
    description: 'Je werkt in loondienst bij een bedrijf dat de verzekeringen regelt.',
    icon: Building2,
    documentsRequired: ['Rijbewijs', 'Profielfoto', 'ID/Paspoort'],
  },
  {
    id: 'zzp',
    title: 'ZZP / Zelfstandig',
    subtitle: 'Eigen onderneming',
    description: 'Je werkt als zelfstandige en regelt je eigen verzekeringen.',
    icon: User,
    documentsRequired: ['Rijbewijs', 'Profielfoto', 'ID/Paspoort', 'WAM-verzekering', 'Aansprakelijkheidsverzekering'],
  },
];

export const StepEmploymentType = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const selected = data.employmentType;

  const handleSelect = (type: EmploymentType) => {
    updateData({ employmentType: type });
  };

  const canProceed = selected !== null;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Dienstverband
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Werk je in loondienst of als zelfstandige? Dit bepaalt welke documenten we nodig hebben.
        </p>
      </div>

      <div className="flex-1 space-y-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {OPTIONS.map((option, index) => {
          const isSelected = selected === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
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
                      {option.title}
                    </span>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-sm text-primary/80 font-medium mb-1">{option.subtitle}</p>
                  <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {option.documentsRequired.map((doc) => (
                      <span key={doc} className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isSelected ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"
                      )}>
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected === 'zzp' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium mb-1">ZZP documentatie vereist</p>
              <p className="text-xs text-amber-300/80">
                Als ZZP'er moet je een geldig verzekeringsbewijs (WAM) en 
                aansprakelijkheidsverzekering (AVB) uploaden. Deze documenten 
                worden automatisch geverifieerd.
              </p>
            </div>
          </div>
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
