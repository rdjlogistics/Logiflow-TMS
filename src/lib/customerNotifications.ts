import { supabase } from '@/integrations/supabase/client';

const STATUS_MESSAGES: Record<string, { title: string; body: (orderNr: string) => string }> = {
  gepland: {
    title: '📦 Zending ingepland',
    body: (nr) => `Uw zending ${nr} is ingepland voor transport`,
  },
  geladen: {
    title: '📦 Zending geladen',
    body: (nr) => `Uw zending ${nr} is geladen en klaar voor transport`,
  },
  onderweg: {
    title: '🚚 Zending onderweg',
    body: (nr) => `Uw zending ${nr} is opgehaald en onderweg`,
  },
  afgeleverd: {
    title: '✅ Zending afgeleverd',
    body: (nr) => `Uw zending ${nr} is afgeleverd`,
  },
  gecontroleerd: {
    title: '✅ Zending afgeleverd',
    body: (nr) => `Uw zending ${nr} is afgeleverd`,
  },
  afgerond: {
    title: '✅ Zending afgemeld',
    body: (nr) => `Uw zending ${nr} is afgemeld`,
  },
  geannuleerd: {
    title: '❌ Zending geannuleerd',
    body: (nr) => `Uw zending ${nr} is geannuleerd`,
  },
};

/**
 * Send a push notification to the B2B customer when their shipment status changes.
 * Non-blocking: errors are logged but never thrown.
 */
export function notifyCustomerStatusChange(
  customerId: string | null | undefined,
  tripId: string,
  newStatus: string,
  orderNumber?: string | null,
) {
  if (!customerId) return;

  const mapping = STATUS_MESSAGES[newStatus];
  if (!mapping) return;

  const nr = orderNumber || tripId.slice(0, 8).toUpperCase();

  supabase.functions
    .invoke('send-customer-notification', {
      body: {
        customer_id: customerId,
        trip_id: tripId,
        subject: mapping.title,
        message: mapping.body(nr),
        notification_type: 'status_change',
      },
    })
    .catch((err) => console.error('[CustomerNotification] Failed:', err));
}
