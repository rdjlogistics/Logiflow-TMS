import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { InvoiceEmailComposer } from "@/components/invoices/InvoiceEmailComposer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Calendar, FileText, Euro, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function InvoiceSend() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-for-send', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            id,
            company_name,
            email,
            phone,
            address,
            city,
            postal_code,
            contact_name
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleSuccess = () => {
    navigate('/invoices');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Factuur Verzenden">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="bg-card border border-border rounded-xl p-6">
                <Skeleton className="h-8 w-48 mb-6" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Factuur niet gevonden">
        <div className="max-w-6xl mx-auto">
          <div className="bg-card border border-border rounded-xl py-12 text-center">
            <p className="text-muted-foreground">Factuur niet gevonden</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/invoices')}>
              Terug naar facturen
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Factuur ${invoice.invoice_number} Verzenden`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/invoices')} 
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar facturen
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Invoice Summary (40%) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Invoice Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              {/* Invoice Header */}
              <div className="px-5 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{invoice.invoice_number}</h3>
                    <p className="text-xs text-muted-foreground">Factuurnummer</p>
                  </div>
                </div>
              </div>

              {/* Total Amount Highlight */}
              <div className="px-5 py-5 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Euro className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Totaal incl. BTW</span>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  €{invoice.total_amount?.toFixed(2) || '0.00'}
                </p>
              </div>

              {/* Customer Info */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Klant</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{invoice.customers?.company_name}</p>
                  {invoice.customers?.contact_name && (
                    <p className="text-sm text-muted-foreground">
                      t.a.v. {invoice.customers.contact_name}
                    </p>
                  )}
                  {invoice.customers?.address && (
                    <p className="text-sm text-muted-foreground">
                      {invoice.customers.address}
                    </p>
                  )}
                  {(invoice.customers?.postal_code || invoice.customers?.city) && (
                    <p className="text-sm text-muted-foreground">
                      {invoice.customers.postal_code} {invoice.customers.city}
                    </p>
                  )}
                  {invoice.customers?.email && (
                    <p className="text-sm text-primary mt-2">{invoice.customers.email}</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="px-5 py-4 border-b border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Factuurdatum</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">Vervaldatum</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(invoice.due_date), 'd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="px-5 py-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotaal</span>
                    <span>€{invoice.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>BTW ({invoice.vat_percentage}%)</span>
                    <span>€{invoice.vat_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border">
                    <span>Totaal</span>
                    <span>€{invoice.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Email Composer (60%) */}
          <div className="lg:col-span-3">
            <InvoiceEmailComposer 
              invoiceId={invoice.id}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
