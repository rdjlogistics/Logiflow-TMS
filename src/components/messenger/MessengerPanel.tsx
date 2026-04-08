import { useRef, useEffect } from 'react';
import { useMessenger } from '@/hooks/useMessenger';
import { useAuth } from '@/hooks/useAuth';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, Radio, Users, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessengerPanelProps {
  tripId: string;
  tripName?: string;
  orderNumber?: string;
  customerName?: string;
  className?: string;
}

export const MessengerPanel = ({
  tripId,
  tripName,
  orderNumber,
  customerName,
  className,
}: MessengerPanelProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessenger(tripId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className={cn('flex flex-col h-full premium-card overflow-hidden', className)}>
      <CardHeader className="flex-shrink-0 border-b border-border bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-badge">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">TMS Messenger</h3>
                {orderNumber && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    #{orderNumber}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {customerName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{customerName}</span>
                  </div>
                )}
                {tripName && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{tripName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <Radio className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-600">Live</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-gradient-to-b from-muted/20 to-transparent">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Berichten laden...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">Nog geen berichten</h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Start de conversatie met de chauffeur of klant
                </p>
              </div>
            ) : (
              <>
                {/* Date separator for first message */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2">Vandaag</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    content={msg.content}
                    senderName={msg.sender_name}
                    senderRole={msg.sender_role}
                    createdAt={msg.created_at}
                    isOwn={msg.sender_role === 'planner'}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <MessageInput
        onSend={(content) => sendMessage(content, 'planner')}
        disabled={loading}
        channelId={channel?.id}
      />
    </Card>
  );
};
