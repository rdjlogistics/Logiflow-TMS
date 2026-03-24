/**
 * Batch T16: StatusBadge
 * Color-coded badges for LogiFlow statuses.
 * Props: status, variant (dot | pill | tag)
 *
 * Supported statuses: actief, pending, geblokkeerd, voltooid, concept, verzonden,
 * betaald, vervallen, gepland, onderweg, afgerond, geannuleerd, draft, geladen,
 * afgeleverd, gecontroleerd, gefactureerd, open, in_review, approved, rejected
 */
import { cn } from '@/lib/utils';

type StatusVariant = 'dot' | 'pill' | 'tag';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

// Map status strings to Tailwind color tokens
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  // Active / positive
  actief:        { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  active:        { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  betaald:       { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  voltooid:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  afgerond:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  afgeleverd:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  gecontroleerd: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  gefactureerd:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  approved:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },

  // In progress / blue
  onderweg:      { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  in_progress:   { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  in_review:     { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  verzonden:     { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  geladen:       { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: 'bg-blue-400' },

  // Planned / yellow
  gepland:       { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  pending:       { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  open:          { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: 'bg-amber-400' },

  // Draft / neutral
  concept:       { bg: 'bg-white/10',       text: 'text-white/60',    dot: 'bg-white/40' },
  draft:         { bg: 'bg-white/10',       text: 'text-white/60',    dot: 'bg-white/40' },
  aanvraag:      { bg: 'bg-white/10',       text: 'text-white/60',    dot: 'bg-white/40' },
  offerte:       { bg: 'bg-purple-500/15',  text: 'text-purple-400',  dot: 'bg-purple-400' },

  // Warning / partial
  gedeeltelijk_betaald: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  vervallen:     { bg: 'bg-orange-500/15',  text: 'text-orange-400',  dot: 'bg-orange-400' },

  // Blocked / error
  geblokkeerd:   { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: 'bg-red-400' },
  geannuleerd:   { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: 'bg-red-400' },
  rejected:      { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: 'bg-red-400' },
  expired:       { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: 'bg-red-400' },
};

const DEFAULT_COLOR = { bg: 'bg-white/10', text: 'text-white/60', dot: 'bg-white/40' };

// Human-readable Dutch labels for known statuses
const STATUS_LABELS: Record<string, string> = {
  actief: 'Actief',
  active: 'Actief',
  betaald: 'Betaald',
  voltooid: 'Voltooid',
  afgerond: 'Afgerond',
  afgeleverd: 'Afgeleverd',
  gecontroleerd: 'Gecontroleerd',
  gefactureerd: 'Gefactureerd',
  approved: 'Goedgekeurd',
  onderweg: 'Onderweg',
  in_progress: 'Bezig',
  in_review: 'In beoordeling',
  verzonden: 'Verzonden',
  geladen: 'Geladen',
  gepland: 'Gepland',
  pending: 'In behandeling',
  open: 'Open',
  concept: 'Concept',
  draft: 'Concept',
  aanvraag: 'Aanvraag',
  offerte: 'Offerte',
  gedeeltelijk_betaald: 'Gedeeltelijk betaald',
  vervallen: 'Vervallen',
  geblokkeerd: 'Geblokkeerd',
  geannuleerd: 'Geannuleerd',
  rejected: 'Afgewezen',
  expired: 'Verlopen',
};

function getLabel(status: string): string {
  return STATUS_LABELS[status.toLowerCase()] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

function getColors(status: string) {
  return STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR;
}

export function StatusBadge({ status, variant = 'pill', className }: StatusBadgeProps) {
  const colors = getColors(status);
  const label = getLabel(status);

  if (variant === 'dot') {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span
          className={cn('inline-block w-2 h-2 rounded-full', colors.dot)}
        />
        <span className={cn('text-sm', colors.text)}>{label}</span>
      </span>
    );
  }

  if (variant === 'tag') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border',
          colors.bg,
          colors.text,
          'border-current/20',
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
        {label}
      </span>
    );
  }

  // Default: pill
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  );
}
