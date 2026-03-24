import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PurchaseInvoiceStatusBadge } from '@/components/purchase-invoices/PurchaseInvoiceStatusBadge';
import { useRealtimePurchaseInvoices } from '@/hooks/useRealtimeSubscription';

interface CarrierInvoicesTabProps {
  carrierId: string;
}

const CarrierInvoicesTab = ({ carrierId }: CarrierInvoicesTabProps) => {
  const queryKey = ['carrier-portal-invoices', carrierId];

  // Realtime subscription for instant purchase invoice updates
  const { recentlyUpdatedIds } = useRealtimePurchaseInvoices(queryKey, !!carrierId);

  const { data: invoices, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, invoice_date, due_date, subtotal, vat_amount, total_amount, status, paid_at')
        .eq('carrier_id', carrierId)
        .order('invoice_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalOpen = invoices
    ?.filter(i => !['betaald', 'concept'].includes(i.status ?? ''))
    .reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Facturen</h2>

      {/* Summary card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Openstaand bedrag</p>
            <p className="text-2xl font-bold">€ {totalOpen.toFixed(2)}</p>
          </div>
          <Euro className="h-8 w-8 text-primary/40" />
        </CardContent>
      </Card>

      {(!invoices || invoices.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Geen facturen gevonden</p>
        </div>
      ) : (
        invoices.map(inv => (
          <Card key={inv.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-bold">{inv.invoice_number}</span>
                <span className={recentlyUpdatedIds.has(inv.id) ? 'animate-realtime-pulse rounded-full' : ''}>
                  <PurchaseInvoiceStatusBadge status={inv.status as any} />
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(inv.invoice_date), 'd MMM yyyy', { locale: nl })}
                </span>
                <span className="font-semibold">€ {(inv.total_amount || 0).toFixed(2)}</span>
              </div>
              {inv.due_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Vervaldatum: {format(new Date(inv.due_date), 'd MMM yyyy', { locale: nl })}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default CarrierInvoicesTab;
