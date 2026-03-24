import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
  Building2, Package, Bot, LayoutDashboard, Rocket,
  Sun, Moon, Monitor,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DASHBOARD_PRESETS, DashboardPreset } from '@/components/dashboard/DashboardPresetSelector';
import { useTheme } from '@/components/ThemeProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';

const STEPS = [
  { label: 'Welkom', icon: Sparkles, gradient: 'from-primary to-primary/60' },
  { label: 'Bedrijf', icon: Building2, gradient: 'from-blue-500 to-cyan-500' },
  { label: 'TMS', icon: Package, gradient: 'from-emerald-500 to-teal-500' },
  { label: 'AI', icon: Bot, gradient: 'from-violet-500 to-purple-500' },
  { label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-amber-500 to-orange-500' },
  { label: 'Start', icon: Rocket, gradient: 'from-emerald-500 to-green-400' },
];

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingRequired();
  const { company } = useCompany();
  const { setTheme: applyTheme } = useTheme();
  const { reorderWidgets, updatePreference } = useUserPreferences();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

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

      // Save TMS plan
      if (selectedTMSPlanId && companyId) {
        await supabase
          .from('tenant_subscriptions')
          .update({ plan_id: selectedTMSPlanId })
          .eq('tenant_id', companyId);
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

      await queryClient.invalidateQueries({ queryKey: ['onboarding-required'] });
      await queryClient.invalidateQueries({ queryKey: ['user-company'] });

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
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0, filter: 'blur(4px)' }),
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, filter: 'blur(4px)' }),
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
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)',
            filter: 'blur(60px)',
            top: '10%',
            right: '15%',
          }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/[0.03] dark:bg-white/[0.02] backdrop-blur-2xl border-b border-white/[0.06]">
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

      {/* Progress bar */}
      <div className="relative z-10 h-[2px] bg-white/[0.04]">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/50"
          initial={{ width: '0%' }}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.4)' }}
        />
      </div>

      {/* Step pills */}
      <div className="relative z-10 flex justify-center gap-1 sm:gap-2 py-5 px-4 flex-wrap">
        {STEPS.map(({ label, icon: Icon }, i) => {
          const isCompleted = i < step;
          const isActive = i === step;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-500 backdrop-blur-xl',
                isActive && 'bg-white/[0.08] border border-white/[0.12] text-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]',
                isCompleted && 'bg-primary/10 border border-primary/20 text-primary',
                !isActive && !isCompleted && 'bg-white/[0.03] border border-white/[0.06] text-muted-foreground/40',
              )}
            >
              {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-5 sm:px-6 lg:px-8 pb-28 sm:pb-32 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-10 py-8 sm:py-16">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 shadow-2xl shadow-primary/25"
                >
                  <Truck className="h-10 w-10 text-primary-foreground" />
                </motion.div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-light tracking-tight leading-[1.1]">
                    Welkom, <span className="font-semibold">{userName}</span>
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground/70 max-w-md mx-auto leading-relaxed font-light">
                    In een paar stappen richten we je hele TMS in.
                  </p>
                </div>

                <div className="space-y-3 max-w-sm mx-auto">
                  {[
                    { icon: Building2, text: 'Bedrijfsgegevens invullen' },
                    { icon: Package, text: 'Kies je TMS pakket' },
                    { icon: Bot, text: 'Optioneel: AI Co-pilot activeren' },
                    { icon: LayoutDashboard, text: 'Dashboard instellen' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl text-left backdrop-blur-xl bg-white/[0.04] border border-white/[0.07]"
                    >
                      <div className="h-8 w-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-muted-foreground/70" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Company Details */}
            {step === 1 && (
              <div className="max-w-lg mx-auto py-6 sm:py-10 space-y-6">
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20 mb-2"
                  >
                    <Building2 className="h-7 w-7 text-white" />
                  </motion.div>
                  <h2 className="text-2xl sm:text-3xl font-display font-light tracking-tight">
                    Jouw <span className="font-semibold">bedrijf</span>
                  </h2>
                  <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
                    Deze gegevens verschijnen op facturen en documenten
                  </p>
                </div>

                <motion.div
                  variants={fieldStagger}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {[
                    { key: 'name', label: 'Bedrijfsnaam', placeholder: 'Transport BV', span: 2 },
                    { key: 'kvk_number', label: 'KvK-nummer', placeholder: '12345678' },
                    { key: 'vat_number', label: 'BTW-nummer', placeholder: 'NL123456789B01' },
                    { key: 'address', label: 'Adres', placeholder: 'Hoofdweg 1', span: 2 },
                    { key: 'postal_code', label: 'Postcode', placeholder: '1234 AB' },
                    { key: 'city', label: 'Plaats', placeholder: 'Amsterdam' },
                    { key: 'phone', label: 'Telefoon', placeholder: '+31 6 12345678' },
                    { key: 'iban', label: 'IBAN', placeholder: 'NL91ABNA0417164300' },
                  ].map(({ key, label, placeholder, span }) => (
                    <motion.div
                      key={key}
                      variants={fieldItem}
                      className={cn(span === 2 && 'sm:col-span-2')}
                    >
                      <Label className="text-xs text-muted-foreground/70 mb-1.5 block">{label}</Label>
                      <Input
                        value={(companyForm as any)[key]}
                        onChange={(e) => updateCompanyField(key, e.target.value)}
                        placeholder={placeholder}
                        className="bg-white/[0.04] border-white/[0.08] backdrop-blur-xl focus-visible:border-primary/40"
                      />
                    </motion.div>
                  ))}
                </motion.div>

                <p className="text-xs text-muted-foreground/40 text-center">
                  Je kunt dit later altijd aanpassen in Instellingen
                </p>
              </div>
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
              <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-8">
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 mb-2"
                  >
                    <LayoutDashboard className="h-7 w-7 text-white" />
                  </motion.div>
                  <h2 className="text-2xl sm:text-3xl font-display font-light tracking-tight">
                    Jouw <span className="font-semibold">dashboard</span>
                  </h2>
                  <p className="text-sm text-muted-foreground/60">Kies een startlayout en thema</p>
                </div>

                {/* Preset cards */}
                <motion.div
                  variants={fieldStagger}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {selectablePresets.map((preset) => {
                    const isSelected = selectedPreset?.id === preset.id;
                    const PresetIcon = preset.icon;
                    return (
                      <motion.button
                        key={preset.id}
                        variants={fieldItem}
                        onClick={() => setSelectedPreset(preset)}
                        className={cn(
                          'relative p-4 rounded-2xl text-left transition-all duration-200 backdrop-blur-xl border',
                          'hover:scale-[1.02] active:scale-[0.98]',
                          isSelected
                            ? 'bg-primary/[0.08] border-primary/30 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]'
                            : 'bg-white/[0.04] border-white/[0.08] hover:border-white/[0.15]',
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
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>

                {/* Theme toggle */}
                <div className="flex items-center justify-center gap-2">
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
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 backdrop-blur-xl border',
                        'active:scale-[0.97]',
                        theme === value
                          ? 'bg-primary/[0.08] border-primary/30 text-foreground'
                          : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:border-white/[0.15]',
                      )}
                    >
                      <ThemeIcon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div className="text-center space-y-8 py-8 sm:py-12">
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20"
                >
                  <Check className="h-8 w-8 text-emerald-500" />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-display font-light tracking-tight">
                    Alles <span className="font-semibold">klaar</span>
                  </h2>
                  <p className="text-muted-foreground/60 font-light">Hier is een overzicht van je keuzes</p>
                </div>

                <div className="max-w-sm mx-auto space-y-3">
                  {/* Company summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]"
                  >
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">Bedrijf</p>
                      <p className="font-medium mt-0.5">{companyForm.name || 'Niet ingevuld'}</p>
                    </div>
                    {companyForm.name ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Later</span>
                    )}
                  </motion.div>

                  {/* TMS summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]"
                  >
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">TMS Pakket</p>
                      <p className="font-medium capitalize mt-0.5">{selectedTMSSlug || 'Growth'}</p>
                    </div>
                    <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                  </motion.div>

                  {/* AI summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]"
                  >
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">AI Co-pilot</p>
                      <p className="font-medium capitalize mt-0.5">{selectedAISlug || 'Niet geselecteerd'}</p>
                    </div>
                    {selectedAISlug ? (
                      <div className="h-6 w-6 rounded-full bg-violet-500/15 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Optioneel</span>
                    )}
                  </motion.div>

                  {/* Dashboard summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]"
                  >
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">Dashboard</p>
                      <p className="font-medium mt-0.5">{selectedPreset?.name || 'Standaard'}</p>
                    </div>
                    <div className="h-6 w-6 rounded-full bg-amber-500/15 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                  </motion.div>

                  {/* Trial */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 backdrop-blur-xl"
                  >
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      30 dagen gratis trial
                    </p>
                    <p className="text-xs text-emerald-600/50 dark:text-emerald-400/40 mt-1 leading-relaxed">
                      Geen creditcard nodig. Volledige toegang tot alle functies.
                    </p>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 inset-x-0 z-20 backdrop-blur-2xl bg-background/60 border-t border-white/[0.06]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={step === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              'backdrop-blur-xl bg-white/[0.04] border border-white/[0.07]',
              'hover:bg-white/[0.08] active:scale-[0.97]',
              step === 0 && 'opacity-0 pointer-events-none',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Terug
          </button>

          {step === STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
                'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5',
                'active:scale-[0.97]',
                saving && 'opacity-70 pointer-events-none',
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {saving ? 'Bezig...' : 'Start met LogiFlow'}
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
