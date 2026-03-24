import { supabase } from "@/integrations/supabase/client";

export interface SmsResult {
  success: boolean;
  message_id?: string;
  status?: string;
  error?: string;
}

/**
 * Send an SMS via the send-sms edge function (MessageBird).
 * Returns success/error — does NOT throw.
 */
export async function sendSms(params: {
  to: string;
  message: string;
  trip_id?: string;
  driver_id?: string;
  type?: "trip_update" | "dispatch" | "reminder" | "custom";
}): Promise<SmsResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: params,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message_id: data?.message_id,
      status: data?.status,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Prebuilt SMS templates for common logistics events.
 */
export const smsTemplates = {
  tripAssigned: (driverName: string, orderNumber: string, pickup: string, pickupTime: string) =>
    `Hallo ${driverName}, je hebt een nieuwe opdracht: rit ${orderNumber}.\n📍 Ophalen bij: ${pickup}\n🕐 Tijd: ${pickupTime}\nInloggen via LogiFlow TMS`,

  tripUpdated: (orderNumber: string, change: string) =>
    `Update rit ${orderNumber}: ${change}\nBekijk details in de LogiFlow app.`,

  reminderDelivery: (orderNumber: string, address: string, time: string) =>
    `Herinnering: rit ${orderNumber}\n📦 Afleveren bij: ${address}\n🕐 Uiterlijk: ${time}`,

  paymentReminder: (customerName: string, invoiceNumber: string, amount: string, dueDate: string) =>
    `Beste ${customerName}, uw factuur ${invoiceNumber} (€${amount}) vervalt op ${dueDate}. Betaal via uw betaallink of neem contact op.`,

  dispatchConfirmation: (driverName: string, vehicle: string, startTime: string) =>
    `${driverName}, u bent ingepland voor ${vehicle} vanaf ${startTime}. Bevestig via de app.`,
};
