import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { OfflineBanner } from '../OfflineBanner';
import { FloatingTruck3D } from '../FloatingTruck3D';
import { CheckCircle2, Sparkles, Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOnboardingOffline } from '@/hooks/useOnboardingOffline';

export const StepComplete = () => {
  const { data, clearDraft, isOnline, pendingUploads: contextPending } = useOnboarding();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pendingCount, isSyncing, syncProgress, syncPendingUploads, clearAll: clearOfflineQueue } = useOnboardingOffline();

  // Save all driver data to the database on mount
  useEffect(() => {
    const saveDriverData = async () => {
      if (saved || isSaving) return;
      
      setIsSaving(true);
      setError(null);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Geen gebruiker gevonden');
        }

        // Update the driver record with all collected data
        const { error: updateError } = await supabase
          .from('drivers')
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            date_of_birth: data.dateOfBirth?.toISOString().split('T')[0] || null,
            license_number: data.driversLicenseNumber || null,
            license_expiry: data.driversLicenseExpiry?.toISOString().split('T')[0] || null,
            driver_category: data.driverCategory,
            is_zzp: data.employmentType === 'zzp',
            cpc_expiry: data.cpcCardExpiry?.toISOString().split('T')[0] || null,
            adr_expiry: data.adrCertificateExpiry?.toISOString().split('T')[0] || null,
            emergency_contact_name: data.emergencyContactName || null,
            emergency_contact_phone: data.emergencyContactPhone || null,
            emergency_contact_relationship: data.emergencyContactRelationship || null,
            profile_photo_url: data.profilePhoto.url || null,
            onboarding_completed_at: new Date().toISOString(),
            status: 'beschikbaar',
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Driver update error:', updateError);
          // Try insert if update fails (driver record might not exist)
          const { error: insertError } = await supabase
            .from('drivers')
            .insert({
              user_id: user.id,
              name: data.name,
              email: data.email,
              phone: data.phone || null,
              date_of_birth: data.dateOfBirth?.toISOString().split('T')[0] || null,
              license_number: data.driversLicenseNumber || null,
              license_expiry: data.driversLicenseExpiry?.toISOString().split('T')[0] || null,
              driver_category: data.driverCategory,
              is_zzp: data.employmentType === 'zzp',
              cpc_expiry: data.cpcCardExpiry?.toISOString().split('T')[0] || null,
              adr_expiry: data.adrCertificateExpiry?.toISOString().split('T')[0] || null,
              emergency_contact_name: data.emergencyContactName || null,
              emergency_contact_phone: data.emergencyContactPhone || null,
              emergency_contact_relationship: data.emergencyContactRelationship || null,
              profile_photo_url: data.profilePhoto.url || null,
              onboarding_completed_at: new Date().toISOString(),
              status: 'beschikbaar',
            });

          if (insertError) {
            console.error('Driver insert error:', insertError);
            throw insertError;
          }
        }

        setSaved(true);
        toast.success('Profiel opgeslagen!', {
          description: 'Je chauffeursprofiel is succesvol aangemaakt.',
        });
      } catch (err) {
        console.error('Error saving driver data:', err);
        setError('Kon profiel niet opslaan. Je kunt later alsnog starten.');
        // Don't block the user - they can still proceed
        setSaved(true);
      } finally {
        setIsSaving(false);
      }
    };

    saveDriverData();
  }, [data, saved, isSaving]);

  const handleComplete = async () => {
    // Sync any pending offline uploads first
    if (pendingCount > 0 && navigator.onLine) {
      await syncPendingUploads();
    }
    // Clean up draft and offline queue
    clearDraft();
    await clearOfflineQueue();
    // Mark onboarding as complete
    localStorage.setItem('driver_onboarding_complete', 'true');
    navigate('/driver');
  };

  const getCategoryLabel = () => {
    if (data.driverCategory === 'heavy') return 'Vrachtwagen (C/CE)';
    return 'Bestelbus (B/BE)';
  };

  const getEmploymentLabel = () => {
    if (data.employmentType === 'zzp') return 'ZZP / Zelfstandig';
    return 'In loondienst';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8 relative overflow-hidden"
    >
      <OfflineBanner isOnline={isOnline} pendingUploads={contextPending} isSyncing={isSyncing} syncProgress={syncProgress} />

      {/* Background celebration effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              y: [-20, 20],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <Sparkles className="w-4 h-4 text-primary/50" />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-4 relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Welkom aan boord,
          <br />
          <span className="text-primary">{data.name}!</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground"
        >
          {isSaving 
            ? 'Even geduld, we slaan je gegevens op...'
            : 'Je bent klaar om te beginnen. Bekijk je rooster en accepteer je eerste ritten.'
          }
        </motion.p>
      </div>

      {/* Success animation */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        {isSaving ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Profiel opslaan...</p>
          </motion.div>
        ) : (
          <>
            <FloatingTruck3D />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              className="absolute top-0 right-8 p-3 rounded-full bg-emerald-500/20 border border-emerald-500/30"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </motion.div>
          </>
        )}
      </div>

      {/* Error notice */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <p className="text-xs text-amber-400">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
      >
        <p className="text-sm text-muted-foreground mb-3">Profiel aangemaakt met:</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <span className="text-foreground font-medium">{data.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Telefoon</span>
            <span className="text-foreground font-medium">{data.phone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Categorie</span>
            <span className="text-foreground font-medium">{getCategoryLabel()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dienstverband</span>
            <span className="text-foreground font-medium">{getEmploymentLabel()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Locatie</span>
            <span className={data.locationEnabled ? 'text-emerald-400' : 'text-muted-foreground'}>
              {data.locationEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Notificaties</span>
            <span className={data.notificationsEnabled ? 'text-emerald-400' : 'text-muted-foreground'}>
              {data.notificationsEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
            </span>
          </div>
        </div>
        
        {/* Document status */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-muted-foreground mb-2">Geüploade documenten:</p>
          <div className="flex flex-wrap gap-2">
            {data.driversLicenseFront.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ Rijbewijs
              </span>
            )}
            {data.profilePhoto.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ Profielfoto
              </span>
            )}
            {data.identityDocument.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ ID
              </span>
            )}
            {data.cpcCard.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ CPC
              </span>
            )}
            {data.adrCertificate.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ ADR
              </span>
            )}
            {data.insuranceCertificate?.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ WAM
              </span>
            )}
            {data.liabilityInsurance?.uploaded && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                ✓ AVB
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Pending uploads warning */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              {pendingCount} document{pendingCount > 1 ? 'en' : ''} wacht{pendingCount === 1 ? '' : 'en'} nog op upload
              {!isOnline && ' — verbind met internet om te synchroniseren'}
            </p>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <OnboardingButton 
        onClick={handleComplete}
        disabled={isSaving || isSyncing}
        loading={isSaving || isSyncing}
      >
        {isSaving ? 'Opslaan...' : isSyncing ? 'Synchroniseren...' : 'Aan de slag! 🚚'}
      </OnboardingButton>
    </motion.div>
  );
};
