import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderFinance {
  invoice: {
    id: string; invoice_number: string; invoice_date: string | null; due_date: string;
    total_amount: number | null; amount_paid: number | null; status: string;
  } | null;
  payments: Array<{
    id: string; transaction_date: string; amount: number; counterparty_name: string | null;
    counterparty_iban: string | null; match_confidence: number | null;
  }>;
  companyIban: string | null;
  customerIban: string | null;
  expectedRevenue: { amount: number; status: string | null } | null;
}

export const useOrderFinance = (tripId: string | undefined) =>
  useQuery({
    queryKey: ["order-finance", tripId],
    enabled: !!tripId,
    queryFn: async (): Promise<OrderFinance> => {
      const { data: trip } = await supabase
        .from("trips").select("company_id, customer_id").eq("id", tripId!).maybeSingle();
      const { data: line } = await supabase
        .from("invoice_lines").select("invoice_id").eq("trip_id", tripId!).limit(1).maybeSingle();

      let invoice: OrderFinance["invoice"] = null;
      let payments: OrderFinance["payments"] = [];
      if (line?.invoice_id) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("id, invoice_number, invoice_date, due_date, total_amount, amount_paid, status")
          .eq("id", line.invoice_id).maybeSingle();
        invoice = (inv as OrderFinance["invoice"]) ?? null;
        const { data: tx } = await supabase
          .from("bank_transactions")
          .select("id, transaction_date, amount, counterparty_name, counterparty_iban, match_confidence")
          .eq("matched_invoice_id", line.invoice_id)
          .order("transaction_date", { ascending: false });
        payments = (tx ?? []) as OrderFinance["payments"];
      }

      let companyIban: string | null = null;
      if (trip?.company_id) {
        const { data: c } = await supabase.from("companies").select("iban").eq("id", trip.company_id).maybeSingle();
        companyIban = (c as { iban?: string | null } | null)?.iban ?? null;
      }
      let customerIban = payments.find((p) => p.counterparty_iban)?.counterparty_iban ?? null;
      if (!customerIban && trip?.customer_id) {
        const { data: lastTx } = await supabase
          .from("bank_transactions").select("counterparty_iban, matched_invoice_id")
          .not("counterparty_iban", "is", null).not("matched_invoice_id", "is", null)
          .in("matched_invoice_id",
            ((await supabase.from("invoices").select("id").eq("customer_id", trip.customer_id).limit(50)).data ?? []).map((i) => i.id).concat(["00000000-0000-0000-0000-000000000000"]))
          .limit(1).maybeSingle();
        customerIban = lastTx?.counterparty_iban ?? null;
      }

      const { data: rev } = await supabase
        .from("finance_transactions").select("amount, status")
        .eq("external_id", `trip-revenue:${tripId}`).maybeSingle();

      return { invoice, payments, companyIban, customerIban, expectedRevenue: rev ? { amount: Number(rev.amount), status: rev.status as string | null } : null };
    },
  });

export const useCreateTripInvoice = (tripId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_trip_invoice", { p_trip: tripId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order-finance", tripId] }),
  });
};
