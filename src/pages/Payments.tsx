import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Search,
  Euro,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          invoices:invoice_id (
            invoice_number,
            customers:customer_id (
              company_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Betaald
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
            <RefreshCw className="h-3 w-3 mr-1" />
            In behandeling
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Mislukt
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Verlopen
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Geannuleerd
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch =
      payment.invoices?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoices?.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.mollie_payment_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: payments?.length || 0,
    paid: payments?.filter((p) => p.status === "paid").length || 0,
    pending: payments?.filter((p) => p.status === "pending" || p.status === "open").length || 0,
    totalAmount: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    paidAmount: payments?.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };

  return (
    <DashboardLayout title="Betalingen">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
                <CreditCard className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold gradient-text">Betalingen</h1>
              <Sparkles className="h-5 w-5 text-accent animate-pulse" />
            </div>
            <p className="text-muted-foreground">
              Beheer en volg alle betalingen
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            className="btn-premium"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="stat" className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Totaal Betalingen</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/20">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat" className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Betaald</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-400">{stats.paid}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat" className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">In Behandeling</p>
                  <p className="text-3xl font-bold mt-1 text-amber-400">{stats.pending}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat" className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Totaal Ontvangen</p>
                  <p className="text-3xl font-bold mt-1 text-primary">
                    €{stats.paidAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/20">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card variant="premium">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op factuurnummer, klant of betaling ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 bg-background/50 border-border/50">
                  <SelectValue placeholder="Filter op status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="paid">Betaald</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">In behandeling</SelectItem>
                  <SelectItem value="failed">Mislukt</SelectItem>
                  <SelectItem value="expired">Verlopen</SelectItem>
                  <SelectItem value="canceled">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              Betalingsoverzicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredPayments?.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Geen betalingen gevonden</p>
              </div>
            ) : (
              <div className="table-premium rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-semibold">Datum</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Factuur</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Klant</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Bedrag</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Methode</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Betaald op</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments?.map((payment, index) => (
                      <TableRow
                        key={payment.id}
                        className="border-border/30 hover:bg-accent/5 transition-colors animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(new Date(payment.created_at), "d MMM yyyy", { locale: nl })}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-primary">
                            {payment.invoices?.invoice_number || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {payment.invoices?.customers?.company_name || "-"}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            €{Number(payment.amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize text-muted-foreground">
                            {payment.payment_method || "-"}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {payment.paid_at
                            ? format(new Date(payment.paid_at), "d MMM yyyy HH:mm", { locale: nl })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.mollie_payment_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => {
                                navigator.clipboard.writeText(payment.mollie_payment_id || "");
                                toast({
                                  title: "Gekopieerd",
                                  description: "Betaling ID gekopieerd naar klembord",
                                });
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Payments;
