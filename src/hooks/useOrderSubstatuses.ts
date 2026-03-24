import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderSubstatus {
  id: string;
  company_id: string;
  name: string;
  color: string | null;
  available_in_driver_app: boolean;
  visible_on_tracking: boolean;
  sort_order: number;
  is_active: boolean;
}

export const useOrderSubstatuses = (options?: { driverAppOnly?: boolean }) => {
  return useQuery({
    queryKey: ['order-substatuses', options?.driverAppOnly],
    queryFn: async (): Promise<OrderSubstatus[]> => {
      let query = supabase
        .from('order_substatuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (options?.driverAppOnly) {
        query = query.eq('available_in_driver_app', true);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching order substatuses:', error);
        return [];
      }
      return data || [];
    },
  });
};
