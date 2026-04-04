import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from '@/components/driver-onboarding/OnboardingContext';
import { StepWelcome } from '@/components/driver-onboarding/steps/StepWelcome';
import { StepName } from '@/components/driver-onboarding/steps/StepName';
import { StepPhone } from '@/components/driver-onboarding/steps/StepPhone';
import { StepBirthDate } from '@/components/driver-onboarding/steps/StepBirthDate';
import { StepAccount } from '@/components/driver-onboarding/steps/StepAccount';
import { StepProfilePhoto } from '@/components/driver-onboarding/steps/StepProfilePhoto';
import { StepDriverCategory } from '@/components/driver-onboarding/steps/StepDriverCategory';
import { StepEmploymentType } from '@/components/driver-onboarding/steps/StepEmploymentType';
import { StepDriversLicense } from '@/components/driver-onboarding/steps/StepDriversLicense';
import { StepDocuments } from '@/components/driver-onboarding/steps/StepDocuments';
import { StepVehiclePreference } from '@/components/driver-onboarding/steps/StepVehiclePreference';
import { StepEmergencyContact } from '@/components/driver-onboarding/steps/StepEmergencyContact';
import { StepLocation } from '@/components/driver-onboarding/steps/StepLocation';
import { StepNotifications } from '@/components/driver-onboarding/steps/StepNotifications';
import { StepComplete } from '@/components/driver-onboarding/steps/StepComplete';

const OnboardingFlow = () => {
  const { currentStep, setCurrentStep, hasDraft, clearDraft } = useOnboarding();
  const navigate = useNavigate();
  const hasCheckedRef = useRef(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    const isComplete = localStorage.getItem('driver_onboarding_complete');
    if (isComplete === 'true') {
      navigate('/driver', { replace: true });
      return;
    }

    // Show draft restore dialog if there's a saved draft and user is past step 0
    if (hasDraft && currentStep > 0) {
      setShowDraftDialog(true);
    }
  }, [navigate, hasDraft, currentStep]);

  const handleResumeDraft = () => {
    setShowDraftDialog(false);
    // currentStep is already restored from localStorage
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setCurrentStep(0);
    setShowDraftDialog(false);
    // Reload to reset state
    window.location.reload();
  };

  const steps = [
    <StepWelcome key="welcome" />,
    <StepName key="name" />,
    <StepPhone key="phone" />,
    <StepBirthDate key="birthdate" />,
    <StepAccount key="account" />,
    <StepProfilePhoto key="profilephoto" />,
    <StepDriverCategory key="drivercategory" />,
    <StepEmploymentType key="employmenttype" />,
    <StepDriversLicense key="driverslicense" />,
    <StepDocuments key="documents" />,
    <StepVehiclePreference key="vehiclepref" />,
    <StepEmergencyContact key="emergencycontact" />,
    <StepLocation key="location" />,
    <StepNotifications key="notifications" />,
    <StepComplete key="complete" />,
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Draft restore dialog */}
        {showDraftDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div
              className="w-full max-w-sm p-6 rounded-2xl bg-card border border-border shadow-xl"
            >
              <h2 className="text-xl font-bold text-foreground mb-2">
                Verder waar je gebleven was?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Je hebt eerder gegevens ingevuld. Wil je verdergaan of opnieuw beginnen?
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleResumeDraft}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Verdergaan (stap {currentStep + 1})
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="w-full py-3 px-4 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                >
                  Opnieuw beginnen
                </button>
              </div>
            </div>
          </div>
        )}
        {steps[currentStep]}
    </div>
  );
};

const DriverOnboarding = () => {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
};

export default DriverOnboarding;
