import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Route, 
  Truck, 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Zap,
  Calendar,
  Package,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addHours, startOfDay, setHours } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useCopilotContext } from '@/components/copilot';
import { useToast } from '@/hooks/use-toast';

const demoPlanRevisions = [
  { id: '1', time: '08:45', trigger: 'Nieuwe order', description: 'ORD-2024-008 toegevoegd, herplanning uitgevoerd', impact: '+12 km, -5 min wachttijd', status: 'applied' },
  { id: '2', time: '09:30', trigger: 'Vertraging', description: 'ORD-2024-003 30 min vertraagd door file A2', impact: 'Volgorde aangepast', status: 'applied' },
  { id: '3', time: '10:15', trigger: 'GPS Alert', description: 'Chauffeur Klaas geen GPS signaal 5 min', impact: 'Monitoring actief', status: 'proposed' },
];

const timeSlots = Array.from({ length: 12 }, (_, i) => i + 6); // 6:00 - 17:00

interface PlanDriver {
  id: string;
  name: string;
  vehicle: string;
  status: string;
  efficiency: number;
}

interface PlanAssignment {
  id: string;
  orderId: string;
  driver: string;
  pickup: string;
  delivery: string;
  startTime: number;
  duration: number;
  status: string;
  priority: string;
}

const AIPlanView: React.FC = () => {
  const [isAutoPlanning, setIsAutoPlanning] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planRevisions, setPlanRevisions] = useState(demoPlanRevisions);
  const { openPanel } = useCopilotContext();
  const { toast } = useToast();

  // Fetch real drivers from database
  const { data: demoDrivers = [] } = useQuery<PlanDriver[]>({
    queryKey: ['ai-plan-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, status')
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).map(d => ({
        id: d.id,
        name: d.name,
        vehicle: '',
        status: d.status ?? 'active',
        efficiency: 90,
      }));
    },
  });

  // Fetch real trips as assignments
  const { data: demoAssignments = [] } = useQuery<PlanAssignment[]>({
    queryKey: ['ai-plan-assignments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, order_number, pickup_city, delivery_city, status, driver_id, drivers(name), pickup_time_from')
        .eq('trip_date', format(selectedDate, 'yyyy-MM-dd'))
        .not('driver_id', 'is', null);
      if (error) throw error;
      return (data ?? []).map((t: any, i: number) => ({
        id: t.id,
        orderId: t.order_number || `ORD-${i + 1}`,
        driver: t.drivers?.name || 'Onbekend',
        pickup: t.pickup_city || '',
        delivery: t.delivery_city || '',
        startTime: t.pickup_time_from ? parseInt(t.pickup_time_from.split(':')[0]) : 8,
        duration: 2,
        status: t.status === 'onderweg' ? 'in_progress' : t.status === 'afgerond' ? 'completed' : 'scheduled',
        priority: 'normal',
      }));
    },
  });

  const handleApplyRevision = (revisionId: string) => {
    setPlanRevisions(prev => prev.map(r => 
      r.id === revisionId ? { ...r, status: 'applied' } : r
    ));
    toast({
      title: "Revisie toegepast",
      description: "De planningswijziging is succesvol toegepast.",
    });
  };

  const handleIgnoreRevision = (revisionId: string) => {
    setPlanRevisions(prev => prev.filter(r => r.id !== revisionId));
    toast({
      title: "Revisie genegeerd",
      description: "De planningswijziging is genegeerd.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'scheduled': return 'bg-muted';
      case 'delayed': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'normal': return 'border-l-blue-500';
      case 'low': return 'border-l-muted-foreground';
      default: return 'border-l-muted';
    }
  };

  const getDriverAssignments = (driverName: string) => {
    return demoAssignments.filter((a: PlanAssignment) => a.driver === driverName);
  };

  return (
    <DashboardLayout title="AI Dispatch Plan" description="Motion-style automatische planning met real-time optimalisatie">
      <div className="space-y-4 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shrink-0">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight">AI Dispatch Plan</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Automatische planning met real-time optimalisatie
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isAutoPlanning ? "default" : "outline"}
              onClick={() => setIsAutoPlanning(!isAutoPlanning)}
              size="sm"
              className="gap-1.5 text-xs md:text-sm flex-1 sm:flex-initial"
            >
              {isAutoPlanning ? (
                <>
                  <Pause className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden xs:inline">Auto-planning</span> Actief
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Start
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => openPanel('dispatch_planner')} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Copilot</span>
            </Button>
          </div>
        </div>

        {/* Stats Row - Mobile: 2x2 grid, larger screens: 5 cols */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
          <Card className="premium-card">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
                  <Package className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">24</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-green-500/10">
                  <Truck className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">4</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Chauffeurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-amber-500/10">
                  <Route className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">342</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">km totaal</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card hidden md:block">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">92%</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Efficiëntie</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">2</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Mobile: Tabs, Desktop: Side by Side */}
        <Tabs defaultValue="timeline" className="lg:hidden">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="timeline" className="text-xs">Planning</TabsTrigger>
            <TabsTrigger value="revisions" className="text-xs">Revisies</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="mt-0">
            <MobileTimelineView 
              drivers={demoDrivers} 
              getDriverAssignments={getDriverAssignments}
              getStatusColor={getStatusColor}
              getPriorityBorder={getPriorityBorder}
              selectedDate={selectedDate}
            />
          </TabsContent>
          
          <TabsContent value="revisions" className="mt-0">
            <Card className="premium-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Plan Revisies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {planRevisions.map((revision) => (
                  <div 
                    key={revision.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      revision.status === 'proposed' 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={revision.status === 'proposed' ? 'default' : 'secondary'} className="text-[10px]">
                        {revision.trigger}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{revision.time}</span>
                    </div>
                    <p className="text-xs">{revision.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{revision.impact}</p>
                    {revision.status === 'proposed' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleApplyRevision(revision.id)}>Toepassen</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => handleIgnoreRevision(revision.id)}>Negeren</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="insights" className="mt-0">
            <AIInsightsPanel openPanel={openPanel as any} />
          </TabsContent>
        </Tabs>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {/* Timeline View */}
          <div className="col-span-3">
            <Card className="premium-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Dag Planning - {format(selectedDate, 'EEEE d MMMM', { locale: nl })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Zap className="h-3 w-3 text-green-500" />
                      Live updates
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {/* Time Header */}
                  <div className="flex border-b border-border pb-2 mb-2 sticky top-0 bg-card z-10">
                    <div className="w-36 flex-shrink-0 font-medium text-sm text-muted-foreground">
                      Chauffeur
                    </div>
                    <div className="flex-1 flex">
                      {timeSlots.map((hour) => (
                        <div 
                          key={hour} 
                          className="flex-1 text-center text-xs text-muted-foreground border-l border-border/50 first:border-l-0"
                        >
                          {hour}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Driver Rows */}
                  {demoDrivers.map((driver) => (
                    <div key={driver.id} className="flex items-center py-2 border-b border-border/50 last:border-b-0">
                      {/* Driver Info */}
                      <div className="w-36 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            driver.status === 'active' ? 'bg-green-500' : 
                            driver.status === 'break' ? 'bg-amber-500' : 'bg-muted'
                          )} />
                          <div>
                            <p className="text-sm font-medium truncate">{driver.name}</p>
                            <p className="text-[10px] text-muted-foreground">{driver.vehicle}</p>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex-1 relative h-12">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex">
                          {timeSlots.map((hour) => (
                            <div 
                              key={hour} 
                              className="flex-1 border-l border-border/30 first:border-l-0"
                            />
                          ))}
                        </div>

                        {/* Assignments */}
                        {getDriverAssignments(driver.name).map((assignment) => {
                          const startOffset = ((assignment.startTime - 6) / 12) * 100;
                          const width = (assignment.duration / 12) * 100;
                          
                          return (
                            <div
                              key={assignment.id}
                              className={cn(
                                "absolute top-1 h-10 rounded-lg border-l-4 px-2 py-1 cursor-pointer",
                                "transition-all hover:scale-[1.02] hover:shadow-lg",
                                getStatusColor(assignment.status),
                                getPriorityBorder(assignment.priority),
                                assignment.status === 'scheduled' && 'bg-muted/80',
                                assignment.status === 'completed' && 'bg-green-500/20',
                                assignment.status === 'in_progress' && 'bg-blue-500/20',
                                assignment.status === 'delayed' && 'bg-red-500/20 animate-pulse'
                              )}
                              style={{
                                left: `${startOffset}%`,
                                width: `${width}%`,
                              }}
                            >
                              <p className="text-[10px] font-medium truncate">
                                {assignment.orderId}
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate">
                                {assignment.pickup} → {assignment.delivery}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500/20 border-l-2 border-green-500" />
                    <span className="text-xs">Voltooid</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500/20 border-l-2 border-blue-500" />
                    <span className="text-xs">Onderweg</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-muted border-l-2 border-muted-foreground" />
                    <span className="text-xs">Gepland</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500/20 border-l-2 border-red-500" />
                    <span className="text-xs">Vertraagd</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Plan Revisions */}
            <Card className="premium-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Plan Revisies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {planRevisions.map((revision) => (
                  <div 
                    key={revision.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      revision.status === 'proposed' 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={revision.status === 'proposed' ? 'default' : 'secondary'} className="text-[10px]">
                        {revision.trigger}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{revision.time}</span>
                    </div>
                    <p className="text-xs">{revision.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{revision.impact}</p>
                    {revision.status === 'proposed' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="h-6 text-[10px] flex-1" onClick={() => handleApplyRevision(revision.id)}>Toepassen</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={() => handleIgnoreRevision(revision.id)}>Negeren</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Insights */}
            <AIInsightsPanel openPanel={openPanel as any} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Mobile Timeline View Component
interface MobileTimelineViewProps {
  drivers: PlanDriver[];
  getDriverAssignments: (driverName: string) => PlanAssignment[];
  getStatusColor: (status: string) => string;
  getPriorityBorder: (priority: string) => string;
  selectedDate: Date;
}

const MobileTimelineView: React.FC<MobileTimelineViewProps> = ({
  drivers,
  getDriverAssignments,
  getStatusColor,
  getPriorityBorder,
  selectedDate,
}) => {
  return (
    <Card className="premium-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {format(selectedDate, 'EEE d MMM', { locale: nl })}
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Zap className="h-2.5 w-2.5 text-green-500" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {drivers.map((driver) => {
          const assignments = getDriverAssignments(driver.name);
          return (
            <div key={driver.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
              {/* Driver Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  driver.status === 'active' ? 'bg-green-500' : 
                  driver.status === 'break' ? 'bg-amber-500' : 'bg-muted'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  <p className="text-[10px] text-muted-foreground">{driver.vehicle}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {assignments.length} ritten
                </Badge>
              </div>
              
              {/* Assignments List */}
              <div className="space-y-1.5">
                {assignments.slice(0, 3).map((assignment) => (
                  <div 
                    key={assignment.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border-l-4 text-xs",
                      getPriorityBorder(assignment.priority),
                      assignment.status === 'completed' && 'bg-green-500/10',
                      assignment.status === 'in_progress' && 'bg-blue-500/10',
                      assignment.status === 'scheduled' && 'bg-muted/50',
                      assignment.status === 'delayed' && 'bg-red-500/10'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{assignment.orderId}</span>
                        <Badge 
                          variant={assignment.status === 'delayed' ? 'destructive' : 'secondary'} 
                          className="text-[9px] px-1 h-4"
                        >
                          {assignment.status === 'completed' && 'Klaar'}
                          {assignment.status === 'in_progress' && 'Onderweg'}
                          {assignment.status === 'scheduled' && 'Gepland'}
                          {assignment.status === 'delayed' && 'Vertraagd'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {assignment.pickup} → {assignment.delivery}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-medium">{assignment.startTime}:00</p>
                      <p className="text-[9px] text-muted-foreground">{assignment.duration}u</p>
                    </div>
                  </div>
                ))}
                {assignments.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    +{assignments.length - 3} meer ritten
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// AI Insights Panel Component
interface AIInsightsPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openPanel: (type?: any) => void;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ openPanel }) => {
  return (
    <Card className="premium-card bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium">Efficiëntie +8%</p>
              <p className="text-[10px] text-muted-foreground">
                Door route optimalisatie bespaar je vandaag ~28km lege kilometers
              </p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium">SLA Risico</p>
              <p className="text-[10px] text-muted-foreground">
                ORD-2024-006 loopt 15 min vertraging op door file op A28
              </p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 text-xs" 
          onClick={() => openPanel('dispatch_planner')}
        >
          <Sparkles className="h-3 w-3" />
          Open AI Copilot
          <ArrowRight className="h-3 w-3 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIPlanView;
