import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Clock,
  MapPin,
  Euro,
  Truck,
  User,
  Eye,
  XCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AnomalyRow {
  id: string;
  anomaly_type: string;
  severity: string | null;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metrics_json: Record<string, string> | null;
  is_resolved: boolean | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string | null;
}

export default function AnomalyDetection() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ['anomaly-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AnomalyRow[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('anomaly_events')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolution_notes: 'Gemarkeerd als opgelost' 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly-events'] });
      toast.success("Anomalie gemarkeerd als opgelost");
    },
  });

  const filteredAnomalies = anomalies.filter(a => {
    if (filter === 'unresolved') return !a.is_resolved;
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Kritiek</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Hoog</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Medium</Badge>;
      case 'low':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Laag</Badge>;
      default:
        return <Badge variant="secondary">{severity ?? 'Onbekend'}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'margin_drop': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'fuel_anomaly': return <Truck className="h-5 w-5 text-amber-500" />;
      case 'delay_pattern': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'driver_behavior': return <User className="h-5 w-5 text-purple-500" />;
      case 'volume_spike': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'route_deviation': return <MapPin className="h-5 w-5 text-orange-500" />;
      case 'cost_overrun': return <Euro className="h-5 w-5 text-red-500" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const stats = {
    total: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical' && !a.is_resolved).length,
    high: anomalies.filter(a => a.severity === 'high' && !a.is_resolved).length,
    resolved: anomalies.filter(a => a.is_resolved).length,
  };

  return (
    <DashboardLayout title="Anomaly Detection" description="AI-gestuurde detectie van afwijkingen en patronen">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Totaal anomalieën</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Kritiek</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.high}</p>
                  <p className="text-sm text-muted-foreground">Hoge prioriteit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Opgelost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="unresolved">
              Open ({anomalies.filter(a => !a.is_resolved).length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Opgelost ({anomalies.filter(a => a.is_resolved).length})
            </TabsTrigger>
            <TabsTrigger value="all">
              Alle ({anomalies.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Anomalies List */}
        <div className="space-y-4">
          {filteredAnomalies.map(anomaly => {
            const metrics = anomaly.metrics_json as Record<string, string> | null;
            return (
              <Card key={anomaly.id} className={anomaly.is_resolved ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      {getTypeIcon(anomaly.anomaly_type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{anomaly.title}</h3>
                            {getSeverityBadge(anomaly.severity)}
                            {anomaly.is_resolved && (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Opgelost
                              </Badge>
                            )}
                          </div>
                          {anomaly.description && (
                            <p className="text-sm text-muted-foreground mt-1">{anomaly.description}</p>
                          )}
                        </div>
                        {anomaly.created_at && (
                          <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(anomaly.created_at), "d MMM HH:mm", { locale: nl })}
                          </span>
                        )}
                      </div>

                      {metrics && Object.keys(metrics).length > 0 && (
                        <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
                          {metrics.expected && (
                            <div><span className="text-muted-foreground">Verwacht:</span> <span className="font-medium">{metrics.expected}</span></div>
                          )}
                          {metrics.actual && (
                            <div><span className="text-muted-foreground">Actueel:</span> <span className="font-medium">{metrics.actual}</span></div>
                          )}
                          {metrics.deviation && (
                            <div className="font-bold text-red-500">{metrics.deviation}</div>
                          )}
                        </div>
                      )}

                      {anomaly.resolution_notes && (
                        <div className="mt-3 p-2 bg-green-500/10 rounded text-sm">
                          <span className="font-medium">Oplossing:</span> {anomaly.resolution_notes}
                        </div>
                      )}

                      {!anomaly.is_resolved && (
                        <div className="flex items-center gap-2 mt-4">
                          <Button 
                            size="sm" 
                            onClick={() => resolveMutation.mutate(anomaly.id)}
                            disabled={resolveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Markeer als opgelost
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!isLoading && filteredAnomalies.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium">Geen anomalieën gevonden</p>
                <p className="text-sm">Alle systemen werken naar behoren</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
