import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface EmailOrderIntake {
  id: string;
  inbound_email_id: string | null;
  company_id: string;
  status: string;
  ai_confidence: number | null;
  ai_extracted_data: Record<string, any>;
  created_trip_id: string | null;
  assigned_driver_id: string | null;
  error_message: string | null;
  auto_reply_sent: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  processed_at: string | null;
  created_at: string;
  inbound_emails?: {
    from_email: string;
    from_name: string | null;
    subject: string | null;
    received_at: string | null;
  } | null;
  trips?: {
    order_number: string | null;
    status: string | null;
    pickup_city: string | null;
    delivery_city: string | null;
  } | null;
}

export function useEmailOrderIntake() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company, loading: companyLoading } = useCompany();
  const currentCompanyId = company?.id ?? null;

  const { data: intakes = [], isLoading, refetch } = useQuery({
    queryKey: ["email-order-intake", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_order_intake")
        .select(`
          *,
          inbound_emails(from_email, from_name, subject, received_at),
          trips(order_number, status, pickup_city, delivery_city)
        `)
        .eq("company_id", currentCompanyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as EmailOrderIntake[];
    },
  });

  useEffect(() => {
    if (!currentCompanyId) return;

    const invalidateIntake = () => {
      queryClient.invalidateQueries({ queryKey: ["email-order-intake", currentCompanyId] });
    };

    const channel = supabase
      .channel(`email-order-intake:${currentCompanyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_order_intake",
          filter: `company_id=eq.${currentCompanyId}`,
        },
        invalidateIntake
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbound_emails",
          filter: `company_id=eq.${currentCompanyId}`,
        },
        invalidateIntake
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentCompanyId, queryClient]);

  const confirmMutation = useMutation({
    mutationFn: async (intakeId: string) => {
      const { error } = await (supabase as any)
        .from("email_order_intake")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", intakeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-order-intake", currentCompanyId] });
      toast({ title: "Order bevestigd", description: "De order is goedgekeurd voor dispatch." });
    },
    onError: (e: any) => {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (intakeId: string) => {
      const { error } = await (supabase as any)
        .from("email_order_intake")
        .update({ status: "ignored" })
        .eq("id", intakeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-order-intake", currentCompanyId] });
      toast({ title: "Afgewezen", description: "De intake is gemarkeerd als genegeerd." });
    },
    onError: (e: any) => {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    },
  });

  const stats = {
    total: intakes.length,
    auto_created: intakes.filter(i => i.status === "order_created").length,
    needs_review: intakes.filter(i => i.status === "order_created" && i.ai_confidence !== null && i.ai_confidence < 0.8).length,
    confirmed: intakes.filter(i => i.status === "confirmed").length,
    ignored: intakes.filter(i => i.status === "ignored").length,
    failed: intakes.filter(i => i.status === "failed").length,
    avg_confidence: intakes.length > 0
      ? Math.round((intakes.reduce((s, i) => s + (i.ai_confidence || 0), 0) / intakes.length) * 100)
      : 0,
  };

  return {
    intakes,
    isLoading: companyLoading || isLoading,
    refetch,
    stats,
    confirmMutation,
    rejectMutation,
  };
}
