import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from './usePortalAuth';

interface CreateCaseData {
  shipmentId: string;
  type: 'damage' | 'delay' | 'shortage' | 'other';
  description: string;
  claimedAmount?: number;
}

export function usePortalCases() {
  const { customerId } = usePortalAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCase = async (data: CreateCaseData) => {
    if (!customerId) {
      return { error: 'No customer linked' };
    }

    setLoading(true);
    setError(null);

    try {
      // First get the trip_id from the submission
      const { data: submission, error: subError } = await supabase
        .from('customer_submissions')
        .select('converted_trip_id')
        .eq('id', data.shipmentId)
        .maybeSingle();

      const orderId = submission?.converted_trip_id || data.shipmentId;

      // Get tenant_id from customer
      const { data: customer, error: custError } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', customerId)
        .maybeSingle();

      if (custError) throw custError;
      
      const tenantId = customer?.tenant_id || '00000000-0000-0000-0000-000000000001';

      // Map type to database enum
      const claimType = data.type === 'damage' ? 'damage'
        : data.type === 'delay' ? 'delay'
        : data.type === 'shortage' ? 'shortage'
        : 'other';

      const { data: claim, error: insertError } = await supabase
        .from('claim_cases')
        .insert([{
          order_id: orderId,
          tenant_id: tenantId,
          claim_type: claimType as any,
          status: 'open' as any,
          notes: data.description,
          claimed_amount: data.claimedAmount,
          opened_by_role: 'customer',
          liability: 'undecided' as any,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      return { data: claim, error: null };
    } catch (err) {
      console.error('Error creating case:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create case';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    createCase,
    loading,
    error,
  };
}
