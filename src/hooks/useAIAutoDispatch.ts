import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScoredDriver {
  driver: {
    id: string;
    name: string;
    phone: string;
    current_city?: string;
    rating: number;
    driver_category?: string;
  };
  scores: {
    distance: number;
    availability: number;
    workload: number;
    rating: number;
    history: number;
  };
  overallScore: number;
  confidence: number;
  reasoning: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
}

export interface AIAnalysis {
  topPick: string;
  confidence: number;
  reasoning: string;
  automationAdvice: 'auto_assign' | 'send_whatsapp' | 'manual_review';
  riskFactors: string[];
}

export interface DispatchConversation {
  id: string;
  trip_id: string;
  driver_id: string;
  status: 'pending' | 'awaiting_response' | 'confirmed' | 'declined' | 'expired' | 'cancelled';
  ai_confidence: number;
  ai_reasoning: string;
  initiated_at: string;
  responded_at?: string;
  confirmed_at?: string;
}

export interface DispatchMessage {
  id: string;
  conversation_id: string;
  direction: 'outbound' | 'inbound';
  message_type: 'text' | 'template' | 'confirmation' | 'system';
  content: string;
  ai_interpretation?: {
    intent: 'yes' | 'no' | 'unclear';
    confidence: number;
    sentiment: string;
  };
  created_at: string;
}

export function useAIAutoDispatch() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<ScoredDriver[]>([]);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [activeConversations, setActiveConversations] = useState<DispatchConversation[]>([]);
  const [messages, setMessages] = useState<DispatchMessage[]>([]);

  // Analyze drivers for a trip
  const analyzeTrip = useCallback(async (tripId: string) => {
    setIsAnalyzing(true);
    setCandidates([]);
    setAIAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-dispatch-engine', {
        body: { action: 'analyze', tripId },
      });

      if (error) throw error;

      if (data.success) {
        setCandidates(data.candidates || []);
        setAIAnalysis(data.aiAnalysis);
        
        toast({
          title: '🤖 AI Analyse Voltooid',
          description: `${data.candidates?.length || 0} chauffeurs geanalyseerd`,
        });

        return data;
      } else {
        throw new Error(data.error || 'Analyse mislukt');
      }
    } catch (error) {
      console.error('AI Dispatch analyze error:', error);
      toast({
        title: 'Analyse Mislukt',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Initiate dispatch conversation with a driver
  const initiateDispatch = useCallback(async (tripId: string, driverId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dispatch-engine', {
        body: { action: 'initiate', tripId, driverId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '📱 Dispatch Gestart',
          description: data.message,
        });

        // Refresh conversations
        await fetchActiveConversations();

        return {
          conversationId: data.conversationId,
          whatsappMessage: data.whatsappMessage,
          driverPhone: data.driverPhone,
        };
      } else {
        throw new Error(data.error || 'Dispatch mislukt');
      }
    } catch (error) {
      console.error('Initiate dispatch error:', error);
      toast({
        title: 'Dispatch Mislukt',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Process driver response
  const processResponse = useCallback(async (conversationId: string, responseText: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dispatch-engine', {
        body: { action: 'process_response', conversationId, responseText },
      });

      if (error) throw error;

      if (data.success) {
        const intentEmoji = data.interpretation?.intent === 'yes' ? '✅' : 
                           data.interpretation?.intent === 'no' ? '❌' : '❓';
        
        toast({
          title: `${intentEmoji} Antwoord Verwerkt`,
          description: `AI Confidence: ${data.interpretation?.confidence}%`,
        });

        await fetchActiveConversations();
        return data;
      } else {
        throw new Error(data.error || 'Verwerking mislukt');
      }
    } catch (error) {
      console.error('Process response error:', error);
      toast({
        title: 'Verwerking Mislukt',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Confirm and assign driver
  const confirmAssignment = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dispatch-engine', {
        body: { action: 'confirm_assign', conversationId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '🎉 Rit Toegewezen!',
          description: data.message,
        });

        await fetchActiveConversations();
        return data;
      } else {
        throw new Error(data.error || 'Toewijzing mislukt');
      }
    } catch (error) {
      console.error('Confirm assignment error:', error);
      toast({
        title: 'Toewijzing Mislukt',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Fetch active conversations
  const fetchActiveConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dispatch_conversations')
        .select(`
          *,
          trips (pickup_city, delivery_city, trip_date),
          drivers (name, phone)
        `)
        .in('status', ['pending', 'awaiting_response'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveConversations((data || []) as unknown as DispatchConversation[]);
    } catch (error) {
      console.error('Fetch conversations error:', error);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispatch_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as unknown as DispatchMessage[]);
      return data;
    } catch (error) {
      console.error('Fetch messages error:', error);
      return [];
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const conversationsChannel = supabase
      .channel(`dispatch-conversations-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_conversations',
        },
        () => {
          fetchActiveConversations();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`dispatch-messages-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispatch_messages',
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as DispatchMessage]);
        }
      )
      .subscribe();

    // Initial fetch
    fetchActiveConversations();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [fetchActiveConversations]);

  return {
    // State
    isAnalyzing,
    candidates,
    aiAnalysis,
    activeConversations,
    messages,
    
    // Actions
    analyzeTrip,
    initiateDispatch,
    processResponse,
    confirmAssignment,
    fetchMessages,
    fetchActiveConversations,
    
    // Helpers
    getTopCandidate: () => candidates[0] || null,
    isAutomationReady: () => (aiAnalysis?.confidence || 0) >= 90,
  };
}
