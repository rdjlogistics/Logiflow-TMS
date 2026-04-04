import { useState, useEffect } from 'react';
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
    if ('Notification' in window && Notification.permission === 'granted') {
      setPermissionGranted(true);
      updateData({ notificationsEnabled: true });
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) { setCurrentStep(nextStep); return; }

    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPermissionGranted(true);
        updateData({ notificationsEnabled: true });
        new Notification('Welkom! 🚚', { body: 'Je ontvangt nu meldingen over je ritten.', icon: '/favicon.ico' });
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
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="text-sm text-muted-foreground mb-2 animate-fade-in-up">
          Stap {currentStep + 1} van 15
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Blijf Op de Hoogte
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Ontvang meldingen over belangrijke updates. We spammen je niet.
        </p>
      </div>

      <div className="relative mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="w-56 h-80 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700 p-4 overflow-hidden shadow-2xl">
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl p-4 space-y-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">Nieuwe Rit</p>
                  <p className="text-xs text-muted-foreground">Amsterdam → Rotterdam</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/5 animate-fade-in" style={{ animationDelay: `${0.7 + i * 0.05}s` }} />
              ))}
            </div>
          </div>
        </div>

        {permissionGranted && (
          <div className="absolute -bottom-3 -right-3 p-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 animate-scale-fade-in">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      <div className="space-y-3 mb-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl animate-fade-in-up',
              'bg-white/5 backdrop-blur-sm border border-white/10'
            )}
            style={{ animationDelay: `${0.5 + index * 0.1}s` }}
          >
            <feature.icon className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">{feature.text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 mt-8">
        <OnboardingButton onClick={requestNotificationPermission} loading={isRequesting} variant="primary">
          Meldingen Toestaan
        </OnboardingButton>
        <OnboardingButton onClick={() => setCurrentStep(nextStep)} variant="ghost">
          Overslaan
        </OnboardingButton>
      </div>
    </div>
  );
};
