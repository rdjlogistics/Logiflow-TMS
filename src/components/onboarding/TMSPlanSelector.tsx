import { Check, Zap, Rocket, Crown, Building2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PlanData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly_eur: number;
  max_users: number;
  max_vehicles: number;
  max_orders_month: number;
  features_json: Record<string, boolean>;
  sort_order: number;
}

const PLAN_META: Record<string, { icon: typeof Crown; gradient: string; audience: string }> = {
  solo: {
    icon: Zap,
    gradient: 'from-sky-500 to-sky-600',
    audience: 'ZZP\'ers & startende transporteurs',
  },
  starter: {
    icon: Rocket,
    gradient: 'from-emerald-500 to-emerald-600',
    audience: 'Kleine bedrijven met 2–5 voertuigen',
  },
  growth: {
    icon: Crown,
    gradient: 'from-primary to-primary/80',
    audience: 'Serieuze transportbedrijven met 5+ voertuigen',
  },
  scale: {
    icon: Building2,
    gradient: 'from-violet-500 to-violet-600',
    audience: 'Marktleiders met complexe operaties',
  },
};

const KEY_FEATURES: Record<string, string[]> = {
  solo: ['Orderbeheer', 'Digitale POD', 'Facturatie', 'Live Tracking'],
  starter: ['Chauffeurs App', 'Multi-stop Orders', 'CRM', 'KPI Dashboard'],
  growth: ['AI Dispatch', 'Route Optimalisatie', 'Marge Analyse', 'Klanten Portaal'],
  scale: ['Onbeperkt alles', 'API Toegang', 'White Label', 'WMS / Magazijn'],
};

interface TMSPlanSelectorProps {
  selectedPlanId: string | null;
  onSelect: (planId: string, slug: string) => void;
}

export const TMSPlanSelector = ({ selectedPlanId, onSelect }: TMSPlanSelectorProps) => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['onboarding-tms-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as PlanData[];
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-6 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-60 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Apple-style header */}
      <div className="text-center space-y-3">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium"
        >
          Stap 3 van 6
        </p>

        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20"
        >
          <Package className="h-7 w-7 text-white" />
        </div>

        <h2
          className="text-2xl sm:text-3xl font-display font-light tracking-tight"
        >
          Kies je <span className="font-semibold">TMS pakket</span>
        </h2>
        <p
          className="text-sm text-muted-foreground/50 font-light"
        >
          Alle pakketten inclusief 30 dagen gratis trial
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans?.map((plan, index) => {
          const meta = PLAN_META[plan.slug] || PLAN_META.solo;
          const Icon = meta.icon;
          const isSelected = selectedPlanId === plan.id;
          const isPopular = plan.slug === 'growth';
          const features = KEY_FEATURES[plan.slug] || [];

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id, plan.slug)}
              style={{ perspective: 800, transformStyle: 'preserve-3d' }}
              className={cn(
                'relative text-left rounded-2xl p-5 transition-all duration-300',
                'backdrop-blur-xl bg-white/[0.03] border',
                'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
                isSelected
                  ? 'border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_30px_-5px_hsl(var(--primary)/0.25)]'
                  : 'border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.05]',
              )}
            >
              {isPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md bg-white/[0.08] border border-white/[0.12] text-foreground/70">
                    Meest gekozen
                  </span>
                </div>
              )}

              {/* Selection ring with pulse */}
              <div className={cn(
                'absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                isSelected
                  ? 'border-primary bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
                  : 'border-white/[0.12]'
              )}>
                {isSelected && (
                  <>
                    <Check className="h-3 w-3 text-primary-foreground" />
                    <div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                    />
                  </>
                )}
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg',
                    meta.gradient
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-[10px] text-muted-foreground/40">{meta.audience}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums">€{plan.price_monthly_eur}</span>
                  <span className="text-xs text-muted-foreground/30 font-light">/ maand</span>
                </div>

                {/* Limits */}
                <div className="flex gap-4 text-[11px] text-muted-foreground/40">
                  <span>{plan.max_users >= 999999 ? '∞' : plan.max_users} gebruikers</span>
                  <span>{plan.max_vehicles >= 999999 ? '∞' : plan.max_vehicles} voertuigen</span>
                </div>

                {/* Features */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
                      <span className="text-muted-foreground/60 text-xs">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
