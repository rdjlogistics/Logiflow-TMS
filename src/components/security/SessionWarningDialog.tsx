import { motion } from 'framer-motion';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionWarningDialogProps {
  isOpen: boolean;
  timeRemaining: string;
  onExtend: () => void;
  onLogout: () => void;
  isExtending?: boolean;
}

export function SessionWarningDialog({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
  isExtending = false,
}: SessionWarningDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 bg-card border border-border rounded-2xl shadow-2xl"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>

          <h2 className="text-xl font-semibold mb-2">Sessie verloopt binnenkort</h2>
          <p className="text-muted-foreground mb-4">
            Je wordt uitgelogd vanwege inactiviteit.
          </p>

          <div className="flex items-center justify-center gap-2 mb-6 text-2xl font-mono font-bold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>{timeRemaining}</span>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onLogout} className="flex-1">
              Uitloggen
            </Button>
            <Button onClick={onExtend} disabled={isExtending} className="flex-1">
              {isExtending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Sessie verlengen'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
