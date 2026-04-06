import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Bot,
  Phone,
  MapPin,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Conversation {
  id: string;
  trip_id: string;
  driver_id: string;
  status: string;
  ai_confidence: number;
  ai_reasoning: string;
  created_at: string;
  responded_at: string | null;
  trips: {
    pickup_city: string;
    delivery_city: string;
    trip_date: string;
  };
  drivers: {
    name: string;
    phone: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  direction: 'outbound' | 'inbound';
  message_type: string;
  content: string;
  ai_interpretation: {
    intent: string;
    confidence: number;
    sentiment: string;
  } | null;
  created_at: string;
}

export function DispatchConversationsPanel() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [mockResponse, setMockResponse] = useState('');

  // Fetch all conversations
  const { data: conversations, refetch } = useQuery({
    queryKey: ['dispatch-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_conversations')
        .select(`
          *,
          trips (pickup_city, delivery_city, trip_date),
          drivers (name, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ['dispatch-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('dispatch_messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        direction: m.direction as 'outbound' | 'inbound',
        ai_interpretation: m.ai_interpretation as Message['ai_interpretation'],
      })) as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`conversations-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dispatch_conversations' },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispatch_messages' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleSimulateResponse = async () => {
    if (!selectedConversation || !mockResponse.trim()) return;

    try {
      await supabase.functions.invoke('ai-dispatch-engine', {
        body: {
          action: 'process_response',
          conversationId: selectedConversation,
          responseText: mockResponse,
        },
      });
      setMockResponse('');
      refetch();
    } catch (error) {
      console.error('Simulate response error:', error);
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedConversation) return;

    try {
      await supabase.functions.invoke('ai-dispatch-engine', {
        body: {
          action: 'confirm_assign',
          conversationId: selectedConversation,
        },
      });
      refetch();
      setSelectedConversation(null);
    } catch (error) {
      console.error('Confirm assign error:', error);
    }
  };

  const handleCancelConversation = async () => {
    if (!selectedConversation) return;

    try {
      await supabase.functions.invoke('ai-dispatch-engine', {
        body: {
          action: 'cancel',
          conversationId: selectedConversation,
        },
      });
      refetch();
      setSelectedConversation(null);
    } catch (error) {
      console.error('Cancel conversation error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400">⏳ Wachtend</Badge>;
      case 'awaiting_response':
        return <Badge className="bg-blue-500/20 text-blue-400">📱 Wacht op Antwoord</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400">✅ Bevestigd</Badge>;
      case 'declined':
        return <Badge className="bg-red-500/20 text-red-400">❌ Geweigerd</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/20 text-gray-400">⏰ Verlopen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeConversations = conversations?.filter(c => 
    ['pending', 'awaiting_response'].includes(c.status)
  ) || [];

  const historyConversations = conversations?.filter(c => 
    !['pending', 'awaiting_response'].includes(c.status)
  ) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Conversations List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Dispatch Gesprekken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {/* Active Conversations */}
            {activeConversations.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  Actieve Gesprekken ({activeConversations.length})
                </h4>
                {activeConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversation === conv.id}
                    onSelect={() => setSelectedConversation(conv.id)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}

            <Separator className="my-4" />

            {/* History */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Geschiedenis ({historyConversations.length})
              </h4>
              {historyConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConversation === conv.id}
                  onSelect={() => setSelectedConversation(conv.id)}
                  getStatusBadge={getStatusBadge}
                  isHistory
                />
              ))}
            </div>

            {(!conversations || conversations.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nog geen gesprekken gestart</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            Gespreksdetails
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedConversation ? (
            <div className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-[350px] border rounded-lg p-3 bg-background/50">
                <div className="space-y-3">
                  {messages?.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {(!messages || messages.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">Geen berichten</p>
                  )}
                </div>
              </ScrollArea>

              {/* Response input — for processing incoming driver replies */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  📱 Verwerk chauffeur-antwoord
                </p>
                <div className="flex gap-2">
                  <Input
                    value={mockResponse}
                    onChange={(e) => setMockResponse(e.target.value)}
                    placeholder="Plak het antwoord van de chauffeur hier"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulateResponse()}
                  />
                  <Button size="icon" onClick={handleSimulateResponse}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmAssign}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Bevestig Toewijzing
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleCancelConversation}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Annuleer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>Selecteer een gesprek om details te bekijken</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  isHistory?: boolean;
}

function ConversationItem({ conversation, isSelected, onSelect, getStatusBadge, isHistory }: ConversationItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-all",
        isSelected
          ? "bg-primary/10 border-primary/50"
          : "bg-card/50 border-border/50 hover:border-primary/30 hover:bg-accent/50",
        isHistory && "opacity-70"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{conversation.drivers?.name || 'Onbekend'}</span>
        </div>
        {getStatusBadge(conversation.status)}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <MapPin className="h-3 w-3" />
        <span>{conversation.trips?.pickup_city} → {conversation.trips?.delivery_city}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Bot className="h-3 w-3" />
          {conversation.ai_confidence}% confidence
        </span>
        <span>
          {formatDistanceToNow(new Date(conversation.created_at), { 
            addSuffix: true, 
            locale: nl 
          })}
        </span>
      </div>
    </button>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] p-3 rounded-2xl",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className={cn(
            "text-[10px]",
            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {new Date(message.created_at).toLocaleTimeString('nl-NL', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {message.ai_interpretation && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] px-1.5 py-0",
                message.ai_interpretation.intent === 'yes' && "bg-green-500/20 text-green-400",
                message.ai_interpretation.intent === 'no' && "bg-red-500/20 text-red-400",
                message.ai_interpretation.intent === 'unclear' && "bg-yellow-500/20 text-yellow-400"
              )}
            >
              AI: {message.ai_interpretation.intent} ({message.ai_interpretation.confidence}%)
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
