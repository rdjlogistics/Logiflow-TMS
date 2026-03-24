import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TrackingMilestone {
  distance: number;
  label: string;
  notified: boolean;
}

interface UseTrackingNotificationsProps {
  currentDistance: number | null;
  etaMinutes?: number | null;
  isActive: boolean;
  customerName?: string;
}

export const useTrackingNotifications = ({
  currentDistance,
  etaMinutes = null,
  isActive,
  customerName = 'Uw zending',
}: UseTrackingNotificationsProps) => {
  const { toast } = useToast();
  const etaNotifiedRef = useRef(false);
  const milestonesRef = useRef<TrackingMilestone[]>([
    { distance: 30, label: 'binnen 30 km', notified: false },
    { distance: 10, label: 'binnen 10 km', notified: false },
    { distance: 5, label: 'bijna aangekomen (5 km)', notified: false },
    { distance: 1, label: 'bijna bij u (1 km)', notified: false },
    { distance: 0.1, label: 'is gearriveerd', notified: false },
  ]);

  const checkMilestones = useCallback(() => {
    if (!isActive || currentDistance === null) return;

    milestonesRef.current.forEach((milestone, index) => {
      if (!milestone.notified && currentDistance <= milestone.distance) {
        // Only notify if we haven't passed a smaller milestone already
        const smallerMilestoneNotified = milestonesRef.current
          .slice(index + 1)
          .some(m => m.notified);
        
        if (!smallerMilestoneNotified) {
          milestone.notified = true;
          
          // Show toast notification
          toast({
            title: milestone.distance === 0.1 ? '🎉 Aangekomen!' : '📍 Update',
            description: `${customerName} ${milestone.label}`,
            duration: milestone.distance <= 1 ? 10000 : 5000,
          });

          // Request browser notification permission and send
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('LogiFlow Track & Trace', {
              body: `${customerName} ${milestone.label}`,
              icon: '/favicon.ico',
            });
          }
        }
      }
    });
  }, [currentDistance, isActive, customerName, toast]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check milestones when distance changes
  useEffect(() => {
    checkMilestones();
  }, [checkMilestones]);

  // ETA-based notification (< 15 minutes)
  useEffect(() => {
    if (!isActive || etaMinutes === null || etaMinutes > 15 || etaNotifiedRef.current) return;

    etaNotifiedRef.current = true;

    toast({
      title: '🚚 Bijna bij u!',
      description: `${customerName} arriveert over circa ${Math.round(etaMinutes)} minuten`,
      duration: 10000,
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('LogiFlow Track & Trace', {
        body: `${customerName} arriveert over circa ${Math.round(etaMinutes)} minuten`,
        icon: '/favicon.ico',
      });
    }
  }, [etaMinutes, isActive, customerName, toast]);

  // Reset milestones when tracking becomes inactive
  useEffect(() => {
    if (!isActive) {
      etaNotifiedRef.current = false;
      milestonesRef.current.forEach(m => m.notified = false);
    }
  }, [isActive]);

  return {
    requestNotificationPermission: () => {
      if ('Notification' in window) {
        return Notification.requestPermission();
      }
      return Promise.resolve('denied' as NotificationPermission);
    },
    notificationPermission: 'Notification' in window ? Notification.permission : 'denied',
  };
};
