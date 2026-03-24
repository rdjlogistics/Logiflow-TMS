import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationPrompt = () => {
  const { isSupported, isSubscribed, permission, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const wasDismissed = localStorage.getItem('push_prompt_dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after a delay if not subscribed
    if (!loading && isSupported && !isSubscribed && permission !== 'denied') {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, isSupported, isSubscribed, permission]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
      setDismissed(true);
    }
  };

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-push.js')
        .then(registration => {
          console.log('Push SW registered:', registration.scope);
        })
        .catch(error => {
          console.error('Push SW registration failed:', error);
        });
    }
  }, []);

  if (!showPrompt || dismissed || !isSupported || isSubscribed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Icon and content */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
              >
                <Bell className="w-6 h-6 text-primary" />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-semibold text-foreground mb-1">
                Mis geen ritten!
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Ontvang direct een melding als er een nieuwe rit voor je klaarstaat.
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="flex-1"
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  {loading ? 'Bezig...' : 'Inschakelen'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-muted-foreground"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
