import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/components/notifications/NotificationCenter";
import { AlertTriangle, ChevronRight, Clock, CalendarClock } from "lucide-react";
import { addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface AlertData {
  overdue: Array<{
    id: string;
    invoice_number: string;
    due_date: string;
    total_amount: number;
  }>;
  soonDue: Array<{
    id: string;
    invoice_number: string;
    due_date: string;
    total_amount: number;
  }>;
  overdueAmount: number;
  soonDueAmount: number;
}

/**
 * Hook to fetch and process purchase invoice payment alerts
 * Automatically adds notification for overdue invoices (once per session)
 */
export const usePurchaseInvoiceAlerts = () => {
  const { addNotification, notifications } = useNotifications();
  const alertShownRef = useRef(false);

  const { data: alertData, isLoading } = useQuery<AlertData>({
    queryKey: ["purchase-invoice-alerts"],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const threeDaysFromNow = addDays(today, 3);

      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("id, invoice_number, due_date, total_amount, status")
        .neq("status", "betaald")
        .not("due_date", "is", null);

      if (error) throw error;

      const invoices = data || [];

      const overdue = invoices.filter((inv) => {
        const dueDate = startOfDay(new Date(inv.due_date!));
        return isBefore(dueDate, today);
      });

      const soonDue = invoices.filter((inv) => {
        const dueDate = startOfDay(new Date(inv.due_date!));
        return (
          !isBefore(dueDate, today) &&
          !isAfter(dueDate, threeDaysFromNow)
        );
      });

      const overdueAmount = overdue.reduce(
        (sum, i) => sum + Number(i.total_amount),
        0
      );
      const soonDueAmount = soonDue.reduce(
        (sum, i) => sum + Number(i.total_amount),
        0
      );

      return { overdue, soonDue, overdueAmount, soonDueAmount } as AlertData;
    },
    staleTime: 300000, // 5 minute cache
    refetchOnWindowFocus: false,
  });

  // Show notification for overdue invoices (once per session)
  useEffect(() => {
    if (
      alertData?.overdue &&
      alertData.overdue.length > 0 &&
      !alertShownRef.current
    ) {
      // Check if there's already a similar unread notification
      const hasExisting = notifications.some(
        (n) => n.type === "invoice_due" && !n.read
      );

      if (!hasExisting) {
        addNotification({
          type: "invoice_due",
          title: `${alertData.overdue.length} inkoopfacturen verlopen`,
          message: `Totaal openstaand: €${alertData.overdueAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`,
          actionUrl: "/purchase-invoices?status=verlopen",
        });
        alertShownRef.current = true;
      }
    }
  }, [alertData, addNotification, notifications]);

  return { alertData, isLoading };
};

/**
 * Payment alert banner for dashboard or purchase invoices page
 */
export const PaymentAlertBanner = () => {
  const { alertData, isLoading } = usePurchaseInvoiceAlerts();

  if (isLoading) return null;

  const hasOverdue = alertData?.overdue && alertData.overdue.length > 0;
  const hasSoonDue = alertData?.soonDue && alertData.soonDue.length > 0;

  if (!hasOverdue && !hasSoonDue) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {/* Overdue Alert */}
      {hasOverdue && (
        <Link to="/purchase-invoices?status=verlopen">
          <div
            className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all",
              "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-600 dark:text-red-400">
                  {alertData!.overdue.length} facturen over vervaldatum
                </p>
                <p className="text-sm text-red-500/80">
                  {formatCurrency(alertData!.overdueAmount)} openstaand
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </Link>
      )}

      {/* Soon Due Alert */}
      {hasSoonDue && (
        <Link to="/purchase-invoices">
          <div
            className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all",
              "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <CalendarClock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {alertData!.soonDue.length} facturen bijna verlopen
                </p>
                <p className="text-sm text-amber-500/80">
                  {formatCurrency(alertData!.soonDueAmount)} binnen 3 dagen
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </Link>
      )}
    </div>
  );
};

/**
 * Compact alert indicator for use in headers/navbars
 */
export const PaymentAlertIndicator = () => {
  const { alertData } = usePurchaseInvoiceAlerts();

  const overdueCount = alertData?.overdue?.length || 0;

  if (overdueCount === 0) return null;

  return (
    <Link
      to="/purchase-invoices?status=verlopen"
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 transition-colors"
    >
      <Clock className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{overdueCount} verlopen</span>
    </Link>
  );
};
