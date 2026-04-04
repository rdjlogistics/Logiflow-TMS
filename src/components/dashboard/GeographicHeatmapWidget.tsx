import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPinned,
  TrendingUp,
  ArrowRight,
  Building2,
  Truck,
  Euro,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface RegionData {
  id: string;
  name: string;
  shortName: string;
  trips: number;
  revenue: number;
  trend: number;
  topCities: string[];
}

interface GeographicHeatmapWidgetProps {
  data?: RegionData[];
  loading?: boolean;
}

const GeographicHeatmapWidget = ({ 
  data, 
  loading 
}: GeographicHeatmapWidgetProps) => {
  const navigate = useNavigate();
  const safeData = data || [];
  const totalTrips = useMemo(() => safeData.reduce((sum, r) => sum + r.trips, 0), [safeData]);
  const totalRevenue = useMemo(() => safeData.reduce((sum, r) => sum + r.revenue, 0), [safeData]);
  const maxTrips = useMemo(() => Math.max(...safeData.map(r => r.trips), 0), [safeData]);

  const handleRegionClick = (region: RegionData) => {
    // Navigate to trips filtered by region
    navigate(`/trips?region=${region.name}`);
    toast({ 
      title: region.name, 
      description: `${region.trips} ritten bekijken in ${region.name}` 
    });
  };

  const getIntensityColor = (trips: number) => {
    const intensity = trips / maxTrips;
    if (intensity > 0.8) return 'from-primary via-primary/80 to-primary/60';
    if (intensity > 0.6) return 'from-primary/80 via-primary/60 to-primary/40';
    if (intensity > 0.4) return 'from-primary/60 via-primary/40 to-primary/20';
    if (intensity > 0.2) return 'from-primary/40 via-primary/20 to-primary/10';
    return 'from-primary/20 via-primary/10 to-primary/5';
  };

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15">
              <MapPinned className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold">Regio Heatmap</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15">
              <MapPinned className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold">Geografische Spreiding</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-2xl bg-muted/20 mb-3">
              <MapPinned className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nog geen ritten</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Regiodata verschijnt zodra er ritten zijn</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} 
      />
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 rounded-xl bg-primary/15"
              whileHover={{ rotate: 10, scale: 1.05 }}
            >
              <MapPinned className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <CardTitle className="text-lg font-bold">Geografische Spreiding</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ritten per regio deze maand
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8">
            <Link to="/crm/lane-map">
              <span className="text-xs">Details</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 relative">
        {/* Summary stats */}
        <motion.div 
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 10 }}
        >
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Totaal Ritten</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalTrips.toLocaleString('nl-NL')}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-3.5 w-3.5 text-success" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Omzet</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-success">
              €{(totalRevenue / 1000).toFixed(1)}k
            </p>
          </div>
        </motion.div>

        {/* Region grid */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
          initial="hidden"
          animate="visible"
        >
          {data.slice(0, 6).map((region, index) => (
            <motion.div
              key={region.id}
              className="group cursor-pointer"
              onClick={() => handleRegionClick(region)}
            >
              <motion.div 
                className={cn(
                  "relative p-3.5 rounded-xl border border-border/30 overflow-hidden transition-all",
                  "hover:border-primary/40 hover:shadow-lg"
                )}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                {/* Intensity background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-30",
                  getIntensityColor(region.trips)
                )} />
                
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5">
                      {region.shortName}
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      <TrendingUp className={cn(
                        "h-3 w-3",
                        region.trend >= 0 ? "text-success" : "text-destructive rotate-180"
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold",
                        region.trend >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {region.trend > 0 ? '+' : ''}{region.trend}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Region name */}
                  <p className="text-xs font-medium text-muted-foreground truncate mb-1">
                    {region.name}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold tabular-nums leading-none">
                        {region.trips}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">ritten</p>
                    </div>
                    <p className="text-xs font-semibold text-success">
                      €{(region.revenue / 1000).toFixed(1)}k
                    </p>
                  </div>

                  {/* Top cities tooltip (show on hover) */}
                  <div className="mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{region.topCities.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
            <span className="text-[10px] text-muted-foreground">Laag</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/50" />
            <span className="text-[10px] text-muted-foreground">Gemiddeld</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground">Hoog</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(GeographicHeatmapWidget);
