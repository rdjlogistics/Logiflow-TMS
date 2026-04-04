import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCopilot, AssistantType, CopilotMessage } from '@/hooks/useCopilot';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  User,
  Bot,
  X,
} from 'lucide-react';

interface CopilotPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantType?: AssistantType;
}

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
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

export const CopilotPanel = forwardRef<HTMLDivElement, CopilotPanelProps>(({ 
  open, 
  onOpenChange,
  assistantType: initialAssistant = 'dispatch_planner'
}, ref) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearConversation 
  } = useCopilot(initialAssistant);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent ref={ref} side="right" className="w-[400px] sm:w-[450px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">LogiFlow AI</SheetTitle>
              <p className="text-xs text-muted-foreground">Jouw intelligente TMS assistent</p>
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
        </SheetHeader>

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">LogiFlow AI Assistent</h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Stel een vraag over ritten, planning, facturatie, of laat me je helpen met je dagelijkse taken.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {[
                    'Plan vandaag',
                    'Toon uitzonderingen',
                    'Te factureren orders',
                    'Chauffeur status',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors border border-border/50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI denkt na...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

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
            <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted">K</kbd> voor snelle toegang
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
});

CopilotPanel.displayName = 'CopilotPanel';
