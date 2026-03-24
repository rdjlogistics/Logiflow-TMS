import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Check,
  X,
  Volume2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { GeofenceAlert } from '@/hooks/useGeofenceAlerts';

interface GeofenceAlertPanelProps {
  alerts: GeofenceAlert[];
  onFlyTo?: (lat: number, lng: number) => void;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  newAlertCount: number;
  onClearNew: () => void;
}

// Play alert sound using Web Audio API
function playAlertSound(critical: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = critical ? 880 : 587; // A5 for critical, D5 for warning
    osc.type = 'sine';
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported
  }
}

const GeofenceAlertPanel: React.FC<GeofenceAlertPanelProps> = ({
  alerts,
  onFlyTo,
  onAcknowledge,
  onDismiss,
  newAlertCount,
  onClearNew,
}) => {
  const prevCountRef = useRef(0);

  // Play sound for new alerts
  useEffect(() => {
    if (newAlertCount > 0 && alerts.length > prevCountRef.current) {
      const hasCritical = alerts.some(a => a.severity === 'critical' && a.status === 'open');
      playAlertSound(hasCritical);
      onClearNew();
    }
    prevCountRef.current = alerts.length;
  }, [newAlertCount, alerts, onClearNew]);

  if (alerts.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <Check className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
        <p className="text-xs text-muted-foreground">Geen actieve alerts</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-semibold">Alerts</span>
          <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
            {alerts.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
        <div className="p-2 space-y-1">
          {alerts.map((alert) => {
            const isGeofence = alert.exception_type === 'geofence_violation';
            const Icon = isGeofence ? MapPin : Clock;
            const iconColor = isGeofence ? 'text-destructive' : 'text-amber-500';
            const bgColor = isGeofence ? 'bg-destructive/5 border-destructive/20' : 'bg-amber-500/5 border-amber-500/20';
            const timeAgo = formatDistanceToNow(new Date(alert.created_at), { locale: nl, addSuffix: true });

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted/30 ${bgColor}`}
                onClick={() => {
                  if (alert.latitude && alert.longitude && onFlyTo) {
                    onFlyTo(alert.latitude, alert.longitude);
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{alert.title}</p>
                    {alert.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 ml-5" onClick={(e) => e.stopPropagation()}>
                  {alert.status === 'open' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      <Volume2 className="h-3 w-3" />
                      Bevestig
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
                    onClick={() => onDismiss(alert.id)}
                  >
                    <X className="h-3 w-3" />
                    Afwijzen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default GeofenceAlertPanel;
