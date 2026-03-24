import { useState } from 'react';
import { motion } from 'framer-motion';
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

  // Email validation
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
        toast.error('Account aanmaken mislukt', {
          description: signUpError.message,
        });
        return;
      }

      if (authData.user) {
        // Ensure profile exists (fallback for missing DB trigger)
        try {
          const { ensureProfileAfterSignup } = await import('@/lib/ensureProfileAfterSignup');
          await ensureProfileAfterSignup(authData.user.id, data.email, data.name, { skipAdminRole: true });
        } catch (e) {
          logger.error('[StepAccount] ensureProfileAfterSignup failed:', e);
        }

        // Create driver record linked to the auth user
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
          console.error('Driver record creation error:', driverError);
        }

        // Assign chauffeur role, company link, and tenant_id via edge function
        try {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.access_token) {
            const response = await supabase.functions.invoke('assign-driver-role', {
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
              },
            });
            if (response.error) {
              console.error('assign-driver-role error:', response.error);
            } else {
              console.log('Driver role assigned successfully:', response.data);
            }
          }
        } catch (roleErr) {
          console.error('Role assignment failed:', roleErr);
        }

        toast.success('Account aangemaakt!', {
          description: 'Je account is succesvol aangemaakt.',
        });
        // Move to next step after account creation
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 100);
      }
    } catch (err) {
      console.error('Account creation error:', err);
      setError('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8"
    >
      <OfflineBanner isOnline={isOnline} pendingUploads={pendingUploads} />

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
          Maak je account aan
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Zo kun je altijd bij je ritten en rooster.
        </motion.p>
      </div>

      {/* Inputs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-8 mb-auto"
      >
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
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-sm"
          >
            {error}
          </motion.p>
        )}

        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              Je hebt internet nodig om je account aan te maken. Je gegevens zijn opgeslagen.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Buttons */}
      <div className="space-y-3">
        <OnboardingButton
          onClick={handleCreateAccount}
          disabled={!canProceed || !isOnline}
          loading={loading}
        >
          {loading ? 'Bezig...' : 'Account aanmaken'}
        </OnboardingButton>
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
