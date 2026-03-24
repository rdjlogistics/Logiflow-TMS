import { useState } from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8"
    >
      {/* Header */}
      <div className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground mb-2"
        >
          Stap {currentStep + 1} van 15
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Hallo, {data.name}! 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Wat is je telefoonnummer? Dit gebruiken we om je te bereiken.
        </motion.p>
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-auto"
      >
        <OnboardingInput
          value={data.phone}
          onChange={(value) => updateData({ phone: value })}
          placeholder="Telefoonnummer"
          type="tel"
          autoFocus
          error={attempted && !canProceed ? 'Vul een geldig telefoonnummer in (min. 10 cijfers)' : undefined}
        />
      </motion.div>

      {/* Buttons */}
      <div className="space-y-3">
        <OnboardingButton onClick={handleNext} />
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
