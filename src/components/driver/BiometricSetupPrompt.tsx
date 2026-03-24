import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { toast } from '@/hooks/use-toast';

export const BiometricSetupPrompt = () => {
  const { isSupported, hasCredential, loading, setupDismissed, register, dismissSetup } = useWebAuthn();
  const [visible, setVisible] = useState(true);

  // Don't show if: not supported, already registered, dismissed, or manually hidden
  if (!isSupported || hasCredential || setupDismissed || !visible) return null;

  const handleSetup = async () => {
    const success = await register();
    if (success) {
      toast({
        title: 'Biometrische login ingesteld!',
        description: 'Je kunt nu inloggen met Face ID of Touch ID.',
      });
      setVisible(false);
    } else {
      toast({
        title: 'Instellen mislukt',
        description: 'Probeer het opnieuw of gebruik wachtwoord login.',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = () => {
    dismissSetup();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/20 p-4 backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/20 p-2.5 flex-shrink-0">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Sneller inloggen met biometrie
              </h3>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stel Face ID of Touch ID in voor sneller en veiliger inloggen.
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Shield className="h-3 w-3 text-success" />
              <span className="text-[10px] text-success/80">Apparaat-gebonden beveiliging</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleSetup}
                loading={loading}
                className="rounded-lg text-xs"
              >
                <Fingerprint className="h-3.5 w-3.5 mr-1" />
                Instellen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="rounded-lg text-xs text-muted-foreground"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
