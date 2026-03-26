import { motion } from 'framer-motion';
import { Check, Zap, Brain, Infinity, Bot, TrendingUp, Mail, Truck, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AIPlan {
  id: string;
  slug: string;
  name: string;
  credits_included: number;
  price_monthly_eur: number;
  model_access: string[];
  features_json: Record<string, any>;
}

const AI_PLAN_META: Record<string, {
  gradient: string;
  audience: string;
  tagline: string;
  icon: typeof Sparkles;
  features: { icon: typeof Bot; label: string }[];
}> = {
  starter: {
    gradient: 'from-sky-400 to-blue-500',
    audience: 'ZZP\'ers & startende transporteurs',
    tagline: 'De basis AI tools voor slimmer werken',
    icon: Zap,
    features: [
      { icon: Bot, label: 'AI Chat Assistent' },
      { icon: Mail, label: 'Email Generatie' },
      { icon: Truck, label: 'Order Uitleg' },
    ],
  },
  pro: {
    gradient: 'from-violet-500 to-purple-600',
    audience: 'Serieuze transportbedrijven met 5+ voertuigen',
    tagline: 'Geavanceerde AI voor groeiende bedrijven',
    icon: Brain,
    features: [
      { icon: Bot, label: 'Smart Order Entry' },
      { icon: TrendingUp, label: 'Marge Analyse' },
      { icon: BarChart3, label: 'Cashflow Forecast' },
      { icon: Truck, label: 'Auto-Dispatch' },
      { icon: Mail, label: 'Email Generatie' },
    ],
  },
  enterprise: {
    gradient: 'from-amber-500 to-orange-600',
    audience: 'Marktleiders met complexe operaties',
    tagline: 'Onbeperkte AI kracht voor marktleiders',
    icon: Infinity,
    features: [
      { icon: Bot, label: 'Alle AI Tools' },
      { icon: Brain, label: 'Alle AI Modellen' },
      { icon: TrendingUp, label: 'Custom AI Workflows' },
      { icon: BarChart3, label: 'API Toegang' },
      { icon: Sparkles, label: 'Priority Support' },
    ],
  },
};

interface AIPlanSelectorProps {
  selectedPlanId: string | null;
  onSelect: (planId: string | null, slug: string | null) => void;
  showSkip?: boolean;
}

export const AIPlanSelector = ({ selectedPlanId, onSelect, showSkip = true }: AIPlanSelectorProps) => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['onboarding-ai-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_plans')
        .select('id, slug, name, credits_included, price_monthly_eur, model_access, features_json')
        .eq('is_active', true)
        .order('price_monthly_eur');
      if (error) throw error;
      return (data ?? []) as AIPlan[];
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-6 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Apple-style header */}
      <div className="text-center space-y-3">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium"
        >
          Stap 4 van 6 · Optioneel
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/20"
        >
          <Sparkles className="h-7 w-7 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-2xl sm:text-3xl font-display font-light tracking-tight"
        >
          Supercharge je operaties met{' '}
          <span className="font-semibold">AI</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground/50 max-w-md mx-auto font-light"
        >
          Voeg intelligente automatisering toe aan je TMS
        </motion.p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans?.map((plan, index) => {
          const meta = AI_PLAN_META[plan.slug];
          if (!meta) return null;
          const Icon = meta.icon;
          const isSelected = selectedPlanId === plan.id;
          const isPopular = plan.slug === 'pro';

          return (
            <motion.button
              key={plan.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, scale: 1.01, rotateY: 2, rotateX: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(plan.id, plan.slug)}
              style={{ perspective: 800, transformStyle: 'preserve-3d' }}
              className={cn(
                'relative text-left rounded-2xl p-5 transition-all duration-300',
                'backdrop-blur-2xl bg-white/[0.03] border',
                'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
                isSelected
                  ? 'border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_30px_-5px_hsl(var(--primary)/0.25)]'
                  : 'border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.05]',
              )}
            >
              {/* Subtle corner glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
                style={{
                  background: `radial-gradient(circle at 100% 0%, hsl(var(--primary) / 0.15), transparent 70%)`,
                }}
              />

              {isPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md bg-white/[0.08] border border-white/[0.12] text-foreground/70">
                    Meest gekozen
                  </span>
                </div>
              )}

              {/* Selection ring with pulse */}
              <div className={cn(
                'absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10',
                isSelected
                  ? 'border-primary bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
                  : 'border-white/[0.12]'
              )}>
                {isSelected && (
                  <>
                    <Check className="h-3 w-3 text-primary-foreground" />
                    <motion.div
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 rounded-full border-2 border-primary"
                    />
                  </>
                )}
              </div>

              <div className="relative z-10 space-y-4">
                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg',
                    meta.gradient
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-[10px] text-muted-foreground/40">{meta.audience}</p>
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-xs text-muted-foreground/50 font-light">{meta.tagline}</p>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums">€{plan.price_monthly_eur}</span>
                  <span className="text-xs text-muted-foreground/30 font-light">/ maand</span>
                </div>

                {/* Credits */}
                <p className="text-[11px] text-muted-foreground/40">
                  {plan.credits_included >= 99999
                    ? 'Onbeperkte credits'
                    : `${plan.credits_included.toLocaleString('nl-NL')} credits per maand`}
                </p>

                {/* Features */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                  {meta.features.map(f => {
                    const FeatureIcon = f.icon;
                    return (
                      <div key={f.label} className="flex items-center gap-2 text-sm pt-0.5">
                        <FeatureIcon className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                        <span className="text-muted-foreground/60 text-xs">{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Skip link */}
      {showSkip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            type="button"
            onClick={() => onSelect(null, null)}
            className={cn(
              'text-sm transition-all duration-200 cursor-pointer',
              'relative inline-block',
              'text-muted-foreground/40 hover:text-muted-foreground/70',
              'after:content-[""] after:absolute after:w-full after:scale-x-0 after:h-px after:bottom-0 after:left-0',
              'after:bg-muted-foreground/30 after:origin-bottom-right after:transition-transform after:duration-300',
              'hover:after:scale-x-100 hover:after:origin-bottom-left',
              !selectedPlanId && 'text-muted-foreground/60',
            )}
          >
            Later kiezen — ik wil eerst het TMS uitproberen
          </button>
        </motion.div>
      )}
    </div>
  );
};
