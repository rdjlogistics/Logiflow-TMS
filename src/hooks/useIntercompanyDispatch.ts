import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany, Company } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export type DispatchType = 'subcontract' | 'handoff';
export type DispatchStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

export interface IntercompanyDispatch {
  id: string;
  primary_order_id: string;
  subcontract_order_id: string | null;
  from_company_id: string;
  to_company_id: string;
  dispatch_type: DispatchType;
  status: DispatchStatus;
  agreed_price: number | null;
  currency: string;
  dispatched_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  dispatch_notes: string | null;
  decline_reason: string | null;
  dispatched_by: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  from_company?: Company;
  to_company?: Company;
  primary_order?: any;
  subcontract_order?: any;
}

export const useIntercompanyDispatch = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [incomingDispatches, setIncomingDispatches] = useState<IntercompanyDispatch[]>([]);

  // Fetch incoming dispatches on mount and when company changes
  useEffect(() => {
    if (company) {
      fetchIncomingDispatches();
    }
  }, [company?.id]);

  const fetchIncomingDispatches = async () => {
    if (!company) return;

    try {
      const { data, error } = await supabase
        .from('intercompany_dispatches')
        .select(`
          *,
          from_company:companies!intercompany_dispatches_from_company_id_fkey(*),
          primary_order:trips!intercompany_dispatches_primary_order_id_fkey(*)
        `)
        .eq('to_company_id', company.id)
        .in('status', ['pending', 'accepted', 'in_progress']);

      if (error) throw error;
      setIncomingDispatches((data || []) as unknown as IntercompanyDispatch[]);
    } catch (err) {
      console.error('Error fetching incoming dispatches:', err);
    }
  };

  const dispatchOrder = async (
    orderId: string,
    targetCompanyId: string,
    options: {
      dispatchType?: DispatchType;
      agreedPrice?: number;
      notes?: string;
    } = {}
  ): Promise<IntercompanyDispatch | null> => {
    if (!company || !user) return null;

    try {
      setLoading(true);

      // Create the dispatch record
      const { data: dispatch, error: dispatchError } = await supabase
        .from('intercompany_dispatches')
        .insert({
          primary_order_id: orderId,
          from_company_id: company.id,
          to_company_id: targetCompanyId,
          dispatch_type: options.dispatchType || 'subcontract',
          agreed_price: options.agreedPrice,
          dispatch_notes: options.notes,
          dispatched_by: user.id,
        })
        .select()
        .single();

      if (dispatchError) throw dispatchError;

      // Update the primary order to mark it as dispatched
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          dispatched_to_company_id: targetCompanyId,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Create notification for receiving company
      await supabase.from('dispatch_notifications').insert({
        dispatch_id: dispatch.id,
        company_id: targetCompanyId,
        notification_type: 'new_dispatch',
        title: 'Nieuwe opdracht ontvangen',
        message: `${company.name} heeft een opdracht naar u doorgestuurd.`,
      });

      toast({
        title: 'Order verstuurd',
        description: 'De opdracht is doorgestuurd naar het andere bedrijf.',
      });

      return dispatch as IntercompanyDispatch;
    } catch (err) {
      console.error('Error dispatching order:', err);
      toast({
        title: 'Fout',
        description: 'Kon opdracht niet doorsturen.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const acceptDispatch = async (dispatchId: string): Promise<boolean> => {
    if (!company || !user) return false;

    try {
      setLoading(true);

      // Get the dispatch with primary order details
      const { data: dispatch, error: fetchError } = await supabase
        .from('intercompany_dispatches')
        .select('*')
        .eq('id', dispatchId)
        .maybeSingle();

      if (fetchError || !dispatch) throw fetchError || new Error('Dispatch not found');

      // Get the primary order separately
      const { data: primaryOrder, error: orderError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', dispatch!.primary_order_id)
        .maybeSingle();

      if (orderError || !primaryOrder) throw orderError || new Error('Order not found');

      // Create a subcontract order (copy of primary order for our company)
      const { data: subOrder, error: subOrderError } = await supabase
        .from('trips')
        .insert({
          company_id: company.id,
          is_subcontract_order: true,
          primary_dispatch_id: dispatchId,
          // Copy order details
          trip_date: primaryOrder.trip_date,
          pickup_address: primaryOrder.pickup_address,
          pickup_city: primaryOrder.pickup_city,
          pickup_postal_code: primaryOrder.pickup_postal_code,
          pickup_latitude: primaryOrder.pickup_latitude,
          pickup_longitude: primaryOrder.pickup_longitude,
          delivery_address: primaryOrder.delivery_address,
          delivery_city: primaryOrder.delivery_city,
          delivery_postal_code: primaryOrder.delivery_postal_code,
          delivery_latitude: primaryOrder.delivery_latitude,
          delivery_longitude: primaryOrder.delivery_longitude,
          cargo_description: primaryOrder.cargo_description,
          weight_kg: primaryOrder.weight_kg,
          dimensions: primaryOrder.dimensions,
          notes: primaryOrder.notes,
          customer_id: primaryOrder.customer_id,
          // Set purchase price from agreed price
          purchase_total: dispatch!.agreed_price,
          status: 'gepland',
        } as any)
        .select()
        .single();

      if (subOrderError) throw subOrderError;

      // Copy route stops if any
      const { data: stops } = await supabase
        .from('route_stops')
        .select('*')
        .eq('trip_id', primaryOrder.id);

      if (stops && stops.length > 0) {
        const newStops = stops.map(stop => ({
          ...stop,
          id: undefined,
          trip_id: subOrder.id,
          created_at: undefined,
          updated_at: undefined,
        }));
        await supabase.from('route_stops').insert(newStops as any);
      }

      // Update dispatch record
      const { error: updateError } = await supabase
        .from('intercompany_dispatches')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
          subcontract_order_id: subOrder.id,
        })
        .eq('id', dispatchId);

      if (updateError) throw updateError;

      // Create notification for sending company
      await supabase.from('dispatch_notifications').insert({
        dispatch_id: dispatchId,
        company_id: dispatch!.from_company_id,
        notification_type: 'accepted',
        title: 'Opdracht geaccepteerd',
        message: `${company.name} heeft uw opdracht geaccepteerd.`,
      });

      toast({
        title: 'Opdracht geaccepteerd',
        description: 'De opdracht is toegevoegd aan uw orderoverzicht.',
      });

      return true;
    } catch (err) {
      console.error('Error accepting dispatch:', err);
      toast({
        title: 'Fout',
        description: 'Kon opdracht niet accepteren.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const declineDispatch = async (dispatchId: string, reason?: string): Promise<boolean> => {
    if (!company) return false;

    try {
      setLoading(true);

      const { data: dispatch, error: fetchError } = await supabase
        .from('intercompany_dispatches')
        .select('from_company_id')
        .eq('id', dispatchId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('intercompany_dispatches')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: reason,
        })
        .eq('id', dispatchId);

      if (error) throw error;

      // Create notification for sending company
      await supabase.from('dispatch_notifications').insert({
        dispatch_id: dispatchId,
        company_id: dispatch!.from_company_id,
        notification_type: 'declined',
        title: 'Opdracht afgewezen',
        message: reason
          ? `${company.name} heeft uw opdracht afgewezen: ${reason}`
          : `${company.name} heeft uw opdracht afgewezen.`,
      });

      toast({
        title: 'Opdracht afgewezen',
        description: 'Het andere bedrijf is op de hoogte gesteld.',
      });

      return true;
    } catch (err) {
      console.error('Error declining dispatch:', err);
      toast({
        title: 'Fout',
        description: 'Kon opdracht niet afwijzen.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getDispatchesForOrder = async (orderId: string): Promise<IntercompanyDispatch[]> => {
    try {
      const { data, error } = await supabase
        .from('intercompany_dispatches')
        .select(`
          *,
          from_company:companies!intercompany_dispatches_from_company_id_fkey(*),
          to_company:companies!intercompany_dispatches_to_company_id_fkey(*)
        `)
        .or(`primary_order_id.eq.${orderId},subcontract_order_id.eq.${orderId}`);

      if (error) throw error;
      return (data || []) as unknown as IntercompanyDispatch[];
    } catch (err) {
      console.error('Error fetching dispatches:', err);
      return [];
    }
  };

  const getIncomingDispatches = async (): Promise<IntercompanyDispatch[]> => {
    if (!company) return [];

    try {
      const { data, error } = await supabase
        .from('intercompany_dispatches')
        .select(`
          *,
          from_company:companies!intercompany_dispatches_from_company_id_fkey(*),
          primary_order:trips!intercompany_dispatches_primary_order_id_fkey(*)
        `)
        .eq('to_company_id', company.id)
        .eq('status', 'pending');

      if (error) throw error;
      return (data || []) as unknown as IntercompanyDispatch[];
    } catch (err) {
      console.error('Error fetching incoming dispatches:', err);
      return [];
    }
  };

  return {
    loading,
    incomingDispatches,
    dispatchOrder,
    acceptDispatch,
    declineDispatch,
    getDispatchesForOrder,
    getIncomingDispatches,
    refetchIncoming: fetchIncomingDispatches,
  };
};
