import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MapPin,
  ArrowRight,
  Search,
  Calendar,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
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
  rejection_reason?: string | null;
}

interface Trip {
  id: string;
  status: string;
  pickup_city: string | null;
  delivery_city: string | null;
  pickup_address: string;
  delivery_address: string;
  trip_date: string;
  order_number: string | null;
  tracking_token: string | null;
  cargo_description: string | null;
}

interface ShipmentsListProps {
  submissions: Submission[];
  trips: Trip[];
}

export const ShipmentsList = ({ submissions, trips }: ShipmentsListProps) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const getSubmissionStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      pending: { label: 'In afwachting', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
      approved: { label: 'Goedgekeurd', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
      rejected: { label: 'Afgewezen', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
      converted: { label: 'Verwerkt', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Package },
    };
    return configs[status] || configs.pending;
  };

  const getTripStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      gepland: { label: 'Gepland', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Clock },
      onderweg: { label: 'Onderweg', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Truck },
      geladen: { label: 'Geladen', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Package },
      afgerond: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
      afgeleverd: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
      gecontroleerd: { label: 'Afgeleverd', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
      gefactureerd: { label: 'Gefactureerd', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
      geannuleerd: { label: 'Geannuleerd', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
    };
    return configs[status] || configs.gepland;
  };

  // Filter based on search
  const filteredSubmissions = submissions.filter(s => {
    const searchLower = search.toLowerCase();
    return (
      s.pickup_city.toLowerCase().includes(searchLower) ||
      s.delivery_city.toLowerCase().includes(searchLower) ||
      s.pickup_company.toLowerCase().includes(searchLower) ||
      s.delivery_company.toLowerCase().includes(searchLower) ||
      (s.reference_number?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const filteredTrips = trips.filter(t => {
    const searchLower = search.toLowerCase();
    return (
      (t.pickup_city?.toLowerCase().includes(searchLower) ?? false) ||
      (t.delivery_city?.toLowerCase().includes(searchLower) ?? false) ||
      (t.order_number?.toLowerCase().includes(searchLower) ?? false) ||
      (t.cargo_description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Filter by tab
  const getFilteredData = () => {
    switch (activeTab) {
      case 'pending':
        return { submissions: filteredSubmissions.filter(s => s.status === 'pending'), trips: [] };
      case 'active':
        return { 
          submissions: [], 
          trips: filteredTrips.filter(t => t.status === 'onderweg' || t.status === 'geladen' || t.status === 'gepland') 
        };
      case 'completed':
        return { 
          submissions: filteredSubmissions.filter(s => s.status !== 'pending'), 
          trips: filteredTrips.filter(t => ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(t.status)) 
        };
      default:
        return { submissions: filteredSubmissions, trips: filteredTrips };
    }
  };

  const { submissions: displaySubmissions, trips: displayTrips } = getFilteredData();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Mijn Zendingen</CardTitle>
            <CardDescription>Bekijk de status van al uw zendingen</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all">Alles</TabsTrigger>
            <TabsTrigger value="pending">Aanvragen</TabsTrigger>
            <TabsTrigger value="active">Actief</TabsTrigger>
            <TabsTrigger value="completed">Afgerond</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {displaySubmissions.length === 0 && displayTrips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Geen zendingen gevonden</p>
              </div>
            ) : (
              <>
                {/* Trips (processed shipments) */}
                {displayTrips.map((trip) => {
                  const statusConfig = getTripStatusConfig(trip.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={trip.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${statusConfig.color.split(' ')[0]}`}>
                          <StatusIcon className={`h-5 w-5 ${statusConfig.color.split(' ')[1]}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {trip.pickup_city || 'Ophalen'}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {trip.delivery_city || 'Leveren'}
                            </span>
                            <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {trip.pickup_address} → {trip.delivery_address}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(trip.trip_date), 'd MMMM yyyy', { locale: nl })}
                            </span>
                            {trip.order_number && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {trip.order_number}
                              </span>
                            )}
                            {trip.cargo_description && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {trip.cargo_description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {trip.tracking_token && (trip.status === 'onderweg' || trip.status === 'geladen') && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(`/track?token=${trip.tracking_token}`, '_blank')}
                        >
                          <MapPin className="h-4 w-4" />
                          Live tracking
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}

                {/* Submissions (pending requests) */}
                {displaySubmissions.map((submission) => {
                  const statusConfig = getSubmissionStatusConfig(submission.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={submission.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${statusConfig.color.split(' ')[0]}`}>
                          <StatusIcon className={`h-5 w-5 ${statusConfig.color.split(' ')[1]}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {submission.pickup_city}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {submission.delivery_city}
                            </span>
                            <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {submission.pickup_company} → {submission.delivery_company}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Ophalen: {format(new Date(submission.pickup_date), 'd MMMM yyyy', { locale: nl })}
                            </span>
                            {submission.reference_number && (
                              <span>Ref: {submission.reference_number}</span>
                            )}
                            <span>
                              Ingediend: {format(new Date(submission.created_at), 'd MMM yyyy HH:mm', { locale: nl })}
                            </span>
                          </div>
                          {submission.status === 'rejected' && submission.rejection_reason && (
                            <div className="mt-2 text-sm text-red-600 bg-red-500/10 rounded-lg px-3 py-2">
                              Reden: {submission.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
