import { useEffect, useState } from 'react';
import { Check, Building2, Package, Bot, LayoutDashboard, Rocket, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LaunchSequenceProps {
  companyName: string;
  tmsPlan: string | null;
  aiPlan: string | null;
  dashboardPreset: string | null;
  saving: boolean;
  onLaunch: () => void;
}

const CHECKLIST = [
  { key: 'company', icon: Building2, label: 'Bedrijf', color: 'text-blue-500', bg: 'bg-blue-500/15' },
  { key: 'tms', icon: Package, label: 'TMS Pakket', color: 'text-emerald-500', bg: 'bg-emerald-500/15' },
  { key: 'ai', icon: Bot, label: 'AI Co-pilot', color: 'text-violet-500', bg: 'bg-violet-500/15' },
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-amber-500', bg: 'bg-amber-500/15' },
];

export const LaunchSequence = ({ companyName, tmsPlan, aiPlan, dashboardPreset, saving, onLaunch }: LaunchSequenceProps) => {
  const [revealedItems, setRevealedItems] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    CHECKLIST.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedItems(i + 1), 400 + i * 350));
    });
    timers.push(setTimeout(() => setShowConfetti(true), 400 + CHECKLIST.length * 350 + 200));
    return () => timers.forEach(clearTimeout);
  }, []);

  const getValue = (key: string) => {
    switch (key) {
      case 'company': return companyName || 'Niet ingevuld';
      case 'tms': return tmsPlan || 'Growth';
      case 'ai': return aiPlan || 'Niet geselecteerd';
      case 'dashboard': return dashboardPreset || 'Standaard';
      default: return '';
    }
  };

  const isConfigured = (key: string) => {
    switch (key) {
      case 'company': return !!companyName;
      case 'tms': return !!tmsPlan;
      case 'ai': return !!aiPlan;
      case 'dashboard': return true;
      default: return false;
    }
  };

  return (
    <div className="text-center space-y-8 py-8 sm:py-12 relative">
      {/* Confetti particles */}
        {showConfetti && (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`particle-${i}`}
                className="absolute left-1/2 top-8 pointer-events-none"
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    ['bg-primary', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-blue-500', 'bg-pink-500'][i % 6],
                  )}
                />
              </div>
            ))}
          </>
        )}
      {/* Icon */}
      <div
        className="inline-flex items-center justify-center w-18 h-18 rounded-[22px] bg-gradient-to-br from-emerald-500 to-green-400 shadow-2xl shadow-emerald-500/25"
        style={{ width: 72, height: 72 }}
      >
        <div
        >
          <Sparkles className="h-9 w-9 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2
          className="text-2xl sm:text-3xl font-display font-light tracking-tight"
        >
          Alles is <span className="font-semibold">klaar</span>
        </h2>
        <p
          className="text-muted-foreground/60 font-light text-sm"
        >
          Je LogiFlow omgeving is geconfigureerd
        </p>
      </div>

      {/* Sequential checklist */}
      <div className="max-w-sm mx-auto space-y-3">
        {CHECKLIST.map((item, i) => {
          const revealed = i < revealedItems;
          const configured = isConfigured(item.key);

          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08]"
            >
              <div className="flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', item.bg)}>
                  <item.icon className={cn('h-4.5 w-4.5', item.color)} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">{item.label}</p>
                  <p className="font-medium text-sm mt-0.5 capitalize">{getValue(item.key)}</p>
                </div>
              </div>
                {revealed && (
                  <div
                  >
                    {configured ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Later</span>
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Trial badge */}
      <div
        className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 backdrop-blur-xl max-w-sm mx-auto"
      >
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          30 dagen gratis trial
        </p>
        <p className="text-xs text-emerald-600/50 dark:text-emerald-400/40 mt-1 leading-relaxed">
          Geen creditcard nodig. Volledige toegang tot alle functies.
        </p>
      </div>

      {/* Launch button */}
      <button
        onClick={onLaunch}
        disabled={saving}
        className={cn(
          'inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-200',
          'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
          'shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 hover:-translate-y-0.5',
          'active:scale-[0.98]',
          saving && 'opacity-70 pointer-events-none',
        )}
      >
        {saving ? (
          <div>
            <Rocket className="h-5 w-5" />
          </div>
        ) : (
          <Rocket className="h-5 w-5" />
        )}
        {saving ? 'Even geduld...' : 'Start met LogiFlow'}
      </button>
    </div>
  );
};
