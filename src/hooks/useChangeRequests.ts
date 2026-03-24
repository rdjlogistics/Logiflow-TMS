import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export type ChangeRequestType = "timewindow" | "contact" | "instructions" | "address_fix" | "cancel_request";
export type ChangeRequestStatus = "pending" | "approved" | "rejected";

export interface ChangeRequest {
  id: string;
  tenant_id: string;
  customer_id: string;
  shipment_id: string;
  request_type: ChangeRequestType;
  payload_json: Json;
  status: ChangeRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface CreateChangeRequestInput {
  tenant_id: string;
  customer_id: string;
  shipment_id: string;
  request_type: ChangeRequestType;
  payload_json: Json;
}

const requestTypeLabels: Record<ChangeRequestType, string> = {
  timewindow: "Tijdvenster wijzigen",
  contact: "Contact wijzigen",
  instructions: "Instructies toevoegen",
  address_fix: "Adres corrigeren",
  cancel_request: "Annulering aanvragen",
};

const statusLabels: Record<ChangeRequestStatus, string> = {
  pending: "In behandeling",
  approved: "Goedgekeurd",
  rejected: "Afgewezen",
};

export const useChangeRequests = (customerId?: string, shipmentId?: string) => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!customerId && !shipmentId) return;

    setLoading(true);
    try {
      let query = supabase.from("change_requests").select("*");
      
      if (customerId) {
        query = query.eq("customer_id", customerId);
      }
      if (shipmentId) {
        query = query.eq("shipment_id", shipmentId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ChangeRequest[]);
    } catch (error) {
      console.error("Error fetching change requests:", error);
    } finally {
      setLoading(false);
    }
  }, [customerId, shipmentId]);

  const createRequest = async (input: CreateChangeRequestInput): Promise<ChangeRequest | null> => {
    try {
      const { data, error } = await supabase
        .from("change_requests")
        .insert({
          tenant_id: input.tenant_id,
          customer_id: input.customer_id,
          shipment_id: input.shipment_id,
          request_type: input.request_type,
          payload_json: input.payload_json,
        })
        .select()
        .single();

      if (error) throw error;

      const typedData = data as ChangeRequest;
      setRequests(prev => [typedData, ...prev]);
      toast({
        title: "Wijzigingsverzoek ingediend",
        description: `${requestTypeLabels[input.request_type]} is aangevraagd`,
      });
      return typedData;
    } catch (error) {
      console.error("Error creating change request:", error);
      toast({
        title: "Fout",
        description: "Kon verzoek niet indienen",
        variant: "destructive",
      });
      return null;
    }
  };

  const getRequestLabel = (type: ChangeRequestType): string => requestTypeLabels[type];
  const getStatusLabel = (status: ChangeRequestStatus): string => statusLabels[status];

  return {
    requests,
    loading,
    fetchRequests,
    createRequest,
    getRequestLabel,
    getStatusLabel,
    pendingCount: requests.filter(r => r.status === "pending").length,
  };
};
