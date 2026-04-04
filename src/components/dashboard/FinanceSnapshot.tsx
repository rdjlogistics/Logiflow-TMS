import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, FileText, CreditCard, TrendingUp, ArrowRight, Plus, Sparkles, Euro } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceSnapshotProps {
  openstaand: number;
  openFacturen: number;
  payoutsGepland: number;
  cashRunway: number;
  readyToInvoice?: number;
  loading?: boolean;
}

const FinanceSnapshot = ({
  openstaand, openFacturen, payoutsGepland, cashRunway, readyToInvoice = 0, loading,
}: FinanceSnapshotProps) => {
  const formatCurrency = (value: number) =>
    `€${value.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const metrics = [
    { label: "Openstaand", value: formatCurrency(openstaand), icon: CreditCard, colorClass: openstaand > 0 ? "text-warning" : "text-muted-foreground", bgClass: openstaand > 0 ? "bg-warning/10" : "bg-muted/30", href: "/payments" },
    { label: "Open facturen", value: openFacturen.toString(), icon: FileText, colorClass: "text-primary", bgClass: "bg-primary/10", href: "/invoices?filter=open" },
    { label: "Payouts gepland", value: formatCurrency(payoutsGepland), sublabel: "deze week", icon: Wallet, colorClass: "text-success", bgClass: "bg-success/10", href: "/payments?filter=scheduled" },
    { label: "Cash runway", value: `${cashRunway}d`, icon: TrendingUp, colorClass: cashRunway < 30 ? "text-destructive" : cashRunway < 60 ? "text-warning" : "text-success", bgClass: cashRunway < 30 ? "bg-destructive/10" : cashRunway < 60 ? "bg-warning/10" : "bg-success/10", href: "/finance/cashflow" },
  ];

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/15"><Euro className="h-5 w-5 text-success" /></div>
            <div>
              <CardTitle className="text-lg font-bold">Finance</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Laden...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/10 border border-border/20">
                <div className="h-3 w-16 bg-muted/30 rounded animate-pulse mb-3" />
                <div className="h-7 w-20 bg-muted/30 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-success/5 rounded-full blur-[60px] pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success/15 hover:rotate-[10deg] hover:scale-105 transition-transform">
            <Euro className="h-5 w-5 text-success" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">Finance Snapshot</CardTitle>
              <Sparkles className="h-4 w-4 text-success" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Financieel overzicht vandaag</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 relative">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: `${index * 40}ms` >
              <Link to={metric.href} className="block touch-manipulation">
                <div className={cn(
                  "p-3 sm:p-4 rounded-xl border border-border/30 transition-all group cursor-pointer",
                  "bg-gradient-to-br from-background/80 to-background/40",
                  "hover:border-border/50 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5",
                  "active:scale-[0.97] transition-transform"
                )}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className={cn("p-1.5 rounded-lg transition-all group-hover:scale-110", metric.bgClass)}>
                      <metric.icon className={cn("h-3 sm:h-3.5 w-3 sm:w-3.5", metric.colorClass)} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{metric.label}</span>
                  </div>
                  <p className={cn("text-xl sm:text-2xl font-bold tabular-nums tracking-tight", metric.colorClass)}>{metric.value}</p>
                  {metric.sublabel && (
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 font-medium">{metric.sublabel}</p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
          {readyToInvoice > 0 && (
            <Button variant="premium" size="default" className="w-full justify-center h-11 touch-manipulation active:scale-[0.97] transition-transform" asChild>
              <Link to="/invoices?action=create-batch">
                <Plus className="h-4 w-4 mr-2" />
                Maak facturen ({readyToInvoice})
              </Link>
            </Button>
          )}
          <Button variant="outline" size="default" className="w-full justify-center group h-11 touch-manipulation active:scale-[0.97] transition-transform" asChild>
            <Link to="/finance/cashflow">
              Cashflow bekijken
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(FinanceSnapshot);
