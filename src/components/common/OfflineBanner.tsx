import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sticky banner shown when the user goes offline.
 * Mount once at the top of DashboardLayout or App root.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const { online } = useNetworkStatus();

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2',
        'bg-amber-500 text-amber-950 text-sm font-medium py-2 px-4',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Geen internetverbinding — wijzigingen worden niet opgeslagen</span>
    </div>
  );
}
