import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useCopilot, AssistantType, CopilotMessage } from '@/hooks/useCopilot';
import {
  Sparkles,
  Send,
  Loader2,
  Route,
  AlertTriangle,
  Calculator,
  HelpCircle,
  RotateCcw,
  Lightbulb,
  ChevronRight,
  User,
  Bot,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react';

interface CopilotPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantType?: AssistantType;
}

const assistantConfig: Record<AssistantType, { label: string; icon: React.ElementType; color: string }> = {
  dispatch_planner: { label: 'Dispatch', icon: Route, color: 'text-blue-400' },
  control_tower: { label: 'Control', icon: AlertTriangle, color: 'text-amber-400' },
  finance_autopilot: { label: 'Finance', icon: Calculator, color: 'text-green-400' },
  knowledge_search: { label: 'Help', icon: HelpCircle, color: 'text-purple-400' },
};

const MessageBubble = forwardRef<HTMLDivElement, { message: CopilotMessage }>(({ message }, ref) => {
  const isUser = message.role === 'user';
  
  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
        isUser 
          ? 'bg-primary/20 text-primary' 
          : 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={cn(
        'flex-1 max-w-[85%]',
        isUser ? 'text-right' : ''
      )}>
        <div className={cn(
          'inline-block px-4 py-2.5 rounded-2xl text-sm',
          isUser 
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Action Card Component
const ActionCard = forwardRef<HTMLDivElement, { 
  title: string; 
  description: string; 
  status?: string;
  metrics?: { label: string; value: string }[];
  explainability?: { reasons: string[]; confidence: number };
  onApprove?: () => void;
  onReject?: () => void;
}>(({ title, description, status, metrics, explainability, onApprove, onReject }, ref) => (
  <Card ref={ref} className="bg-card/80 border-border/50">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {status && (
          <Badge variant="secondary" className="text-[10px]">
            {status}
          </Badge>
        )}
      </div>

      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((m, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-sm font-semibold">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {explainability && (
        <div className="border-t border-border/50 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Waarom dit voorstel
            </span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {Math.round(explainability.confidence * 100)}% zekerheid
            </Badge>
          </div>
          <ul className="space-y-1">
            {explainability.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(onApprove || onReject) && (
        <div className="flex gap-2 pt-2">
          {onReject && (
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onReject}>
              <X className="w-3 h-3 mr-1" />
              Afwijzen
            </Button>
          )}
          {onApprove && (
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={onApprove}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Goedkeuren
            </Button>
          )}
        </div>
      )}
    </CardContent>
  </Card>
));

ActionCard.displayName = 'ActionCard';

export const CopilotPanel = forwardRef<HTMLDivElement, CopilotPanelProps>(({ 
  open, 
  onOpenChange,
  assistantType: initialAssistant = 'dispatch_planner'
}, ref) => {
  const [activeAssistant, setActiveAssistant] = useState<AssistantType>(initialAssistant);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearConversation 
  } = useCopilot(activeAssistant);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const ActiveIcon = assistantConfig[activeAssistant].icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent ref={ref} side="right" className="w-[400px] sm:w-[450px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">LogiFlow Copilot</SheetTitle>
              <p className="text-xs text-muted-foreground">AI-gestuurde assistent</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={clearConversation}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Assistant Tabs */}
          <Tabs value={activeAssistant} onValueChange={(v) => setActiveAssistant(v as AssistantType)} className="mt-3">
            <TabsList className="w-full h-9 p-1 bg-muted/50">
              {Object.entries(assistantConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key} 
                    className="flex-1 text-xs data-[state=active]:bg-background"
                  >
                    <Icon className={cn("w-3.5 h-3.5 mr-1", config.color)} />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <ActiveIcon className={cn("w-8 h-8", assistantConfig[activeAssistant].color)} />
                </div>
                <h4 className="font-semibold mb-1">
                  {activeAssistant === 'dispatch_planner' && 'AI Dispatch Planner'}
                  {activeAssistant === 'control_tower' && 'AI Control Tower'}
                  {activeAssistant === 'finance_autopilot' && 'AI Finance Autopilot'}
                  {activeAssistant === 'knowledge_search' && 'AI Knowledge Search'}
                </h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {activeAssistant === 'dispatch_planner' && 'Vraag me om ritten te plannen, chauffeurs toe te wijzen, of routes te optimaliseren.'}
                  {activeAssistant === 'control_tower' && 'Ik monitor risico\'s en genereer proactieve alerts voor je operatie.'}
                  {activeAssistant === 'finance_autopilot' && 'Laat me facturen voorbereiden, payouts plannen, of een financieel overzicht maken.'}
                  {activeAssistant === 'knowledge_search' && 'Stel een vraag over LogiFlow en ik help je op weg.'}
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Copilot denkt na...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-card/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Stel een vraag..."
              disabled={isLoading}
              className="flex-1 h-10 bg-background/50"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-10 w-10"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted">K</kbd> voor Command Bar
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
});

CopilotPanel.displayName = 'CopilotPanel';
