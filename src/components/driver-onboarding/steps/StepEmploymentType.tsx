import { motion } from 'framer-motion';
import { Building2, User, CheckCircle2, AlertCircle, Shield, FileText } from 'lucide-react';
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
          Dienstverband
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Werk je in loondienst of als zelfstandige? Dit bepaalt welke documenten we nodig hebben.
        </motion.p>
      </div>

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-1 space-y-4 mb-6"
      >
        {OPTIONS.map((option, index) => {
          const isSelected = selected === option.id;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "w-full p-5 rounded-2xl text-left transition-all border-2",
                isSelected
                  ? "bg-primary/20 border-primary"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-primary/30" : "bg-white/10"
                )}>
                  <Icon className={cn(
                    "w-7 h-7",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "font-bold text-lg",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {option.title}
                    </span>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-sm text-primary/80 font-medium mb-1">
                    {option.subtitle}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {option.description}
                  </p>
                  
                  {/* Documents required */}
                  <div className="flex flex-wrap gap-1.5">
                    {option.documentsRequired.map((doc) => (
                      <span
                        key={doc}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          isSelected 
                            ? "bg-primary/20 text-primary" 
                            : "bg-white/10 text-muted-foreground"
                        )}
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* ZZP info box */}
      {selected === 'zzp' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium mb-1">
                ZZP documentatie vereist
              </p>
              <p className="text-xs text-amber-300/80">
                Als ZZP'er moet je een geldig verzekeringsbewijs (WAM) en 
                aansprakelijkheidsverzekering (AVB) uploaden. Deze documenten 
                worden automatisch geverifieerd.
              </p>
            </div>
          </div>
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
