import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileEdit,
  FileCheck,
  Send,
  Inbox,
  ThumbsUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

interface StatusOption {
  value: PurchaseInvoiceStatus;
  label: string;
  icon: typeof FileEdit;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "concept",
    label: "Concept",
    icon: FileEdit,
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-300 dark:border-slate-600",
  },
  {
    value: "definitief",
    label: "Definitief",
    icon: FileCheck,
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-600",
  },
  {
    value: "verzonden",
    label: "Verzonden",
    icon: Send,
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    textColor: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-300 dark:border-indigo-600",
  },
  {
    value: "ontvangen",
    label: "Ontvangen",
    icon: Inbox,
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-600",
  },
  {
    value: "goedgekeurd",
    label: "Goedgekeurd",
    icon: ThumbsUp,
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    textColor: "text-cyan-600 dark:text-cyan-400",
    borderColor: "border-cyan-300 dark:border-cyan-600",
  },
  {
    value: "betaald",
    label: "Betaald",
    icon: CheckCircle2,
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-600",
  },
  {
    value: "betwist",
    label: "Betwist",
    icon: AlertTriangle,
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-600",
  },
];

interface PurchaseInvoiceStatusDropdownProps {
  invoiceId: string;
  currentStatus: PurchaseInvoiceStatus;
  disabled?: boolean;
  onStatusChange?: (newStatus: PurchaseInvoiceStatus) => void;
}

export const PurchaseInvoiceStatusDropdown = ({
  invoiceId,
  currentStatus,
  disabled = false,
  onStatusChange,
}: PurchaseInvoiceStatusDropdownProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = statusOptions.find(s => s.value === currentStatus) || statusOptions[0];
  const Icon = currentOption.icon;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: PurchaseInvoiceStatus) => {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      // Set paid_at when status changes to betaald
      if (newStatus === "betaald") {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_invoices")
        .update(updateData)
        .eq("id", invoiceId);

      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", invoiceId] });
      toast({
        title: "Status bijgewerkt",
        description: `Status gewijzigd naar ${statusOptions.find(s => s.value === newStatus)?.label}`,
      });
      onStatusChange?.(newStatus);
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== currentStatus) {
      updateStatusMutation.mutate(newStatus as PurchaseInvoiceStatus);
    }
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={disabled || updateStatusMutation.isPending}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger
        className={cn(
          "w-auto min-w-[140px] h-8 gap-2 border text-xs font-medium",
          currentOption.bgColor,
          currentOption.textColor,
          currentOption.borderColor,
          "focus:ring-1 focus:ring-offset-0"
        )}
      >
        {updateStatusMutation.isPending && (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-50 bg-background border shadow-lg">
        {statusOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                option.value === currentStatus && "bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <OptionIcon className={cn("h-3 w-3", option.textColor)} />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
