import { useState, useEffect, useRef } from 'react';
import { usePortalAI, PortalType, ContextType, PortalAIMessage } from '@/hooks/usePortalAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bot, 
  Send, 
  Loader2, 
  X, 
  RefreshCw,
  User,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PortalAIPanelProps {
  portalType: PortalType;
  tenantId: string;
  contextType?: ContextType;
  contextId?: string;
  onClose?: () => void;
  title?: string;
}

export const PortalAIPanel = ({
  portalType,
  tenantId,
  contextType,
  contextId,
  onClose,
  title = 'AI Assistent',
}: PortalAIPanelProps) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isFeatureEnabled,
    checkingFeature,
    messages,
    isLoading,
    isSending,
    pendingDraft,
    initConversation,
    sendMessage,
    confirmAction,
    cancelAction,
    resetConversation,
  } = usePortalAI({
    portalType,
    tenantId,
    contextType,
    contextId,
  });

  useEffect(() => {
    if (isFeatureEnabled) {
      initConversation();
    }
  }, [isFeatureEnabled, initConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (checkingFeature) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!isFeatureEnabled) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Bot className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-lg mb-2">AI Assistent niet beschikbaar</h3>
        <p className="text-sm text-muted-foreground max-w-[250px]">
          Deze functie is momenteel niet ingeschakeld voor uw account.
        </p>
      </div>
    );
  }

  const renderMessage = (message: PortalAIMessage) => {
    const isUser = message.role === 'USER';
    const isSystem = message.role === 'SYSTEM';

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 mb-4',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : isSystem 
              ? 'bg-amber-500/20 text-amber-600' 
              : 'bg-gradient-to-br from-primary/20 to-primary-glow/20 text-primary'
        )}>
          {isUser ? (
            <User className="h-4 w-4" />
          ) : isSystem ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </div>
        <div className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-muted/60 rounded-tl-sm'
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          
          {/* Action Cards */}
          {message.action_cards && message.action_cards.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.action_cards.map((card: any, idx: number) => (
                <ActionCard key={idx} card={card} />
              ))}
            </div>
          )}
          
          {/* Evidence Links */}
          {message.evidence_links && message.evidence_links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.evidence_links.map((link: any, idx: number) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
          
          <p className="text-[10px] opacity-60 mt-2">
            {format(new Date(message.created_at), 'HH:mm', { locale: nl })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/25">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {portalType === 'CUSTOMER' ? 'Klant Assistent' : 'Chauffeur Coach'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetConversation}
            className="h-8 w-8 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Gesprek laden...</p>
          </div>
        ) : messages.length === 0 ? (
          <WelcomeMessage portalType={portalType} />
        ) : (
          <>
            {messages.map(renderMessage)}
            {isSending && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm text-muted-foreground">Aan het denken...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </ScrollArea>

      {/* Pending Action Draft */}
      {pendingDraft && (
        <div className="px-4 py-3 border-t border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Actie bevestigen
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {pendingDraft.intent_key}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelAction(pendingDraft.id)}
              className="flex-1 h-9"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={() => confirmAction(pendingDraft.id)}
              className="flex-1 h-9 bg-gradient-to-r from-emerald-500 to-green-500 hover:opacity-90"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Bevestigen
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border/40 bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stel een vraag..."
            disabled={isSending || !!pendingDraft}
            className="flex-1 h-11 rounded-xl bg-muted/50 border-border/40"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending || !!pendingDraft}
            className="h-11 w-11 rounded-xl bg-gradient-to-r from-primary to-primary-glow"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Action Card Component
const ActionCard = ({ card }: { card: any }) => {
  return (
    <Card className="border-border/40 bg-background/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-[10px]">
            {card.type}
          </Badge>
          {card.title && (
            <span className="text-xs font-medium">{card.title}</span>
          )}
        </div>
        {card.content && (
          <p className="text-xs text-muted-foreground">{card.content}</p>
        )}
        {card.items && (
          <ul className="mt-2 space-y-1">
            {card.items.map((item: string, idx: number) => (
              <li key={idx} className="text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

// Welcome Message Component
const WelcomeMessage = ({ portalType }: { portalType: PortalType }) => {
  const suggestions = portalType === 'CUSTOMER' 
    ? [
        'Waar is mijn zending?',
        'Nieuwe zending aanmaken',
        'Waarom wachttijd op factuur?',
        'Schade melden',
      ]
    : [
        'Wat is mijn volgende stap?',
        'Schade melden',
        'Wachtbericht sturen',
        'Help bij checkout',
      ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-primary-glow blur-xl opacity-30 animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-glow flex items-center justify-center shadow-2xl">
          <Bot className="h-10 w-10 text-primary-foreground" />
        </div>
      </div>
      <h3 className="font-display font-bold text-xl mb-2">
        {portalType === 'CUSTOMER' ? 'Hallo! Hoe kan ik helpen?' : 'Hallo chauffeur!'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        {portalType === 'CUSTOMER' 
          ? 'Vraag naar je zendingen, maak een nieuwe aanvraag, of krijg uitleg over je facturen.'
          : 'Ik help je bij het afmelden van stops, incidenten melden, en berichten opstellen.'
        }
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 text-xs text-left justify-start rounded-xl border-border/40 hover:bg-primary/10 hover:border-primary/30"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};
