import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type NavApp, isAppleMapsAvailable, openNavigation } from '@/lib/navigation-urls';

interface NavigationChooserProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  label?: string;
  lat?: number | null;
  lng?: number | null;
}

const navApps: Array<{ id: NavApp; name: string; icon: string; color: string; getAvailable: () => boolean }> = [
  {
    id: 'google',
    name: 'Google Maps',
    icon: '🗺️',
    color: 'bg-blue-500/15 border-blue-500/30 hover:bg-blue-500/25',
    getAvailable: () => true,
  },
  {
    id: 'waze',
    name: 'Waze',
    icon: '👻',
    color: 'bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/25',
    getAvailable: () => true,
  },
  {
    id: 'apple',
    name: 'Apple Kaarten',
    icon: '🍎',
    color: 'bg-gray-500/15 border-gray-500/30 hover:bg-gray-500/25',
    getAvailable: isAppleMapsAvailable,
  },
];

export function NavigationChooser({ isOpen, onClose, destination, label, lat, lng }: NavigationChooserProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
          >
            <div className="bg-card rounded-2xl shadow-2xl border border-border/40 overflow-hidden max-w-md mx-auto">
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Navigeren</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {label || destination}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 space-y-2">
                {navApps.map((app) => {
                  const available = app.getAvailable();
                  return (
                    <button
                      key={app.id}
                      disabled={!available}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all touch-manipulation",
                        available
                          ? app.color + ' active:scale-[0.98]'
                          : 'bg-muted/30 border-transparent opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => {
                        if (available) {
                          openNavigation(app.id, destination, lat, lng);
                          onClose();
                        }
                      }}
                    >
                      <span className="text-2xl">{app.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{app.name}</p>
                        {!available && (
                          <p className="text-xs text-muted-foreground">Niet beschikbaar</p>
                        )}
                      </div>
                      {available && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 pt-0">
                <Button variant="outline" className="w-full h-11 rounded-xl" onClick={onClose}>
                  Annuleren
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
