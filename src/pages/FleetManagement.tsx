import { useState } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Fuel,
  Wrench,
  Truck,
  AlertTriangle,
  Gauge,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FuelManagement from '@/components/fleet/FuelManagement';
import MaintenanceManagement from '@/components/fleet/MaintenanceManagement';
import VehicleOverview from '@/components/fleet/VehicleOverview';
import VehicleValuation from '@/components/fleet/VehicleValuation';
import { useFleetManagement } from '@/hooks/useFleetManagement';

const FleetManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { vehicles, vehiclesLoading, alerts, stats } = useFleetManagement();

  const statItems = [
    { label: 'Totaal', value: stats.totalVehicles, icon: Truck, accent: 'text-primary' },
    { label: 'Actief', value: stats.activeVehicles, icon: Truck, accent: 'text-emerald-500' },
    { label: 'Inactief', value: stats.totalVehicles - stats.activeVehicles, icon: AlertTriangle, accent: 'text-amber-500' },
    { label: 'Kritiek', value: stats.criticalAlerts, icon: AlertTriangle, accent: 'text-destructive' },
    { label: 'APK aandacht', value: stats.apkExpiringSoon, icon: Gauge, accent: 'text-orange-500' },
    { label: 'Onderhoud', value: stats.serviceDue, icon: Calendar, accent: 'text-purple-500' },
  ];

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  return (
    <DashboardLayout title="Vlootbeheer" description="Voertuigen, brandstof en onderhoud">
      <div className="space-y-5">

        {/* Stat Strip */}
        {vehiclesLoading ? (
          <LoadingState message="Vlootgegevens laden..." />
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm px-3 py-3 flex items-center gap-2.5"
              >
                <s.icon className={cn('h-4 w-4 shrink-0', s.accent)} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold tabular-nums leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Critical alert banner */}
        {criticalAlerts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-destructive/8 border border-destructive/15 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-destructive font-medium">
              {criticalAlerts.length} kritieke melding(en) — directe actie vereist
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
              onClick={() => setActiveTab('maintenance')}
            >
              Bekijk
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Scrollable tab bar on mobile */}
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <TabsList className="bg-card/60 backdrop-blur-sm border border-border/20 inline-flex w-auto min-w-full md:min-w-0">
              <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background/80">
                <Truck className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Overzicht</span>
                <span className="xs:hidden">Vloot</span>
              </TabsTrigger>
              <TabsTrigger value="fuel" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background/80">
                <Fuel className="h-3.5 w-3.5" />
                Brandstof
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background/80">
                <Wrench className="h-3.5 w-3.5" />
                Onderhoud
                {stats.serviceDue > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                    {stats.serviceDue}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="valuation" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background/80">
                <TrendingDown className="h-3.5 w-3.5" />
                Waarde
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <VehicleOverview />
          </TabsContent>
          <TabsContent value="fuel" className="mt-0">
            <FuelManagement />
          </TabsContent>
          <TabsContent value="maintenance" className="mt-0">
            <MaintenanceManagement />
          </TabsContent>
          <TabsContent value="valuation" className="mt-0">
            <VehicleValuation />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FleetManagement;
