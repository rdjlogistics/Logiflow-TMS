import { useState, useRef, useCallback, useEffect } from 'react';
import { LoadingState } from '@/components/common/LoadingState';

import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Fuel,
  Wrench,
  Truck,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Gauge,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FuelManagement from '@/components/fleet/FuelManagement';
import MaintenanceManagement from '@/components/fleet/MaintenanceManagement';
import VehicleOverview from '@/components/fleet/VehicleOverview';
import VehicleValuation from '@/components/fleet/VehicleValuation';
import { useFleetManagement } from '@/hooks/useFleetManagement';

const FleetManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  // navigate removed — all CRUD is now in VehicleOverview
  const { vehicles, vehiclesLoading, alerts, stats } = useFleetManagement();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vlootbeheer</h1>
            <p className="text-muted-foreground mt-1">
              Voertuigen, brandstof en onderhoud
            </p>
          </div>
          {/* Add vehicle button moved into VehicleOverview */}
        </motion.div>

        {/* Elite Stat Cards */}
        {vehiclesLoading ? (
          <LoadingState message="Vlootgegevens laden..." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Totaal', value: stats.totalVehicles, icon: Truck, color: 'text-blue-500', glow: 'hsl(217 91% 60% / 0.12)' },
              { label: 'Actief', value: stats.activeVehicles, icon: TrendingUp, color: 'text-green-500', glow: 'hsl(142 71% 45% / 0.12)' },
              { label: 'Inactief', value: stats.totalVehicles - stats.activeVehicles, icon: AlertTriangle, color: 'text-yellow-500', glow: 'hsl(45 93% 47% / 0.12)' },
              { label: 'Kritiek', value: stats.criticalAlerts, icon: AlertTriangle, color: 'text-destructive', glow: 'hsl(var(--destructive) / 0.12)' },
              { label: 'APK aandacht', value: stats.apkExpiringSoon, icon: Gauge, color: 'text-orange-500', glow: 'hsl(25 95% 53% / 0.12)' },
              { label: 'Onderhoud', value: stats.serviceDue, icon: Calendar, color: 'text-purple-500', glow: 'hsl(271 91% 65% / 0.12)' },
            ].map((stat, i) => (
              <EliteStatCard key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        )}

        {/* Critical alert banner */}
        <AnimatePresence>
          {alerts.filter(a => a.severity === 'critical').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-destructive/8 border border-destructive/15 backdrop-blur-xl text-sm"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-destructive/12">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <span className="font-medium text-destructive">
                {alerts.filter(a => a.severity === 'critical').length} kritieke melding(en) — directe actie vereist
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setActiveTab('maintenance')}
              >
                Bekijk
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card/70 backdrop-blur-xl border border-border/30">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background/80 data-[state=active]:backdrop-blur-sm">
              <Truck className="h-4 w-4" />
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="fuel" className="gap-2 data-[state=active]:bg-background/80 data-[state=active]:backdrop-blur-sm">
              <Fuel className="h-4 w-4" />
              Brandstof
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2 data-[state=active]:bg-background/80 data-[state=active]:backdrop-blur-sm">
              <Wrench className="h-4 w-4" />
              Onderhoud
              {stats.serviceDue > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {stats.serviceDue}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="valuation" className="gap-2 data-[state=active]:bg-background/80 data-[state=active]:backdrop-blur-sm">
              <TrendingDown className="h-4 w-4" />
              Waarde
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <TabsContent value="overview" className="mt-0" forceMount={activeTab === 'overview' ? true : undefined}>
                {activeTab === 'overview' && <VehicleOverview />}
              </TabsContent>
              <TabsContent value="fuel" className="mt-0" forceMount={activeTab === 'fuel' ? true : undefined}>
                {activeTab === 'fuel' && <FuelManagement />}
              </TabsContent>
              <TabsContent value="maintenance" className="mt-0" forceMount={activeTab === 'maintenance' ? true : undefined}>
                {activeTab === 'maintenance' && <MaintenanceManagement />}
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
};

/* ─── Elite Stat Card with 3D Perspective ─── */

interface EliteStatProps {
  stat: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    glow: string;
  };
  index: number;
}

function EliteStatCard({ stat, index }: EliteStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(600px) rotateX(0deg) rotateY(0deg)');
  const Icon = stat.icon;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(600px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(600px) rotateX(0deg) rotateY(0deg)');
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 120, damping: 18 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform }}
      className="rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl p-4 transition-[transform,box-shadow] duration-200 ease-out hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15)] active:scale-[0.97]"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: stat.glow }}
        >
          <Icon className={cn('h-5 w-5', stat.color)} />
        </div>
        <div className="min-w-0">
          <AnimatedCounter value={stat.value} />
          <p className="text-xs text-muted-foreground truncate mt-0.5">{stat.label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Animated Counter ─── */

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 500;
    const start = performance.now();
    const startVal = display;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <p className="text-2xl font-bold text-foreground tabular-nums">{display}</p>;
}

export default FleetManagement;
