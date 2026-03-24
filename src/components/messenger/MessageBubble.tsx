import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { User, Truck, Users, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  senderName: string;
  senderRole: 'planner' | 'chauffeur' | 'klant';
  createdAt: string;
  isOwn: boolean;
}

const roleConfig = {
  planner: {
    icon: Users,
    label: 'Planner',
    avatarBg: 'bg-gradient-to-br from-primary/20 to-primary/10',
    avatarText: 'text-primary',
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  chauffeur: {
    icon: Truck,
    label: 'Chauffeur',
    avatarBg: 'bg-gradient-to-br from-amber-500/20 to-amber-500/10',
    avatarText: 'text-amber-600',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  klant: {
    icon: User,
    label: 'Klant',
    avatarBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/10',
    avatarText: 'text-blue-600',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
};

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(({
  content,
  senderName,
  senderRole,
  createdAt,
  isOwn,
}, ref) => {
  const config = roleConfig[senderRole];
  const Icon = config.icon;

  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-3 max-w-[85%] animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isOwn ? 'ml-auto flex-row-reverse' : ''
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
          config.avatarBg
        )}
      >
        <Icon className={cn('w-4 h-4', config.avatarText)} />
      </div>
      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : '')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{senderName}</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-medium border',
              config.badge
            )}
          >
            {config.label}
          </span>
        </div>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl shadow-sm relative',
            isOwn
              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md'
              : 'bg-card border border-border rounded-bl-md'
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(createdAt), 'HH:mm', { locale: nl })}
          </span>
          {isOwn && (
            <CheckCheck className="w-3.5 h-3.5 text-primary" />
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
