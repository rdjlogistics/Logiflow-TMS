import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { edgeFunctionUrl } from '@/lib/backendConfig';

export type AssistantType = 'dispatch_planner' | 'control_tower' | 'finance_autopilot' | 'knowledge_search';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: unknown[];
  action_cards?: ActionCard[];
  created_at: string;
}

export interface ActionCard {
  id: string;
  type: 'plan' | 'assignment' | 'invoice' | 'alert' | 'message' | 'search_result';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  requires_approval: boolean;
  data: Record<string, unknown>;
  explainability?: {
    top_reasons: string[];
    trade_offs?: string[];
    risks?: string[];
    confidence: number;
  };
}

interface CopilotContext {
  current_page?: string;
  selected_orders?: string[];
  selected_trip?: string;
  filters?: Record<string, unknown>;
}

// ─── Now uses the unified chatgpt edge function ───
const CHATGPT_URL = edgeFunctionUrl('chatgpt');

export const useCopilot = (assistantType: AssistantType = 'dispatch_planner') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<CopilotContext>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Parse SSE stream and extract content
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onDelta: (text: string) => void,
    onDone: () => void
  ) => {
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    onDone();
  };

  // Send message using the unified chatgpt engine
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant') {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: assistantContent,
          created_at: new Date().toISOString(),
        }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Je moet ingelogd zijn om de AI assistent te gebruiken.');
      }

      // Build message history (last 15 for optimal latency)
      const allMessages = [...messages, userMessage].slice(-15).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Call the unified chatgpt edge function with copilot mode
      const response = await fetch(CHATGPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'chat',
          message: content.trim(),
          context: {
            currentPage: context.current_page || 'Copilot',
            selectedOrders: context.selected_orders || [],
            filters: context.filters || {},
            userRole: 'Admin',
            copilotMode: assistantType,
          },
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error('Te veel verzoeken. Wacht even en probeer opnieuw.');
        }
        if (response.status === 402) {
          throw new Error('Tegoed op. Voeg credits toe om door te gaan.');
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      await parseSSEStream(reader, updateAssistant, () => {
        setIsLoading(false);
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.error('AI Assistent error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsLoading(false);
      toast({
        title: "AI Assistent",
        description: err instanceof Error ? err.message : "Er ging iets mis",
        variant: "destructive",
      });
    }
  }, [messages, assistantType, context, isLoading, toast]);

  // Parse slash commands
  const parseCommand = useCallback((input: string): { command: string | null; query: string } => {
    const match = input.match(/^\/(\w+)\s*(.*)/);
    if (match) {
      return { command: match[1].toLowerCase(), query: match[2] };
    }
    return { command: null, query: input };
  }, []);

  // Handle slash commands
  const handleInput = useCallback((input: string) => {
    const { query } = parseCommand(input);
    sendMessage(query || input);
  }, [parseCommand, sendMessage]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
  }, []);

  // Update context
  const updateContext = useCallback((newContext: Partial<CopilotContext>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  // Toggle copilot panel
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    error,
    setIsOpen,
    toggle,
    sendMessage,
    handleInput,
    clearConversation,
    context,
    updateContext,
    assistantType,
  };
};
