import { useState } from "react";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { usePortalExport } from "@/hooks/usePortalExport";
import { LoadingState } from "@/components/portal/shared/LoadingState";
import { 
  Download, FileText, Euro, CheckCircle2, Clock, AlertCircle, Search, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};
const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.03, type: "spring", stiffness: 400, damping: 25 },
  }),
};

const invoiceStatusConfig = {
  draft: { label: 'Concept', color: 'text-muted-foreground', bgColor: 'bg-muted', icon: FileText },
  sent: { label: 'Verzonden', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Clock },
  paid: { label: 'Betaald', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2 },
  overdue: { label: 'Achterstallig', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: AlertCircle },
};

const summaryCards = [
  { key: 'all', label: 'Totaal', icon: Euro, colorClass: 'text-foreground' },
  { key: 'open', label: 'Openstaand', icon: Clock, colorClass: 'text-amber-400' },
  { key: 'paid', label: 'Betaald', icon: CheckCircle2, colorClass: 'text-emerald-400' },
  { key: 'overdue', label: 'Achterstallig', icon: AlertCircle, colorClass: 'text-red-400' },
] as const;

const B2BInvoices = () => {
  const { customerId, customer } = usePortalAuth();
  const { invoices, loading, refetch } = usePortalData(customerId);
  const { exportInvoices, exporting } = usePortalExport();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !search || inv.number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = {
    all: invoices.reduce((sum, i) => sum + i.amount, 0),
    open: invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.amount, 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0),
  };

  if (loading) {
    return (
      <B2BLayout companyName={customer?.companyName || "Laden..."}>
        <LoadingState message="Facturen laden..." />
      </B2BLayout>
    );
  }

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"} onRefresh={refetch}>
      <div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
        {/* Header */}
        <div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Facturen</h1>
            <p className="text-sm text-muted-foreground">{invoices.length} facturen in totaal</p>
          </div>
          <div>
            <Button 
              variant="outline" className="gap-2"
              disabled={exporting || invoices.length === 0}
              onClick={() => { exportInvoices(invoices); toast.success("Export gestart"); }}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporteer CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
          {summaryCards.map((card, index) => (
            <div key={card.key} variants={itemVariants} whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}>
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn("p-1.5 rounded-lg flex-shrink-0", card.key === 'overdue' ? 'bg-red-500/10' : card.key === 'paid' ? 'bg-emerald-500/10' : card.key === 'open' ? 'bg-amber-500/10' : 'bg-muted/50')}
                    >
                      <card.icon className={cn("h-4 w-4", card.colorClass)} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{card.label}</span>
                  </div>
                  <p
                    className={cn("text-xl font-display font-bold", card.colorClass)}
                  >
                    €{totals[card.key].toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken op factuurnummer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 text-base" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none">
            {[
              { key: null, label: 'Alles' },
              { key: 'sent', label: 'Open' },
              { key: 'paid', label: 'Betaald' },
              { key: 'overdue', label: 'Achterstallig' },
            ].map(tab => (
              <div key={tab.key || 'all'} className="snap-start">
                <Button
                  variant={statusFilter === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(tab.key)}
                  className="whitespace-nowrap touch-manipulation min-h-[44px]"
                >
                  {tab.label}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredInvoices.map((invoice, index) => {
            const status = invoiceStatusConfig[invoice.status];
            const StatusIcon = status.icon;
            const isOverdue = invoice.status === 'overdue';
            
            return (
              <div
                key={invoice.id}
                className="touch-manipulation"
              >
                <div className={cn(
                  "bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-4 transition-colors",
                  isOverdue && "border-l-2 border-l-red-500/60"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{invoice.number}</span>
                    <Badge variant="outline" className={cn(status.bgColor, status.color, "border-0 text-xs gap-1")}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{format(new Date(invoice.createdAt), "d MMM yyyy", { locale: nl })}</p>
                      <p>Vervalt: {format(new Date(invoice.dueDate), "d MMM yyyy", { locale: nl })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={cn("text-xl font-bold tabular-nums", isOverdue && "text-red-400")}
                      >
                        €{invoice.amount.toFixed(2)}
                      </span>
                      <Button
                        variant={isOverdue ? "destructive" : "outline"}
                        size="sm"
                        className="h-10 gap-1.5 min-w-[100px] touch-manipulation font-medium"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            toast.loading(`PDF wordt gegenereerd...`);
                            const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
                              body: { invoiceId: invoice.id },
                            });
                            toast.dismiss();
                            if (error || !data?.pdf) throw new Error(error?.message || "Geen PDF data");
                            const binaryString = atob(data.pdf);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                            const blob = new Blob([bytes], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `Factuur-${invoice.number}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            toast.success(`PDF gedownload`);
                          } catch (err: any) {
                            toast.dismiss();
                            toast.error(err.message || "Kon PDF niet genereren");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                        {isOverdue ? "Download PDF" : "PDF"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div variants={itemVariants} className="hidden md:block bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full w-full">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Factuurnr.</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Datum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Vervaldatum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Bedrag</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredInvoices.map((invoice, index) => {
                  const status = invoiceStatusConfig[invoice.status];
                  const StatusIcon = status.icon;
                  const isOverdue = invoice.status === 'overdue';
                  
                  return (
                    <tr
                      key={invoice.id}
                      className="transition-colors"
                    >
                      <td className="px-4 py-3"><span className="font-medium text-sm">{invoice.number}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{format(new Date(invoice.createdAt), "d MMM yyyy", { locale: nl })}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{format(new Date(invoice.dueDate), "d MMM yyyy", { locale: nl })}</span></td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn(status.bgColor, status.color, "border-0 text-xs gap-1")}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn("text-sm font-semibold", isOverdue && "text-red-400")}
                        >
                          €{invoice.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <Button 
                            variant="ghost" size="sm" className="gap-1"
                            onClick={async () => {
                              try {
                                toast.loading(`PDF wordt gegenereerd voor ${invoice.number}...`);
                                const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
                                  body: { invoiceId: invoice.id },
                                });
                                toast.dismiss();
                                if (error || !data?.pdf) throw new Error(error?.message || "Geen PDF data ontvangen");
                                const binaryString = atob(data.pdf);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Factuur-${invoice.number}.pdf`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                toast.success(`PDF gedownload: ${invoice.number}`);
                              } catch (err: any) {
                                toast.dismiss();
                                toast.error(err.message || "Kon PDF niet genereren");
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredInvoices.length === 0 && (
          <div 
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Geen facturen gevonden</h3>
            <p className="text-sm text-muted-foreground">Probeer een andere zoekopdracht of filter</p>
          </div>
        )}
      </div>
    </B2BLayout>
  );
};

export default B2BInvoices;
