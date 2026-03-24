import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeInvoices } from "@/hooks/useRealtimeSubscription";
import { useState } from "react";

interface B2CInvoicesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  status: string;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid: { label: "Betaald", icon: CheckCircle2, className: "text-emerald-500 bg-emerald-500/10" },
  sent: { label: "Open", icon: Clock, className: "text-amber-500 bg-amber-500/10" },
  overdue: { label: "Achterstallig", icon: AlertCircle, className: "text-red-500 bg-red-500/10" },
  draft: { label: "Concept", icon: Clock, className: "text-muted-foreground bg-muted" },
  pending: { label: "In afwachting", icon: Clock, className: "text-amber-500 bg-amber-500/10" },
};

export const B2CInvoicesSheet = ({ open, onOpenChange }: B2CInvoicesSheetProps) => {
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryKey = ['b2c-invoices', user?.id || ''];

  // Realtime subscription for instant invoice updates
  const { recentlyUpdatedIds } = useRealtimeInvoices(queryKey, open && !!user?.id);
  // Fetch real invoices for the current user's customer account
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: async (): Promise<Invoice[]> => {
      if (!user?.id) return [];

      // First get the customer linked to this user
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        return [];
      }

      if (!customer) {
        // No customer linked, return empty
        return [];
      }

      // Fetch invoices for this customer
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at, total_amount, status')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (invoiceError) {
        console.error('Error fetching invoices:', invoiceError);
        throw invoiceError;
      }

      return invoiceData || [];
    },
    enabled: open && !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  const handleDownload = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session?.access_token) {
        toast.error("Je moet ingelogd zijn om facturen te downloaden");
        return;
      }

      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id },
      });

      if (response.error) {
        console.error('PDF generation error:', response.error);
        toast.error("Kon PDF niet genereren");
        return;
      }

      const data = response.data;
      
      if (!data?.pdf) {
        toast.error("Geen PDF inhoud ontvangen");
        return;
      }

      // Download PDF directly
      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factuur-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`PDF voor ${invoice.invoice_number} gedownload`);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error("Downloaden mislukt");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatus = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Mijn facturen</SheetTitle>
          <SheetDescription>Bekijk en download je facturen</SheetDescription>
        </SheetHeader>
        
        <div className="space-y-3 overflow-y-auto max-h-[calc(80vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
              <p className="text-muted-foreground">Kon facturen niet laden</p>
            </div>
          ) : invoices && invoices.length > 0 ? (
            invoices.map((invoice) => {
              const status = getStatus(invoice.status);
              const StatusIcon = status.icon;
              
              return (
                <Card key={invoice.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <Badge variant="outline" className={`text-xs gap-1 ${status.className} border-0 rounded-full ${recentlyUpdatedIds.has(invoice.id) ? 'animate-realtime-pulse' : ''}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.created_at), "d MMMM yyyy", { locale: nl })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">€{(invoice.total_amount || 0).toFixed(2)}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 gap-1"
                          onClick={() => handleDownload(invoice)}
                          disabled={downloadingId === invoice.id}
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nog geen facturen</p>
              <p className="text-xs text-muted-foreground mt-1">
                Facturen verschijnen hier zodra er ritten zijn gefactureerd
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
