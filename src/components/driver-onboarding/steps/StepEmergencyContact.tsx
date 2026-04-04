import { Shield } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { OnboardingInput } from '../OnboardingInput';
import { useOnboarding } from '../OnboardingContext';
import { cn } from '@/lib/utils';

const RELATIONSHIPS = ['Partner', 'Ouder', 'Kind', 'Broer/zus', 'Vriend(in)', 'Anders'];

export const StepEmergencyContact = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();

  const nameValid = data.emergencyContactName.trim().length >= 2;
  const phoneValid = data.emergencyContactPhone.trim().length >= 9;
  const canProceed = nameValid && phoneValid;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' >
          Noodcontact
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' >
          Wie moeten we bereiken in geval van nood?
        </p>
      </div>

      <div className="mb-8 p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-fade-in-up" style={{ animationDelay: '0.3s' >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground mb-1">Veiligheid voorop</p>
            <p className="text-xs text-muted-foreground">
              Je noodcontact wordt alleen gebruikt bij noodsituaties en wordt vertrouwelijk behandeld.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-8 mb-8">
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' >
          <OnboardingInput
            value={data.emergencyContactName}
            onChange={(value) => updateData({ emergencyContactName: value })}
            placeholder="Naam contactpersoon"
          />
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' >
          <OnboardingInput
            value={data.emergencyContactPhone}
            onChange={(value) => updateData({ emergencyContactPhone: value })}
            placeholder="Telefoonnummer"
            type="tel"
          />
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' >
          <p className="text-sm text-muted-foreground mb-3">Relatie (optioneel)</p>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIPS.map((rel) => {
              const isSelected = data.emergencyContactRelationship === rel;
              return (
                <button
                  key={rel}
                  onClick={() => updateData({ emergencyContactRelationship: isSelected ? '' : rel })}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground hover:bg-white/20"
                  )}
                >
                  {rel}
                </button>
              );
            })}
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
