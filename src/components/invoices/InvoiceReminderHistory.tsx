import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone, Bell, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNEL_CONFIG: Record<string, { icon: typeof Mail; label: string }> = {
  email: { icon: Mail, label: "E-mail" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp" },
  sms: { icon: Phone, label: "SMS" },
};

const TYPE_LABELS: Record<string, string> = {
  first: "1e herinnering",
  second: "2e herinnering",
  third: "3e herinnering",
  custom: "Aangepast",
  final_notice: "Laatste aanmaning",
};

interface InvoiceReminderHistoryProps {
  invoiceId: string;
}

export function InvoiceReminderHistory({ invoiceId }: InvoiceReminderHistoryProps) {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ["invoice-reminder-history", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_email_log")
        .select("id, channel, reminder_type, recipient_email, delivery_status, created_at")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <div className="px-6 pb-6">
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!reminders || reminders.length === 0) {
    return (
      <div className="px-6 pb-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Geen herinneringen verstuurd</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Herinneringen verschijnen hier na verzending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 space-y-2">
      {reminders.map((r, idx) => {
        const channel = CHANNEL_CONFIG[r.channel ?? "email"] ?? CHANNEL_CONFIG.email;
        const ChannelIcon = channel.icon;
        const isSent = r.delivery_status === "sent" || r.delivery_status === "delivered";
        const date = new Date(r.created_at);

        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/20 transition-colors duration-200 group"
          >
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
              isSent ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            )}>
              <ChannelIcon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {TYPE_LABELS[r.reminder_type ?? ""] ?? r.reminder_type ?? "Herinnering"}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md",
                  isSent
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                )}>
                  {isSent ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {isSent ? "Verzonden" : "Mislukt"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {r.recipient_email ?? "–"} · {channel.label}
              </p>
            </div>

            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
              <span className="ml-1 opacity-60">
                {date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
