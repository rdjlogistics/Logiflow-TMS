import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Handshake, Search, Truck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  gepland: { label: "Gepland", variant: "outline" },
  onderweg: { label: "Onderweg", variant: "default" },
  afgeleverd: { label: "Afgeleverd", variant: "secondary" },
  afgerond: { label: "Afgerond", variant: "secondary" },
};

const JointOrders = () => {
  const [search, setSearch] = useState("");

  // Show trips that have a carrier assigned (= subcontracted/joint orders)
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["joint-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, order_number, status, trip_date, pickup_city, delivery_city, carrier_id, customer_id, customers(company_name), sales_total, purchase_total, carriers(company_name)")
        .not("carrier_id", "is", null)
        .is("deleted_at", null)
        .order("trip_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filtered = trips.filter(t =>
    t.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.pickup_city?.toLowerCase().includes(search.toLowerCase()) ||
    t.delivery_city?.toLowerCase().includes(search.toLowerCase()) ||
    (t.carriers as any)?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Gezamenlijke Ritten">
      <FeatureGate feature="vervoerders_netwerk">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{trips.length}</div>
              <p className="text-xs text-muted-foreground">Totaal Ritten</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{trips.filter(t => t.status === "onderweg").length}</div>
              <p className="text-xs text-muted-foreground">Onderweg</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {trips.reduce((s, t) => s + (Number(t.sales_total) || 0), 0).toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground">Omzet</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">
                {new Set(trips.map(t => t.carrier_id).filter(Boolean)).size}
              </div>
              <p className="text-xs text-muted-foreground">Partners</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5 text-primary" /> Uitbestede Ritten</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Zoek rit..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Geen uitbestede ritten gevonden</p>
                  <p className="text-sm">Ritten met een gekoppelde vervoerder verschijnen hier automatisch</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead className="hidden sm:table-cell">Datum</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead className="hidden md:table-cell">Vervoerder</TableHead>
                        <TableHead className="hidden md:table-cell">Klant</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Marge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(t => {
                        const s = statusMap[t.status as string] || { label: t.status, variant: "outline" as const };
                        const margin = (Number(t.sales_total) || 0) - (Number(t.purchase_total) || 0);
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.order_number}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              {t.trip_date ? format(new Date(t.trip_date), "d MMM yyyy", { locale: nl }) : "-"}
                            </TableCell>
                            <TableCell>{t.pickup_city} → {t.delivery_city}</TableCell>
                            <TableCell className="hidden md:table-cell">{(t.carriers as any)?.company_name || "-"}</TableCell>
                            <TableCell className="hidden md:table-cell">{(t.customers as any)?.company_name || "-"}</TableCell>
                            <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                            <TableCell className={`hidden sm:table-cell text-right font-medium ${margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {margin.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

export default JointOrders;
