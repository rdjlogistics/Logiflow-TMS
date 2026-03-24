// Helper functions for purchase invoice payment status

export interface PurchaseInvoiceForStatus {
  status: string;
  due_date: string | null;
}

/**
 * Determine if a purchase invoice is overdue
 * Returns true if:
 * - status is not "betaald"
 * - due_date exists and is in the past
 */
export const isInvoiceOverdue = (invoice: PurchaseInvoiceForStatus): boolean => {
  if (invoice.status === "betaald") return false;
  if (!invoice.due_date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(invoice.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
};

/**
 * Get the payment status color for an invoice
 * - green: paid (betaald)
 * - amber: open but not overdue
 * - red: overdue
 */
export const getPaymentStatusColor = (invoice: PurchaseInvoiceForStatus): "green" | "amber" | "red" => {
  if (invoice.status === "betaald") return "green";
  if (!invoice.due_date) return "amber"; // No due date = treat as not overdue
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(invoice.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today ? "red" : "amber";
};

/**
 * Get CSS classes for payment status indicator
 */
export const getPaymentStatusClasses = (color: "green" | "amber" | "red"): string => {
  const colorClasses = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return colorClasses[color];
};

/**
 * Get CSS classes for due date cell background
 */
export const getDueDateCellClasses = (color: "green" | "amber" | "red"): string => {
  const colorClasses = {
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return colorClasses[color];
};
