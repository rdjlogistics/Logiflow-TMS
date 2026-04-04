import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Building2, Users, TrendingUp, Euro, Crown, Activity,
  ArrowUpRight, ArrowDownRight, Clock, Package, Truck,
  FileText, Shield, RefreshCw, Loader2, BarChart3
} from "lucide-react";

// Platform-wide aggregated metrics (computed live from existing tables)
const usePlatformOverview = () =>
  useQuery({
    queryKey: ["super-admin-overview"],
    queryFn: async () => {
      const [
        { count: totalTenants },
        { count: totalUsers },
        { count: totalOrders },
        { count: totalDrivers },
        { count: totalVehicles },
        { count: totalInvoices },
        { data: subscriptions },
        { data: recentTenants },
      ] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("drivers").select("*", { count: "exact", head: true }),
        supabase.from("vehicles").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("*", { count: "exact", head: true }),
        supabase.from("tenant_subscriptions").select(`
          id, status, billing_cycle, tenant_id,
          subscription_plans ( slug, name, price_monthly_eur, price_yearly_eur )
        `),
        supabase.from("companies").select("id, name, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      // Calculate MRR from active subscriptions
      let mrr = 0;
      let trialCount = 0;
      let activeCount = 0;
      let cancelledCount = 0;

      (subscriptions ?? []).forEach((sub: any) => {
        const plan = sub.subscription_plans;
        if (!plan) return;
        if (sub.status === "trial") trialCount++;
        else if (sub.status === "active") {
          activeCount++;
          mrr += sub.billing_cycle === "yearly"
            ? Number(plan.price_yearly_eur) / 12
            : Number(plan.price_monthly_eur);
        } else if (sub.status === "cancelled" || sub.status === "expired") {
          cancelledCount++;
        }
      });

      return {
        totalTenants: totalTenants ?? 0,
        totalUsers: totalUsers ?? 0,
        totalOrders: totalOrders ?? 0,
        totalDrivers: totalDrivers ?? 0,
        totalVehicles: totalVehicles ?? 0,
        totalInvoices: totalInvoices ?? 0,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        trialCount,
        activeCount,
        cancelledCount,
        recentTenants: recentTenants ?? [],
        subscriptions: subscriptions ?? [],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

const useTenantDetails = () =>
  useQuery({
    queryKey: ["super-admin-tenants"],
    queryFn: async () => {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      if (!companies) return [];

      // For each company, get counts
      const enriched = await Promise.all(
        companies.map(async (company) => {
          const [
            { count: users },
            { count: orders },
            { count: drivers },
            { data: sub },
          ] = await Promise.all([
            supabase.from("user_companies").select("*", { count: "exact", head: true }).eq("company_id", company.id),
            supabase.from("trips").select("*", { count: "exact", head: true }).eq("company_id", company.id),
            supabase.from("drivers").select("*", { count: "exact", head: true }).eq("tenant_id", company.id),
            supabase.from("tenant_subscriptions").select("status, subscription_plans(slug, name)").eq("tenant_id", company.id).maybeSingle(),
          ]);

          return {
            ...company,
            users: users ?? 0,
            orders: orders ?? 0,
            drivers: drivers ?? 0,
            plan: (sub?.subscription_plans as any)?.name ?? "Geen",
            planSlug: (sub?.subscription_plans as any)?.slug ?? "none",
            status: sub?.status ?? "none",
          };
        })
      );

      return enriched;
    },
    staleTime: 5 * 60 * 1000,
  });

const MetricCard = ({
  title, value, subtitle, icon: Icon, trend, color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: { value: number; label: string };
  color?: string;
}) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`rounded-lg p-2 bg-${color}/10`}>
        <Icon className={`h-4 w-4 text-${color}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center text-xs mt-2 ${trend.value >= 0 ? "text-success" : "text-destructive"}`}>
          {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </CardContent>
  </Card>
);

const statusBadge = (status: string) => {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    trial: { variant: "secondary", label: "Trial" },
    active: { variant: "default", label: "Actief" },
    past_due: { variant: "destructive", label: "Achterstallig" },
    cancelled: { variant: "outline", label: "Geannuleerd" },
    expired: { variant: "outline", label: "Verlopen" },
    none: { variant: "outline", label: "Geen plan" },
  };
  const cfg = map[status] ?? map.none;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

const SuperAdminDashboard = () => {
  const { data: overview, isLoading, refetch } = usePlatformOverview();
  const { data: tenants, isLoading: tenantsLoading } = useTenantDetails();

  return (
    <DashboardLayout title="Super-Admin Dashboard">
      <div}}}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              Platform Overzicht
            </h1>
            <p className="text-muted-foreground">Platform-brede metrics en tenant management</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : overview ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="MRR"
                value={`€${overview.mrr.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
                subtitle={`ARR: €${overview.arr.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
                icon={Euro}
                color="primary"
              />
              <MetricCard
                title="Tenants"
                value={overview.totalTenants}
                subtitle={`${overview.activeCount} actief, ${overview.trialCount} trial`}
                icon={Building2}
              />
              <MetricCard
                title="Gebruikers"
                value={overview.totalUsers}
                icon={Users}
              />
              <MetricCard
                title="Orders"
                value={overview.totalOrders.toLocaleString("nl-NL")}
                icon={Package}
              />
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Chauffeurs" value={overview.totalDrivers} icon={Users} />
              <MetricCard title="Voertuigen" value={overview.totalVehicles} icon={Truck} />
              <MetricCard title="Facturen" value={overview.totalInvoices} icon={FileText} />
              <MetricCard
                title="Churn"
                value={overview.cancelledCount}
                subtitle="Geannuleerd / Verlopen"
                icon={ArrowDownRight}
                color="destructive"
              />
            </div>

            {/* Subscription breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Abonnement Verdeling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {["trial", "active", "past_due", "cancelled", "expired"].map((status) => {
                    const count = overview.subscriptions.filter((s: any) => s.status === status).length;
                    const total = overview.subscriptions.length || 1;
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          {statusBadge(status)}
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                        <Progress value={(count / total) * 100} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tenant table */}
            <Tabs defaultValue="tenants">
              <TabsList>
                <TabsTrigger value="tenants">Tenants ({tenants?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="recent">Recent Aangemeld</TabsTrigger>
              </TabsList>

              <TabsContent value="tenants">
                <Card>
                  <CardContent className="pt-6">
                    {tenantsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bedrijf</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Gebruikers</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Chauffeurs</TableHead>
                            <TableHead>Aangemeld</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenants?.map((t) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">{t.name}</TableCell>
                              <TableCell>{t.plan}</TableCell>
                              <TableCell>{statusBadge(t.status)}</TableCell>
                              <TableCell className="text-right">{t.users}</TableCell>
                              <TableCell className="text-right">{t.orders}</TableCell>
                              <TableCell className="text-right">{t.drivers}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(t.created_at), "d MMM yyyy", { locale: nl })}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!tenants || tenants.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                Geen tenants gevonden
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {overview.recentTenants.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{t.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(t.created_at), "d MMMM yyyy, HH:mm", { locale: nl })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">Nieuw</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
