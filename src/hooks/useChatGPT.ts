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

// ─── SSE stream parser ───
async function parseSSEStream(
  response: Response,
  onDelta: (text: string) => void,
  onConfirmation?: (data: any) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx: number;
    while ((nlIdx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nlIdx);
      buffer = buffer.slice(nlIdx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') return fullContent;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onDelta(content);
        }
        // Check for pending confirmation injected by backend
        if (parsed._pendingConfirmation && onConfirmation) {
          onConfirmation(parsed._pendingConfirmation);
        }
      } catch {
        // Partial JSON — put back and wait
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  // Flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onDelta(content);
        }
      } catch {}
    }
  }

  return fullContent;
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
    if (!message.trim()) return;
    if (!user) {
      console.error('sendMessage: user is null — auth not ready');
      toast({ title: 'Niet ingelogd', description: 'Log opnieuw in om de AI Assistent te gebruiken.', variant: 'destructive' });
      return;
    }
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
          stream: true,
        })
      });

      if (response.status === 402) {
        toast({ title: 'Credits op', description: 'Onvoldoende credits. Upgrade je plan.', variant: 'destructive' });
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }
      if (response.status === 429) {
        toast({ title: 'Rate limit', description: 'Te veel verzoeken, probeer het later opnieuw.', variant: 'destructive' });
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && response.body) {
        // ─── SSE Streaming ───
        const assistantId = crypto.randomUUID();
        let assistantContent = '';

        // Add empty assistant message
        setMessages(prev => [...prev, {
          id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString(), isStreaming: true,
        }]);

        await parseSSEStream(
          response,
          (delta) => {
            assistantContent += delta;
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            ));
          },
          (confirmation) => {
            setPendingConfirmation(confirmation);
          }
        );

        // Mark streaming done
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        ));

        // Extract conversationId from first SSE chunk or rely on backend
        // The backend saves the message, so we just need to refresh conversations

      } else {
        // ─── Non-streaming fallback ───
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Er ging iets mis');

        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        const messageContent = data.message || 'Ik kon geen antwoord genereren.';
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: messageContent,
          createdAt: new Date().toISOString(),
          pendingConfirmation: !!data.pendingConfirmation,
          confirmationPayload: data.pendingConfirmation,
        }]);

        if (data.pendingConfirmation) setPendingConfirmation(data.pendingConfirmation);
        if (data.credits) {
          setCreditInfo(data.credits);
          if (data.credits.warning) toast({ title: 'Credits waarschuwing', description: data.credits.warning });
        }
      }

    } catch (error: any) {
      console.error('ChatGPT error:', error);
      toast({ title: 'Fout', description: error.message || 'Er ging iets mis', variant: 'destructive' });
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
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `✅ ${data.result?.message || 'Actie succesvol uitgevoerd'}`,
        createdAt: new Date().toISOString()
      }]);
      setPendingConfirmation(null);
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
