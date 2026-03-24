import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Satellite, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GPSDebugOverlayProps {
  isTracking: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
  } | null;
  permissionStatus: PermissionState | null;
  tripId?: string;
  error?: string | null;
}

export const GPSDebugOverlay = ({
  isTracking,
  currentLocation,
  permissionStatus,
  tripId,
  error,
}: GPSDebugOverlayProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 left-3 right-3 z-50 md:left-auto md:right-4 md:max-w-[400px]"
    >
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isTracking ? "bg-emerald-400 animate-pulse" : "bg-red-400"
            )} />
            <Satellite className="h-4 w-4 text-white/60" />
            <span className="text-sm font-medium text-white/90">
              GPS {isTracking ? 'Actief' : 'Inactief'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentLocation && (
              <span className="text-xs text-emerald-400 font-mono">
                {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </span>
            )}
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronUp className="h-4 w-4 text-white/40" />
            )}
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10"
            >
              <div className="px-4 py-3 space-y-2 text-xs font-mono">
                <Row label="Permissie" value={permissionStatus || 'onbekend'} color={permissionStatus === 'granted' ? 'text-emerald-400' : 'text-amber-400'} />
                <Row label="Trip ID" value={tripId ? tripId.slice(0, 12) + '…' : 'geen'} color={tripId ? 'text-blue-400' : 'text-white/40'} />
                <Row label="Tracking" value={isTracking ? '✅ Actief' : '❌ Gestopt'} />
                {currentLocation && (
                  <>
                    <Row label="Lat" value={currentLocation.latitude.toFixed(6)} />
                    <Row label="Lng" value={currentLocation.longitude.toFixed(6)} />
                    <Row label="Nauwkeurigheid" value={currentLocation.accuracy ? `${currentLocation.accuracy.toFixed(0)}m` : '—'} />
                    <Row label="Snelheid" value={currentLocation.speed ? `${(currentLocation.speed * 3.6).toFixed(0)} km/h` : '—'} />
                    <Row label="Richting" value={currentLocation.heading ? `${currentLocation.heading.toFixed(0)}°` : '—'} />
                  </>
                )}
                {error && <Row label="Fout" value={error} color="text-red-400" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const Row = ({ label, value, color = 'text-white/80' }: { label: string; value: string; color?: string }) => (
  <div className="flex justify-between">
    <span className="text-white/40">{label}</span>
    <span className={color}>{value}</span>
  </div>
);
