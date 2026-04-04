import { ShieldCheck } from 'lucide-react';
import { useSessionRefreshIndicator } from '@/hooks/useSessionRefreshIndicator';

export function SessionRefreshIndicator() {
  const { show, lastRefreshedAt } = useSessionRefreshIndicator();

  const timeStr = lastRefreshedAt
    ? lastRefreshedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md shadow-lg">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-300">
          Sessie verlengd
        </span>
        {timeStr && (
          <span className="text-xs text-emerald-400/60">{timeStr}</span>
        )}
      </div>
    </div>
  );
}
