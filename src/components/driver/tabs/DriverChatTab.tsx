import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMessenger } from '@/hooks/useMessenger';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, 
  Send, 
  Loader2,
  Truck,
  Users,
  User,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Trip {
  id: string;
  order_number?: string;
  pickup_city?: string;
  delivery_city?: string;
  status?: string;
}

interface DriverChatTabProps {
  trips?: Trip[];
  activeTrip?: Trip | null;
  onStartChat?: () => void;
}

const roleConfig = {
  planner: {
    icon: Users,
    label: 'Planner',
    bg: 'bg-primary/20',
    text: 'text-primary',
  },
  chauffeur: {
    icon: Truck,
    label: 'Chauffeur',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
  },
  klant: {
    icon: User,
    label: 'Klant',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
  },
};

export function DriverChatTab({ trips = [], activeTrip, onStartChat }: DriverChatTabProps) {
  const { user } = useAuth();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(activeTrip?.id || null);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentTripId = selectedTripId || activeTrip?.id;
  const { messages, loading, isSending, sendMessage, channel } = useMessenger(currentTripId);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;
    const text = newMessage;
    setNewMessage('');
    await sendMessage(text, 'chauffeur');
  }, [newMessage, isSending, sendMessage]);

  // No trip selected and no active trip
  if (!currentTripId) {
    const availableTrips = trips;

    return (
      <div className="flex-1 flex flex-col overscroll-contain">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-white/95">Chat</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
          <div
            className="flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-white/30" />
            </div>
            <p className="font-semibold text-white/80 mb-1">Geen actieve rit</p>
            <p className="text-sm text-white/40 mb-6 max-w-xs">
              Selecteer een rit hieronder om een chat te starten met de planning.
            </p>
          </div>

          {availableTrips.length > 0 && (
            <div className="w-full space-y-2 mt-4">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wide px-1">
                Beschikbare ritten
              </p>
              {availableTrips.map((trip, i) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTripId(trip.id)}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/90 text-sm">
                        {trip.order_number || `${trip.pickup_city} → ${trip.delivery_city}`}
                      </p>
                      <p className="text-xs text-white/40">{trip.pickup_city} → {trip.delivery_city}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentTrip = trips.find(t => t.id === currentTripId) || activeTrip;

  return (
    <div className="flex-1 flex flex-col overscroll-contain">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white/95">Planning Chat</h1>
            <p className="text-xs text-white/40">
              {currentTrip?.order_number || `${currentTrip?.pickup_city} → ${currentTrip?.delivery_city}`}
            </p>
          </div>
          {channel && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4 pb-32">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-white/20" />
              </div>
              <p className="font-semibold text-white/70 mb-1">Nog geen berichten</p>
              <p className="text-sm text-white/40">Stuur een bericht naar de planning</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const role = (msg.sender_role as 'planner' | 'chauffeur' | 'klant') || 'planner';
                const isOwn = role === 'chauffeur';
                const config = roleConfig[role] || roleConfig.planner;
                const Icon = config.icon;

                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2.5 max-w-[85%]', isOwn ? 'ml-auto flex-row-reverse' : '')}
                  >
                    <div className={cn('w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center', config.bg)}>
                      <Icon className={cn('w-4 h-4', config.text)} />
                    </div>
                    <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : '')}>
                      <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span className="font-medium text-white/60">{msg.sender_name}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium border', 
                          `${config.bg} ${config.text} border-white/10`
                        )}>
                          {config.label}
                        </span>
                      </div>
                      <div className={cn(
                        'px-4 py-2.5 rounded-2xl',
                        isOwn
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md'
                          : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-md'
                      )}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30">
                          {format(new Date(msg.created_at), 'HH:mm', { locale: nl })}
                        </span>
                        {isOwn && <CheckCheck className="w-3 h-3 text-primary/60" />}
                      </div>
                    </div>
                  </div>
                );
              })}
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Typ een bericht..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isSending}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="rounded-xl bg-primary hover:bg-primary/80 h-10 w-10 flex-shrink-0"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
