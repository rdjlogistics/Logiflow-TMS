import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useEffect } from "react";

export interface CaseMessage {
  id: string;
  case_id: string;
  tenant_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export const useCaseMessages = (caseId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  // Fetch messages for a specific case
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["case_messages", caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data, error } = await supabase
        .from("case_messages")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as CaseMessage[];
    },
    enabled: !!caseId && !!company?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!caseId) return;

    const channel = supabase
      .channel(`case_messages_${caseId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "case_messages",
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ["case_messages", caseId],
            (old: CaseMessage[] = []) => [...old, payload.new as CaseMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, queryClient]);

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      senderName,
      senderRole = "staff",
      isInternal = false,
    }: {
      content: string;
      senderName: string;
      senderRole?: string;
      isInternal?: boolean;
    }) => {
      if (!caseId || !company?.id) throw new Error("Missing case or company");

      const { data, error } = await supabase
        .from("case_messages")
        .insert({
          case_id: caseId,
          tenant_id: company.id,
          sender_name: senderName,
          sender_role: senderRole,
          content,
          is_internal: isInternal,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Bericht verzonden" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij verzenden",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
