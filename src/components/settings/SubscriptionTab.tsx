import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Truck, Package, Clock, ArrowUpRight, CheckCircle2, AlertTriangle, Receipt, Loader2, CalendarDays, RefreshCw, XCircle, Check, X, Sparkles, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { useSubscriptionInvoices, useCreateSubscriptionCheckout } from '@/hooks/useSubscriptionInvoices';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const FEATURE_LABELS: Record<string, string> = {
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

export const SubscriptionTab = () => {
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const {
    subscription,
    plan,
    status,
    isTrialing,
    isActive,
    isPastDue,
    trialDaysLeft,
    limits,
    featuresJson,
    loading,
  } = useSubscriptionPlan();

  const { data: invoices, isLoading: invoicesLoading } = useSubscriptionInvoices();
  const { createCheckout } = useCreateSubscriptionCheckout();
  const { isAdmin } = usePermissions();

  // Fetch current usage counts
  const { data: usage } = useQuery({
    queryKey: ['subscription-usage'],
    queryFn: async () => {
      const [driversRes, vehiclesRes, tripsRes] = await Promise.all([
        supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('trips').select('id', { count: 'exact', head: true })
          .gte('trip_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      ]);
      return {
        users: driversRes.count ?? 0,
        vehicles: vehiclesRes.count ?? 0,
        ordersThisMonth: tripsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const handleUpgrade = async (planSlug: string) => {
    try {
      setIsUpgrading(true);
      const result = await createCheckout(planSlug, subscription?.billing_cycle as 'monthly' | 'yearly' || 'monthly');
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Onbekende fout';
      toast.error('Upgrade mislukt', { description: message });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const { data: uc } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (!uc?.company_id) throw new Error('Geen bedrijf gevonden');

      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('tenant_id', uc.company_id)
        .eq('status', 'active');

      if (error) throw error;

      toast.success('Abonnement wordt opgezegd aan het einde van de huidige periode.');
      setCancelDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout';
      toast.error('Opzeggen mislukt', { description: message });
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const { data: uc } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (!uc?.company_id) throw new Error('Geen bedrijf gevonden');

      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq('tenant_id', uc.company_id);

      if (error) throw error;

      toast.success('Abonnement heractiveerd!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout';
      toast.error('Heractiveren mislukt', { description: message });
    } finally {
      setReactivating(false);
    }
  };

  // Payment success is now handled by /checkout/success page

  if (loading) return null;

  // ─── No subscription: attractive empty state ───
  if (!plan || !subscription) {
    return (
      <motion.div variants={staggerItem}>
        <Card variant="glass" className="overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Geen actief abonnement</CardTitle>
                  <CardDescription>Start vandaag nog met LogiFlow TMS</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kies een pakket dat past bij jouw transportbedrijf. Alle pakketten bevatten een gratis proefperiode zodat je alles kunt uitproberen.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Truck, label: 'Voertuig- & eigen chauffeursbeheer' },
                  { icon: Receipt, label: 'Automatische facturatie' },
                  { icon: Package, label: 'Order- & ritplanning' },
                  { icon: Sparkles, label: 'AI-assistent & inzichten' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/pricing')} size="lg" className="w-full gap-2">
                Bekijk pakketten
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    );
  }

  const statusConfig = {
    trial: { label: 'Trial', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', icon: Clock },
    active: { label: 'Actief', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    past_due: { label: 'Achterstallig', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
    cancelled: { label: 'Geannuleerd', color: 'text-muted-foreground bg-muted border-border', icon: AlertTriangle },
    expired: { label: 'Verlopen', color: 'text-muted-foreground bg-muted border-border', icon: AlertTriangle },
  };

  const currentStatus = statusConfig[status ?? 'trial'];
  const StatusIcon = currentStatus.icon;

  const isMonthly = subscription.billing_cycle === 'monthly';
  const yearlySaving = plan.price_monthly_eur * 12 - plan.price_yearly_eur;
  const displayPrice = isMonthly ? plan.price_monthly_eur : (plan.price_yearly_eur / 12).toFixed(0);
  const cancelAtEnd = subscription.cancel_at_period_end;

  const limitItems = limits ? [
    { label: 'Gebruikers', icon: Users, current: usage?.users ?? 0, max: limits.maxUsers, color: 'primary' },
    { label: 'Voertuigen', icon: Truck, current: usage?.vehicles ?? 0, max: limits.maxVehicles, color: 'primary' },
    { label: 'Orders / maand', icon: Package, current: usage?.ordersThisMonth ?? 0, max: limits.maxOrdersMonth, color: 'primary' },
  ] : [];

  const invoiceStatusBadge = (s: string) => {
    switch (s) {
      case 'paid': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Betaald</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">In afwachting</Badge>;
      case 'failed': return <Badge variant="destructive">Mislukt</Badge>;
      case 'canceled': return <Badge variant="outline" className="text-muted-foreground">Geannuleerd</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  // Build full feature list (enabled + disabled)
  const allFeatures = Object.entries(FEATURE_LABELS).map(([key, label]) => ({
    key,
    label,
    enabled: Boolean(featuresJson[key]),
  }));

  return (
    <>
      {/* Plan Overview Card — enriched */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                >
                  <Crown className="h-5 w-5 text-primary-foreground" />
                </motion.div>
                <div>
                  <CardTitle className="text-base md:text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.description || 'Je huidige abonnement'}</CardDescription>
                </div>
              </div>
              <Badge className={cn('gap-1.5', currentStatus.color)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {currentStatus.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Trial countdown */}
            {isTrialing && trialDaysLeft > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Trial verloopt over {trialDaysLeft} {trialDaysLeft === 1 ? 'dag' : 'dagen'}
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                    Upgrade naar een betaald pakket om alle functies te behouden
                  </p>
                </div>
              </div>
            )}

            {isPastDue && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Betaling achterstallig</p>
                  <p className="text-xs text-red-600/80">Werk je betaalmethode bij om toegang te behouden</p>
                </div>
              </div>
            )}

            {cancelAtEnd && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Abonnement wordt opgezegd</p>
                  <p className="text-xs text-muted-foreground">
                    Je hebt nog toegang tot {format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: nl })}
                  </p>
                </div>
              </div>
            )}

            {/* Pricing display */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">€{displayPrice}</span>
              <span className="text-muted-foreground text-sm">/ maand</span>
              <Badge variant="secondary" className="text-xs ml-1">
                {isMonthly ? 'Maandelijks' : 'Jaarlijks'}
              </Badge>
              {isMonthly && yearlySaving > 0 && (
                <span className="text-xs text-emerald-600 font-medium ml-1">
                  Bespaar €{yearlySaving.toFixed(0)}/jaar met jaarlijks
                </span>
              )}
            </div>

            <Separator />

            {/* Billing details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Periode start
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(subscription.current_period_start), 'dd MMM yyyy', { locale: nl })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Periode eind
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(subscription.current_period_end), 'dd MMM yyyy', { locale: nl })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> Volgende factuur
                </p>
                <p className="text-sm font-medium">
                  {cancelAtEnd
                    ? '—'
                    : format(new Date(subscription.current_period_end), 'dd MMM yyyy', { locale: nl })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Automatische verlenging
                </p>
                <p className={cn('text-sm font-medium', cancelAtEnd ? 'text-muted-foreground' : 'text-emerald-600')}>
                  {cancelAtEnd ? 'Uitgeschakeld' : 'Actief'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate('/pricing')}
                variant={isActive ? 'outline' : 'default'}
                className="gap-2"
              >
                {isActive ? 'Wijzig pakket' : 'Upgrade nu'}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              {isTrialing && (
                <Button
                  onClick={() => handleUpgrade(plan.slug || 'growth')}
                  disabled={isUpgrading}
                  className="gap-2"
                >
                  {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Activeer nu
                </Button>
              )}
              {isMonthly && !isTrialing && (
                <Button
                  variant="secondary"
                  onClick={() => handleUpgrade(plan.slug)}
                  disabled={isUpgrading}
                  className="gap-2"
                >
                  Overstappen naar jaarlijks
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Included Features Card */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base md:text-lg">Inbegrepen functies</CardTitle>
                <CardDescription>Overzicht van functies in je {plan.name} pakket</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allFeatures.map((f) => (
                <div
                  key={f.key}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg text-sm transition-colors',
                    f.enabled
                      ? 'bg-emerald-500/5 text-foreground'
                      : 'bg-muted/20 text-muted-foreground'
                  )}
                >
                  {f.enabled ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={cn(!f.enabled && 'line-through decoration-muted-foreground/30')}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
            {allFeatures.some((f) => !f.enabled) && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')} className="gap-1.5 text-primary">
                  Upgrade voor meer functies
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Limits & Usage */}
      {limitItems.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card variant="glass">
            <CardHeader className="pb-4">
              <CardTitle className="text-base md:text-lg">Limieten & Verbruik</CardTitle>
              <CardDescription>Huidig gebruik ten opzichte van je pakketlimieten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {limitItems.map((item) => {
                const percentage = item.max > 0 ? Math.min(100, (item.current / item.max) * 100) : 0;
                const isNearLimit = percentage >= 80;
                const isAtLimit = percentage >= 100;
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ItemIcon className={cn('h-4 w-4', isAtLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-muted-foreground')} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className={cn('text-sm tabular-nums', isAtLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground')}>
                        {item.current} / {item.max === 999999 ? '\u221E' : item.max}
                      </span>
                    </div>
                    {item.max < 999999 && (
                      <Progress
                        value={percentage}
                        className={cn('h-2', isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-amber-500' : '')}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Subscription Management */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <CardTitle className="text-base md:text-lg">Abonnement beheren</CardTitle>
            <CardDescription>Wijzig of annuleer je abonnement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isAdmin ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Alleen de beheerder kan het abonnement beheren.
                </p>
              </div>
            ) : cancelAtEnd ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium">Opzegging terugdraaien</p>
                  <p className="text-xs text-muted-foreground">
                    Je abonnement loopt af op {format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: nl })}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReactivate} disabled={reactivating}>
                  {reactivating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Heractiveer
                </Button>
              </div>
            ) : (
              !isTrialing && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <div>
                    <p className="text-sm font-medium">Abonnement opzeggen</p>
                    <p className="text-xs text-muted-foreground">
                      Je behoudt toegang tot het einde van de huidige periode
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    Opzeggen
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Billing History */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base md:text-lg">Facturatiegeschiedenis</CardTitle>
                <CardDescription>Overzicht van je abonnementsfacturen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !invoices?.length ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                Nog geen facturen. Je eerste factuur verschijnt na activatie van je abonnement.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Bedrag</TableHead>
                    <TableHead>Methode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">
                        {format(new Date(inv.created_at), 'dd MMM yyyy', { locale: nl })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.period_start && inv.period_end
                          ? `${format(new Date(inv.period_start), 'dd MMM', { locale: nl })} - ${format(new Date(inv.period_end), 'dd MMM yyyy', { locale: nl })}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        €{Number(inv.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {inv.payment_method || inv.payment_provider || '-'}
                      </TableCell>
                      <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        title="Abonnement opzeggen"
        description="Weet je zeker dat je je abonnement wilt opzeggen? Je behoudt toegang tot het einde van de huidige facturatieperiode."
        confirmText="Ja, opzeggen"
        cancelText="Annuleren"
        variant="destructive"
        onConfirm={handleCancelSubscription}
        onCancel={() => setCancelDialogOpen(false)}
      />
    </>
  );
};
