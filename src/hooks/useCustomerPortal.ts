import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ============= TYPES =============
export interface CustomerData {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  tenant_id: string | null;
  onboarding_completed: boolean | null;
  first_login_at: string | null;
}

export interface CustomerSettings {
  clickops_enabled: boolean;
  pricing_visible_to_customer: boolean;
  waiting_time_visible_to_customer: boolean;
  customer_can_request_changes: boolean;
  customer_can_cancel: boolean;
  customer_can_view_invoices: boolean;
  tracking_share_link_enabled: boolean;
  messenger_enabled: boolean;
  auto_waiting_enabled: boolean;
  allow_customer_chat: boolean;
  auto_send_tracking: boolean;
}

export interface Shipment {
  id: string;
  status: string;
  customer_status: string | null;
  pickup_city: string | null;
  delivery_city: string | null;
  pickup_address: string;
  delivery_address: string;
  trip_date: string;
  order_number: string | null;
  tracking_token: string | null;
  cargo_description: string | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  delivered_at: string | null;
  pod_available: boolean | null;
  customer_id: string | null;
}

export interface Submission {
  id: string;
  status: string;
  pickup_company: string;
  pickup_city: string;
  pickup_address: string;
  pickup_postal_code: string | null;
  delivery_company: string;
  delivery_city: string;
  delivery_address: string;
  delivery_postal_code: string | null;
  pickup_date: string;
  created_at: string;
  reference_number: string | null;
  rejection_reason?: string | null;
  estimated_price: number | null;
  product_id: string | null;
  converted_trip_id: string | null;
}

export interface CustomerNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface BookingTemplate {
  id: string;
  name: string;
  is_favorite: boolean;
  payload_json: Record<string, unknown>;
  use_count: number;
  last_used_at: string | null;
}

export interface SavedAddress {
  id: string;
  label: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  street: string;
  house_number: string | null;
  postal_code: string | null;
  city: string;
  country: string;
  address_quality: string;
  is_pickup_default: boolean;
  is_delivery_default: boolean;
}

export interface ServiceProduct {
  id: string;
  name: string;
  customer_display_name: string | null;
  customer_description: string | null;
  vehicle_type: string | null;
  icon_name: string | null;
  sales_rate: number;
  min_price: number | null;
}

export interface PortalStats {
  totalShipments: number;
  activeShipments: number;
  pendingSubmissions: number;
  deliveredThisMonth: number;
  unreadNotifications: number;
  onTimePercentage: number;
  podPercentage: number;
  addressQualityScore: number;
}

const defaultSettings: CustomerSettings = {
  clickops_enabled: true,
  pricing_visible_to_customer: false,
  waiting_time_visible_to_customer: false,
  customer_can_request_changes: true,
  customer_can_cancel: true,
  customer_can_view_invoices: false,
  tracking_share_link_enabled: true,
  messenger_enabled: true,
  auto_waiting_enabled: false,
  allow_customer_chat: true,
  auto_send_tracking: true,
};

export const useCustomerPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [settings, setSettings] = useState<CustomerSettings>(defaultSettings);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [templates, setTemplates] = useState<BookingTemplate[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [stats, setStats] = useState<PortalStats>({
    totalShipments: 0,
    activeShipments: 0,
    pendingSubmissions: 0,
    deliveredThisMonth: 0,
    unreadNotifications: 0,
    onTimePercentage: 0,
    podPercentage: 0,
    addressQualityScore: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer data
  const fetchCustomerData = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, company_name, contact_name, email, phone, address, city, tenant_id, onboarding_completed, first_login_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (customerError) throw customerError;
      return customerData;
    } catch (err) {
      console.error("Error fetching customer:", err);
      return null;
    }
  }, [user]);

  // Fetch customer settings (feature flags)
  const fetchSettings = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_settings")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings({
          clickops_enabled: data.clickops_enabled ?? true,
          pricing_visible_to_customer: data.pricing_visible_to_customer ?? false,
          waiting_time_visible_to_customer: data.waiting_time_visible_to_customer ?? false,
          customer_can_request_changes: data.customer_can_request_changes ?? true,
          customer_can_cancel: data.customer_can_cancel ?? true,
          customer_can_view_invoices: data.customer_can_view_invoices ?? false,
          tracking_share_link_enabled: data.tracking_share_link_enabled ?? true,
          messenger_enabled: data.messenger_enabled ?? true,
          auto_waiting_enabled: data.auto_waiting_enabled ?? false,
          allow_customer_chat: data.allow_customer_chat ?? true,
          auto_send_tracking: data.auto_send_tracking ?? true,
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  // Fetch shipments (trips)
  const fetchShipments = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          id, status, customer_status, pickup_city, delivery_city, 
          pickup_address, delivery_address, trip_date, order_number, 
          tracking_token, cargo_description, estimated_arrival, 
          actual_arrival, delivered_at, pod_available, customer_id
        `)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .order("trip_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      setShipments(data || []);
      return data || [];
    } catch (err) {
      console.error("Error fetching shipments:", err);
      return [];
    }
  }, []);

  // Fetch submissions
  const fetchSubmissions = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_submissions")
        .select(`
          id, status, pickup_company, pickup_city, pickup_address, pickup_postal_code,
          delivery_company, delivery_city, delivery_address, delivery_postal_code,
          pickup_date, created_at, reference_number, rejection_reason,
          estimated_price, product_id, converted_trip_id
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setSubmissions(data || []);
      return data || [];
    } catch (err) {
      console.error("Error fetching submissions:", err);
      return [];
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_notifications")
        .select("id, notification_type, title, body, entity_type, entity_id, is_read, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []) as unknown as CustomerNotification[]);
      return (data || []) as unknown as CustomerNotification[];
    } catch (err) {
      console.error("Error fetching notifications:", err);
      return [];
    }
  }, []);

  // Fetch booking templates
  const fetchTemplates = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_booking_templates")
        .select("id, name, is_favorite, payload_json, use_count, last_used_at")
        .eq("customer_id", customerId)
        .order("use_count", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        payload_json: t.payload_json as Record<string, unknown>
      })) as unknown as BookingTemplate[]);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  }, []);

  // Fetch saved addresses
  const fetchAddresses = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_address_book")
        .select("id, label, company_name, contact_name, phone, street, house_number, postal_code, city, country, address_quality, is_pickup_default, is_delivery_default")
        .eq("customer_id", customerId)
        .order("use_count", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSavedAddresses((data || []) as unknown as SavedAddress[]);
    } catch (err) {
      console.error("Error fetching addresses:", err);
    }
  }, []);

  // Fetch products visible to customers
  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, customer_display_name, customer_description, vehicle_type, icon_name, sales_rate, min_price")
        .eq("is_active", true)
        .eq("customer_visible", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }, []);

  // Calculate statistics
  const calculateStats = useCallback((
    shipmentsList: Shipment[],
    submissionsList: Submission[],
    notificationsList: CustomerNotification[]
  ): PortalStats => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeStatuses = ['aanvraag', 'gepland', 'geladen', 'onderweg'];
    const deliveredStatuses = ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'];
    
    const activeShipments = shipmentsList.filter(s => activeStatuses.includes(s.status));
    const deliveredThisMonth = shipmentsList.filter(s => 
      deliveredStatuses.includes(s.status) && 
      new Date(s.trip_date) >= startOfMonth
    );
    const pendingSubmissions = submissionsList.filter(s => s.status === 'pending');
    const unreadNotifications = notificationsList.filter(n => !n.is_read);
    
    // Calculate on-time percentage (simplified)
    const deliveredWithArrival = shipmentsList.filter(s => s.actual_arrival && s.estimated_arrival);
    const onTime = deliveredWithArrival.filter(s => {
      if (!s.actual_arrival || !s.estimated_arrival) return false;
      return new Date(s.actual_arrival) <= new Date(s.estimated_arrival);
    });
    const onTimePercentage = deliveredWithArrival.length > 0 
      ? Math.round((onTime.length / deliveredWithArrival.length) * 100) 
      : 0;
    
    // Calculate POD percentage
    const completed = shipmentsList.filter(s => deliveredStatuses.includes(s.status));
    const withPod = completed.filter(s => s.pod_available);
    const podPercentage = completed.length > 0 
      ? Math.round((withPod.length / completed.length) * 100) 
      : 0;

    return {
      totalShipments: shipmentsList.length,
      activeShipments: activeShipments.length,
      pendingSubmissions: pendingSubmissions.length,
      deliveredThisMonth: deliveredThisMonth.length,
      unreadNotifications: unreadNotifications.length,
      onTimePercentage,
      podPercentage,
      addressQualityScore: 85, // Placeholder - would need address data
    };
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customerData = await fetchCustomerData();
      
      if (!customerData) {
        setError("Geen klantprofiel gevonden. Neem contact op met de beheerder.");
        setLoading(false);
        return;
      }

      setCustomer(customerData);

      // Parallel fetch all data
      const [shipmentsList, submissionsList, notificationsList] = await Promise.all([
        fetchShipments(customerData.id),
        fetchSubmissions(customerData.id),
        fetchNotifications(customerData.id),
        fetchSettings(customerData.id),
        fetchTemplates(customerData.id),
        fetchAddresses(customerData.id),
        fetchProducts(),
      ]);

      // Calculate stats
      const calculatedStats = calculateStats(shipmentsList, submissionsList, notificationsList);
      setStats(calculatedStats);

      // Update first login if needed
      if (!customerData.first_login_at) {
        await supabase
          .from("customers")
          .update({ first_login_at: new Date().toISOString() })
          .eq("id", customerData.id);
      }
    } catch (err: unknown) {
      console.error("Error loading portal data:", err);
      setError("Er is een fout opgetreden bij het laden van de gegevens.");
    } finally {
      setLoading(false);
    }
  }, [user, fetchCustomerData, fetchShipments, fetchSubmissions, fetchNotifications, fetchSettings, fetchTemplates, fetchAddresses, fetchProducts, calculateStats]);

  // Initial load
  useEffect(() => {
    if (!authLoading) {
      loadAllData();
    }
  }, [authLoading, loadAllData]);

  // Real-time notifications subscription
  useEffect(() => {
    if (!customer?.id) return;

    const channelId = `customer-notifications-${customer.id}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_notifications',
          filter: `customer_id=eq.${customer.id}`,
        },
        (payload) => {
          const newNotification = payload.new as CustomerNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setStats(prev => ({
            ...prev,
            unreadNotifications: prev.unreadNotifications + 1,
          }));
          
          toast({
            title: newNotification.title,
            description: newNotification.body || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer?.id, toast]);

  // Mark notification as read
  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from("customer_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
      }));
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  }, []);

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(async () => {
    if (!customer?.id) return;

    try {
      await supabase
        .from("customer_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("customer_id", customer.id)
        .eq("is_read", false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setStats(prev => ({ ...prev, unreadNotifications: 0 }));
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  }, [customer?.id]);

  // Log audit event
  const logAuditEvent = useCallback(async (
    entityType: string,
    entityId: string | null,
    action: string,
    diffJson?: Record<string, unknown>
  ) => {
    if (!customer?.id) return;

    try {
      // Use type assertion since table was just created and types not yet synced
      const auditData = {
        tenant_id: customer.tenant_id || null,
        customer_id: customer.id,
        actor_user_id: user?.id || null,
        actor_type: 'customer',
        entity_type: entityType,
        entity_id: entityId,
        action,
        diff_json: diffJson || null,
      };
      
      await supabase.from("customer_portal_audit_log").insert(auditData as never);
    } catch (err) {
      console.error("Error logging audit event:", err);
    }
  }, [customer?.id, customer?.tenant_id, user?.id]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!customer?.id) return;

    try {
      await supabase
        .from("customers")
        .update({ onboarding_completed: true })
        .eq("id", customer.id);

      setCustomer(prev => prev ? { ...prev, onboarding_completed: true } : null);
      await logAuditEvent('customer', customer.id, 'ONBOARDING_COMPLETE');
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }
  }, [customer?.id, logAuditEvent]);

  return {
    // State
    customer,
    settings,
    shipments,
    submissions,
    notifications,
    templates,
    savedAddresses,
    products,
    stats,
    loading,
    authLoading,
    error,
    
    // Actions
    refetch: loadAllData,
    markNotificationRead,
    markAllNotificationsRead,
    logAuditEvent,
    completeOnboarding,
  };
};

export default useCustomerPortal;
