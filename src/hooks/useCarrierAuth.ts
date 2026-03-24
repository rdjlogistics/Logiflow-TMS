import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CarrierAuthData {
  carrierId: string;
  carrierName: string;
  contactId: string;
  contactName: string;
  portalRole: string;
  portalScope: string;
  showPurchaseRates: boolean;
  tenantId: string;
  isLoading: boolean;
  isCarrierUser: boolean;
  isBlocked: boolean;
  portalSettings: {
    show_purchase_rates: boolean;
    show_documents: boolean;
    allow_document_upload: boolean;
    auto_internal_documents: boolean;
  } | null;
}

export const useCarrierAuth = (): CarrierAuthData => {
  const { user } = useAuth();
  const [data, setData] = useState<Omit<CarrierAuthData, 'isLoading'>>({
    carrierId: '',
    carrierName: '',
    contactId: '',
    contactName: '',
    portalRole: 'viewer',
    portalScope: 'all_orders',
    showPurchaseRates: false,
    tenantId: '',
    isCarrierUser: false,
    isBlocked: false,
    portalSettings: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchCarrierData = async () => {
      setIsLoading(true);
      try {
        // Get carrier contact for this user
        const { data: contact, error: contactError } = await supabase
          .from('carrier_contacts')
          .select('id, name, carrier_id, tenant_id, portal_role, portal_scope, show_purchase_rates')
          .eq('user_id', user.id)
          .eq('portal_access', true)
          .limit(1)
          .maybeSingle();

        if (contactError || !contact) {
          setData(prev => ({ ...prev, isCarrierUser: false }));
          setIsLoading(false);
          return;
        }

        // Fetch carrier name and portal settings in parallel
        const [carrierRes, settingsRes] = await Promise.all([
          supabase
            .from('carriers')
            .select('company_name, is_active')
            .eq('id', contact.carrier_id)
            .single(),
          supabase
            .from('carrier_portal_settings')
            .select('show_purchase_rates, show_documents, allow_document_upload, auto_internal_documents')
            .eq('carrier_id', contact.carrier_id)
            .maybeSingle(),
        ]);

        setData({
          carrierId: contact.carrier_id,
          carrierName: carrierRes.data?.company_name || '',
          contactId: contact.id,
          contactName: contact.name,
          portalRole: contact.portal_role || 'viewer',
          portalScope: (contact as any).portal_scope || 'all_orders',
          showPurchaseRates: (contact as any).show_purchase_rates ?? false,
          tenantId: contact.tenant_id,
          isCarrierUser: true,
          isBlocked: carrierRes.data?.is_active === false,
          portalSettings: settingsRes.data || null,
        });
      } catch (err) {
        console.error('Error fetching carrier auth data:', err);
        setData(prev => ({ ...prev, isCarrierUser: false }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarrierData();
  }, [user?.id]);

  return { ...data, isLoading };
};
