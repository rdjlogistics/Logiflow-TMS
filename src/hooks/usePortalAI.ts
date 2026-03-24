import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PortalType = 'CUSTOMER' | 'DRIVER';
export type ContextType = 'ORDER' | 'INVOICE' | 'GENERAL';

export interface PortalAIMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  text: string;
  intent_key?: string | null;
  action_cards?: any[];
  evidence_links?: any[];
  created_at: string;
}

export interface PortalAIActionDraft {
  id: string;
  intent_key: string;
  proposed_actions_json: any[];
  evidence_links_json?: any[];
  status: 'DRAFT' | 'CONFIRMED' | 'EXECUTED' | 'CANCELLED' | 'BLOCKED';
  context_type?: ContextType;
  context_id?: string;
}

export interface UsePortalAIOptions {
  portalType: PortalType;
  tenantId?: string;
  contextType?: ContextType;
  contextId?: string;
}

export const usePortalAI = ({ portalType, tenantId, contextType, contextId }: UsePortalAIOptions) => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PortalAIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PortalAIActionDraft | null>(null);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [checkingFeature, setCheckingFeature] = useState(true);

  // Check if feature flag is enabled
  useEffect(() => {
    const checkFeatureFlag = async () => {
      if (!tenantId) {
        setCheckingFeature(false);
        return;
      }

      try {
        const flagKey = portalType === 'CUSTOMER' 
          ? 'FF_CUSTOMER_AI_ASSISTANT' 
          : 'FF_DRIVER_AI_ASSISTANT';
        
        const { data, error } = await supabase
          .from('portal_feature_flags')
          .select('enabled')
          .eq('tenant_id', tenantId)
          .eq('flag_key', flagKey)
          .maybeSingle();

        if (!error && data) {
          setIsFeatureEnabled(data.enabled);
        }
      } catch (err) {
        console.error('Error checking feature flag:', err);
      } finally {
        setCheckingFeature(false);
      }
    };

    checkFeatureFlag();
  }, [tenantId, portalType]);

  // Load or create conversation
  const initConversation = useCallback(async () => {
    if (!user?.id || !tenantId) return;

    setIsLoading(true);
    try {
      // Check for existing conversation with same context
      const query = supabase
        .from('portal_ai_conversations')
        .select('id')
        .eq('portal_user_id', user.id)
        .eq('portal_type', portalType)
        .eq('tenant_id', tenantId);

      if (contextType && contextId) {
        query.eq('context_type', contextType).eq('context_id', contextId);
      } else {
        query.eq('context_type', 'GENERAL');
      }

      const { data: existing } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (existing) {
        setConversationId(existing.id);
        await loadMessages(existing.id);
      } else {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('portal_ai_conversations')
          .insert({
            tenant_id: tenantId,
            portal_type: portalType,
            portal_user_id: user.id,
            context_type: contextType || 'GENERAL',
            context_id: contextId || null,
          })
          .select('id')
          .single();

        if (!error && newConv) {
          setConversationId(newConv.id);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error initializing conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tenantId, portalType, contextType, contextId]);

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('portal_ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as PortalAIMessage[]);
    }
  };

  // Send a message
  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !user?.id || !tenantId || isSending) return;

    setIsSending(true);
    
    // Optimistically add user message
    const tempUserMsg: PortalAIMessage = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Insert user message
      const { data: userMsg, error: userMsgError } = await supabase
        .from('portal_ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'USER',
          text,
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;

      // Call edge function
      const response = await supabase.functions.invoke('portal-ai', {
        body: {
          conversationId,
          portalType,
          tenantId,
          contextType,
          contextId,
          message: text,
          userId: user.id,
        },
      });

      if (response.error) throw response.error;

      const { assistantMessage, actionDraft } = response.data;

      // Update messages with real user message and assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id);
        return [...filtered, userMsg as PortalAIMessage, assistantMessage as PortalAIMessage];
      });

      if (actionDraft) {
        setPendingDraft(actionDraft);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  }, [conversationId, user?.id, tenantId, portalType, contextType, contextId, isSending]);

  // Confirm a pending action
  const confirmAction = useCallback(async (draftId: string) => {
    if (!user?.id || !tenantId) return;

    try {
      const { data, error } = await supabase
        .from('portal_ai_action_drafts')
        .update({
          status: 'CONFIRMED',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('portal_user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Execute the action via edge function
      const response = await supabase.functions.invoke('portal-ai', {
        body: {
          action: 'execute',
          draftId,
          portalType,
          tenantId,
          userId: user.id,
        },
      });

      if (response.error) throw response.error;

      setPendingDraft(null);

      // Refresh messages to show result
      if (conversationId) {
        await loadMessages(conversationId);
      }

      return response.data;
    } catch (err) {
      console.error('Error confirming action:', err);
      throw err;
    }
  }, [user?.id, tenantId, portalType, conversationId]);

  // Cancel a pending action
  const cancelAction = useCallback(async (draftId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('portal_ai_action_drafts')
        .update({ status: 'CANCELLED' })
        .eq('id', draftId)
        .eq('portal_user_id', user.id);

      setPendingDraft(null);
    } catch (err) {
      console.error('Error cancelling action:', err);
    }
  }, [user?.id]);

  // Start new conversation
  const resetConversation = useCallback(async () => {
    setConversationId(null);
    setMessages([]);
    setPendingDraft(null);
    await initConversation();
  }, [initConversation]);

  return {
    isFeatureEnabled,
    checkingFeature,
    conversationId,
    messages,
    isLoading,
    isSending,
    pendingDraft,
    initConversation,
    sendMessage,
    confirmAction,
    cancelAction,
    resetConversation,
  };
};
