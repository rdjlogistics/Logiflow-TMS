import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Landmark, CheckCircle2, Clock, Loader2, Wallet, ExternalLink } from "lucide-react";
import { useOrderFinance, useCreateTripInvoice } from "@/hooks/useOrderFinance";
import { useToast } from "@/hooks/use-toast";

const eur = (n: number | null | undefined) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));
const date = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("nl-NL") : "—");

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  concept: { label: "Concept", variant: "outline" },
  verzonden: { label: "Definitief", variant: "secondary" },
  gedeeltelijk_betaald: { label: "Deels betaald", variant: "secondary" },
  betaald: { label: "Betaald", variant: "default" },
  vervallen: { label: "Vervallen", variant: "destructive" },
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium tabular-nums">{children}</span>
  </div>
);

export const OrderFinancePanel = ({ tripId }: { tripId: string }) => {
  const { data, isLoading } = useOrderFinance(tripId);
  const create = useCreateTripInvoice(tripId);
  const { toast } = useToast();

  if (isLoading) {
    return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  const inv = data?.invoice;
  const paid = Number(inv?.amount_paid ?? 0);
  const total = Number(inv?.total_amount ?? 0);
  const open = Math.max(total - paid, 0);
  const st = inv ? STATUS[inv.status] ?? { label: inv.status, variant: "outline" as const } : null;
  const matchState = !inv ? null : inv.status === "betaald" ? "Gematcht" : paid > 0 ? "Deels betaald" : "Wacht op betaling";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        Financieel
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" />Factuur</span>
              {st && <Badge variant={st.variant}>{st.label}</Badge>}
            </div>
            {inv ? (
              <>
                <Row label="Nummer">{inv.invoice_number}</Row>
                <Row label="Datum">{date(inv.invoice_date)}</Row>
                <Row label="Vervaldatum">{date(inv.due_date)}</Row>
                <Row label="Totaal (incl. btw)">{eur(total)}</Row>
                <Button asChild variant="outline" size="sm" className="w-full mt-3">
                  <Link to={`/invoices/${inv.id}`}><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open factuur</Link>
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Nog geen factuur voor deze order.</p>
                <Button size="sm" className="w-full" disabled={create.isPending}
                  onClick={() => create.mutate(undefined, {
                    onSuccess: () => toast({ title: "Conceptfactuur aangemaakt" }),
                    onError: (e) => toast({ title: "Factuur maken mislukt", description: (e as Error).message, variant: "destructive" }),
                  })}>
                  {create.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Conceptfactuur maken
                </Button>
              </div>
            )}
            {data?.expectedRevenue && (
              <p className="mt-3 text-xs text-muted-foreground">Verwachte omzet geboekt: {eur(data.expectedRevenue.amount)} excl. btw</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="flex items-center gap-2 text-sm font-semibold mb-2"><Landmark className="h-4 w-4" />Bankrekening</span>
            <Row label="Ons IBAN (op factuur)"><span className="font-mono text-xs">{data?.companyIban || "Niet ingesteld"}</span></Row>
            <Row label="IBAN klant"><span className="font-mono text-xs">{data?.customerIban || "Nog onbekend"}</span></Row>
            {!data?.companyIban && (
              <Button asChild variant="link" size="sm" className="px-0 h-auto mt-2"><Link to="/admin/settings">IBAN instellen</Link></Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {matchState === "Gematcht" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4" />}Bankmatching
              </span>
              {matchState && <Badge variant={matchState === "Gematcht" ? "default" : "outline"}>{matchState}</Badge>}
            </div>
            {inv ? (
              <>
                <Row label="Betaald">{eur(paid)}</Row>
                <Row label="Openstaand">{eur(open)}</Row>
                {data!.payments.map((p) => (
                  <div key={p.id} className="mt-2 rounded-lg border border-border/50 p-2 text-xs">
                    <div className="flex justify-between"><span>{date(p.transaction_date)}</span><span className="font-medium">{eur(p.amount)}</span></div>
                    <div className="text-muted-foreground truncate">{p.counterparty_name || "Onbekend"} · {p.counterparty_iban || "—"}</div>
                    {p.match_confidence != null && <div className="text-muted-foreground">Zekerheid {Math.round(Number(p.match_confidence) * 100)}%</div>}
                  </div>
                ))}
                {inv.status !== "betaald" && (
                  <Button asChild variant="outline" size="sm" className="w-full mt-3"><Link to="/finance/bank">Betaling handmatig matchen</Link></Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Wordt actief zodra er een factuur is.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderFinancePanel;
