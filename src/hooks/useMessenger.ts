import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'planner' | 'chauffeur' | 'klant';
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatChannel {
  id: string;
  trip_id: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export const useMessenger = (tripId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSending, setIsSending] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch or create channel for trip
  const getOrCreateChannel = useCallback(async (tripId: string) => {
    try {
      setError(null);
      // First try to fetch existing channel
      const { data: existingChannel, error: fetchError } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingChannel) {
        setChannel(existingChannel);
        return existingChannel;
      }

      // Create new channel if doesn't exist
      const { data: newChannel, error: createError } = await supabase
        .from('chat_channels')
        .insert({ trip_id: tripId })
        .select()
        .single();

      if (createError) throw createError;
      setChannel(newChannel);
      return newChannel;
    } catch (err) {
      console.error('Error getting/creating channel:', err);
      setError(err instanceof Error ? err : new Error('Failed to get channel'));
      return null;
    }
  }, []);

  // Fetch messages for channel
  const fetchMessages = useCallback(async (channelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages((data as ChatMessage[]) || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string, senderRole: 'planner' | 'chauffeur' | 'klant' = 'planner') => {
    if (!channel || !user || !content.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error: sendError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channel.id,
          sender_id: user.id,
          sender_name: user.email?.split('@')[0] || 'Gebruiker',
          sender_role: senderRole,
          content: content.trim(),
        });

      if (sendError) throw sendError;
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: "Fout",
        description: "Kon bericht niet verzenden",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [channel, user, toast, isSending]);

  // Initialize channel and messages
  useEffect(() => {
    if (tripId) {
      getOrCreateChannel(tripId).then((ch) => {
        if (ch) fetchMessages(ch.id);
      });
    }
  }, [tripId, getOrCreateChannel, fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!channel) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const subscription = supabase
      .channel(`chat-${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [channel]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!channel || !user) return;
    
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('channel_id', channel.id)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [channel, user]);

  return {
    channel,
    messages,
    loading,
    error,
    isSending,
    sendMessage,
    getOrCreateChannel,
    fetchMessages,
    markAsRead,
  };
};
