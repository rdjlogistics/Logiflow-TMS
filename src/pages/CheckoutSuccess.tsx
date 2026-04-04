import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// CSS confetti particles
const CONFETTI_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 50%)',   // emerald
  'hsl(48, 96%, 53%)',    // gold
  'hsl(262, 83%, 58%)',   // purple
  'hsl(199, 89%, 48%)',   // sky
  'hsl(330, 81%, 60%)',   // pink
];

const ConfettiParticle = ({ index }: { index: number }) => {
  const style = useMemo(() => ({
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 2}s`,
    animationDuration: `${2 + Math.random() * 2}s`,
    backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    width: `${6 + Math.random() * 6}px`,
    height: `${6 + Math.random() * 6}px`,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    transform: `rotate(${Math.random() * 360}deg)`,
  }), [index]);

  return (
    <div
      className="absolute top-0 opacity-0 animate-[confetti-fall_3s_ease-out_forwards]"
      style={style}
    />
  );
};

const AnimatedCheckmark = () => (
  <div className="relative flex items-center justify-center">
    {/* Glow ring */}
    <div
      className="absolute w-32 h-32 rounded-full bg-emerald-500/20"
    />
    <div
      className="absolute w-24 h-24 rounded-full bg-emerald-500/30"
    />
    {/* Circle + checkmark */}
    <svg
      width="96" height="96" viewBox="0 0 96 96"
    >
      <circle
        cx="48" cy="48" r="44"
        fill="none"
        stroke="hsl(142, 76%, 50%)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M30 50 L42 62 L66 38"
        fill="none"
        stroke="hsl(142, 76%, 50%)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const CheckoutSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planSlug = params.get('plan') || '';
  const cycle = params.get('cycle') || 'monthly';
  const { refetch } = useSubscriptionPlan();

  // Fetch plan details for display
  const { data: plan } = useQuery({
    queryKey: ['checkout-success-plan', planSlug],
    queryFn: async () => {
      if (!planSlug) return null;
      const { data } = await supabase
        .from('subscription_plans')
        .select('name, slug, price_monthly_eur, price_yearly_eur, description')
        .eq('slug', planSlug)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!planSlug,
  });

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Poll subscription status until webhook has processed
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15;
    
    const poll = async () => {
      const result = await refetch();
      const sub = result.data;
      if (sub?.status === 'active') {
        setPaymentConfirmed(true);
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        // After 30s, show success anyway (webhook may be delayed)
        setPaymentConfirmed(true);
      }
    };

    poll();
  }, [refetch]);

  const price = plan
    ? cycle === 'yearly'
      ? (plan.price_yearly_eur > 0 ? plan.price_yearly_eur : Math.round(plan.price_monthly_eur * 10))
      : plan.price_monthly_eur
    : null;

  const actions = [
    { icon: LayoutDashboard, label: 'Dashboard', desc: 'Bekijk je overzicht', path: '/' },
    { icon: FileText, label: 'Orders', desc: 'Maak je eerste order', path: '/orders' },
    { icon: Settings, label: 'Instellingen', desc: 'Configureer je account', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500/5 via-background to-primary/5 relative overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {Array.from({ length: 28 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div
          className="max-w-lg w-full text-center space-y-8"
        >
          {/* Checkmark */}
          <div className="flex justify-center">
            <AnimatedCheckmark />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              {paymentConfirmed ? 'Welkom bij LogiFlow!' : 'Betaling wordt verwerkt...'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {paymentConfirmed
                ? 'Je abonnement is succesvol geactiveerd'
                : 'Even geduld, we activeren je abonnement...'}
            </p>
          </div>

          {/* Plan details card */}
          {plan && (
            <div>
              <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-lg">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cycle === 'yearly' ? 'Jaarlijks' : 'Maandelijks'}
                        </p>
                      </div>
                    </div>
                    {price !== null && (
                      <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums">€{price}</p>
                        <p className="text-xs text-muted-foreground">
                          {cycle === 'yearly' ? '/ jaar' : '/ maand'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* What's next */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Wat wil je nu doen?
            </p>
            <div className="grid gap-3">
              {actions.map((action) => (
                <div
                  key={action.path}
                >
                  <Card
                    variant="interactive"
                    className="cursor-pointer"
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <action.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium">{action.label}</p>
                        <p className="text-sm text-muted-foreground">{action.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Skip link */}
          <div>
            <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
              Naar Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confetti CSS */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CheckoutSuccess;
