import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Scale, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const CommunitySettlements = () => {
  // Aggregate purchase invoices per carrier = settlements overview
  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ["community-settlements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("id, invoice_number, supplier_name, total_amount, status, invoice_date, due_date, paid_amount")
        .order("invoice_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const totalAmount = settlements.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const paidAmount = settlements.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
  const openAmount = totalAmount - paidAmount;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      betaald: { label: "Betaald", variant: "default" },
      open: { label: "Open", variant: "outline" },
      vervallen: { label: "Vervallen", variant: "destructive" },
      concept: { label: "Concept", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <DashboardLayout title="Afrekeningen">
      <FeatureGate feature="vervoerders_netwerk">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{totalAmount.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Totaal Inkoopfacturen</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <div className="text-2xl font-bold text-emerald-600">{paidAmount.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Betaald</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <Scale className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <div className="text-2xl font-bold text-amber-600">{openAmount.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Openstaand</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Partner Afrekeningen</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : settlements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Scale className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Geen afrekeningen gevonden</p>
                  <p className="text-sm">Inkoopfacturen van partners verschijnen hier automatisch</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factuurnummer</TableHead>
                        <TableHead>Leverancier</TableHead>
                        <TableHead className="hidden sm:table-cell">Datum</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.invoice_number || "-"}</TableCell>
                          <TableCell>{s.supplier_name || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {s.invoice_date ? new Date(s.invoice_date).toLocaleDateString("nl-NL") : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(s.total_amount).toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                          </TableCell>
                          <TableCell>{statusBadge(s.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default CommunitySettlements;
