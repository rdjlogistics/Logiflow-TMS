import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BookOpen, Loader2, ArrowUpRight, ArrowDownLeft, DollarSign } from "lucide-react";

const CommunityLedger = () => {
  // Show finance_transactions as ledger entries for community
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["community-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("id, description, amount, transaction_type, transaction_date, status, external_id, cost_center")
        .order("transaction_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const totalIncome = transactions.filter(t => t.transaction_type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = transactions.filter(t => t.transaction_type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  return (
    <DashboardLayout title="Grootboek">
      <FeatureGate feature="vervoerders_netwerk">
        <div className="animate-fade-in "space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <ArrowUpRight className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <div className="text-2xl font-bold text-emerald-600">{totalIncome.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Inkomsten</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <ArrowDownLeft className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <div className="text-2xl font-bold text-destructive">{totalExpense.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Uitgaven</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>{balance.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Balans</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Community Grootboek</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Geen transacties gevonden</p>
                  <p className="text-sm">Financiele transacties met partners verschijnen hier automatisch</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="hidden sm:table-cell">Referentie</TableHead>
                        <TableHead className="hidden md:table-cell">Categorie</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-muted-foreground">
                            {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString("nl-NL") : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{t.description || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{t.external_id || "-"}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {t.cost_center ? <Badge variant="outline">{t.cost_center}</Badge> : "-"}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${t.transaction_type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                            {t.transaction_type === "income" ? "+" : "-"}
                            {Math.abs(Number(t.amount)).toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.transaction_type === "income" ? "default" : "secondary"}>
                              {t.transaction_type === "income" ? "Inkomst" : "Uitgave"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default CommunityLedger;
