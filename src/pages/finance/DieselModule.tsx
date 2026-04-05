import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Fuel,
  Plus,
  TrendingUp,
  TrendingDown,
  Calculator,
  Euro,
  Calendar,
  RefreshCw,
  Trash2,
  Edit,
  Loader2,
  Info,
  BarChart3,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DieselStaffel {
  id: string;
  tenant_id: string;
  name: string;
  reference_price: number;
  current_market_price: number | null;
  step_size: number;
  step_percentage: number;
  max_surcharge_pct: number | null;
  min_surcharge_pct: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  price_history: any[];
  last_updated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function calculateSurcharge(staffel: DieselStaffel): number {
  if (!staffel.current_market_price) return 0;
  const diff = staffel.current_market_price - staffel.reference_price;
  if (diff <= 0) return Math.max(staffel.min_surcharge_pct ?? 0, 0);
  const steps = Math.floor(diff / staffel.step_size);
  const surcharge = steps * staffel.step_percentage;
  const capped = Math.min(surcharge, staffel.max_surcharge_pct ?? 100);
  return Math.max(capped, staffel.min_surcharge_pct ?? 0);
}

const DieselModule = () => {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaffel, setEditingStaffel] = useState<DieselStaffel | null>(null);

  const [form, setForm] = useState({
    name: "Standaard Staffel",
    reference_price: "1.5000",
    current_market_price: "",
    step_size: "0.0500",
    step_percentage: "0.50",
    max_surcharge_pct: "25.00",
    min_surcharge_pct: "0.00",
    valid_from: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: staffels, isLoading } = useQuery({
    queryKey: ["diesel-staffels", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("diesel_staffels")
        .select("*")
        .eq("tenant_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DieselStaffel[];
    },
    enabled: !!companyId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: any) => {
      if (editingStaffel) {
        const { error } = await supabase
          .from("diesel_staffels")
          .update(input)
          .eq("id", editingStaffel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("diesel_staffels")
          .insert({ ...input, tenant_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel-staffels"] });
      toast.success(editingStaffel ? "Staffel bijgewerkt" : "Staffel aangemaakt");
      setDialogOpen(false);
      setEditingStaffel(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diesel_staffels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel-staffels"] });
      toast.success("Staffel verwijderd");
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const staffel = staffels?.find((s) => s.id === id);
      const history = [...(staffel?.price_history || []), { date: new Date().toISOString().split("T")[0], price }];
      const { error } = await supabase
        .from("diesel_staffels")
        .update({
          current_market_price: price,
          price_history: history as any,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diesel-staffels"] });
      toast.success("Marktprijs bijgewerkt");
    },
  });

  const handleSubmit = () => {
    upsertMutation.mutate({
      name: form.name,
      reference_price: parseFloat(form.reference_price),
      current_market_price: form.current_market_price ? parseFloat(form.current_market_price) : null,
      step_size: parseFloat(form.step_size),
      step_percentage: parseFloat(form.step_percentage),
      max_surcharge_pct: parseFloat(form.max_surcharge_pct),
      min_surcharge_pct: parseFloat(form.min_surcharge_pct),
      valid_from: form.valid_from,
      notes: form.notes || null,
    });
  };

  const openEdit = (s: DieselStaffel) => {
    setEditingStaffel(s);
    setForm({
      name: s.name,
      reference_price: String(s.reference_price),
      current_market_price: s.current_market_price ? String(s.current_market_price) : "",
      step_size: String(s.step_size),
      step_percentage: String(s.step_percentage),
      max_surcharge_pct: String(s.max_surcharge_pct ?? 25),
      min_surcharge_pct: String(s.min_surcharge_pct ?? 0),
      valid_from: s.valid_from,
      notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingStaffel(null);
    setForm({
      name: "Standaard Staffel",
      reference_price: "1.5000",
      current_market_price: "",
      step_size: "0.0500",
      step_percentage: "0.50",
      max_surcharge_pct: "25.00",
      min_surcharge_pct: "0.00",
      valid_from: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setDialogOpen(true);
  };

  // Summary stats
  const activeStaffels = staffels?.filter((s) => s.is_active) ?? [];
  const avgSurcharge = activeStaffels.length > 0
    ? activeStaffels.reduce((sum, s) => sum + calculateSurcharge(s), 0) / activeStaffels.length
    : 0;

  // Price history for chart from first active staffel
  const chartStaffel = activeStaffels[0];
  const chartData = (chartStaffel?.price_history || []).map((entry: any) => ({
    date: entry.date,
    price: entry.price,
    reference: chartStaffel?.reference_price,
  }));

  return (
    <DashboardLayout title="Diesel Staffel Module" description="Automatische brandstoftoeslag berekening">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Staffels</CardTitle>
              <Fuel className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStaffels.length}</div>
              <p className="text-xs text-muted-foreground">{staffels?.length ?? 0} totaal</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Huidige Marktprijs</CardTitle>
              <Euro className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chartStaffel?.current_market_price
                  ? `€${Number(chartStaffel.current_market_price).toFixed(4)}`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Per liter diesel</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Toeslag</CardTitle>
              {avgSurcharge > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSurcharge.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">Brandstoftoeslag</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referentieprijs</CardTitle>
              <Calculator className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chartStaffel ? `€${Number(chartStaffel.reference_price).toFixed(4)}` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Basisprijs staffel</p>
            </CardContent>
          </Card>
        </div>

        {/* Price History Chart */}
        {chartData.length > 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Dieselprijs Historie</CardTitle>
              </div>
              <CardDescription>Marktprijs vs referentieprijs over tijd</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area type="monotone" dataKey="price" name="Marktprijs" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="reference" name="Referentie" stroke="#6366f1" fill="none" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staffels Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Diesel Staffels</CardTitle>
                <CardDescription>Beheer brandstoftoeslag staffels per contract</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Staffel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingStaffel ? "Staffel Bewerken" : "Nieuwe Staffel"}</DialogTitle>
                    <DialogDescription>
                      Stel referentieprijs en staffelstappen in voor automatische brandstoftoeslag berekening
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Naam</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Referentieprijs (€/L)</Label>
                        <Input type="number" step="0.0001" value={form.reference_price} onChange={(e) => setForm({ ...form, reference_price: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Huidige marktprijs (€/L)</Label>
                        <Input type="number" step="0.0001" value={form.current_market_price} onChange={(e) => setForm({ ...form, current_market_price: e.target.value })} placeholder="Optioneel" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Stapgrootte (€)</Label>
                        <Input type="number" step="0.0001" value={form.step_size} onChange={(e) => setForm({ ...form, step_size: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Toeslag per stap (%)</Label>
                        <Input type="number" step="0.01" value={form.step_percentage} onChange={(e) => setForm({ ...form, step_percentage: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Min toeslag (%)</Label>
                        <Input type="number" step="0.01" value={form.min_surcharge_pct} onChange={(e) => setForm({ ...form, min_surcharge_pct: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Max toeslag (%)</Label>
                        <Input type="number" step="0.01" value={form.max_surcharge_pct} onChange={(e) => setForm({ ...form, max_surcharge_pct: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Geldig vanaf</Label>
                      <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Notities</Label>
                      <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optioneel" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
                    <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                      {upsertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingStaffel ? "Opslaan" : "Aanmaken"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !staffels?.length ? (
              <div className="text-center py-12">
                <Fuel className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">Nog geen staffels aangemaakt</p>
                <p className="text-sm text-muted-foreground mt-1">Maak een staffel aan om brandstoftoeslagen automatisch te berekenen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead className="text-right">Referentie</TableHead>
                      <TableHead className="text-right">Marktprijs</TableHead>
                      <TableHead className="text-right">Stap</TableHead>
                      <TableHead className="text-right">Toeslag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffels.map((s) => {
                      const surcharge = calculateSurcharge(s);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right">€{Number(s.reference_price).toFixed(4)}</TableCell>
                          <TableCell className="text-right">
                            {s.current_market_price ? `€${Number(s.current_market_price).toFixed(4)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">€{Number(s.step_size).toFixed(4)} / {Number(s.step_percentage).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={surcharge > 0 ? "destructive" : "secondary"}>
                              {surcharge.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? "Actief" : "Inactief"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const price = prompt("Nieuwe marktprijs (€/L):");
                                  if (price) updatePriceMutation.mutate({ id: s.id, price: parseFloat(price) });
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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

        {/* How it works */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Hoe werkt de diesel staffel?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>De staffel berekent automatisch een brandstoftoeslag op basis van het verschil tussen de huidige marktprijs en de referentieprijs.</p>
            <p><strong>Voorbeeld:</strong> Referentieprijs €1.50, stapgrootte €0.05, toeslag per stap 0.50%.</p>
            <p>Als de marktprijs stijgt naar €1.65 (verschil €0.15 = 3 stappen), dan is de toeslag 3 x 0.50% = <strong>1.50%</strong>.</p>
            <p>Deze toeslag wordt automatisch toegepast bij het aanmaken van facturen via de batch-facturatie wizard.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DieselModule;
