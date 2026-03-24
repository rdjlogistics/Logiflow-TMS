import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { edgeFunctionUrl } from '@/lib/backendConfig';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  pendingConfirmation?: boolean;
  confirmationPayload?: {
    toolName: string;
    payload: any;
    preview: any;
  };
  isStreaming?: boolean;
}

export interface ChatContext {
  currentPage?: string;
  selectedOrders?: string[];
  filters?: Record<string, any>;
  dateRange?: { from?: string; to?: string };
  userRole?: string;
}

export interface CreditInfo {
  used: number;
  remaining: number;
  plan: string;
  warning: string | null;
}

export const useChatGPT = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('chatgpt_conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });
    if (error) { console.error('Error loading conversations:', error); return []; }
    return data || [];
  }, [user]);

  const loadConversation = useCallback(async (convId: string) => {
    if (!user) return;
    const { data: msgs, error } = await supabase
      .from('chatgpt_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (error) { console.error('Error loading messages:', error); return; }
    setConversationId(convId);
    setMessages((msgs?.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      createdAt: m.created_at,
      pendingConfirmation: m.pending_confirmation || false,
      confirmationPayload: m.confirmation_payload as any
    })) || []) as unknown as ChatMessage[]);
  }, [user]);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setPendingConfirmation(null);
  }, []);

  const sendMessage = useCallback(async (message: string, context?: ChatContext) => {
    if (!user || !message.trim()) return;
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      const response = await fetch(edgeFunctionUrl('chatgpt'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'chat',
          conversationId,
          message,
          context,
          stream: false // Non-streaming for now (tool calls need it)
        })
      });

      if (response.status === 402) {
        const errData = await response.json();
        toast({
          title: 'Credits op',
          description: errData.message || 'Onvoldoende credits. Upgrade je plan.',
          variant: 'destructive'
        });
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }

      if (response.status === 429) {
        toast({
          title: 'Rate limit',
          description: 'Te veel verzoeken, probeer het later opnieuw.',
          variant: 'destructive'
        });
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Er ging iets mis');
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const messageContent = data.message || (data.success ? 'Ik kon geen antwoord genereren. Probeer het opnieuw.' : null);
      if (messageContent) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: messageContent,
          createdAt: new Date().toISOString(),
          pendingConfirmation: !!data.pendingConfirmation,
          confirmationPayload: data.pendingConfirmation
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      if (data.pendingConfirmation) {
        setPendingConfirmation(data.pendingConfirmation);
      }

      // Update credit info
      if (data.credits) {
        setCreditInfo(data.credits);
        if (data.credits.warning) {
          toast({ title: 'Credits waarschuwing', description: data.credits.warning });
        }
      }

    } catch (error: any) {
      console.error('ChatGPT error:', error);
      toast({
        title: 'Fout',
        description: error.message || 'Er ging iets mis met de AI Assistent',
        variant: 'destructive'
      });
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationId, toast]);

  const confirmAction = useCallback(async () => {
    if (!user || !pendingConfirmation) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');
      const response = await fetch(edgeFunctionUrl('chatgpt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'confirm', conversationId,
          confirmAction: pendingConfirmation.toolName, confirmPayload: pendingConfirmation.payload
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Actie mislukt');
      const resultMessage: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        content: `✅ ${data.result?.message || 'Actie succesvol uitgevoerd'}`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, resultMessage]);
      setPendingConfirmation(null);
      if (data.credits_remaining !== undefined) {
        setCreditInfo(prev => prev ? { ...prev, remaining: data.credits_remaining } : null);
      }
      toast({ title: 'Succes', description: data.result?.message || 'Actie uitgevoerd' });
    } catch (error: any) {
      console.error('Confirm action error:', error);
      toast({ title: 'Fout', description: error.message || 'Kon actie niet uitvoeren', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationId, pendingConfirmation, toast]);

  const cancelAction = useCallback(() => {
    setPendingConfirmation(null);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: 'assistant',
      content: '❌ Actie geannuleerd. Hoe kan ik verder helpen?',
      createdAt: new Date().toISOString()
    }]);
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('chatgpt_conversations')
      .update({ is_active: false })
      .eq('id', convId).eq('user_id', user.id);
    if (error) { console.error('Error deleting conversation:', error); return; }
    if (convId === conversationId) startNewConversation();
  }, [user, conversationId, startNewConversation]);

  return {
    conversationId, messages, isLoading, pendingConfirmation, creditInfo,
    loadConversations, loadConversation, startNewConversation,
    sendMessage, confirmAction, cancelAction, deleteConversation
  };
};
