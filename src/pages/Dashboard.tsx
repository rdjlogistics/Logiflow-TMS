import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Route,
  Activity,
  TrendingUp,
  Clock,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  CloudSun,
  Car,
  AlertTriangle,
  Settings2,
  Truck,
  Target,
  Bell,
  MapPin,
  
  Mail,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useUserPreferences, DashboardWidgetConfig } from "@/hooks/useUserPreferences";
import OpsSnapshot from "@/components/dashboard/OpsSnapshot";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DraggableWidgetGrid from "@/components/dashboard/DraggableWidgetGrid";
import WidgetCustomizer from "@/components/dashboard/WidgetCustomizer";
import { DASHBOARD_PRESETS, DashboardPreset } from "@/components/dashboard/DashboardPresetSelector";
import { ModuleOnboarding } from "@/components/onboarding/ModuleOnboarding";

import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { StatsGridSkeleton } from "@/components/ui/skeleton-loaders";
import { nl } from "date-fns/locale";

const Dashboard = () => {
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const { 
    stats, 
    opsStats, 
    financeStats, 
    actionQueue, 
    revenueData, 
    tripStatusData, 
    weeklyTripsData, 
    otifPercentage,
    unreadEmailCount,
    hasEnoughData,
    loading,
    error 
  } = useDashboardData();
  
  const { weather, loading: weatherLoading } = useWeatherData();
  const { 
    preferences, 
    updatePreference,
    reorderWidgets, 
    removeWidget, 
    resizeWidget,
    resetDashboardWidgets 
  } = useUserPreferences();
  const { setTheme: applyTheme } = useTheme();

  // Legacy wizards removed — consolidated into /onboarding
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [currentPresetId, setCurrentPresetId] = useState<string | undefined>();
  // showSetupWizard removed — consolidated into /onboarding
  const [currentTime, setCurrentTime] = useState(format(new Date(), "HH:mm"));

  // Setup wizard logic removed — consolidated into /onboarding

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), "HH:mm"));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPreset = (preset: DashboardPreset) => {
    reorderWidgets(preset.widgets);
    setCurrentPresetId(preset.id);
  };


  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15, ease: "easeOut" } }
  }), []);

  const currentDate = useMemo(() => format(new Date(), "EEEE d MMMM", { locale: nl }), []);

  // Weather icon mapping
  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'sunny': return Sun;
      case 'cloudy': return Cloud;
      case 'rainy': return CloudRain;
      case 'snowy': return CloudSnow;
      case 'foggy': return CloudFog;
      case 'stormy': return CloudLightning;
      case 'partly-cloudy': return CloudSun;
      default: return Sun;
    }
  };

  // Traffic level styling
  const getTrafficConfig = (level: string) => {
    switch (level) {
      case 'low': return { color: 'text-success', bg: 'bg-success/10', label: 'Vlot' };
      case 'moderate': return { color: 'text-warning', bg: 'bg-warning/10', label: 'Matig' };
      case 'high': return { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Druk' };
      case 'severe': return { color: 'text-destructive', bg: 'bg-destructive/10', label: 'Files' };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted/30', label: 'Onbekend' };
    }
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.icon) : Sun;
  const trafficConfig = weather ? getTrafficConfig(weather.trafficExpected) : getTrafficConfig('low');

  const handleSaveWidgets = (newWidgets: DashboardWidgetConfig[]) => {
    reorderWidgets(newWidgets);
  };

  // Quick stats for mobile iOS-style widgets
  const attentionCount = opsStats.atRisk + opsStats.chauffeurNodig;
  const quickStats = useMemo(() => [
    { 
      label: "Onderweg", 
      value: opsStats.onderweg, 
      icon: Truck, 
      color: "text-primary", 
      bg: "bg-primary/10",
      href: "/trips?filter=onderweg",
      showPulse: false,
    },
    { 
      label: "Afgeleverd", 
      value: opsStats.afgeleverd, 
      icon: TrendingUp, 
      color: "text-success", 
      bg: "bg-success/10",
      href: "/trips?filter=afgerond",
      showPulse: false,
    },
    { 
      label: "Aandacht", 
      value: attentionCount, 
      icon: AlertTriangle, 
      color: attentionCount > 0 ? "text-warning" : "text-muted-foreground", 
      bg: attentionCount > 0 ? "bg-warning/10" : "bg-muted/10",
      href: "/trips?filter=at-risk",
      showPulse: attentionCount > 0,
    },
    { 
      label: "OTIF", 
      value: otifPercentage || 0, 
      suffix: "%",
      icon: Target, 
      color: otifPercentage >= 90 ? "text-success" : otifPercentage >= 75 ? "text-warning" : "text-destructive", 
      bg: otifPercentage >= 90 ? "bg-success/10" : otifPercentage >= 75 ? "bg-warning/10" : "bg-destructive/10",
      href: "/enterprise/recommendations",
      showPulse: false,
    },
  ], [opsStats.onderweg, opsStats.afgeleverd, attentionCount, otifPercentage]);

  return (
    <DashboardLayout title="Command Center">
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Mobile: Compact Header with Quick Actions */}
        {/* Desktop: Full Elite Header */}
        <div
          className="relative overflow-hidden rounded-xl sm:rounded-2xl"
        >
        {/* Multi-layer mesh gradient background */}
          <div className="absolute inset-0 mesh-bg-animated opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-card/60 to-background/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          {/* Animated orb glow — GPU compositor */}
          <div className="hidden sm:block orb-glow top-[-20px] right-[10%] w-80 h-80" />
          <div className="hidden lg:block orb-glow bottom-[-30px] left-[5%] w-60 h-60 opacity-[0.06]" style={{ animationDelay: '-7s' }} />
          
          <div className="relative glass-panel p-4 sm:p-6">
            {/* Mobile Layout */}
            <div className="flex flex-col gap-3 sm:hidden">
              {/* Top row: Time + Quick info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                    <Activity className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Command Center</h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{format(new Date(), "EEE d MMM", { locale: nl })}</span>
                      <span>•</span>
                      <span className="font-mono tabular-nums">{currentTime}</span>
                      {!weatherLoading && weather && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <WeatherIcon className="h-3 w-3 text-gold" />
                            <span>{weather.temperature}°</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Live badge */}
                <Badge variant="premium" className="text-[9px] font-semibold h-5">
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                  Live
                </Badge>
              </div>
              
              {/* Mobile Quick Actions - Fixed at bottom, prominent */}
              <div className="flex gap-2">
                <Button asChild variant="premium" size="sm" className="flex-1 h-10 shadow-lg shadow-primary/20">
                  <Link to="/orders">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nieuwe order
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-10">
                  <Link to="/track-chauffeurs">
                    <Route className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsCustomizing(true)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Branding & Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative hover:scale-105 transition-transform">
                    <div className="absolute -inset-1 bg-gradient-to-br from-primary via-primary/50 to-gold/50 rounded-xl blur opacity-40" />
                    <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/25">
                      <Activity className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Command Center</h1>
                      <Badge variant="premium" className="text-[10px] font-semibold uppercase tracking-wider">
                        <span className="relative flex h-1.5 w-1.5 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                        </span>
                        Live
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="capitalize">{currentDate}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="font-mono text-xs tabular-nums">{currentTime}</span>
                    </p>
                    
                    {/* Weather & Traffic Info */}
                    {!weatherLoading && weather && (
                      <div className="flex items-center gap-3 mt-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-sm">
                          <WeatherIcon className="h-4 w-4 text-gold" />
                          <span className="font-bold tabular-nums">{weather.temperature}°C</span>
                          <span className="text-muted-foreground text-xs">{weather.condition}</span>
                        </div>
                        <span className="text-muted-foreground/30">|</span>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                          trafficConfig.bg
                        )}>
                          {weather.trafficExpected === 'severe' || weather.trafficExpected === 'high' ? (
                            <AlertTriangle className={cn("h-3 w-3", trafficConfig.color)} />
                          ) : (
                            <Car className={cn("h-3 w-3", trafficConfig.color)} />
                          )}
                          <span className={trafficConfig.color}>{trafficConfig.label}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel-subtle">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    <span className="text-muted-foreground">Vandaag:</span>
                    <span className="font-bold tabular-nums">{opsStats.afgeleverd}</span>
                    <span className="text-muted-foreground/70">leveringen</span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Actions */}
              <div className="flex items-center gap-3">
                <div className="hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-transform">
                  <Button asChild variant="premium" size="default" className="shadow-lg shadow-primary/20 h-11">
                    <Link to="/orders">
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuwe order
                    </Link>
                  </Button>
                </div>
                <div className="hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-transform">
                  <Button asChild variant="outline" size="default" className="group h-11">
                    <Link to="/track-chauffeurs">
                      <Route className="h-4 w-4 mr-2" />
                      Tracking
                      <ChevronRight className="h-4 w-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </Button>
                </div>
                <div className="hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-transform">
                  <Button asChild variant="ghost" size="icon" className="h-11 w-11 relative">
                    <Link to="/email">
                      <Mail className="h-5 w-5" />
                      {unreadEmailCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] px-1 flex items-center justify-center">
                          {unreadEmailCount > 9 ? "9+" : unreadEmailCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </div>
                <div className="hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-transform">
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setIsCustomizing(true)}>
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: iOS-Style Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          {loading ? (
            <StatsGridSkeleton count={4} />
          ) : (
            quickStats.map((stat, index) => (
              <Link key={stat.label} to={stat.href}>
                <div className={cn(
                    "relative p-3.5 rounded-2xl glass-panel-subtle",
                    "bg-gradient-to-br from-card/80 to-card/40",
                    "active:scale-[0.97] transition-transform touch-manipulation"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn("p-2 rounded-xl", stat.bg)}>
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    </div>
                    {stat.showPulse && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    {stat.label}
                  </p>
                  <p className={cn("text-2xl font-bold tabular-nums", stat.color)}>
                    {`${stat.value}${'suffix' in stat ? stat.suffix : ''}`}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Desktop: Full OPS Snapshot */}
        <section className="hidden sm:block">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/50" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Operationeel Overzicht
            </h2>
          </div>
          <OpsSnapshot
            chauffeurNodig={opsStats.chauffeurNodig}
            onderweg={opsStats.onderweg}
            afgeleverd={opsStats.afgeleverd}
            atRisk={opsStats.atRisk}
            podMissing={opsStats.podMissing}
            waitingTime={opsStats.waitingTime}
            gpsOff={opsStats.gpsOff}
            etaRisk={opsStats.etaRisk}
            hold={opsStats.hold}
            loading={loading}
          />
        </section>

        {/* Mobile: Compact OPS Row (just critical alerts) */}
        <section className="sm:hidden">
          {(opsStats.chauffeurNodig > 0 || opsStats.atRisk > 0 || opsStats.podMissing > 0) && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                Vereist aandacht
              </p>
              <div className="space-y-1.5">
                {opsStats.chauffeurNodig > 0 && (
                  <Link to="/driver/assign" className="block">
                    <div className="active:scale-[0.98] transition-transform "flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-destructive/15">
                          <Bell className="h-3.5 w-3.5 text-destructive" />
                        </div>
                        <span className="text-sm font-medium">Chauffeur nodig</span>
                      </div>
                      <Badge variant="destructive" className="text-xs font-bold">
                        {opsStats.chauffeurNodig}
                      </Badge>
                    </div>
                  </Link>
                )}
                {opsStats.atRisk > 0 && (
                  <Link to="/trips?filter=at-risk" className="block">
                    <div className="active:scale-[0.98] transition-transform "flex items-center justify-between p-3 rounded-xl bg-warning/10 border border-warning/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-warning/15">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        </div>
                        <span className="text-sm font-medium">SLA Risico</span>
                      </div>
                      <Badge variant="warning" className="text-xs font-bold">
                        {opsStats.atRisk}
                      </Badge>
                    </div>
                  </Link>
                )}
                {opsStats.podMissing > 0 && (
                  <Link to="/claims?filter=pod-missing" className="block">
                    <div className="active:scale-[0.98] transition-transform "flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-primary/15">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">POD ontbreekt</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold">
                        {opsStats.podMissing}
                      </Badge>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Customizable Widget Grid */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 sm:h-5 rounded-full bg-gradient-to-b from-gold to-gold/50" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <span className="hidden sm:inline">Jouw Dashboard</span>
                <span className="sm:hidden">Widgets</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomizing(true)}
                className="text-xs h-7 sm:h-8 gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
              >
                <Settings2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                <span>Aanpassen</span>
              </Button>
            </div>
          </div>
          
          <div className="max-w-full overflow-hidden">
          <DraggableWidgetGrid
            widgets={preferences.dashboardWidgets}
            isEditing={false}
            onReorder={reorderWidgets}
            onRemove={removeWidget}
            onResize={resizeWidget}
            actionQueue={actionQueue}
            financeStats={financeStats}
            revenueData={revenueData}
            tripStatusData={tripStatusData}
            weeklyTripsData={weeklyTripsData}
            loading={loading}
            hasEnoughData={hasEnoughData}
          />
          </div>
        </section>

        {/* Snelle acties */}
        <section>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-1 h-4 sm:h-5 rounded-full bg-gradient-to-b from-primary to-primary/50" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Snelle acties
            </h2>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
            {[
              { label: "Nieuwe order", icon: Plus, href: "/orders/edit", color: "text-primary", bg: "bg-primary/8", border: "border-primary/15" },
              { label: "Nieuwe factuur", icon: FileText, href: "/invoices/new", color: "text-success", bg: "bg-success/8", border: "border-success/15" },
              { label: "Chauffeurs", icon: Truck, href: "/drivers", color: "text-warning", bg: "bg-warning/8", border: "border-warning/15" },
              { label: "Planning", icon: Route, href: "/planning", color: "text-primary", bg: "bg-primary/8", border: "border-primary/15" },
            ].map((action) => (
              <Link key={action.href} to={action.href}>
                <div
                  className={cn(
                    "action-card-3d hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.97] transition-all",
                    "relative flex flex-col items-center justify-center gap-3 p-5 cursor-pointer",
                    "group touch-manipulation min-h-[88px] sm:min-h-0",
                    action.border
                  )}
                >
                  <div className={cn("p-3 rounded-xl transition-all duration-200 group-hover:scale-[1.15]", action.bg)}>
                    <action.icon className={cn("h-5 w-5", action.color)} />
                  </div>
                  <span className="text-sm font-semibold text-center leading-tight">{action.label}</span>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>


        {/* Empty State / Setup Guide */}
        {!hasEnoughData && !loading && (
          <div className="animate-scale-in">
            <DashboardEmptyState
              hasOrders={stats.tripsThisMonth > 0}
              hasRates={true}
              hasBankConnected={false}
              hasCustomers={stats.customers > 0}
            />
          </div>
        )}
      </div>

      {/* Widget Customizer + Presets — unified panel */}
      <WidgetCustomizer
        isOpen={isCustomizing}
        onClose={() => setIsCustomizing(false)}
        widgets={preferences.dashboardWidgets}
        onSave={handleSaveWidgets}
        onReset={resetDashboardWidgets}
        onSelectPreset={handleSelectPreset}
        currentPresetId={currentPresetId}
      />
      
      {/* Module Onboarding Tour */}
      <ModuleOnboarding moduleKey="dashboard" />
    </DashboardLayout>
  );
};

export default Dashboard;
