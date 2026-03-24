import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingUploads?: number;
  isSyncing?: boolean;
  syncProgress?: { current: number; total: number };
}

export const OfflineBanner = ({ isOnline, pendingUploads = 0, isSyncing, syncProgress }: OfflineBannerProps) => {
  const showBanner = !isOnline || isSyncing;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 overflow-hidden"
        >
          {isSyncing && syncProgress ? (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-400">
                  🔄 Bezig met synchroniseren... ({syncProgress.current}/{syncProgress.total})
                </p>
              </div>
            </div>
          ) : !isOnline ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400">
                  📱 Offline — je gegevens worden lokaal opgeslagen
                  {pendingUploads > 0 && ` (${pendingUploads} wachtend)`}
                </p>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
