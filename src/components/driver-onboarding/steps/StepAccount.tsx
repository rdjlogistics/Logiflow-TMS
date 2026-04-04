import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { OnboardingInput } from '../OnboardingInput';
import { useOnboarding } from '../OnboardingContext';
import { OfflineBanner } from '../OfflineBanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';
import { logger } from '@/lib/logger';

export const StepAccount = () => {
  const { data, updateData, setCurrentStep, currentStep, isOnline, pendingUploads } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(data.email);
  const isPasswordValid = data.password.length >= 6;
  const canProceed = isEmailValid && isPasswordValid;

  const handleCreateAccount = async () => {
    setAttempted(true);
    if (!canProceed) return;

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/driver`,
          data: {
            full_name: data.name,
            phone: data.phone,
            date_of_birth: data.dateOfBirth?.toISOString(),
            role: 'driver',
          },
        },
      });

      if (signUpError) {
        logger.error('SignUp error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          setError('Dit e-mailadres is al in gebruik. Probeer in te loggen.');
        } else {
          setError(signUpError.message);
        }
        toast.error('Account aanmaken mislukt', { description: signUpError.message });
        return;
      }

      if (authData.user) {
        try {
          const { ensureProfileAfterSignup } = await import('@/lib/ensureProfileAfterSignup');
          await ensureProfileAfterSignup(authData.user.id, data.email, data.name, { skipAdminRole: true });
        } catch (e) {
          logger.error('[StepAccount] ensureProfileAfterSignup failed:', e);
        }

        const { error: driverError } = await supabase
          .from('drivers')
          .insert({
            user_id: authData.user.id,
            name: data.name,
            email: data.email.trim().toLowerCase(),
            phone: data.phone || null,
            date_of_birth: data.dateOfBirth?.toISOString().split('T')[0] || null,
            license_expiry: data.driversLicenseExpiry?.toISOString().split('T')[0] || null,
            emergency_contact_name: data.emergencyContactName || null,
            emergency_contact_phone: data.emergencyContactPhone || null,
            status: 'beschikbaar',
          });

        if (driverError) {
          logger.error('Driver record creation error:', driverError);
        }

        try {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.access_token) {
            const response = await supabase.functions.invoke('assign-driver-role', {
              headers: { Authorization: `Bearer ${session.session.access_token}` },
            });
            if (response.error) {
              logger.error('assign-driver-role error:', response.error);
            } else {
              logger.log('Driver role assigned successfully:', response.data);
            }
          }
        } catch (roleErr) {
          logger.error('Role assignment failed:', roleErr);
        }

        toast.success('Account aangemaakt!', { description: 'Je account is succesvol aangemaakt.' });
        setTimeout(() => setCurrentStep(currentStep + 1), 100);
      }
    } catch (err) {
      logger.error('Account creation error:', err);
      setError('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <OfflineBanner isOnline={isOnline} pendingUploads={pendingUploads} />

      <div className="mb-8">
        <div className="text-sm text-muted-foreground mb-2 animate-fade-in-up">
          Stap {currentStep + 1} van 15
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' >
          Maak je account aan
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' >
          Zo kun je altijd bij je ritten en rooster.
        </p>
      </div>

      <div className="space-y-8 mb-auto animate-fade-in-up" style={{ animationDelay: '0.3s' >
        <OnboardingInput
          value={data.email}
          onChange={(value) => updateData({ email: value })}
          placeholder="E-mailadres"
          type="email"
          autoFocus
          error={attempted && !isEmailValid ? 'Vul een geldig e-mailadres in' : undefined}
        />
        <OnboardingInput
          value={data.password}
          onChange={(value) => updateData({ password: value })}
          placeholder="Wachtwoord (min. 6 tekens)"
          type="password"
          error={attempted && !isPasswordValid ? 'Wachtwoord moet minimaal 6 tekens zijn' : undefined}
        />

        {error && (
          <p className="text-destructive text-sm animate-fade-in-up">{error}</p>
        )}

        {!isOnline && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in-up">
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              Je hebt internet nodig om je account aan te maken. Je gegevens zijn opgeslagen.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <OnboardingButton onClick={handleCreateAccount} disabled={!canProceed || !isOnline} loading={loading}>
          {loading ? 'Bezig...' : 'Account aanmaken'}
        </OnboardingButton>
        <OnboardingButton onClick={() => setCurrentStep(currentStep - 1)} variant="ghost">
          Terug
        </OnboardingButton>
      </div>
    </div>
  );
};
