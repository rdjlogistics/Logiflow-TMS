import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantSettings {
  id: string;
  company_id: string | null;
  show_purchase_price_to_driver: boolean;
  auto_send_pod_email: boolean;
  pod_email_recipients: string[];
  show_documents_in_driver_app: boolean;
  attach_documents_to_invoice: boolean;
  attach_documents_to_purchase_invoice: boolean;
  composite_route_product_id: string | null;
  route_service_time_minutes: number;
  route_eta_margin_before_minutes: number;
  route_eta_margin_after_minutes: number;
  route_start_location: string;
  route_end_location: string;
  route_vehicle_type: string;
  route_optimization_provider: string;
  route_speed_percentage: number;
  theme_preset: string;
  theme_mode: string;
  driver_app_use_arrival_departure_times: boolean;
  driver_app_separate_remarks_field: boolean;
  driver_app_auto_save_waiting: boolean;
  driver_app_auto_save_loading: boolean;
  driver_app_auto_save_distance: boolean;
  driver_app_show_waybill: boolean;
  driver_app_show_cmr: boolean;
  driver_app_completed_stops_bottom: boolean;
}

export const useTenantSettings = () => {
  return useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async (): Promise<TenantSettings | null> => {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant settings:', error);
        return null;
      }

      return data as TenantSettings | null;
    },
  });
};
