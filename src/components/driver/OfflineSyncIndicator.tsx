import { Button } from '@/components/ui/button';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineSyncIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

export const OfflineSyncIndicator = ({
  isOnline,
  pendingCount,
  isSyncing,
  onSync,
}: OfflineSyncIndicatorProps) => {
  // Show success state briefly when online with no pending (could add animation)
  if (isOnline && pendingCount === 0) {
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: 'Geen verbinding',
        sublabel: pendingCount > 0 
          ? `${pendingCount} afmelding${pendingCount > 1 ? 'en' : ''} wachtend`
          : 'Afmeldingen worden lokaal opgeslagen',
        showPulse: true,
      };
    }

    if (isSyncing) {
      return {
        icon: Loader2,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        label: 'Synchroniseren...',
        sublabel: `${pendingCount} afmelding${pendingCount > 1 ? 'en' : ''} versturen`,
        showPulse: false,
        iconSpin: true,
      };
    }

    if (pendingCount > 0) {
      return {
        icon: Upload,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        label: 'Wachtend op sync',
        sublabel: `${pendingCount} afmelding${pendingCount > 1 ? 'en' : ''} lokaal opgeslagen`,
        showPulse: false,
      };
    }

    return {
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      label: 'Alles gesynchroniseerd',
      sublabel: '',
      showPulse: false,
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all',
      config.bgColor,
      config.borderColor
    )}>
      <div className="relative">
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center',
          config.bgColor
        )}>
          <StatusIcon className={cn(
            'h-5 w-5',
            config.iconColor,
            config.iconSpin && 'animate-spin'
          )} />
        </div>
        {config.showPulse && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', config.iconColor)}>
          {config.label}
        </p>
        {config.sublabel && (
          <p className="text-xs text-muted-foreground truncate">
            {config.sublabel}
          </p>
        )}
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <Button
          variant="secondary"
          size="sm"
          className="h-9 px-3 shadow-sm"
          onClick={onSync}
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Sync
        </Button>
      )}
      
      {pendingCount > 0 && (
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
          isOnline ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
        )}>
          {pendingCount}
        </div>
      )}
    </div>
  );
};
