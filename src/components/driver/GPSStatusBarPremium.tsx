import { motion } from 'framer-motion';
import { 
  Navigation, 
  MapPin, 
  WifiOff,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GPSStatusBarPremiumProps {
  isTracking: boolean;
  permissionStatus: PermissionState | null;
  accuracy: number | null;
  onRequestPermission: () => void;
  onToggleTracking: () => void;
  className?: string;
}

// Premium signal strength bars with animation
const SignalStrengthBars = ({ level }: { level: 0 | 1 | 2 | 3 | 4 }) => {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[1, 2, 3, 4].map((bar) => (
        <motion.div
          key={bar}
          initial={{ height: 0 }}
          animate={{ 
            height: bar === 1 ? 5 : bar === 2 ? 9 : bar === 3 ? 13 : 17,
          }}
          transition={{ delay: bar * 0.1, type: 'spring', stiffness: 300 }}
          className={cn(
            'w-1.5 rounded-sm',
            bar <= level 
              ? level >= 3 
                ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' 
                : level >= 2 
                  ? 'bg-gradient-to-t from-amber-500 to-amber-400' 
                  : 'bg-gradient-to-t from-orange-500 to-orange-400'
              : 'bg-white/10'
          )}
        />
      ))}
    </div>
  );
};

// Calculate signal level from accuracy
const getSignalLevel = (accuracy: number | null): 0 | 1 | 2 | 3 | 4 => {
  if (!accuracy) return 0;
  if (accuracy <= 10) return 4;
  if (accuracy <= 30) return 3;
  if (accuracy <= 100) return 2;
  return 1;
};

export const GPSStatusBarPremium = ({
  isTracking,
  permissionStatus,
  accuracy,
  onRequestPermission,
  onToggleTracking,
  className,
}: GPSStatusBarPremiumProps) => {
  const signalLevel = getSignalLevel(accuracy);
  
  const getStatusInfo = () => {
    if (permissionStatus === 'denied') {
      return {
        icon: WifiOff,
        label: 'GPS geblokkeerd',
        description: 'Sta locatie toe in instellingen',
        gradient: 'from-red-500/20 to-red-600/10',
        iconColor: 'text-red-400',
        borderGlow: 'shadow-red-500/20',
        showSignal: false,
      };
    }
    
    if (permissionStatus === 'prompt' || permissionStatus === null) {
      return {
        icon: AlertTriangle,
        label: 'GPS niet actief',
        description: 'Tik om locatie toe te staan',
        gradient: 'from-amber-500/20 to-orange-500/10',
        iconColor: 'text-amber-400',
        borderGlow: 'shadow-amber-500/20',
        showSignal: false,
      };
    }

    if (!isTracking) {
      return {
        icon: MapPin,
        label: 'GPS gereed',
        description: 'Start een rit om te delen',
        gradient: 'from-white/5 to-white/[0.02]',
        iconColor: 'text-white/60',
        borderGlow: '',
        showSignal: false,
      };
    }

    if (accuracy !== null) {
      const qualityLabels: Record<number, string> = {
        4: 'Uitstekend',
        3: 'Goed',
        2: 'Redelijk',
        1: 'Zwak',
        0: 'Geen signaal',
      };
      
      return {
        icon: Navigation,
        label: 'GPS actief',
        description: `${qualityLabels[signalLevel]} • ±${Math.round(accuracy)}m`,
        gradient: signalLevel >= 3 
          ? 'from-emerald-500/20 to-cyan-500/10' 
          : signalLevel >= 2 
            ? 'from-amber-500/20 to-orange-500/10' 
            : 'from-orange-500/20 to-red-500/10',
        iconColor: signalLevel >= 3 ? 'text-emerald-400' : signalLevel >= 2 ? 'text-amber-400' : 'text-orange-400',
        borderGlow: signalLevel >= 3 ? 'shadow-emerald-500/20' : signalLevel >= 2 ? 'shadow-amber-500/20' : 'shadow-orange-500/20',
        showSignal: true,
      };
    }

    return {
      icon: Loader2,
      label: 'Locatie zoeken...',
      description: 'Even geduld',
      gradient: 'from-primary/20 to-pink-500/10',
      iconColor: 'text-primary',
      borderGlow: 'shadow-primary/20',
      showSignal: false,
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  const handleClick = () => {
    if (permissionStatus !== 'granted') {
      onRequestPermission();
    }
  };

  return (
    <motion.div 
      className={cn(
        'relative cursor-pointer rounded-2xl overflow-hidden',
        className
      )}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Background with gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-r backdrop-blur-xl border border-white/10',
        status.gradient,
        status.borderGlow && `shadow-lg ${status.borderGlow}`
      )} />
      
      {/* Animated glow for active tracking */}
      {isTracking && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      
      <div className="relative p-4">
        <div className="flex items-center gap-4">
          {/* Icon with animated background */}
          <motion.div 
            className={cn(
              'relative w-12 h-12 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10'
            )}
            animate={isTracking ? { 
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0)',
                '0 0 20px 0 rgba(16, 185, 129, 0.3)',
                '0 0 0 0 rgba(16, 185, 129, 0)'
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <StatusIcon className={cn(
              'w-6 h-6',
              status.iconColor,
              StatusIcon === Loader2 && 'animate-spin'
            )} />
            
            {/* Live pulse indicator */}
            {isTracking && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white/90">{status.label}</span>
              {isTracking && (
                <motion.div 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
                </motion.div>
              )}
            </div>
            <p className="text-sm text-white/50">{status.description}</p>
          </div>
          
          {status.showSignal && (
            <div className="flex flex-col items-center gap-1">
              <SignalStrengthBars level={signalLevel} />
              <span className="text-[10px] text-white/40 font-medium">
                {signalLevel}/4
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};