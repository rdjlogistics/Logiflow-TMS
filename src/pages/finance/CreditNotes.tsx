import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Euro, Search } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function CreditNotes() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [vatPct, setVatPct] = useState("21");

  const tenantId = company?.id;

  const { data: creditNotes = [], isLoading } = useQuery({
    queryKey: ["credit-notes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("*")
        .eq("company_id", tenantId!);
      if (error) throw error;
      return (data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!tenantId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("customers")
        .select("id, company_name") as any)
        .eq("company_id", tenantId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-credit", tenantId, customerId],
    queryFn: async () => {
      const q = supabase
        .from("invoices")
        .select("id, invoice_number, total_amount")
        .eq("company_id", tenantId!);
      if (customerId) q.eq("customer_id", customerId);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const sub = parseFloat(subtotal) || 0;
      const vat = parseFloat(vatPct) || 21;
      const vatAmt = sub * (vat / 100);
      const { data: numData } = await supabase.rpc("generate_credit_note_number");
      const { error } = await supabase.from("credit_notes").insert({
        company_id: tenantId!,
        customer_id: customerId || null,
        invoice_id: invoiceId && invoiceId !== "" ? invoiceId : null,
        credit_note_number: numData || `CN-${Date.now()}`,
        reason,
        subtotal: sub,
        vat_percentage: vat,
        vat_amount: vatAmt,
        total_amount: sub + vatAmt,
        status: "concept",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] });
      toast({ title: "Creditnota aangemaakt" });
      setDialogOpen(false);
      setReason(""); setCustomerId(""); setInvoiceId(""); setSubtotal("");
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    if (s === "concept") return "secondary";
    if (s === "verzonden") return "default";
    if (s === "verwerkt") return "outline";
    return "secondary";
  };

  const customerMap = useMemo(() => {
    const m: Record<string, string> = {};
    customers.forEach((c: any) => { m[c.id] = c.company_name; });
    return m;
  }, [customers]);

  const filtered = creditNotes.filter((cn: any) => {
    const q = search.toLowerCase();
    const custName = customerMap[cn.customer_id] || "";
    return cn.credit_note_number?.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
  });

  const totalOpen = creditNotes.filter((cn: any) => cn.status !== "verwerkt").reduce((s: number, cn: any) => s + (cn.total_amount || 0), 0);

  return (
    <DashboardLayout title="Creditnota's" description="Beheer creditnota's en terugbetalingen">
    <div className="space-y-6">
      <PageHeader
        title="Creditnota's"
        description="Beheer creditnota's en terugbetalingen"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nieuwe creditnota</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Creditnota aanmaken</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Klant</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gekoppelde factuur (optioneel)</Label>
                  <Select value={invoiceId} onValueChange={setInvoiceId}>
                    <SelectTrigger><SelectValue placeholder="Geen factuur" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Geen</SelectItem>
                      {invoices.map((inv: any) => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number} — €{inv.total_amount?.toFixed(2)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reden</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reden voor creditnota..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Subtotaal (€)</Label>
                    <Input type="number" step="0.01" value={subtotal} onChange={e => setSubtotal(e.target.value)} />
                  </div>
                  <div>
                    <Label>BTW %</Label>
                    <Select value={vatPct} onValueChange={setVatPct}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="9">9%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!customerId || !reason || !subtotal || createMutation.isPending} className="w-full">
                  Aanmaken
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Totaal creditnota's</p>
            <p className="text-2xl font-bold">{creditNotes.length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open bedrag</p>
            <p className="text-2xl font-bold text-destructive">€{totalOpen.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Verwerkt</p>
            <p className="text-2xl font-bold">{creditNotes.filter((cn: any) => cn.status === "verwerkt").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Laden...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Geen creditnota's gevonden</CardContent></Card>
        ) : (
          filtered.map((cn: any) => (
            <Card key={cn.id} variant="interactive">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{cn.credit_note_number}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customerMap[cn.customer_id] || "—"} • {format(new Date(cn.credit_date), "d MMM yyyy", { locale: nl })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={statusColor(cn.status)}>{cn.status}</Badge>
                  <span className="font-bold text-destructive">€{cn.total_amount?.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
