import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const saveDriverData = async () => {
      if (saved || isSaving) return;
      setIsSaving(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Geen gebruiker gevonden');

        const { error: updateError } = await supabase.from('drivers').update({
          name: data.name, email: data.email, phone: data.phone || null,
          date_of_birth: data.dateOfBirth?.toISOString().split('T')[0] || null,
          license_number: data.driversLicenseNumber || null,
          license_expiry: data.driversLicenseExpiry?.toISOString().split('T')[0] || null,
          driver_category: data.driverCategory, is_zzp: data.employmentType === 'zzp',
          cpc_expiry: data.cpcCardExpiry?.toISOString().split('T')[0] || null,
          adr_expiry: data.adrCertificateExpiry?.toISOString().split('T')[0] || null,
          emergency_contact_name: data.emergencyContactName || null,
          emergency_contact_phone: data.emergencyContactPhone || null,
          emergency_contact_relationship: data.emergencyContactRelationship || null,
          profile_photo_url: data.profilePhoto.url || null,
          onboarding_completed_at: new Date().toISOString(), status: 'beschikbaar',
        }).eq('user_id', user.id);

        if (updateError) {
          console.error('Driver update error:', updateError);
          const { error: insertError } = await supabase.from('drivers').insert({
            user_id: user.id, name: data.name, email: data.email, phone: data.phone || null,
            date_of_birth: data.dateOfBirth?.toISOString().split('T')[0] || null,
            license_number: data.driversLicenseNumber || null,
            license_expiry: data.driversLicenseExpiry?.toISOString().split('T')[0] || null,
            driver_category: data.driverCategory, is_zzp: data.employmentType === 'zzp',
            cpc_expiry: data.cpcCardExpiry?.toISOString().split('T')[0] || null,
            adr_expiry: data.adrCertificateExpiry?.toISOString().split('T')[0] || null,
            emergency_contact_name: data.emergencyContactName || null,
            emergency_contact_phone: data.emergencyContactPhone || null,
            emergency_contact_relationship: data.emergencyContactRelationship || null,
            profile_photo_url: data.profilePhoto.url || null,
            onboarding_completed_at: new Date().toISOString(), status: 'beschikbaar',
          });
          if (insertError) { console.error('Driver insert error:', insertError); throw insertError; }
        }

        setSaved(true);
        toast.success('Profiel opgeslagen!', { description: 'Je chauffeursprofiel is succesvol aangemaakt.' });
      } catch (err) {
        console.error('Error saving driver data:', err);
        setError('Kon profiel niet opslaan. Je kunt later alsnog starten.');
        setSaved(true);
      } finally {
        setIsSaving(false);
      }
    };
    saveDriverData();
  }, [data, saved, isSaving]);

  const handleComplete = async () => {
    if (pendingCount > 0 && navigator.onLine) await syncPendingUploads();
    clearDraft();
    await clearOfflineQueue();
    localStorage.setItem('driver_onboarding_complete', 'true');
    navigate('/driver');
  };

  const getCategoryLabel = () => data.driverCategory === 'heavy' ? 'Vrachtwagen (C/CE)' : 'Bestelbus (B/BE)';
  const getEmploymentLabel = () => data.employmentType === 'zzp' ? 'ZZP / Zelfstandig' : 'In loondienst';

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 relative overflow-hidden animate-fade-in">
      <OfflineBanner isOnline={isOnline} pendingUploads={contextPending} isSyncing={isSyncing} syncProgress={syncProgress} />

      {/* Background celebration effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            <Sparkles className="w-4 h-4 text-primary/50" />
          </div>
        ))}
      </div>

      <div className="mb-4 relative z-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Welkom aan boord,<br /><span className="text-primary">{data.name}!</span>
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {isSaving ? 'Even geduld, we slaan je gegevens op...' : 'Je bent klaar om te beginnen. Bekijk je rooster en accepteer je eerste ritten.'}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        {isSaving ? (
          <div className="flex flex-col items-center animate-fade-in">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Profiel opslaan...</p>
          </div>
        ) : (
          <>
            <FloatingTruck3D />
            <div className="absolute top-0 right-8 p-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-scale-fade-in" style={{ animationDelay: '0.5s' }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <p className="text-xs text-amber-400">{error}</p>
          </div>
        </div>
      )}

      <div className="mb-8 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <p className="text-sm text-muted-foreground mb-3">Profiel aangemaakt met:</p>
        <div className="space-y-2">
          {[
            ['E-mail', data.email],
            ['Telefoon', data.phone],
            ['Categorie', getCategoryLabel()],
            ['Dienstverband', getEmploymentLabel()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
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
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-muted-foreground mb-2">Geüploade documenten:</p>
          <div className="flex flex-wrap gap-2">
            {data.driversLicenseFront.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ Rijbewijs</span>}
            {data.profilePhoto.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ Profielfoto</span>}
            {data.identityDocument.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ ID</span>}
            {data.cpcCard.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ CPC</span>}
            {data.adrCertificate.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ ADR</span>}
            {data.insuranceCertificate?.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ WAM</span>}
            {data.liabilityInsurance?.uploaded && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ AVB</span>}
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              {pendingCount} document{pendingCount > 1 ? 'en' : ''} wacht{pendingCount === 1 ? '' : 'en'} nog op upload
              {!isOnline && ' — verbind met internet om te synchroniseren'}
            </p>
          </div>
        </div>
      )}

      <OnboardingButton onClick={handleComplete} disabled={isSaving || isSyncing} loading={isSaving || isSyncing}>
        {isSaving ? 'Opslaan...' : isSyncing ? 'Synchroniseren...' : 'Aan de slag! 🚚'}
      </OnboardingButton>
    </div>
  );
};
