import { useState } from 'react';
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
        navigator.geolocation.getCurrentPosition(
          () => { setPermissionGranted(true); updateData({ locationEnabled: true }); setTimeout(() => setCurrentStep(nextStep), 500); },
          () => { updateData({ locationEnabled: false }); setCurrentStep(nextStep); }
        );
      } else {
        updateData({ locationEnabled: false });
        setCurrentStep(nextStep);
      }
    } catch {
      navigator.geolocation.getCurrentPosition(
        () => { setPermissionGranted(true); updateData({ locationEnabled: true }); setTimeout(() => setCurrentStep(nextStep), 500); },
        () => { updateData({ locationEnabled: false }); setCurrentStep(nextStep); }
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
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <div className="mb-8">
        <div className="text-sm text-muted-foreground mb-2 animate-fade-in-up">
          Stap {currentStep + 1} van 15
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Locatie Delen
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          We hebben je locatie nodig voor de beste route-planning.
        </p>
      </div>

      <div className="relative mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/20 flex items-center justify-center">
          <div className={permissionGranted ? "animate-pulse" : "animate-bounce"}>
            {permissionGranted ? (
              <CheckCircle2 className="w-20 h-20 text-emerald-400" />
            ) : (
              <MapPin className="w-20 h-20 text-cyan-400" />
            )}
          </div>
        </div>

        {!permissionGranted && (
          <>
            <div className="absolute inset-0 rounded-3xl border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '2s' }} />
          </>
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
            <feature.icon className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-foreground">{feature.text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <OnboardingButton onClick={requestLocationPermission} loading={isRequesting} variant="primary">
          Locatie Toestaan
        </OnboardingButton>
        <OnboardingButton onClick={() => setCurrentStep(nextStep)} variant="ghost">
          Later instellen
        </OnboardingButton>
      </div>
    </div>
  );
};
