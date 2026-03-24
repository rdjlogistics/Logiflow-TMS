import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { Bell, BellRing, MessageSquare, Calendar, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StepNotifications = () => {
  const { data, updateData, setCurrentStep, currentStep } = useOnboarding();
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(data.notificationsEnabled);

  const nextStep = currentStep + 1;

  useEffect(() => {
    // Check if notifications are already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setPermissionGranted(true);
      updateData({ notificationsEnabled: true });
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      // Browser doesn't support notifications
      setCurrentStep(nextStep);
      return;
    }

    setIsRequesting(true);

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setPermissionGranted(true);
        updateData({ notificationsEnabled: true });
        
        // Show a test notification
        new Notification('Welkom! 🚚', {
          body: 'Je ontvangt nu meldingen over je ritten.',
          icon: '/favicon.ico',
        });
        
        setTimeout(() => setCurrentStep(nextStep), 500);
      } else {
        updateData({ notificationsEnabled: false });
        setCurrentStep(nextStep);
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      setCurrentStep(nextStep);
    } finally {
      setIsRequesting(false);
    }
  };

  const features = [
    { icon: BellRing, text: 'Nieuwe ritten en wijzigingen' },
    { icon: MessageSquare, text: 'Berichten van de planning' },
    { icon: Calendar, text: 'Herinneringen voor je shifts' },
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
          Blijf Op de Hoogte
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Ontvang meldingen over belangrijke updates. We spammen je niet.
        </motion.p>
      </div>

      {/* Visual - Phone mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative mx-auto mb-8"
      >
        <div className="w-56 h-80 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700 p-4 overflow-hidden shadow-2xl">
          {/* Phone screen content */}
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl p-4 space-y-3">
            {/* Notification preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">Nieuwe Rit</p>
                  <p className="text-xs text-muted-foreground">Amsterdam → Rotterdam</p>
                </div>
              </div>
            </motion.div>

            {/* App icons placeholder */}
            <div className="grid grid-cols-4 gap-2 mt-6">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-xl bg-white/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Success checkmark */}
        {permissionGranted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-3 -right-3 p-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
          </motion.div>
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
            <feature.icon className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Buttons */}
      <div className="space-y-3 mt-8">
        <OnboardingButton
          onClick={requestNotificationPermission}
          loading={isRequesting}
          variant="primary"
        >
          Meldingen Toestaan
        </OnboardingButton>
        <OnboardingButton
          onClick={() => setCurrentStep(nextStep)}
          variant="ghost"
        >
          Overslaan
        </OnboardingButton>
      </div>
    </motion.div>
  );
};
