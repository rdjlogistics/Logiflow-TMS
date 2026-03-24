import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink } from "lucide-react";
import { PurchaseInvoiceStatusBadge } from "@/components/purchase-invoices/PurchaseInvoiceStatusBadge";
import { getPaymentStatusColor, getDueDateCellClasses, isInvoiceOverdue } from "@/lib/purchase-invoice-helpers";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface PurchaseInvoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  status: string | null;
}

interface CarrierPurchaseInvoicesProps {
  carrierId: string;
}

const CarrierPurchaseInvoices = ({ carrierId }: CarrierPurchaseInvoicesProps) => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("purchase_invoices")
        .select("id, invoice_number, invoice_date, due_date, total_amount, status")
        .eq("carrier_id", carrierId)
        .order("invoice_date", { ascending: false })
        .limit(20);
      setInvoices(data || []);
      setLoading(false);
    };
    fetchInvoices();
  }, [carrierId]);

  if (loading) {
    return <div className="py-4 text-center text-sm text-muted-foreground">Inkoopfacturen laden...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Inkoopfacturen ({invoices.length})</h4>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => navigate("/purchase-invoices/new")}>
          <Plus className="h-3 w-3" />
          Nieuwe inkoopfactuur
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Geen inkoopfacturen voor dit charter.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Factuurnr.</TableHead>
              <TableHead className="text-xs">Datum</TableHead>
              <TableHead className="text-xs">Vervaldatum</TableHead>
              <TableHead className="text-xs text-right">Bedrag</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => {
              const status = inv.status ?? "concept";
              const color = getPaymentStatusColor({ status, due_date: inv.due_date });
              const overdue = isInvoiceOverdue({ status, due_date: inv.due_date });
              const dueDateClasses = getDueDateCellClasses(color);

              return (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/purchase-invoices/${inv.id}`)}
                >
                  <TableCell className="text-xs font-medium">{inv.invoice_number || "-"}</TableCell>
                  <TableCell className="text-xs">
                    {inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy", { locale: nl }) : "-"}
                  </TableCell>
                  <TableCell className={`text-xs rounded px-2 ${dueDateClasses}`}>
                    {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy", { locale: nl }) : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {inv.total_amount != null ? `€ ${inv.total_amount.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <PurchaseInvoiceStatusBadge status={status as any} isOverdue={overdue} />
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default CarrierPurchaseInvoices;
