import React, { memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  ChevronRight,
  Euro,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const PurchaseInvoicesWidget = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["purchase-invoices-widget"],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from("purchase_invoices")
        .select(`
          id, invoice_number, invoice_date, total_amount, status, due_date,
          carriers(company_name)
        `)
        .order("invoice_date", { ascending: false })
        .limit(50);

      if (error) throw error;

      const all = invoices || [];
      const openStatuses = ["concept", "definitief", "verzonden", "ontvangen", "goedgekeurd"];
      const open = all.filter((i) => i.status !== null && openStatuses.includes(i.status));
      const disputed = all.filter((i) => i.status === "betwist");
      const overdue = all.filter((i) => {
        if (!i.due_date || i.status === "betaald") return false;
        return new Date(i.due_date) < new Date();
      });

      const openAmount = open.reduce((sum, i) => sum + Number(i.total_amount), 0);
      const recentOpen = open.slice(0, 4);

      return {
        openCount: open.length,
        openAmount,
        disputedCount: disputed.length,
        overdueCount: overdue.length,
        recentInvoices: recentOpen,
      };
    },
    staleTime: 60000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15">
              <Receipt className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-base font-bold">Inkoopfacturen</CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
            <Link to="/purchase-invoices">
              Bekijk alle
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-muted/50 rounded-lg" />
            <div className="h-16 bg-muted/50 rounded-lg" />
          </div>
        ) : (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Openstaand</span>
                </div>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(stats?.openAmount || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.openCount || 0} facturen
                </p>
              </div>

              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-muted-foreground">Betwist</span>
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats?.disputedCount || 0}
                </p>
                <p className="text-xs text-muted-foreground">facturen</p>
              </div>

              <Link to="/purchase-invoices?status=verlopen" className="block">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Verlopen</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {stats?.overdueCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">facturen</p>
                </div>
              </Link>
            </div>

            {/* Recent Invoices */}
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Recente openstaande
              </p>
              <div className="space-y-2">
                {stats?.recentInvoices?.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    Geen openstaande facturen
                  </div>
                ) : (
                  stats?.recentInvoices?.map((invoice, index) => (
                    <div
                      key={invoice.id}
                    >
                      <Link
                        to={`/purchase-invoices/${invoice.id}`}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg",
                          "bg-muted/30 hover:bg-muted/50 border border-border/20",
                          "transition-all duration-150 group"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-background/50">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">
                              {invoice.carriers?.company_name || "Charter"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.invoice_number}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {formatCurrency(Number(invoice.total_amount))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.invoice_date ? format(new Date(invoice.invoice_date), "d MMM", {
                              locale: nl,
                            }) : "-"}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Action */}
            <div className="mt-4 pt-3 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full gap-2 text-xs"
              >
                <Link to="/purchase-invoices/new">
                  <Plus className="h-3.5 w-3.5" />
                  Nieuwe Batch Inkoopfactuur
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(PurchaseInvoicesWidget);
