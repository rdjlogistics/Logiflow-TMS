import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  userId?: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();

  // Create in-app notification
  const createNotification = useMutation({
    mutationFn: async (params: CreateNotificationParams) => {
      const { error } = await supabase.from('notifications').insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'normal',
        channel: 'in_app',
        status: 'pending',
        entity_type: params.entityType,
        entity_id: params.entityId,
        action_url: params.actionUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Create notification for order events
  const notifyOrderCreated = (orderId: string, orderNumber: string, customerName: string) => {
    return createNotification.mutateAsync({
      type: 'order_created',
      title: 'Nieuwe order',
      message: `Order ${orderNumber} aangemaakt voor ${customerName}`,
      priority: 'normal',
      entityType: 'trip',
      entityId: orderId,
      actionUrl: `/orders/${orderId}`,
    });
  };

  const notifyOrderStatusChanged = (orderId: string, orderNumber: string, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      gepland: 'Gepland',
      onderweg: 'Onderweg',
      afgerond: 'Afgerond',
      geannuleerd: 'Geannuleerd',
    };

    return createNotification.mutateAsync({
      type: 'order_updated',
      title: 'Order status gewijzigd',
      message: `Order ${orderNumber} is nu ${statusLabels[newStatus] || newStatus}`,
      priority: newStatus === 'onderweg' ? 'high' : 'normal',
      entityType: 'trip',
      entityId: orderId,
      actionUrl: `/orders/${orderId}`,
    });
  };

  const notifyInvoiceCreated = (invoiceId: string, invoiceNumber: string, customerName: string, amount: number) => {
    return createNotification.mutateAsync({
      type: 'invoice_created',
      title: 'Factuur aangemaakt',
      message: `Factuur ${invoiceNumber} voor ${customerName} (€${amount.toLocaleString('nl-NL')})`,
      priority: 'normal',
      entityType: 'invoice',
      entityId: invoiceId,
      actionUrl: '/invoices',
    });
  };

  const notifyPaymentReceived = (invoiceId: string, invoiceNumber: string, amount: number) => {
    return createNotification.mutateAsync({
      type: 'payment_received',
      title: 'Betaling ontvangen',
      message: `Betaling van €${amount.toLocaleString('nl-NL')} ontvangen voor factuur ${invoiceNumber}`,
      priority: 'normal',
      entityType: 'invoice',
      entityId: invoiceId,
      actionUrl: '/invoices',
    });
  };

  const notifyDriverAssigned = (orderId: string, orderNumber: string, driverName: string) => {
    return createNotification.mutateAsync({
      type: 'driver_assigned',
      title: 'Chauffeur toegewezen',
      message: `${driverName} is toegewezen aan order ${orderNumber}`,
      priority: 'normal',
      entityType: 'trip',
      entityId: orderId,
      actionUrl: `/orders/${orderId}`,
    });
  };

  const notifyUrgent = (title: string, message: string, actionUrl?: string) => {
    return createNotification.mutateAsync({
      type: 'alert',
      title,
      message,
      priority: 'urgent',
      actionUrl,
    });
  };

  return {
    createNotification,
    notifyOrderCreated,
    notifyOrderStatusChanged,
    notifyInvoiceCreated,
    notifyPaymentReceived,
    notifyDriverAssigned,
    notifyUrgent,
  };
};

export default useNotifications;
