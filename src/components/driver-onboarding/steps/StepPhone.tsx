import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { OnboardingInput } from '../OnboardingInput';
import { useOnboarding } from '../OnboardingContext';

export const StepPhone = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const [attempted, setAttempted] = useState(false);
  const phoneDigits = data.phone.replace(/\D/g, '');
  const canProceed = phoneDigits.length >= 10;

  const handleNext = () => {
    setAttempted(true);
    if (canProceed) setCurrentStep(currentStep + 1);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-12">
        <div className="text-sm text-muted-foreground mb-2 animate-fade-in-up">
          Stap {currentStep + 1} van 15
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Hallo, {data.name}! 👋
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Wat is je telefoonnummer? Dit gebruiken we om je te bereiken.
        </p>
      </div>

      <div className="mb-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <OnboardingInput
          value={data.phone}
          onChange={(value) => updateData({ phone: value })}
          placeholder="Telefoonnummer"
          type="tel"
          autoFocus
          error={attempted && !canProceed ? 'Vul een geldig telefoonnummer in (min. 10 cijfers)' : undefined}
        />
      </div>

      <div className="space-y-3">
        <OnboardingButton onClick={handleNext} />
        <OnboardingButton onClick={() => setCurrentStep(currentStep - 1)} variant="ghost">
          Terug
        </OnboardingButton>
      </div>
    </div>
  );
};
