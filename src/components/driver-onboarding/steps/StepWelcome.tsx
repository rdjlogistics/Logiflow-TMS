import { FloatingTruck3D } from '../FloatingTruck3D';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { Truck, Route, Clock } from 'lucide-react';

export const StepWelcome = () => {
  const { setCurrentStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-2 animate-fade-in-up">
          Welkom bij de onboarding
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' >
          Chauffeur
          <span className="text-primary"> App</span>
        </h1>
        <p className="text-muted-foreground text-lg animate-fade-in-up" style={{ animationDelay: '0.3s' >
          Je nieuwe partner onderweg
        </p>
      </div>

      <FloatingTruck3D />

      {/* Features */}
      <div className="space-y-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.5s' >
        {[
          { icon: Route, text: 'Bekijk je routes in realtime' },
          { icon: Clock, text: 'Check je rooster onderweg' },
          { icon: Truck, text: 'Beheer al je ritten op één plek' },
        ].map((feature, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 animate-fade-in-up"
            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
          >
            <div className="p-2 rounded-lg bg-primary/20">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-foreground font-medium">{feature.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <OnboardingButton onClick={() => setCurrentStep(1)} />
      </div>
    </div>
  );
};
