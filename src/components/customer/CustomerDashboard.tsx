import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  MapPin,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Submission {
  id: string;
  status: string;
  pickup_company: string;
  pickup_city: string;
  delivery_company: string;
  delivery_city: string;
  pickup_date: string;
  created_at: string;
  reference_number: string | null;
}

interface Trip {
  id: string;
  status: string;
  pickup_city: string | null;
  delivery_city: string | null;
  trip_date: string;
  order_number: string | null;
  tracking_token: string | null;
}

interface CustomerDashboardProps {
  submissions: Submission[];
  trips: Trip[];
  onNewShipment: () => void;
}

export const CustomerDashboard = ({ 
  submissions, 
  trips, 
  onNewShipment 
}: CustomerDashboardProps) => {
  const stats = useMemo(() => {
    const pending = submissions.filter(s => s.status === 'pending').length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const inTransit = trips.filter(t => t.status === 'onderweg').length;
    const delivered = trips.filter(t => ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(t.status)).length;
    
    return { pending, approved, inTransit, delivered };
  }, [submissions, trips]);

  // Get upcoming/active shipments
  const activeShipments = useMemo(() => {
    const activeTrips = trips
      .filter(t => !['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd', 'geannuleerd'].includes(t.status))
      .sort((a, b) => new Date(a.trip_date).getTime() - new Date(b.trip_date).getTime())
      .slice(0, 3);
    
    return activeTrips;
  }, [trips]);

  // Recent submissions
  const recentSubmissions = useMemo(() => {
    return submissions
      .filter(s => s.status === 'pending')
      .slice(0, 3);
  }, [submissions]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Vandaag';
    if (isTomorrow(date)) return 'Morgen';
    const daysAway = differenceInDays(date, new Date());
    if (daysAway > 0 && daysAway <= 7) return `Over ${daysAway} dagen`;
    return format(date, 'd MMM', { locale: nl });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      gepland: { label: 'Gepland', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Clock },
      onderweg: { label: 'Onderweg', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Truck },
      geladen: { label: 'Geladen', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Package },
      afgerond: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
      afgeleverd: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
    };
    return configs[status] || configs.gepland;
  };

  return (
    <div className="space-y-6">
      {/* Premium Quick Stats with Glassmorphism */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/30 shadow-lg shadow-amber-500/10 backdrop-blur-sm">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-500/20 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 shadow-md">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{stats.pending}</p>
                <p className="text-xs font-medium text-muted-foreground">In afwachting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 to-blue-500/5 border-blue-500/30 shadow-lg shadow-blue-500/10 backdrop-blur-sm">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/20 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 shadow-md">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{stats.approved}</p>
                <p className="text-xs font-medium text-muted-foreground">Goedgekeurd</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/15 to-purple-500/5 border-purple-500/30 shadow-lg shadow-purple-500/10 backdrop-blur-sm">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-purple-500/20 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-500/10 shadow-md">
                <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{stats.inTransit}</p>
                <p className="text-xs font-medium text-muted-foreground">Onderweg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/20 blur-xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 shadow-md">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.delivered}</p>
                <p className="text-xs font-medium text-muted-foreground">Afgeleverd</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Quick Action Card */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-primary/8 to-transparent border-primary/30 shadow-xl shadow-primary/10 backdrop-blur-sm">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-primary-glow/15 blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
        <CardContent className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary-glow blur-md opacity-50" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-glow flex items-center justify-center shadow-xl">
                  <Package className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl tracking-tight">Nieuwe zending boeken</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Dien snel een nieuwe transportaanvraag in
                </p>
              </div>
            </div>
            <Button 
              onClick={onNewShipment} 
              size="lg" 
              className="gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Nieuwe zending
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Shipments */}
        <Card className="relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-base flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              Actieve Zendingen
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {activeShipments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Truck className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">Geen actieve zendingen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeShipments.map((trip) => {
                  const statusConfig = getStatusConfig(trip.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 transition-all duration-300 border border-transparent hover:border-border/40 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl flex items-center justify-center ${statusConfig.color.split(' ')[0]} shadow-sm`}>
                          <StatusIcon className={`h-4 w-4 ${statusConfig.color.split(' ')[1]}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {trip.pickup_city || 'Ophalen'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {trip.delivery_city || 'Leveren'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getDateLabel(trip.trip_date)}</span>
                            {trip.order_number && (
                              <>
                                <span>•</span>
                                <span>{trip.order_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
                          {statusConfig.label}
                        </Badge>
                        {trip.tracking_token && trip.status === 'onderweg' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => window.open(`/track?token=${trip.tracking_token}`, '_blank')}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Track
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Submissions */}
        <Card className="relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-50" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-base flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              In Afwachting
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                </div>
                <p className="text-sm font-medium">Alle aanvragen zijn verwerkt</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/25 hover:border-amber-500/40 transition-all duration-300"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {submission.pickup_city}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {submission.delivery_city}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Ophalen: {getDateLabel(submission.pickup_date)}</span>
                        {submission.reference_number && (
                          <>
                            <span>•</span>
                            <span>Ref: {submission.reference_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                      In afwachting
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
