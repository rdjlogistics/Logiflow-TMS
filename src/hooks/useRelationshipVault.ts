import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type RelationshipTier = 'STRATEGIC' | 'CORE' | 'STANDARD';
export type MomentType = 'ONBOARDING' | 'MILESTONE' | 'APOLOGY' | 'JUBILEE' | 'RETENTION' | 'PAYMENT_RECOVERY';
export type MomentStatus = 'SUGGESTED' | 'PLANNED' | 'DONE' | 'SKIPPED';
export type GiftCategory = 'FLOWERS' | 'FRUIT' | 'CAKE' | 'GIFT_CARD' | 'OTHER';
export type GiftVendor = 'TOPBLOEMEN' | 'FLEUROP' | 'OTHER';
export type GiftFulfillmentMode = 'MANUAL' | 'VENDOR_PORTAL' | 'API';
export type GiftStatus = 'DRAFT' | 'APPROVAL_PENDING' | 'ORDERED' | 'SENT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';
export type GiftApprovalStatus = 'OPEN' | 'APPROVED' | 'REJECTED';
export type MessageTemplateType = 'THANK_YOU' | 'APOLOGY' | 'MILESTONE' | 'WELCOME';

export interface RelationshipProfile {
  id: string;
  tenant_id: string;
  account_id: string;
  tier: RelationshipTier;
  relationship_score_0_100: number;
  preferences_json: Json;
  key_people_json: Json;
  created_at: string;
  updated_at: string;
}

export interface RelationshipMoment {
  id: string;
  tenant_id: string;
  account_id: string;
  type: MomentType;
  trigger_event_key: string | null;
  trigger_entity_id: string | null;
  status: MomentStatus;
  suggested_actions_json: Json;
  created_at: string;
  done_at: string | null;
}

export interface GiftPolicy {
  id: string;
  tenant_id: string;
  max_amount_per_gift: number;
  max_amount_per_month_per_account: number;
  requires_approval_over_amount: number;
  restricted_account_types_json: Json;
  allowed_categories_json: Json;
  created_at: string;
  updated_at: string;
}

export interface GiftOrder {
  id: string;
  tenant_id: string;
  account_id: string;
  contact_id: string | null;
  category: GiftCategory;
  budget_amount: number;
  currency: string;
  delivery_name: string;
  delivery_address_json: Json;
  delivery_date: string;
  message_card_text: string | null;
  internal_reason: string | null;
  vendor: GiftVendor;
  fulfillment_mode: GiftFulfillmentMode;
  status: GiftStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftApproval {
  id: string;
  gift_order_id: string;
  status: GiftApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface GiftVendorAdapter {
  id: string;
  tenant_id: string;
  vendor: GiftVendor;
  mode: 'MANUAL' | 'PORTAL' | 'API';
  portal_url: string | null;
  api_config_json_secure: Json | null;
  status: 'ENABLED' | 'DISABLED';
  created_at: string;
  updated_at: string;
}

export interface GiftMessageTemplate {
  id: string;
  tenant_id: string;
  type: MessageTemplateType;
  body_template: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRelationshipVault = () => {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const tenantId = company?.id;

  // Relationship Profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['relationship-profiles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('relationship_profiles')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data as RelationshipProfile[];
    },
    enabled: !!tenantId,
  });

  const getProfileByAccount = (accountId: string) => 
    profiles.find(p => p.account_id === accountId);

  const upsertProfile = useMutation({
    mutationFn: async (data: Partial<RelationshipProfile> & { account_id: string }) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('relationship_profiles')
        .upsert({ 
          account_id: data.account_id,
          tenant_id: tenantId,
          tier: data.tier,
          relationship_score_0_100: data.relationship_score_0_100,
          preferences_json: data.preferences_json,
          key_people_json: data.key_people_json,
        }, { onConflict: 'tenant_id,account_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship-profiles'] });
      toast.success('Relatieprofiel bijgewerkt');
    },
  });

  // Moments
  const { data: moments = [], isLoading: momentsLoading } = useQuery({
    queryKey: ['relationship-moments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('relationship_moments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RelationshipMoment[];
    },
    enabled: !!tenantId,
  });

  const createMoment = useMutation({
    mutationFn: async (data: { account_id: string; type: string; trigger_event_key?: string; trigger_entity_id?: string }) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('relationship_moments')
        .insert({ 
          tenant_id: tenantId,
          account_id: data.account_id,
          type: data.type,
          trigger_event_key: data.trigger_event_key,
          trigger_entity_id: data.trigger_entity_id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship-moments'] });
      toast.success('Moment aangemaakt');
    },
  });

  const updateMomentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MomentStatus }) => {
      const { error } = await supabase
        .from('relationship_moments')
        .update({ status, done_at: status === 'DONE' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship-moments'] });
      toast.success('Moment bijgewerkt');
    },
  });

  // Gift Policy
  const { data: giftPolicy, isLoading: policyLoading } = useQuery({
    queryKey: ['gift-policy', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('gift_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as GiftPolicy | null;
    },
    enabled: !!tenantId,
  });

  const upsertGiftPolicy = useMutation({
    mutationFn: async (data: Partial<GiftPolicy>) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('gift_policies')
        .upsert({ 
          tenant_id: tenantId,
          max_amount_per_gift: data.max_amount_per_gift,
          max_amount_per_month_per_account: data.max_amount_per_month_per_account,
          requires_approval_over_amount: data.requires_approval_over_amount,
          allowed_categories_json: data.allowed_categories_json,
          restricted_account_types_json: data.restricted_account_types_json,
        }, { onConflict: 'tenant_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-policy'] });
      toast.success('Gift policy bijgewerkt');
    },
  });

  // Gift Orders
  const { data: giftOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['gift-orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('gift_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GiftOrder[];
    },
    enabled: !!tenantId,
  });

  const createGiftOrder = useMutation({
    mutationFn: async (data: {
      account_id: string;
      category: string;
      vendor: string;
      budget_amount: number;
      delivery_name: string;
      delivery_address_json: Json;
      delivery_date: string;
      message_card_text?: string;
      internal_reason?: string;
      fulfillment_mode?: string;
      status?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant');
      const { data: session } = await supabase.auth.getSession();
      const { data: order, error } = await supabase
        .from('gift_orders')
        .insert({ 
          tenant_id: tenantId,
          account_id: data.account_id,
          category: data.category,
          vendor: data.vendor,
          budget_amount: data.budget_amount,
          delivery_name: data.delivery_name,
          delivery_address_json: data.delivery_address_json,
          delivery_date: data.delivery_date,
          message_card_text: data.message_card_text,
          internal_reason: data.internal_reason,
          fulfillment_mode: data.fulfillment_mode || 'MANUAL',
          status: data.status || 'DRAFT',
          created_by: session?.session?.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      
      // Log creation
      if (order) {
        await supabase.from('gift_audit_logs').insert({
          tenant_id: tenantId,
          gift_order_id: order.id,
          event_key: 'CREATED',
          payload_json: data as unknown as Json,
          created_by: session?.session?.user?.id,
        });
      }
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-orders'] });
      toast.success('Cadeau order aangemaakt');
    },
  });

  const updateGiftOrder = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('gift_orders')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      
      // Log update
      if (tenantId) {
        await supabase.from('gift_audit_logs').insert({
          tenant_id: tenantId,
          gift_order_id: id,
          event_key: data.status ? `STATUS_${data.status}` : 'UPDATED',
          payload_json: data as unknown as Json,
          created_by: session?.session?.user?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-orders'] });
      toast.success('Cadeau order bijgewerkt');
    },
  });

  // Gift Approvals
  const { data: giftApprovals = [] } = useQuery({
    queryKey: ['gift-approvals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('gift_approvals')
        .select('*, gift_orders!inner(tenant_id)')
        .eq('gift_orders.tenant_id', tenantId);
      if (error) throw error;
      return data as (GiftApproval & { gift_orders: { tenant_id: string } })[];
    },
    enabled: !!tenantId,
  });

  const createGiftApproval = useMutation({
    mutationFn: async (giftOrderId: string) => {
      const { error } = await supabase
        .from('gift_approvals')
        .insert({ gift_order_id: giftOrderId, status: 'OPEN' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-approvals'] });
    },
  });

  const processGiftApproval = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'APPROVED' | 'REJECTED'; notes?: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('gift_approvals')
        .update({ 
          status, 
          notes,
          approved_by: session?.session?.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['gift-orders'] });
      toast.success('Goedkeuring verwerkt');
    },
  });

  // Vendor Adapters
  const { data: vendorAdapters = [] } = useQuery({
    queryKey: ['gift-vendor-adapters', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('gift_vendor_adapters')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data as GiftVendorAdapter[];
    },
    enabled: !!tenantId,
  });

  // Message Templates
  const { data: messageTemplates = [] } = useQuery({
    queryKey: ['gift-message-templates', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('gift_message_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      if (error) throw error;
      return data as GiftMessageTemplate[];
    },
    enabled: !!tenantId,
  });

  // Policy validation
  const validateGiftAgainstPolicy = (amount: number, accountId: string): { valid: boolean; reason?: string; needsApproval: boolean } => {
    if (!giftPolicy) return { valid: true, needsApproval: false };
    
    if (amount > giftPolicy.max_amount_per_gift) {
      return { valid: false, reason: `Bedrag overschrijdt max per cadeau (€${giftPolicy.max_amount_per_gift})`, needsApproval: false };
    }
    
    // Check monthly spending for account
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthlySpend = giftOrders
      .filter(o => o.account_id === accountId && new Date(o.created_at) >= monthStart && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.budget_amount), 0);
    
    if (monthlySpend + amount > giftPolicy.max_amount_per_month_per_account) {
      return { valid: false, reason: `Overschrijdt maandelijks budget voor deze klant (€${giftPolicy.max_amount_per_month_per_account})`, needsApproval: false };
    }
    
    const needsApproval = amount > giftPolicy.requires_approval_over_amount;
    
    return { valid: true, needsApproval };
  };

  return {
    // Profiles
    profiles,
    profilesLoading,
    getProfileByAccount,
    upsertProfile,
    
    // Moments
    moments,
    momentsLoading,
    createMoment,
    updateMomentStatus,
    
    // Gift Policy
    giftPolicy,
    policyLoading,
    upsertGiftPolicy,
    
    // Gift Orders
    giftOrders,
    ordersLoading,
    createGiftOrder,
    updateGiftOrder,
    validateGiftAgainstPolicy,
    
    // Approvals
    giftApprovals,
    createGiftApproval,
    processGiftApproval,
    
    // Vendor Adapters
    vendorAdapters,
    
    // Templates
    messageTemplates,
    
    tenantId,
  };
};
