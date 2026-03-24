import { motion } from 'framer-motion';
import { FloatingTruck3D } from '../FloatingTruck3D';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { Truck, Route, Clock } from 'lucide-react';

export const StepWelcome = () => {
  const { setCurrentStep } = useOnboarding();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8"
    >
      {/* Header */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground mb-2"
        >
          Welkom bij de onboarding
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-foreground mb-2"
        >
          Chauffeur
          <span className="text-primary"> App</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-lg"
        >
          Je nieuwe partner onderweg
        </motion.p>
      </div>

      {/* 3D Truck Animation */}
      <FloatingTruck3D />

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4 mb-8"
      >
        {[
          { icon: Route, text: 'Bekijk je routes in realtime' },
          { icon: Clock, text: 'Check je rooster onderweg' },
          { icon: Truck, text: 'Beheer al je ritten op één plek' },
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
          >
            <div className="p-2 rounded-lg bg-primary/20">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <div className="mt-auto">
        <OnboardingButton onClick={() => setCurrentStep(1)} />
      </div>
    </motion.div>
  );
};
