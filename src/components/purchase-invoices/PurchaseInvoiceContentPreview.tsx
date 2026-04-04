import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Truck, 
  Copy, 
  Check, 
  Phone, 
  Mail,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { hapticSelection } from "@/lib/haptics";

interface PurchaseInvoiceContentPreviewProps {
  invoiceId: string;
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export const PurchaseInvoiceContentPreview = ({
  invoiceId,
}: PurchaseInvoiceContentPreviewProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["purchase-invoice-preview", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select(`
          *,
          carriers(id, company_name, contact_name, email, phone, address, city, postal_code, vat_number)
        `)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ["purchase-invoice-lines-preview", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoice_lines")
        .select(`
          *,
          trips(id, order_number, pickup_city, delivery_city, trip_date, distance_km)
        `)
        .eq("purchase_invoice_id", invoiceId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const copyToClipboard = async (text: string, field: string) => {
    hapticSelection();
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Gekopieerd naar klembord");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (invoiceLoading || linesLoading) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const carrier = invoice.carriers as any;

  return (
    <div className="space-y-4">
      {/* Invoice Header Card - Glassmorphism */}
      <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5">
        {/* Top gradient highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <motion.div
            >
              <FileText className="h-5 w-5 text-primary" />
            </motion.div>
            Factuurinhoud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Factuurnummer</p>
              <p className="font-semibold text-foreground">{invoice.invoice_number}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Factuurdatum</p>
              <p className="font-medium text-foreground">
                {format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Periode</p>
              <p className="font-medium text-foreground">
                {invoice.period_from && invoice.period_to
                  ? (
                    <span className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-primary/5 border-primary/20 text-primary">
                        W{getISOWeek(new Date(invoice.period_from))}
                        {getISOWeek(new Date(invoice.period_from)) !== getISOWeek(new Date(invoice.period_to)) && 
                          `-${getISOWeek(new Date(invoice.period_to))}`}
                      </Badge>
                      <span>
                        {format(new Date(invoice.period_from), "d MMM", { locale: nl })} - {format(new Date(invoice.period_to), "d MMM", { locale: nl })}
                      </span>
                    </span>
                  )
                  : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Aantal ritten</p>
              <p className="font-semibold text-foreground">{lines?.length || 0}</p>
            </div>
          </div>

          {/* Lines Table - Premium styling */}
          <div className="rounded-xl border border-border/50 overflow-hidden bg-background/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Order</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Route</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Datum</TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">Bedrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines?.map((line, idx) => (
                  <motion.tr
                    key={line.id}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "group transition-all duration-200 hover:bg-primary/5",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    <TableCell className="font-medium">
                      {line.trips?.order_number || "-"}
                    </TableCell>
                    <TableCell>
                      {line.trips ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="flex items-center gap-1 text-emerald-600">
                            <MapPin className="h-3 w-3" />
                            <span className="font-medium">{line.trips.pickup_city}</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className="flex items-center gap-1 text-primary">
                            <MapPin className="h-3 w-3" />
                            <span className="font-medium">{line.trips.delivery_city}</span>
                          </div>
                          {line.trips.distance_km && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                              {line.trips.distance_km} km
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{line.description || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {line.trips?.trip_date ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-primary/5 border-primary/20 text-primary">
                            W{getISOWeek(new Date(line.trips.trip_date))}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(line.trips.trip_date), "d MMM", { locale: nl })}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(Number(line.total_price))}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals - Premium gradient separator */}
          <div className="mt-4 pt-4 space-y-2">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Subtotaal</span>
              <span className="font-medium tabular-nums">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">BTW {invoice.vat_percentage}%</span>
              <span className="font-medium tabular-nums">{formatCurrency(Number(invoice.vat_amount))}</span>
            </div>
            
            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold">Totaal</span>
              <motion.span 
                initial={{ scale: 0.9, opacity: 0 }}
                className="text-2xl font-bold text-primary"
              >
                {formatCurrency(Number(invoice.total_amount))}
              </motion.span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carrier Info Card - Premium with actions */}
      <Card className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5">
        {/* Top gradient highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-primary" />
            Charter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {/* Avatar placeholder with gradient ring */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="font-semibold text-lg text-foreground truncate">{carrier?.company_name}</p>
                {carrier?.contact_name && (
                  <p className="text-sm text-muted-foreground">{carrier.contact_name}</p>
                )}
              </div>
              
              {/* Contact info with copy buttons */}
              <div className="space-y-2">
                {carrier?.email && (
                  <div className="flex items-center gap-2 group">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{carrier.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation active:scale-95"
                      onClick={() => copyToClipboard(carrier.email, "email")}
                    >
                      {copiedField === "email" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}
                {carrier?.phone && (
                  <div className="flex items-center gap-2 group">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{carrier.phone}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation active:scale-95"
                      onClick={() => copyToClipboard(carrier.phone, "phone")}
                    >
                      {copiedField === "phone" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Address */}
              {carrier?.address && (
                <p className="text-sm text-muted-foreground">
                  {carrier.address}, {carrier.postal_code} {carrier.city}
                </p>
              )}
              
              {/* VAT & Quick action */}
              <div className="flex items-center justify-between pt-2">
                {carrier?.vat_number && (
                  <Badge variant="outline" className="text-xs">
                    BTW: {carrier.vat_number}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 h-7 touch-manipulation active:scale-95"
                  onClick={() => window.open(`/carriers/${carrier?.id}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                  Bekijk profiel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
