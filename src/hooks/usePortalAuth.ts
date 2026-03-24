import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CustomerProfile {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
}

interface NotificationPreferences {
  emailShipmentUpdates: boolean;
  emailDeliveryConfirmation: boolean;
  emailInvoices: boolean;
  emailMarketing: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
}

export function usePortalAuth() {
  const { user, session } = useAuth();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isB2B, setIsB2B] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user?.id) {
        setCustomer(null);
        setCustomerId(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch customer linked to this user
        const { data: customerData, error } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (customerData) {
          setCustomer({
            id: customerData.id,
            companyName: customerData.company_name,
            contactName: customerData.contact_name || undefined,
            email: customerData.email || undefined,
            phone: customerData.phone || undefined,
            address: customerData.address || undefined,
            postalCode: customerData.postal_code || undefined,
            city: customerData.city || undefined,
            country: customerData.country || undefined,
            vatNumber: customerData.vat_number || undefined,
          });
          setCustomerId(customerData.id);
          // B2B if company has a VAT number or company name
          setIsB2B(!!customerData.vat_number || !!customerData.company_name);
        } else {
          // No customer linked — no demo fallback
          setCustomer(null);
          setCustomerId(null);
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
        setCustomer(null);
        setCustomerId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user?.id]);

  return {
    user,
    session,
    customer,
    customerId,
    isB2B,
    loading,
    isAuthenticated: !!session,
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailShipmentUpdates: true,
    emailDeliveryConfirmation: true,
    emailInvoices: true,
    emailMarketing: false,
    pushEnabled: true,
    smsEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('portal_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            emailShipmentUpdates: data.email_shipment_updates ?? true,
            emailDeliveryConfirmation: data.email_delivery_confirmation ?? true,
            emailInvoices: data.email_invoices ?? true,
            emailMarketing: data.email_marketing ?? false,
            pushEnabled: data.push_enabled ?? true,
            smsEnabled: data.sms_enabled ?? false,
          });
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const savePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    if (!user?.id) return { error: 'Not authenticated' };

    setSaving(true);
    try {
      const updatedPrefs = { ...preferences, ...newPrefs };
      
      const { error } = await supabase
        .from('portal_notification_preferences')
        .upsert({
          user_id: user.id,
          email_shipment_updates: updatedPrefs.emailShipmentUpdates,
          email_delivery_confirmation: updatedPrefs.emailDeliveryConfirmation,
          email_invoices: updatedPrefs.emailInvoices,
          email_marketing: updatedPrefs.emailMarketing,
          push_enabled: updatedPrefs.pushEnabled,
          sms_enabled: updatedPrefs.smsEnabled,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(updatedPrefs);
      return { error: null };
    } catch (err) {
      console.error('Error saving preferences:', err);
      return { error: err instanceof Error ? err.message : 'Failed to save' };
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    savePreferences,
    updatePreference: (key: keyof NotificationPreferences, value: boolean) => {
      const newPrefs = { ...preferences, [key]: value };
      setPreferences(newPrefs);
      savePreferences({ [key]: value });
    },
  };
}

export function useCustomerSettings() {
  const { customerId } = usePortalAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!customerId || customerId === '00000000-0000-0000-0000-000000000001') {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('customer_settings')
          .select('*')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (error) throw error;
        setSettings(data);
      } catch (err) {
        console.error('Error fetching customer settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [customerId]);

  const updateCustomerProfile = async (data: Partial<CustomerProfile>) => {
    if (!customerId || customerId === '00000000-0000-0000-0000-000000000001') {
      return { error: 'No customer linked' };
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          company_name: data.companyName,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          postal_code: data.postalCode,
          city: data.city,
          country: data.country,
          vat_number: data.vatNumber,
        })
        .eq('id', customerId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error updating customer:', err);
      return { error: err instanceof Error ? err.message : 'Failed to save' };
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateCustomerProfile,
  };
}
