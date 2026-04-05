import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, ArrowRight, ArrowLeft, Check, Sparkles,
  Building2, Package, Bot, LayoutDashboard, Rocket,
  Sun, Moon, Monitor, Palette, Apple, Cpu, Leaf, Flame, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingRequired } from '@/hooks/useOnboardingRequired';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { TMSPlanSelector } from '@/components/onboarding/TMSPlanSelector';
import { AIPlanSelector } from '@/components/onboarding/AIPlanSelector';
import { DASHBOARD_PRESETS, DashboardPreset } from '@/components/dashboard/DashboardPresetSelector';
import { useTheme } from '@/components/ThemeProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { CinematicIntro } from '@/components/onboarding/CinematicIntro';
import { CompanyVerificationStep } from '@/components/onboarding/CompanyVerificationStep';
import { LaunchSequence } from '@/components/onboarding/LaunchSequence';

const STEPS = [
  { label: 'Welkom', icon: Sparkles, gradient: 'from-primary to-primary/60' },
  { label: 'Bedrijf', icon: Building2, gradient: 'from-blue-500 to-cyan-500' },
  { label: 'TMS', icon: Package, gradient: 'from-emerald-500 to-teal-500' },
  { label: 'AI', icon: Bot, gradient: 'from-violet-500 to-purple-500' },
  { label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-amber-500 to-orange-500' },
  { label: 'Thema', icon: Palette, gradient: 'from-pink-500 to-rose-500' },
  { label: 'Start', icon: Rocket, gradient: 'from-emerald-500 to-green-400' },
];

const THEME_PRESETS = [
  { id: 'ios' as const, name: 'Apple iOS', description: 'Strak, minimalistisch en native — zoals je iPhone.', icon: Apple, color: 'text-gray-100', bg: 'bg-gradient-to-br from-gray-800 to-gray-900' },
  { id: 'vision-pro' as const, name: 'Vision Pro', description: 'Ruimtelijk glasmorfisme met 3D diepte-effecten.', icon: Eye, color: 'text-violet-400', bg: 'bg-gradient-to-br from-violet-900/60 to-indigo-900/60' },
  { id: 'imperial' as const, name: 'Imperial', description: 'Klassiek donker thema met krachtige accenten.', icon: Cpu, color: 'text-primary', bg: 'bg-gradient-to-br from-primary/20 to-primary/10' },
  { id: 'horizon' as const, name: 'Horizon', description: 'Warme zonsondergang tinten met zachte gradients.', icon: Flame, color: 'text-orange-400', bg: 'bg-gradient-to-br from-orange-900/40 to-amber-900/40' },
  { id: 'aurora' as const, name: 'Aurora', description: 'Noorderlicht-geïnspireerd met levendige kleuren.', icon: Leaf, color: 'text-emerald-400', bg: 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40' },
  { id: 'carbon' as const, name: 'Carbon', description: 'Industrieel en zakelijk — puur functioneel design.', icon: Cpu, color: 'text-zinc-400', bg: 'bg-gradient-to-br from-zinc-800 to-zinc-900' },
] as const;

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingRequired();
  const { company } = useCompany();
  const { setTheme: applyTheme, setThemePreset: applyPreset, themePreset: currentPreset } = useTheme();
  const { reorderWidgets, updatePreference } = useUserPreferences();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const completedRef = useRef(false);

  // Plan selections
  const [selectedTMSPlanId, setSelectedTMSPlanId] = useState<string | null>(null);
  const [selectedTMSSlug, setSelectedTMSSlug] = useState<string | null>(null);
  const [selectedAIPlanId, setSelectedAIPlanId] = useState<string | null>(null);
  const [selectedAISlug, setSelectedAISlug] = useState<string | null>(null);

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '', kvk_number: '', vat_number: '',
    address: '', postal_code: '', city: '',
    phone: '', iban: '',
  });

  // Dashboard preferences
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'daar';

  // Prefill company form
  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: (company as any).name || '',
        kvk_number: (company as any).kvk_number || '',
        vat_number: (company as any).vat_number || '',
        address: (company as any).address || '',
        postal_code: (company as any).postal_code || '',
        city: (company as any).city || '',
        phone: (company as any).phone || '',
        iban: (company as any).iban || '',
      });
    }
  }, [company]);

  useEffect(() => {
    if (completedRef.current) return;
    if (!onboardingLoading && !needsOnboarding) {
      navigate('/', { replace: true });
    }
  }, [onboardingLoading, needsOnboarding, navigate]);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const canProceed = () => {
    if (step === 2) return !!selectedTMSPlanId;
    return true;
  };

  const updateCompanyField = (field: string, value: string) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      const { data: companyRow } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user!.id)
        .eq('is_primary', true)
        .single();

      const companyId = companyRow?.company_id;

      // Save company details
      if (companyId) {
        const updates: Record<string, string | undefined> = {};
        Object.entries(companyForm).forEach(([k, v]) => {
          if (v.trim()) updates[k] = v.trim();
        });
        if (Object.keys(updates).length > 0) {
          await supabase.from('companies').update(updates).eq('id', companyId);
        }
      }

      // Save TMS plan — upsert to handle cases where ensure-user-company already created a record
      if (selectedTMSPlanId && companyId) {
        const trialEndTMS = new Date();
        trialEndTMS.setDate(trialEndTMS.getDate() + 14);

        await supabase.from('tenant_subscriptions').upsert(
          {
            tenant_id: companyId,
            plan_id: selectedTMSPlanId,
            status: 'trial',
            billing_cycle: 'monthly',
            current_period_start: new Date().toISOString(),
            current_period_end: trialEndTMS.toISOString(),
            trial_ends_at: trialEndTMS.toISOString(),
          },
          { onConflict: 'tenant_id' }
        );
      }

      // Save AI plan
      if (selectedAIPlanId && companyId) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);

        const { data: aiPlan } = await supabase
          .from('ai_plans')
          .select('credits_included')
          .eq('id', selectedAIPlanId)
          .single();

        await supabase.from('ai_tenant_subscriptions').upsert(
          {
            tenant_id: companyId,
            plan_id: selectedAIPlanId,
            status: 'trial',
            credits_remaining: aiPlan?.credits_included ?? 500,
            credits_used_this_cycle: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: trialEnd.toISOString(),
            trial_ends_at: trialEnd.toISOString(),
          },
          { onConflict: 'tenant_id' }
        );
      }

      // Apply dashboard preset
      if (selectedPreset) {
        reorderWidgets(selectedPreset.widgets);
      }
      applyTheme(theme);
      updatePreference('theme', theme as any);

      // Mark onboarding complete in tenant_settings
      if (companyId) {
        await supabase
          .from('tenant_settings')
          .update({ onboarding_completed_at: new Date().toISOString() } as Record<string, unknown>)
          .eq('company_id', companyId);
      }

      // Mark profile onboarding complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('user_id', user!.id);

      // Set all localStorage keys to prevent any legacy wizard from showing
      localStorage.setItem('tms-dashboard-setup-complete', 'true');
      localStorage.setItem('logiflow-onboarding-v2-done', 'true');
      localStorage.setItem('tour-dashboard', 'true');

      toast({
        title: 'Welkom bij LogiFlow! 🚀',
        description: 'Je account is volledig ingesteld. Veel succes met je trial.',
      });

      completedRef.current = true;

      await queryClient.invalidateQueries({ queryKey: ['onboarding-required'] });
      await queryClient.invalidateQueries({ queryKey: ['user-company'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Onboarding error:', err);
      toast({
        title: 'Er ging iets mis',
        description: 'Probeer het opnieuw.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [saving, selectedTMSPlanId, selectedAIPlanId, user, navigate, toast, companyForm, selectedPreset, theme, applyTheme, reorderWidgets, updatePreference, queryClient]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const fieldStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  };
  const fieldItem = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  };

  const selectablePresets = DASHBOARD_PRESETS.filter(p => !p.isCustom);

  // Hide bottom nav on step 0 (cinematic intro) and step 5 (launch has its own CTA)
  const showBottomNav = step > 0 && step < STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 80% 60% at 20% 40%, hsl(var(--primary) / 0.06) 0%, transparent 60%)',
              'radial-gradient(ellipse 60% 80% at 80% 70%, hsl(var(--accent) / 0.04) 0%, transparent 50%)',
              'radial-gradient(ellipse 50% 50% at 50% 20%, hsl(var(--primary) / 0.03) 0%, transparent 40%)',
            ].join(', '),
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)',
            filter: 'blur(60px)',
            top: '10%',
            right: '15%',
          }}
        />
      </div>

      {/* Header — hidden during cinematic intro */}
        {step > 0 && (
          <header
            className="relative z-10 bg-white/[0.03] dark:bg-white/[0.02] backdrop-blur-2xl border-b border-white/[0.06]"
          >
            <div className="max-w-5xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Truck className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-semibold tracking-tight">LogiFlow</span>
              </div>
              <span className="text-xs text-muted-foreground/60 tabular-nums">
                {step + 1} / {STEPS.length}
              </span>
            </div>
          </header>
        )}
      {/* Progress bar — hidden during cinematic intro */}
      {step > 0 && (
        <div className="relative z-10 h-[2px] bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/50"
            style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.4)' }}
          />
        </div>
      )}

      {/* Step pills — hidden during cinematic intro */}
      {step > 0 && (
        <div className="relative z-10 flex justify-center gap-1 sm:gap-2 py-5 px-4 flex-wrap">
          {STEPS.map(({ label, icon: Icon }, i) => {
            const isCompleted = i < step;
            const isActive = i === step;
            return (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-500 backdrop-blur-xl',
                  isActive && 'bg-white/[0.08] border border-white/[0.12] text-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]',
                  isCompleted && 'bg-primary/10 border border-primary/20 text-primary',
                  !isActive && !isCompleted && 'bg-white/[0.03] border border-white/[0.06] text-muted-foreground/40',
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "relative z-10 flex-1 max-w-5xl mx-auto w-full px-5 sm:px-6 lg:px-8 overflow-y-auto",
        step === 0 ? "flex items-center justify-center" : "pb-28 sm:pb-32",
      )}>
          <div
            key={step}
            className="w-full"
          >
            {/* Step 0: Cinematic Intro */}
            {step === 0 && (
              <CinematicIntro userName={userName} onContinue={goNext} />
            )}

            {/* Step 1: Company Verification with real validation */}
            {step === 1 && (
              <CompanyVerificationStep
                companyForm={companyForm}
                onUpdate={updateCompanyField}
              />
            )}

            {/* Step 2: TMS Plan */}
            {step === 2 && (
              <TMSPlanSelector
                selectedPlanId={selectedTMSPlanId}
                onSelect={(id, slug) => {
                  setSelectedTMSPlanId(id);
                  setSelectedTMSSlug(slug);
                }}
              />
            )}

            {/* Step 3: AI Co-pilot */}
            {step === 3 && (
              <AIPlanSelector
                selectedPlanId={selectedAIPlanId}
                onSelect={(id, slug) => {
                  setSelectedAIPlanId(id);
                  setSelectedAISlug(slug);
                  if (id === null) goNext();
                }}
              />
            )}

            {/* Step 4: Dashboard Setup */}
            {step === 4 && (
              <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
                {/* Apple-style header */}
                <div className="text-center space-y-3">
                  <p
                    className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium"
                  >
                    Stap 5 van 6
                  </p>

                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20"
                  >
                    <LayoutDashboard className="h-7 w-7 text-white" />
                  </div>

                  <h2
                    className="text-2xl sm:text-3xl font-display font-light tracking-tight"
                  >
                    Jouw <span className="font-semibold">dashboard</span>
                  </h2>
                  <p
                    className="text-sm text-muted-foreground/50 font-light"
                  >
                    Kies een startlayout en thema
                  </p>
                </div>

                {/* Preset cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectablePresets.map((preset, index) => {
                    const isSelected = selectedPreset?.id === preset.id;
                    const PresetIcon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset)}
                        style={{ perspective: 800, transformStyle: 'preserve-3d' }}
                        className={cn(
                          'relative p-4 rounded-2xl text-left transition-all duration-300 backdrop-blur-xl border',
                          'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
                          isSelected
                            ? 'bg-primary/[0.08] border-primary/30 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]'
                            : 'bg-white/[0.04] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05]',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', preset.bg)}>
                            <PresetIcon className={cn('h-5 w-5', preset.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{preset.name}</span>
                              {preset.recommended && (
                                <span className="text-[9px] uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                                  Aanbevolen
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-2">{preset.description}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Glassmorphism theme toggle */}
                <div
                  className="flex items-center justify-center"
                >
                  <div className="relative inline-flex items-center gap-0 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-1">
                    {([
                      { value: 'light' as const, icon: Sun, label: 'Licht' },
                      { value: 'dark' as const, icon: Moon, label: 'Donker' },
                      { value: 'system' as const, icon: Monitor, label: 'Systeem' },
                    ]).map(({ value, icon: ThemeIcon, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setTheme(value);
                          applyTheme(value);
                        }}
                        className={cn(
                          'relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300',
                          'active:scale-[0.97]',
                          theme === value
                            ? 'text-foreground'
                            : 'text-muted-foreground/50 hover:text-muted-foreground/70',
                        )}
                      >
                        <ThemeIcon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                    {/* Sliding indicator */}
                    <div
                      className="absolute top-1 bottom-1 rounded-xl bg-white/[0.08] border border-white/[0.1]"
                      style={{
                        width: 'calc(33.333% - 2px)',
                        left: `calc(${['light', 'dark', 'system'].indexOf(theme) * 33.333}% + 4px)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Launch Sequence */}
            {step === 5 && (
              <LaunchSequence
                companyName={companyForm.name}
                tmsPlan={selectedTMSSlug}
                aiPlan={selectedAISlug}
                dashboardPreset={selectedPreset?.name || null}
                saving={saving}
                onLaunch={handleComplete}
              />
            )}
          </div>
      </div>

      {/* Bottom navigation — hidden during cinematic intro and launch */}
        {showBottomNav && (
          <div
            className="fixed bottom-0 inset-x-0 z-20 backdrop-blur-2xl bg-background/60 border-t border-white/[0.06]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="max-w-5xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
              <button
                onClick={goBack}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  'backdrop-blur-xl bg-white/[0.04] border border-white/[0.07]',
                  'hover:bg-white/[0.08] active:scale-[0.97]',
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Terug
              </button>

              <button
                onClick={goNext}
                disabled={!canProceed()}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  'bg-white/[0.06] border border-white/[0.1] backdrop-blur-xl',
                  'hover:bg-white/[0.1] active:scale-[0.97]',
                  !canProceed() && 'opacity-40 pointer-events-none',
                )}
              >
                {step === 1 ? 'Opslaan & door' : 'Volgende'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default OnboardingWizard;
