import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GPSQualityIndicatorProps {
  accuracy: number | null | undefined;
  lastUpdate: string | null | undefined;
  className?: string;
}

const getSignalQuality = (accuracy: number | null | undefined, lastUpdate: string | null | undefined) => {
  // Check if data is stale (more than 60 seconds old)
  if (lastUpdate) {
    const timeDiff = Date.now() - new Date(lastUpdate).getTime();
    if (timeDiff > 60000) {
      return { level: 'offline', label: 'Geen signaal', color: 'text-destructive' };
    }
  } else {
    return { level: 'offline', label: 'Geen signaal', color: 'text-destructive' };
  }

  if (!accuracy) {
    return { level: 'unknown', label: 'Onbekend', color: 'text-muted-foreground' };
  }

  // accuracy is in meters - lower is better
  if (accuracy <= 10) {
    return { level: 'excellent', label: 'Uitstekend', color: 'text-green-500' };
  } else if (accuracy <= 30) {
    return { level: 'good', label: 'Goed', color: 'text-green-500' };
  } else if (accuracy <= 100) {
    return { level: 'fair', label: 'Redelijk', color: 'text-amber-500' };
  } else {
    return { level: 'poor', label: 'Zwak', color: 'text-orange-500' };
  }
};

const SignalIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'excellent':
      return <SignalHigh className="w-4 h-4" />;
    case 'good':
      return <SignalMedium className="w-4 h-4" />;
    case 'fair':
      return <SignalLow className="w-4 h-4" />;
    case 'poor':
      return <Signal className="w-4 h-4" />;
    case 'offline':
      return <WifiOff className="w-4 h-4" />;
    default:
      return <Wifi className="w-4 h-4" />;
  }
};

export const GPSQualityIndicator = ({
  accuracy,
  lastUpdate,
  className,
}: GPSQualityIndicatorProps) => {
  const quality = getSignalQuality(accuracy, lastUpdate);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center gap-1.5', quality.color)}>
        <SignalIcon level={quality.level} />
        <span className="text-xs font-medium">{quality.label}</span>
      </div>
      {accuracy && quality.level !== 'offline' && (
        <span className="text-[10px] text-muted-foreground">
          ±{Math.round(accuracy)}m
        </span>
      )}
    </div>
  );
};
