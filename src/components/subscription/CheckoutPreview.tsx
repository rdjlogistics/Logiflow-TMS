import { useState } from 'react';
import { Check, CreditCard, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useCreateSubscriptionCheckout } from '@/hooks/useSubscriptionInvoices';
import { toast } from 'sonner';

interface PlanForPreview {
  slug: string;
  name: string;
  description: string | null;
  price_monthly_eur: number;
  price_yearly_eur: number;
  features_json: Record<string, boolean>;
}

const FEATURE_LABELS: Record<string, string> = {
  order_management: 'Orderbeheer',
  digital_pod: 'Digitale POD',
  cmr_generation: 'CMR / Vrachtbrief',
  live_tracking: 'Live Tracking',
  basic_invoicing: 'Facturatie',
  basic_crm: 'CRM',
  chauffeurs_app: 'Chauffeurs App',
  multi_stop: 'Multi-stop Orders',
  ai_dispatch: 'AI Dispatch',
  route_optimalisatie: 'Route Optimalisatie',
  debiteurenbeheer: 'Debiteurenbeheer',
  inkoopfacturatie: 'Inkoopfacturatie',
  klanten_portaal: 'Klanten Portaal',
  rate_contracts: 'Tariefcontracten',
  wms: 'WMS / Magazijn',
  api_access: 'API Toegang',
};

interface CheckoutPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanForPreview | null;
  isYearly: boolean;
}

export const CheckoutPreview = ({ open, onOpenChange, plan, isYearly }: CheckoutPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const { createCheckout } = useCreateSubscriptionCheckout();

  if (!plan) return null;

  const price = isYearly
    ? (plan.price_yearly_eur > 0 ? plan.price_yearly_eur : Math.round(plan.price_monthly_eur * 10))
    : plan.price_monthly_eur;

  const monthlyEquivalent = isYearly ? Math.round(price / 12) : price;

  const activeFeatures = Object.entries(plan.features_json)
    .filter(([, v]) => v === true)
    .map(([k]) => FEATURE_LABELS[k] || k)
    .slice(0, 6);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const result = await createCheckout(plan.slug, isYearly ? 'yearly' : 'monthly');
      if (result?.payment_url) {
        window.location.href = result.payment_url;
      } else {
        toast.error('Checkout kon niet worden gestart');
      }
    } catch {
      toast.error('Checkout mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" variant="premium" showDragHandle className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Bevestig je pakket</SheetTitle>
          <SheetDescription>
            Controleer je keuze voordat je naar de betaling gaat
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Plan summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/40">
            <div>
              <p className="font-semibold text-lg">{plan.name}</p>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {isYearly ? 'Jaarlijks' : 'Maandelijks'}
            </Badge>
          </div>

          {/* Price breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Prijsoverzicht</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{plan.name} — {isYearly ? 'jaarabonnement' : 'maandabonnement'}</span>
                <span className="font-medium">€{price.toFixed(2)}</span>
              </div>
              {isYearly && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Equivalent per maand</span>
                  <span>€{monthlyEquivalent}/mnd</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>BTW</span>
                <span>Wordt berekend</span>
              </div>
              <div className="border-t border-border/40 pt-2 flex justify-between font-semibold">
                <span>Totaal excl. BTW</span>
                <span>€{price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Inbegrepen</h4>
            <div className="grid grid-cols-2 gap-2">
              {activeFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button
            size="lg"
            className="w-full gap-2"
            variant="premium"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Even geduld...</>
            ) : (
              <><CreditCard className="h-4 w-4" /> Doorgaan naar betaling</>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuleren
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
