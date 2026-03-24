import { cn } from "@/lib/utils";

type StatusVariant =
  // Trip statuses
  | 'aanvraag' | 'gepland' | 'onderweg' | 'afgerond' | 'geannuleerd'
  | 'offerte' | 'draft' | 'geladen' | 'afgeleverd' | 'gecontroleerd' | 'gefactureerd'
  // Invoice statuses
  | 'concept' | 'verzonden' | 'betaald' | 'vervallen' | 'gedeeltelijk_betaald'
  // Driver statuses
  | 'active' | 'inactive' | 'on_leave'
  // Generic
  | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  | string;

const STATUS_STYLES: Record<string, string> = {
  // Trip
  aanvraag:         'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  gepland:          'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  onderweg:         'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  afgerond:         'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  geannuleerd:      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  offerte:          'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  draft:            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  geladen:          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  afgeleverd:       'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  gecontroleerd:    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  gefactureerd:     'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  // Invoice
  concept:          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  verzonden:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  betaald:          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  vervallen:        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  gedeeltelijk_betaald: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  // Driver
  active:           'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  on_leave:         'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  // Generic
  success:          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning:          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  error:            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info:             'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  neutral:          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_LABELS: Record<string, string> = {
  aanvraag: 'Aanvraag',
  gepland: 'Gepland',
  onderweg: 'Onderweg',
  afgerond: 'Afgerond',
  geannuleerd: 'Geannuleerd',
  offerte: 'Offerte',
  draft: 'Concept',
  geladen: 'Geladen',
  afgeleverd: 'Afgeleverd',
  gecontroleerd: 'Gecontroleerd',
  gefactureerd: 'Gefactureerd',
  concept: 'Concept',
  verzonden: 'Verzonden',
  betaald: 'Betaald',
  vervallen: 'Vervallen',
  gedeeltelijk_betaald: 'Deels betaald',
  active: 'Actief',
  inactive: 'Inactief',
  on_leave: 'Verlof',
};

interface StatusBadgeProps {
  status: StatusVariant;
  /** Override display label */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, label, size = 'md', className, dot = false }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.neutral;
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        styles,
        className,
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 shrink-0" />
      )}
      {displayLabel}
    </span>
  );
}
