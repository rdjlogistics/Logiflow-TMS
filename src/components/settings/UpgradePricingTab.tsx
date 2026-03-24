import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { useCreateSubscriptionCheckout } from '@/hooks/useSubscriptionInvoices';
import { Check, Crown, Loader2, Sparkles, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
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

const PLAN_ICONS: Record<string, React.ElementType> = {
  solo: Star,
  starter: Zap,
  growth: Sparkles,
  scale: Crown,
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function UpgradePricingTab() {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { subscription, plan: currentPlan } = useSubscriptionPlan();
  const { createCheckout } = useCreateSubscriptionCheckout();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-all'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  const handleUpgrade = async (plan: Plan) => {
    if (currentPlan?.slug === plan.slug) return;
    setCheckoutLoading(plan.slug);
    try {
      const result = await createCheckout(plan.slug, billingCycle);
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Fout bij afrekenen',
        description: 'Kon de betaling niet starten. Probeer het opnieuw.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPrice = (plan: Plan) => {
    if (billingCycle === 'yearly') {
      const yearlyPrice = plan.price_yearly_eur > 0 ? plan.price_yearly_eur : plan.price_monthly_eur * 10;
      return Math.round(yearlyPrice / 12);
    }
    return plan.price_monthly_eur;
  };

  const getFeatureList = (plan: Plan): string[] => {
    const features: string[] = [];
    features.push(`${plan.max_users >= 999999 ? 'Onbeperkt' : plan.max_users} gebruikers`);
    features.push(`${plan.max_vehicles >= 999999 ? 'Onbeperkt' : plan.max_vehicles} voertuigen`);
    features.push(`${plan.max_orders_month >= 999999 ? 'Onbeperkt' : plan.max_orders_month} orders/maand`);

    if (plan.features_json) {
      const featureLabels: Record<string, string> = {
        invoicing: 'Facturatie',
        route_optimization: 'Route optimalisatie',
        api_access: 'API toegang',
        priority_support: 'Prioriteit support',
        custom_branding: 'Custom branding',
        multi_depot: 'Multi-depot',
        advanced_analytics: 'Geavanceerde analyses',
        ai_copilot: 'AI Copilot',
        carrier_portal: 'Charter portaal',
        customer_portal: 'Klantportaal',
      };

      Object.entries(plan.features_json).forEach(([key, enabled]) => {
        if (enabled && featureLabels[key]) {
          features.push(featureLabels[key]);
        }
      });
    }

    return features;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerItem} className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.h2
          className="text-2xl md:text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Upgrade je pakket
        </motion.h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
          Kies het plan dat het beste past bij jouw transportbedrijf
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="relative inline-flex items-center rounded-full bg-muted/50 backdrop-blur-sm border border-border/30 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'relative z-10 rounded-full px-5 py-2 text-sm font-medium transition-colors',
              billingCycle === 'monthly' ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {billingCycle === 'monthly' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25"
                layoutId="billingToggle"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">Maandelijks</span>
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'relative z-10 rounded-full px-5 py-2 text-sm font-medium transition-colors',
              billingCycle === 'yearly' ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {billingCycle === 'yearly' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25"
                layoutId="billingToggle"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              Jaarlijks
              <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0">
                -17%
              </Badge>
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan, index) => {
          const isCurrentPlan = currentPlan?.slug === plan.slug;
          const isPopular = plan.slug === 'growth';
          const PlanIcon = PLAN_ICONS[plan.slug] || Star;
          const features = getFeatureList(plan);
          const price = getPrice(plan);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Card
                variant={isPopular ? 'glow' : 'glass'}
                className={cn(
                  'relative h-full flex flex-col overflow-hidden',
                  isPopular && 'ring-1 ring-primary/40',
                  isCurrentPlan && 'ring-1 ring-success/40'
                )}
              >
                {/* Popular / Current badge */}
                {(isPopular || isCurrentPlan) && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      className={cn(
                        'text-[10px] font-semibold',
                        isCurrentPlan
                          ? 'bg-success/20 text-success border-success/30'
                          : 'bg-primary/20 text-primary border-primary/30'
                      )}
                    >
                      {isCurrentPlan ? 'Huidig plan' : plan.badge_text || 'Meest gekozen'}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center',
                        isPopular
                          ? 'bg-primary/15'
                          : 'bg-muted/60'
                      )}
                    >
                      <PlanIcon className={cn('h-5 w-5', isPopular ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.slug}-${billingCycle}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          €{price}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className="text-sm text-muted-foreground">/maand</span>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {plan.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col pt-2">
                  {/* CTA */}
                  <Button
                    variant={isCurrentPlan ? 'outline' : isPopular ? 'premium' : 'default'}
                    className="w-full mb-4"
                    disabled={isCurrentPlan || checkoutLoading === plan.slug}
                    loading={checkoutLoading === plan.slug}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {isCurrentPlan ? 'Huidig plan' : 'Upgraden'}
                  </Button>

                  {/* Features */}
                  <div className="space-y-2.5 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Inclusief:
                    </p>
                    <ul className="space-y-2">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground">
        Alle prijzen zijn exclusief BTW. Je kunt op elk moment upgraden of downgraden.
      </p>
    </motion.div>
  );
}
