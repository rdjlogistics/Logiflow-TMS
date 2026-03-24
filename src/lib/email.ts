/**
 * email.ts — LogiFlow email verzend helper
 *
 * Alle emails worden via de `send-transactional-email` Edge Function verstuurd.
 * De functie rendert React Email templates, checkt suppressies, en enqueued
 * via pgmq voor retry-safe delivery via de Lovable Email API.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Generic transactional email call ───────────────────────────────

type TemplateName = "order-confirmation" | "delivery-confirmation" | "welcome" | "notification" | "subscription-confirmation";

interface SendTransactionalEmailParams {
  template: TemplateName;
  to: string | string[];
  data: Record<string, unknown>;
}

interface EmailResult {
  success: boolean;
  error?: string;
  messageIds?: string[];
  recipientCount?: number;
}

export async function sendTransactionalEmail(params: SendTransactionalEmailParams): Promise<EmailResult> {
  const { data, error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      template: params.template,
      to: params.to,
      data: params.data,
    },
  });

  if (error) {
    console.error("[email] sendTransactionalEmail error:", error);
    return { success: false, error: error.message };
  }

  return {
    success: data?.success ?? false,
    messageIds: data?.message_ids,
    recipientCount: data?.recipient_count,
    error: data?.error,
  };
}

// ─── Convenience wrappers ───────────────────────────────────────────

interface SendInvoiceEmailParams {
  invoiceId: string;
  recipientEmails: string[];
  subject?: string;
  body?: string;
  includePdf?: boolean;
}

/**
 * Verstuur een factuur per email (uses legacy edge function).
 */
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-invoice-email", {
    body: {
      invoice_id: params.invoiceId,
      recipient_emails: params.recipientEmails,
      email_subject: params.subject,
      email_body: params.body,
      include_pdf: params.includePdf ?? true,
    },
  });

  if (error) {
    console.error("[email] sendInvoiceEmail error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, ...data };
}

interface SendOrderConfirmationParams {
  orderNumber: string;
  customerName: string;
  recipientEmail: string;
  pickupAddress: string;
  pickupCity: string;
  deliveryAddress: string;
  deliveryCity: string;
  tripDate: string;
  cargoDescription?: string;
}

/**
 * Verstuur een orderbevestiging via queue.
 */
export async function sendOrderConfirmation(params: SendOrderConfirmationParams): Promise<EmailResult> {
  return sendTransactionalEmail({
    template: "order-confirmation",
    to: params.recipientEmail,
    data: {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      pickupAddress: params.pickupAddress,
      pickupCity: params.pickupCity,
      deliveryAddress: params.deliveryAddress,
      deliveryCity: params.deliveryCity,
      tripDate: params.tripDate,
      cargoDescription: params.cargoDescription,
    },
  });
}

interface SendDeliveryConfirmationParams {
  orderNumber: string;
  customerName: string;
  recipientEmail: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveredAt: string;
  driverName?: string;
  podAvailable?: boolean;
}

/**
 * Verstuur een afleverbevestiging via queue.
 */
export async function sendDeliveryConfirmation(params: SendDeliveryConfirmationParams): Promise<EmailResult> {
  return sendTransactionalEmail({
    template: "delivery-confirmation",
    to: params.recipientEmail,
    data: {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      deliveryAddress: params.deliveryAddress,
      deliveryCity: params.deliveryCity,
      deliveredAt: params.deliveredAt,
      driverName: params.driverName,
      podAvailable: params.podAvailable,
    },
  });
}

interface SendWelcomeEmailParams {
  email: string;
  name: string;
  role: "driver" | "customer" | "staff";
}

/**
 * Stuur een welkomstemail via queue.
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<EmailResult> {
  const roleLabels: Record<string, string> = {
    driver: "chauffeur",
    customer: "klant",
    staff: "medewerker",
  };

  return sendTransactionalEmail({
    template: "welcome",
    to: params.email,
    data: {
      name: params.name,
      role: roleLabels[params.role] || params.role,
      siteUrl: window.location.origin,
    },
  });
}

interface SendNotificationParams {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Stuur een algemene notificatie-email via queue.
 */
export async function sendNotification(params: SendNotificationParams): Promise<EmailResult> {
  return sendTransactionalEmail({
    template: "notification",
    to: params.recipientEmail,
    data: {
      subject: params.subject,
      recipientName: params.recipientName,
      message: params.message,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
    },
  });
}

/**
 * Stuur een dispatch notificatie naar een chauffeur (legacy edge function).
 */
export async function sendDispatchNotification(params: { tripId: string; driverId: string }): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("dispatch-notify", {
    body: {
      trip_id: params.tripId,
      driver_id: params.driverId,
    },
  });

  if (error) {
    console.error("[email] sendDispatchNotification error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, ...data };
}

// ─── Subscription confirmation ──────────────────────────────────

interface SendSubscriptionConfirmationParams {
  recipientEmail: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  amount: string;
  currency?: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod?: string;
  paymentId: string;
  features?: string[];
  settingsUrl?: string;
}

/**
 * Verstuur een abonnement bevestigingsmail via queue.
 */
export async function sendSubscriptionConfirmation(params: SendSubscriptionConfirmationParams): Promise<EmailResult> {
  return sendTransactionalEmail({
    template: "subscription-confirmation",
    to: params.recipientEmail,
    data: {
      planName: params.planName,
      billingCycle: params.billingCycle,
      amount: params.amount,
      currency: params.currency || "EUR",
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      paymentMethod: params.paymentMethod,
      paymentId: params.paymentId,
      features: params.features,
      settingsUrl: params.settingsUrl || `${window.location.origin}/admin/settings`,
    },
  });
}
