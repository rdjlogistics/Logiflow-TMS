import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  Dialog, 
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Search,
  Route,
  FileText,
  AlertTriangle,
  HelpCircle,
  Truck,
  Users,
  Calculator,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Command,
} from 'lucide-react';

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: string) => void;
}

interface IntentChip {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  command: string;
}

const intentChips: IntentChip[] = [
  { id: 'plan', label: 'Plan', icon: Route, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', command: '/plan' },
  { id: 'dispatch', label: 'Dispatch', icon: Truck, color: 'bg-green-500/20 text-green-400 border-green-500/30', command: '/dispatch' },
  { id: 'invoice', label: 'Factureren', icon: FileText, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', command: '/invoice' },
  { id: 'alert', label: 'Alert', icon: AlertTriangle, color: 'bg-red-500/20 text-red-400 border-red-500/30', command: '/alert' },
  { id: 'search', label: 'Zoeken', icon: Search, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', command: '/search' },
  { id: 'help', label: 'Help', icon: HelpCircle, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', command: '/help' },
];

const quickActions = [
  { id: 'plan-today', label: 'Plan vandaag', description: 'Optimaliseer ritten voor vandaag', command: '/plan vandaag' },
  { id: 'exceptions', label: 'Toon uitzonderingen', description: 'Bekijk actieve alerts en problemen', command: '/alert overzicht' },
  { id: 'invoice-ready', label: 'Te factureren orders', description: 'Orders klaar voor facturatie', command: '/invoice gereed' },
  { id: 'driver-status', label: 'Chauffeur status', description: 'Huidige locaties en status', command: '/dispatch status' },
];

export const CommandBar = forwardRef<HTMLDivElement, CommandBarProps>(({ 
  open, 
  onOpenChange, 
  onSubmit 
}, ref) => {
  const [input, setInput] = useState('');
  const [activeIntents, setActiveIntents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Detect intents from input
  useEffect(() => {
    const lowerInput = input.toLowerCase();
    const detected: string[] = [];

    if (lowerInput.includes('plan') || lowerInput.includes('route') || lowerInput.includes('optimaliseer')) {
      detected.push('plan');
    }
    if (lowerInput.includes('factuur') || lowerInput.includes('invoice') || lowerInput.includes('factureer')) {
      detected.push('invoice');
    }
    if (lowerInput.includes('chauffeur') || lowerInput.includes('driver') || lowerInput.includes('toewijzen')) {
      detected.push('dispatch');
    }
    if (lowerInput.includes('alert') || lowerInput.includes('probleem') || lowerInput.includes('uitzondering')) {
      detected.push('alert');
    }
    if (lowerInput.includes('zoek') || lowerInput.includes('vind') || lowerInput.includes('search')) {
      detected.push('search');
    }
    if (lowerInput.includes('help') || lowerInput.includes('hoe')) {
      detected.push('help');
    }

    setActiveIntents(detected);
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
      onOpenChange(false);
    }
  };

  const handleQuickAction = (command: string) => {
    onSubmit(command);
    setInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={ref}
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50"
      >
        {/* Header with AI branding */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">LogiFlow Copilot</h3>
            <p className="text-[10px] text-muted-foreground">AI-gestuurde TMS assistent</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            <Command className="w-3 h-3 mr-1" />K
          </Badge>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Vraag iets aan Copilot of gebruik /commando..."
              className="pl-10 pr-4 h-11 text-sm bg-muted/50 border-border/50 focus-visible:ring-primary/30"
            />
            {input && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Intent Chips */}
          {activeIntents.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Gedetecteerd:</span>
              <div className="flex gap-1.5">
                {activeIntents.map(intentId => {
                  const intent = intentChips.find(i => i.id === intentId);
                  if (!intent) return null;
                  const Icon = intent.icon;
                  return (
                    <Badge 
                      key={intent.id}
                      variant="outline" 
                      className={cn("text-[10px] border", intent.color)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {intent.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Quick Actions & Commands */}
        <ScrollArea className="max-h-[300px]">
          <div className="p-4 space-y-4">
            {/* Slash Commands */}
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Commando's</h4>
              <div className="flex flex-wrap gap-2">
                {intentChips.map(intent => {
                  const Icon = intent.icon;
                  return (
                    <button
                      key={intent.id}
                      onClick={() => setInput(intent.command + ' ')}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all hover:scale-105",
                        intent.color
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-mono">{intent.command}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Snelle acties</h4>
              <div className="space-y-1">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.command)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1 py-0.5 rounded bg-muted">↵</kbd> uitvoeren</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted">esc</kbd> sluiten</span>
            </div>
            <span>Aangedreven door AI</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CommandBar.displayName = 'CommandBar';
