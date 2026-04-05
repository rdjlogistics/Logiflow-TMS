import { type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

interface SubscriptionGateProps {
  children: ReactNode;
}

/**
 * Wraps the main app content. Shows a blocking overlay when the subscription
 * is expired/cancelled, or a warning banner when past_due.
 */
export const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { needsSubscription, isPastDue, isExpired, isCancelled, isTrialing, trialDaysLeft, loading } = useSubscriptionPlan();
  const navigate = useNavigate();
  const location = useLocation();

  // Allow settings pages through so user can upgrade
  const isSettingsPage = location.pathname.startsWith("/admin/settings") || location.pathname.startsWith("/pricing") || location.pathname.startsWith("/checkout");

  if (loading) return <>{children}</>;

  // Blocking overlay for expired/cancelled (except settings pages)
  if (needsSubscription && !isSettingsPage) {
    const title = isCancelled ? "Abonnement geannuleerd" : "Je proefperiode is verlopen";
    const desc = isCancelled
      ? "Je abonnement is geannuleerd. Kies een nieuw pakket om verder te gaan."
      : "Je gratis proefperiode van 30 dagen is afgelopen. Kies een pakket om door te gaan met LogiFlow.";

    return (
      <div className="relative">
        {/* Blurred content underneath */}
        <div className="pointer-events-none select-none opacity-30 blur-[2px]" aria-hidden>
          {children}
        </div>

        {/* Blocking overlay */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-8 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Icon */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                  />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                    <Crown className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>

                {/* Text */}
                <div className="space-y-2">
                  <h2 className="text-xl font-display font-bold tracking-tight">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{desc}</p>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => navigate("/pricing")}
                  >
                    Kies een pakket
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => navigate("/admin/settings?tab=abonnement")}
                  >
                    Naar instellingen
                  </Button>
                </div>

                {/* Reassurance */}
                <p className="text-xs text-muted-foreground">
                  Je data blijft veilig bewaard. Na het kiezen van een pakket heb je direct weer volledige toegang.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      {/* Past due warning banner */}
      {isPastDue && !isSettingsPage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
        >
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Betaling achterstallig</p>
            <p className="text-xs text-destructive/80">Werk je betaalmethode bij om toegang te behouden.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => navigate("/admin/settings?tab=abonnement")}
          >
            Bijwerken
          </Button>
        </motion.div>
      )}

      {/* Payment method reminder when trial is between day 14 and 30 */}
      {isTrialing && trialDaysLeft <= 16 && trialDaysLeft > 3 && !isSettingsPage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
        >
          <Crown className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Voeg je betaalmethode toe
            </p>
            <p className="text-xs text-muted-foreground">
              Nog {trialDaysLeft} {trialDaysLeft === 1 ? "dag" : "dagen"} trial. Voeg een betaalmethode toe zodat je na de trial automatisch doorgaat.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate("/pricing")}
          >
            Toevoegen
          </Button>
        </motion.div>
      )}

      {/* Trial warning when < 3 days left */}
      {isTrialing && trialDaysLeft <= 3 && trialDaysLeft > 0 && !isSettingsPage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Nog {trialDaysLeft} {trialDaysLeft === 1 ? "dag" : "dagen"} trial
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">Upgrade nu om ononderbroken toegang te behouden.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
            onClick={() => navigate("/pricing")}
          >
            Upgrade
          </Button>
        </motion.div>
      )}

      {children}
    </>
  );
};
