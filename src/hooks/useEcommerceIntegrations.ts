import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "./useCompany";

export interface EcommerceConnection {
  id: string;
  tenant_id: string;
  platform: 'shopify' | 'woocommerce' | 'magento' | 'prestashop';
  store_name: string;
  store_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  sync_error: string | null;
  settings_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EcommerceOrder {
  id: string;
  tenant_id: string;
  connection_id: string;
  external_order_id: string;
  external_order_number: string | null;
  platform: string;
  order_status: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address_json: {
    address1?: string;
    address2?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    country_code?: string;
  } | null;
  billing_address_json: Record<string, unknown> | null;
  line_items_json: Array<{
    name: string;
    quantity: number;
    price: number;
    sku?: string;
  }>;
  subtotal: number | null;
  shipping_cost: number | null;
  tax_amount: number | null;
  total_amount: number;
  currency: string;
  weight_kg: number | null;
  notes: string | null;
  tags: string[] | null;
  order_date: string;
  imported_at: string;
  converted_to_trip_id: string | null;
  conversion_status: 'pending' | 'converted' | 'skipped' | 'error';
  created_at: string;
  updated_at: string;
  // Joined fields
  connection?: EcommerceConnection;
}

export interface CreateConnectionInput {
  platform: 'shopify' | 'woocommerce' | 'magento' | 'prestashop';
  store_name: string;
  store_url: string;
  api_key?: string;
  api_secret?: string;
  access_token?: string;
}

export const useEcommerceConnections = () => {
  return useQuery({
    queryKey: ["ecommerce-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EcommerceConnection[];
    },
  });
};

export const useEcommerceOrders = (connectionId?: string, status?: string) => {
  return useQuery({
    queryKey: ["ecommerce-orders", connectionId, status],
    queryFn: async () => {
      let query = supabase
        .from("ecommerce_orders")
        .select(`
          *,
          connection:ecommerce_connections(*)
        `)
        .order("order_date", { ascending: false });

      if (connectionId) {
        query = query.eq("connection_id", connectionId);
      }
      if (status) {
        query = query.eq("conversion_status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EcommerceOrder[];
    },
  });
};

export const useCreateConnection = () => {
  const queryClient = useQueryClient();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (input: Omit<CreateConnectionInput, 'tenant_id'>) => {
      if (!company?.id) throw new Error("Geen bedrijf gevonden");
      
      const { data, error } = await supabase
        .from("ecommerce_connections")
        .insert({
          tenant_id: company.id,
          platform: input.platform,
          store_name: input.store_name,
          store_url: input.store_url,
          api_key_encrypted: input.api_key,
          api_secret_encrypted: input.api_secret,
          access_token_encrypted: input.access_token,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-connections"] });
      toast.success("Verbinding succesvol aangemaakt");
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
    },
  });
};

export const useDeleteConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("ecommerce_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-connections"] });
      toast.success("Verbinding verwijderd");
    },
    onError: (error: Error) => {
      toast.error(`Fout bij verwijderen: ${error.message}`);
    },
  });
};

export const useSyncConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("ecommerce-sync", {
        body: { connectionId, syncType: "incremental" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-connections"] });
      queryClient.invalidateQueries({ queryKey: ["ecommerce-orders"] });
      toast.success("Synchronisatie gestart");
    },
    onError: (error: Error) => {
      toast.error(`Sync mislukt: ${error.message}`);
    },
  });
};

export const useConvertOrderToTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("convert-ecommerce-order", {
        body: { orderId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-orders"] });
      toast.success("Order omgezet naar rit");
    },
    onError: (error: Error) => {
      toast.error(`Conversie mislukt: ${error.message}`);
    },
  });
};

export const useBulkConvertOrders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("convert-ecommerce-order", {
        body: { orderIds, bulk: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-orders"] });
      toast.success(`${data?.converted || 0} orders omgezet naar ritten`);
    },
    onError: (error: Error) => {
      toast.error(`Bulk conversie mislukt: ${error.message}`);
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("ecommerce_orders")
        .update({ conversion_status: status })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-orders"] });
    },
  });
};
