import { useState } from 'react';
import { motion } from 'framer-motion';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { MapPin, Navigation, Route, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StepLocation = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(data.locationEnabled);

  const nextStep = currentStep + 1;

  const requestLocationPermission = async () => {
    setIsRequesting(true);

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      if (result.state === 'granted') {
        setPermissionGranted(true);
        updateData({ locationEnabled: true });
        setTimeout(() => setCurrentStep(nextStep), 500);
      } else if (result.state === 'prompt') {
        // Trigger the actual permission request
        navigator.geolocation.getCurrentPosition(
          () => {
            setPermissionGranted(true);
            updateData({ locationEnabled: true });
            setTimeout(() => setCurrentStep(nextStep), 500);
          },
          () => {
            // User denied - still continue but without location
            updateData({ locationEnabled: false });
            setCurrentStep(nextStep);
          }
        );
      } else {
        // Permission denied previously
        updateData({ locationEnabled: false });
        setCurrentStep(nextStep);
      }
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionGranted(true);
          updateData({ locationEnabled: true });
          setTimeout(() => setCurrentStep(nextStep), 500);
        },
        () => {
          updateData({ locationEnabled: false });
          setCurrentStep(nextStep);
        }
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const features = [
    { icon: Navigation, text: 'Real-time navigatie naar laad- en losadressen' },
    { icon: Route, text: 'Automatische route-optimalisatie' },
    { icon: MapPin, text: 'Live tracking voor klanten' },
  ];

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
          Locatie Delen
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          We hebben je locatie nodig voor de beste route-planning.
        </motion.p>
      </div>

      {/* Visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative mx-auto mb-8"
      >
        <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/20 flex items-center justify-center">
          <motion.div
            animate={permissionGranted ? { scale: [1, 1.1, 1] } : { y: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {permissionGranted ? (
              <CheckCircle2 className="w-20 h-20 text-emerald-400" />
            ) : (
              <MapPin className="w-20 h-20 text-cyan-400" />
            )}
          </motion.div>
        </div>

        {/* Pulse rings */}
        {!permissionGranted && (
          <>
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-cyan-400/30"
              animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-cyan-400/30"
              animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 mb-auto"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl',
              'bg-white/5 backdrop-blur-sm border border-white/10'
            )}
          >
            <feature.icon className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-foreground">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Buttons */}
      <div className="space-y-3">
        <OnboardingButton
          onClick={requestLocationPermission}
          loading={isRequesting}
          variant="primary"
        >
          Locatie Toestaan
        </OnboardingButton>
        <OnboardingButton
          onClick={() => setCurrentStep(nextStep)}
          variant="ghost"
        >
          Later instellen
        </OnboardingButton>
      </div>
    </motion.div>
  );
};
