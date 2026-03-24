import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceTransactions, useCashflowSummary } from "@/hooks/useFinance";
import { AddCostDialog } from "@/components/finance/AddCostDialog";
import {
  Fuel, Route, ParkingCircle, CreditCard, Receipt,
  Loader2, Plus, Download, Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

const typeLabels: Record<string, string> = {
  fuel: "Brandstof",
  toll: "Tol",
  parking: "Parkeren",
  maintenance: "Onderhoud",
  insurance: "Verzekering",
  lease: "Lease",
  subscription: "Abonnement",
  subcontract: "Uitbesteding",
  other_cost: "Overig",
};

const Costs = () => {
  const [activeTab, setActiveTab] = useState("fuel");
  const [addOpen, setAddOpen] = useState(false);

  const { data: transactions = [], isLoading } = useFinanceTransactions();
  const { data: summary } = useCashflowSummary("month");

  const groupedByType = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    for (const tx of transactions) {
      const type = tx.transaction_type || "other_cost";
      if (!groups[type]) groups[type] = [];
      groups[type].push(tx);
    }
    return groups;
  }, [transactions]);

  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const tx of transactions) {
      const type = tx.transaction_type || "other_cost";
      totals[type] = (totals[type] || 0) + Math.abs(tx.amount);
    }
    return totals;
  }, [transactions]);

  const totalSpent = Object.values(typeTotals).reduce((s, v) => s + v, 0);

  const costCategories = [
    { key: "fuel", icon: Fuel, color: "text-orange-500", bg: "bg-orange-500/10" },
    { key: "toll", icon: Route, color: "text-blue-500", bg: "bg-blue-500/10" },
    { key: "parking", icon: ParkingCircle, color: "text-purple-500", bg: "bg-purple-500/10" },
    { key: "maintenance", icon: Wrench, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { key: "other_cost", icon: CreditCard, color: "text-muted-foreground", bg: "bg-muted/30" },
  ];

  const activeTransactions = groupedByType[activeTab] || [];

  // Get available tabs from actual data
  const availableTabs = Object.keys(groupedByType).length > 0
    ? Object.keys(groupedByType)
    : ["fuel", "toll", "parking", "maintenance"];

  return (
    <DashboardLayout title="Kosten" description="Brandstof, tol, parkeren en overige kosten">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {costCategories.map(({ key, icon: Icon, color, bg }) => (
              <Card key={key} variant="glass">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${bg} rounded-lg`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{typeLabels[key] || key}</p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatCurrency(typeTotals[key] || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cost Details */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle>Kostendetails</CardTitle>
                  <Badge variant="outline" className="ml-2">{transactions.length} transacties</Badge>
                </div>
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Kosten toevoegen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap">
                  {availableTabs.map((tab) => (
                    <TabsTrigger key={tab} value={tab}>
                      {typeLabels[tab] || tab} ({groupedByType[tab]?.length || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Omschrijving</TableHead>
                      {activeTab === "fuel" && <TableHead>Voertuig</TableHead>}
                      {activeTab === "fuel" && <TableHead className="text-right">Liters</TableHead>}
                      {activeTab !== "fuel" && <TableHead>Locatie</TableHead>}
                      <TableHead className="text-right">Bedrag</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTransactions.length === 0 ? (
                      <TableEmpty colSpan={6} title={`Geen ${typeLabels[activeTab]?.toLowerCase() || ""} transacties gevonden`} />
                    ) : (
                      activeTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {format(new Date(tx.transaction_date), "d MMM yyyy", { locale: nl })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description || "—"}
                          </TableCell>
                          {activeTab === "fuel" && (
                            <TableCell className="font-mono text-sm">
                              {tx.vehicle?.license_plate || "—"}
                            </TableCell>
                          )}
                          {activeTab === "fuel" && (
                            <TableCell className="text-right tabular-nums">
                              {tx.liters ? `${tx.liters}L` : "—"}
                            </TableCell>
                          )}
                          {activeTab !== "fuel" && (
                            <TableCell>{tx.location_name || "—"}</TableCell>
                          )}
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(Math.abs(tx.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.status === "matched" ? "outline" : tx.status === "approved" ? "default" : "secondary"}>
                              {tx.status === "matched" ? "Gematcht" : tx.status === "approved" ? "Goedgekeurd" : tx.status === "pending" ? "In behandeling" : tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Tabs>
            </CardContent>
          </Card>

          <AddCostDialog open={addOpen} onOpenChange={setAddOpen} />
        </>
      )}
    </DashboardLayout>
  );
};

export default Costs;
