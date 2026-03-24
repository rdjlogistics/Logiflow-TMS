import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, MessageSquare, Loader2, Sparkles, ArrowLeft, Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatGPT, ChatContext } from '@/hooks/useChatGPT';
import { useAICredits } from '@/hooks/useAICredits';
import { ChatGPTMessage } from './ChatGPTMessage';
import { ChatGPTActionCard } from './ChatGPTActionCard';
import { CreditBadge } from './CreditBadge';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { format, isToday, isYesterday } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ChatGPTPanelProps {
  context?: ChatContext;
  className?: string;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function groupConversationsByDate(conversations: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of conversations) {
    const d = c.updated_at ? new Date(c.updated_at) : new Date();
    if (isToday(d)) today.push(c);
    else if (isYesterday(d)) yesterday.push(c);
    else older.push(c);
  }

  if (today.length) groups.push({ label: 'Vandaag', items: today });
  if (yesterday.length) groups.push({ label: 'Gisteren', items: yesterday });
  if (older.length) groups.push({ label: 'Eerder', items: older });
  return groups;
}

export const ChatGPTPanel = ({ context, className }: ChatGPTPanelProps) => {
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const {
    conversationId, messages, isLoading, pendingConfirmation, creditInfo,
    loadConversations, loadConversation, startNewConversation,
    sendMessage, confirmAction, cancelAction, deleteConversation
  } = useChatGPT();

  const { subscription } = useAICredits();

  useEffect(() => { loadConversations().then(setConversations); }, [loadConversations]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(message, context);
    loadConversations().then(setConversations);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const handleNewChat = () => { startNewConversation(); setSidebarOpen(false); };
  const handleSelectConversation = (convId: string) => { loadConversation(convId); setSidebarOpen(false); };
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(convId);
    loadConversations().then(setConversations);
  };

  const groupedConversations = groupConversationsByDate(conversations);

  const quickActions = [
    { text: 'Briefing van vandaag', icon: '📋' },
    { text: 'Wijs chauffeurs toe aan open orders', icon: '🚚' },
    { text: 'Genereer weekrapport', icon: '📊' },
    { text: 'Factureer alle afgeleverde orders', icon: '💰' },
    { text: 'Vlootoverzicht nu', icon: '🚐' },
    { text: 'Openstaande facturen', icon: '📑' },
  ];

  return (
    <div className={`flex h-full ${className}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-72 bg-card/40 backdrop-blur-2xl border-r border-border/10
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/10 flex items-center justify-between">
          <Button onClick={handleNewChat} className="flex-1 gap-2 bg-primary/90 hover:bg-primary rounded-xl" size="sm">
            <Plus className="w-4 h-4" />
            Nieuw gesprek
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden ml-2" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Grouped Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-3">
            {groupedConversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                Nog geen gesprekken. Start een nieuw gesprek.
              </p>
            ) : (
              groupedConversations.map(group => (
                <div key={group.label}>
                  <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider px-3 py-1.5">
                    {group.label}
                  </p>
                  {group.items.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`
                        group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer
                        hover:bg-background/60 transition-all duration-150
                        ${conversationId === conv.id ? 'bg-background/80 shadow-sm border border-border/10' : ''}
                      `}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{conv.title ?? "Nieuw gesprek"}</span>
                      <Button
                        variant="ghost" size="icon"
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Credit Meter + Back */}
        <div className="border-t border-border/10">
          <CreditBadge creditInfo={creditInfo} subscription={subscription} />
          <div className="px-3 pb-3">
            <Button
              variant="ghost" size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              Terug naar TMS
            </Button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        {/* Header */}
        <div className="h-14 border-b border-border/10 flex items-center px-4 gap-3 bg-card/30 backdrop-blur-xl">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-xl ai-avatar-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">AI Assistent</h1>
              <p className="text-[11px] text-muted-foreground">LogiFlow TMS</p>
            </div>
          </div>
          <CreditBadge creditInfo={creditInfo} subscription={subscription} compact />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-3xl ai-avatar-gradient flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Hoe kan ik helpen?</h2>
                <p className="text-muted-foreground text-sm max-w-md mb-8">
                  Stel een vraag over orders, klanten, ritten of laat me taken uitvoeren in het TMS.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(action.text)}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/10 bg-card/40 backdrop-blur-sm
                        hover:bg-card/70 hover:border-border/30 hover:shadow-sm
                        transition-all duration-200 text-left group"
                    >
                      <span className="text-lg">{action.icon}</span>
                      <span className="text-sm flex-1">{action.text}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg) => (
                  <ChatGPTMessage key={msg.id} message={msg} />
                ))}

                {pendingConfirmation && (
                  <div className="max-w-md ml-11">
                    <ChatGPTActionCard
                      preview={pendingConfirmation.preview}
                      onConfirm={confirmAction}
                      onCancel={cancelAction}
                      isLoading={isLoading}
                    />
                  </div>
                )}

                {isLoading && !pendingConfirmation && !messages.some(m => m.isStreaming) && (
                  <div className="flex items-center gap-3 ml-11">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Aan het denken...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border/10 bg-card/20 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
            <div className="relative flex items-end gap-2 bg-card/60 backdrop-blur-xl rounded-2xl border border-border/15
              focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Stel een vraag..."
                disabled={isLoading}
                className="flex-1 min-h-[44px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-4"
                rows={1}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="m-1.5 h-9 w-9 rounded-xl shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              1 credit per bericht • Shift+Enter voor nieuwe regel
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
