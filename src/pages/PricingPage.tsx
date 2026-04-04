import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Crown, Zap, Rocket, Building2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutPreview } from '@/components/subscription/CheckoutPreview';
import { AIPlanSelector } from '@/components/onboarding/AIPlanSelector';

interface PlanData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  badge_text: string | null;
  price_monthly_eur: number;
  price_yearly_eur: number;
  max_users: number;
  max_vehicles: number;
  max_orders_month: number;
  features_json: Record<string, boolean>;
  sort_order: number;
}

const PLAN_ICONS: Record<string, typeof Crown> = {
  solo: Zap,
  starter: Rocket,
  growth: Crown,
  scale: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  solo: 'from-blue-500 to-blue-600',
  starter: 'from-emerald-500 to-emerald-600',
  growth: 'from-primary to-primary/80',
  scale: 'from-purple-500 to-purple-600',
};

// Feature categories for the comparison matrix
const FEATURE_CATEGORIES = [
  {
    title: 'Basis',
    features: [
      { key: 'order_management', label: 'Orderbeheer' },
      { key: 'digital_pod', label: 'Digitale POD' },
      { key: 'cmr_generation', label: 'CMR / Vrachtbrief' },
      { key: 'live_tracking', label: 'Live Tracking' },
      { key: 'basic_invoicing', label: 'Facturatie' },
      { key: 'basic_crm', label: 'CRM' },
      { key: 'basic_kpi', label: 'KPI Dashboard' },
    ],
  },
  {
    title: 'Operations',
    features: [
      { key: 'chauffeurs_app', label: 'Chauffeurs App' },
      { key: 'multi_stop', label: 'Multi-stop Orders' },
      { key: 'ai_dispatch', label: 'AI Dispatch' },
      { key: 'route_optimalisatie', label: 'Route Optimalisatie' },
      { key: 'dienstplanning', label: 'Dienstplanning' },
      { key: 'proactive_alerts', label: 'Proactieve Alerts' },
      { key: 'sla_monitoring', label: 'SLA Monitoring' },
    ],
  },
  {
    title: 'Finance',
    features: [
      { key: 'debiteurenbeheer', label: 'Debiteurenbeheer' },
      { key: 'inkoopfacturatie', label: 'Inkoopfacturatie' },
      { key: 'creditnotas', label: 'Creditnota\'s' },
      { key: 'marge_analyse', label: 'Marge Analyse' },
      { key: 'cashflow_dashboard', label: 'Cashflow Dashboard' },
      { key: 'bank_reconciliatie', label: 'Bank Reconciliatie' },
      { key: 'boekhouding_koppeling', label: 'Boekhouding Koppeling' },
    ],
  },
  {
    title: 'Enterprise',
    features: [
      { key: 'klanten_portaal', label: 'Klanten Portaal' },
      { key: 'rate_contracts', label: 'Tariefcontracten' },
      { key: 'tendering', label: 'Tendering / Charter' },
      { key: 'smart_ocr', label: 'Smart OCR' },
      { key: 'wms', label: 'WMS / Magazijn' },
      { key: 'ecommerce', label: 'E-commerce Integratie' },
      { key: 'exception_management', label: 'Exception Management' },
      { key: 'api_access', label: 'API Toegang' },
      { key: 'white_label', label: 'White Label' },
    ],
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<PlanData | null>(null);
  const { user } = useAuth();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['pricing-plans'],
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

  const getPrice = (plan: PlanData) => {
    if (isYearly) {
      return plan.price_yearly_eur > 0 ? plan.price_yearly_eur : Math.round(plan.price_monthly_eur * 10);
    }
    return plan.price_monthly_eur;
  };

  const getMonthlyEquivalent = (plan: PlanData) => {
    if (isYearly) {
      const yearlyPrice = plan.price_yearly_eur > 0 ? plan.price_yearly_eur : Math.round(plan.price_monthly_eur * 10);
      return Math.round(yearlyPrice / 12);
    }
    return plan.price_monthly_eur;
  };

  const getSavings = (plan: PlanData) => {
    if (!isYearly) return 0;
    const yearlyTotal = plan.price_yearly_eur > 0 ? plan.price_yearly_eur : Math.round(plan.price_monthly_eur * 10);
    const monthlyTotal = plan.price_monthly_eur * 12;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  const handlePlanSelect = (plan: PlanData) => {
    if (user) {
      setPreviewPlan(plan);
    } else {
      navigate(`/auth?plan=${plan.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">LogiFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Inloggen
                </Button>
                <Button onClick={() => navigate('/auth')}>
                  Gratis proberen
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm">
              30 dagen gratis proberen — geen creditcard nodig
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight">
              Eerlijke prijzen, <br />
              <span className="text-primary">serieuze software</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Kies het pakket dat past bij jouw transportbedrijf. Upgrade, downgrade of annuleer wanneer je wilt.
            </p>
          </div>

          {/* Billing toggle */}
          <div
            className="flex items-center justify-center gap-3"
          >
            <span className={cn('text-sm font-medium', !isYearly ? 'text-foreground' : 'text-muted-foreground')}>
              Maandelijks
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={cn('text-sm font-medium', isYearly ? 'text-foreground' : 'text-muted-foreground')}>
              Jaarlijks
            </span>
            {isYearly && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Bespaar ~17%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="pb-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan, index) => {
            const PlanIcon = PLAN_ICONS[plan.slug] || Zap;
            const isPopular = plan.slug === 'growth';
            const savings = getSavings(plan);

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-2xl border p-6 flex flex-col',
                  'bg-card/80 backdrop-blur-sm',
                  isPopular
                    ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20'
                    : 'border-border/50 hover:border-border/80 hover:shadow-lg'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-lg">
                      Meest gekozen
                    </Badge>
                  </div>
                )}

                {plan.badge_text && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary">{plan.badge_text}</Badge>
                  </div>
                )}

                <div className="space-y-4 flex-1">
                  {/* Plan header */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white',
                      PLAN_COLORS[plan.slug] || 'from-primary to-primary/70'
                    )}>
                      <PlanIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tabular-nums">
                        €{getMonthlyEquivalent(plan)}
                      </span>
                      <span className="text-muted-foreground text-sm">/ maand</span>
                    </div>
                    {isYearly && savings > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">
                        €{getPrice(plan)}/jaar — bespaar {savings}%
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 py-3 border-y border-border/40">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gebruikers</span>
                      <span className="font-medium">{plan.max_users >= 999999 ? 'Onbeperkt' : plan.max_users}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Voertuigen</span>
                      <span className="font-medium">{plan.max_vehicles >= 999999 ? 'Onbeperkt' : plan.max_vehicles}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders / maand</span>
                      <span className="font-medium">{plan.max_orders_month >= 999999 ? 'Onbeperkt' : plan.max_orders_month}</span>
                    </div>
                  </div>

                  {/* Key features for this plan */}
                  <div className="space-y-2">
                    {FEATURE_CATEGORIES.flatMap(c => c.features)
                      .filter(f => plan.features_json[f.key] === true)
                      .slice(0, 6)
                      .map((feature) => (
                        <div key={feature.key} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{feature.label}</span>
                        </div>
                      ))}
                    {Object.values(plan.features_json).filter(Boolean).length > 6 && (
                      <p className="text-xs text-muted-foreground pl-6">
                        + {Object.values(plan.features_json).filter(Boolean).length - 6} meer
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-6">
                  <Button
                    className={cn(
                      'w-full gap-2',
                      isPopular && 'relative overflow-hidden shimmer-btn'
                    )}
                    variant={isPopular ? 'premium' : 'outline'}
                    size="lg"
                    onClick={() => handlePlanSelect(plan)}
                  >
                    {user ? (
                      <>{plan.slug === 'growth' ? 'Upgrade nu' : 'Selecteer pakket'}<ArrowRight className="h-4 w-4" /></>
                    ) : (
                      <>Start gratis trial<ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="py-16 px-4 bg-muted/30 border-y border-border/40">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">
            Vergelijk alle functies
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-4 pr-4 font-medium text-muted-foreground min-w-[200px]">Functie</th>
                  {plans?.map((plan) => (
                    <th key={plan.id} className="pb-4 px-4 text-center font-semibold min-w-[120px]">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_CATEGORIES.map((category) => (
                  <>
                    <tr key={category.title}>
                      <td colSpan={(plans?.length ?? 0) + 1} className="pt-6 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category.title}
                        </span>
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr key={feature.key} className="border-b border-border/20">
                        <td className="py-3 pr-4 text-muted-foreground">{feature.label}</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="py-3 px-4 text-center">
                            {plan.features_json[feature.key] ? (
                              <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ-style footer */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-2xl font-display font-bold">Veelgestelde vragen</h2>
          <div className="text-left space-y-6">
            {[
              { q: 'Kan ik op elk moment wisselen van pakket?', a: 'Ja, je kunt op elk moment upgraden of downgraden. Bij een upgrade wordt het verschil pro-rata berekend.' },
              { q: 'Wat gebeurt er na mijn trial?', a: 'Na 30 dagen trial kies je een betaald pakket. Na 14 dagen vragen we je om een betaalmethode toe te voegen zodat we automatisch kunnen incasseren. Je data blijft altijd bewaard.' },
              { q: 'Hoe betaal ik?', a: 'We werken met iDEAL, creditcard en SEPA incasso via Mollie. Je ontvangt automatisch een factuur.' },
              { q: 'Is er een contract of opzegtermijn?', a: 'Nee, bij maandelijks betalen kun je per maand opzeggen. Bij jaarlijks betalen geldt het jaar als minimum.' },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
          <Button size="lg" onClick={() => user ? navigate('/') : navigate('/auth')} className="gap-2">
            {user ? 'Ga naar dashboard' : 'Start je gratis trial'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* AI Co-pilot Add-on Section */}
      <section className="mt-24 mb-16">
        <AIPlanSelector
          selectedPlanId={null}
          onSelect={() => {}
          showSkip={false}
        />
      </section>

      {/* Checkout Preview Sheet */}
      <CheckoutPreview
        open={!!previewPlan}
        onOpenChange={(open) => !open && setPreviewPlan(null)}
        plan={previewPlan}
        isYearly={isYearly}
      />

      {/* Shimmer animation for popular CTA */}
      <style>{`
        .shimmer-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 33%, rgba(255,255,255,0.15) 50%, transparent 67%);
          background-size: 300% 100%;
          animation: shimmer 3s infinite;
          pointer-events: none;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
