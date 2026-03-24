import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useSessionRefreshIndicator } from '@/hooks/useSessionRefreshIndicator';

export function SessionRefreshIndicator() {
  const { show, lastRefreshedAt } = useSessionRefreshIndicator();

  const timeStr = lastRefreshedAt
    ? lastRefreshedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md shadow-lg">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              Sessie verlengd
            </span>
            {timeStr && (
              <span className="text-xs text-emerald-400/60">{timeStr}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
