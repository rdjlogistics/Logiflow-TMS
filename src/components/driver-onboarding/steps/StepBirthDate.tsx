import { OnboardingButton } from '../OnboardingButton';
import { DatePicker3D } from '../DatePicker3D';
import { useOnboarding } from '../OnboardingContext';

export const StepBirthDate = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const canProceed = data.dateOfBirth !== null;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="text-sm text-muted-foreground mb-2 animate-fade-in-up">
          Stap {currentStep + 1} van 15
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' >
          Super!
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' >
          Wanneer ben je geboren? Dit helpt ons om je profiel compleet te maken.
        </p>
      </div>

      <div className="flex-1 flex items-center animate-fade-in-up" style={{ animationDelay: '0.3s' >
        <DatePicker3D value={data.dateOfBirth} onChange={(date) => updateData({ dateOfBirth: date })} />
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
