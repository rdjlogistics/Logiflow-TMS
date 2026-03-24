import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Truck,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  MapPin,
  Calendar,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { Shipment, Submission } from "@/hooks/useCustomerPortal";
import { cn } from "@/lib/utils";

interface ShipmentsListProps {
  shipments: Shipment[];
  submissions: Submission[];
  loading: boolean;
  onViewShipment: (id: string) => void;
  onViewSubmission: (id: string) => void;
  onTrackShipment: (trackingToken: string) => void;
  onRebookSubmission: (submission: Submission) => void;
  canCancel: boolean;
  canRequestChanges: boolean;
  trackingEnabled: boolean;
}

type TabValue = 'all' | 'pending' | 'active' | 'completed';

const getShipmentStatusConfig = (status: string) => {
  switch (status) {
    case 'aanvraag':
      return { label: 'In afwachting', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', icon: Clock };
    case 'gepland':
      return { label: 'Gepland', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Calendar };
    case 'onderweg':
      return { label: 'Onderweg', color: 'bg-primary/20 text-primary', icon: Truck };
    case 'afgeleverd':
      return { label: 'Afgeleverd', color: 'bg-green-500/20 text-green-700 dark:text-green-400', icon: CheckCircle2 };
    case 'gecontroleerd':
      return { label: 'Gecontroleerd', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400', icon: FileText };
    case 'gefactureerd':
      return { label: 'Gefactureerd', color: 'bg-gray-500/20 text-gray-700 dark:text-gray-400', icon: FileText };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground', icon: Package };
  }
};

const getSubmissionStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'In behandeling', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', icon: Clock };
    case 'approved':
      return { label: 'Goedgekeurd', color: 'bg-green-500/20 text-green-700 dark:text-green-400', icon: CheckCircle2 };
    case 'rejected':
      return { label: 'Afgewezen', color: 'bg-red-500/20 text-red-700 dark:text-red-400', icon: AlertCircle };
    case 'converted':
      return { label: 'Verwerkt', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Truck };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground', icon: Package };
  }
};

export const ShipmentsList = ({
  shipments,
  submissions,
  loading,
  onViewShipment,
  onViewSubmission,
  onTrackShipment,
  onRebookSubmission,
  canCancel,
  canRequestChanges,
  trackingEnabled,
}: ShipmentsListProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  const copyTrackingLink = (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link gekopieerd",
      description: "De tracking link is naar uw klembord gekopieerd.",
    });
  };

  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    // Filter shipments
    const filteredShipments = shipments.filter(s => {
      const matchesSearch = !search || 
        (s.order_number?.toLowerCase().includes(searchLower)) ||
        (s.pickup_city?.toLowerCase().includes(searchLower)) ||
        (s.delivery_city?.toLowerCase().includes(searchLower)) ||
        (s.cargo_description?.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
      
      switch (activeTab) {
        case 'pending':
          return s.status === 'aanvraag';
        case 'active':
          return ['gepland', 'geladen', 'onderweg'].includes(s.status);
        case 'completed':
          return ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(s.status);
        default:
          return true;
      }
    });

    // Filter submissions
    const filteredSubmissions = submissions.filter(s => {
      const matchesSearch = !search ||
        (s.reference_number?.toLowerCase().includes(searchLower)) ||
        (s.pickup_city?.toLowerCase().includes(searchLower)) ||
        (s.delivery_city?.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
      
      switch (activeTab) {
        case 'pending':
          return s.status === 'pending';
        case 'active':
        case 'completed':
          return false; // Submissions don't have these states
        default:
          return true;
      }
    });

    // Combine and sort by date
    const combined: Array<{ type: 'shipment' | 'submission'; data: Shipment | Submission; date: Date }> = [
      ...filteredShipments.map(s => ({ 
        type: 'shipment' as const, 
        data: s, 
        date: new Date(s.trip_date) 
      })),
      ...filteredSubmissions.map(s => ({ 
        type: 'submission' as const, 
        data: s, 
        date: new Date(s.pickup_date) 
      })),
    ];

    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [shipments, submissions, search, activeTab]);

  const tabCounts = useMemo(() => ({
    all: shipments.length + submissions.length,
    pending: shipments.filter(s => s.status === 'aanvraag').length + submissions.filter(s => s.status === 'pending').length,
    active: shipments.filter(s => ['gepland', 'geladen', 'onderweg'].includes(s.status)).length,
    completed: shipments.filter(s => ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(s.status)).length,
  }), [shipments, submissions]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoeken op ordernummer, plaats of referentie..."
                className="pl-10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <TabsList className="h-10">
                <TabsTrigger value="all" className="gap-2">
                  Alles
                  <Badge variant="secondary" className="text-xs">{tabCounts.all}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  In afwachting
                  <Badge variant="secondary" className="text-xs">{tabCounts.pending}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  Actief
                  <Badge variant="secondary" className="text-xs">{tabCounts.active}</Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Afgerond
                  <Badge variant="secondary" className="text-xs">{tabCounts.completed}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Geen zendingen gevonden</h3>
            <p className="text-muted-foreground">
              {search ? 'Probeer een andere zoekterm.' : 'U heeft nog geen zendingen.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredData.map((item) => {
            if (item.type === 'shipment') {
              const shipment = item.data as Shipment;
              const statusConfig = getShipmentStatusConfig(shipment.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card 
                  key={`shipment-${shipment.id}`}
                  className="hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => onViewShipment(shipment.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={cn("p-3 rounded-xl", statusConfig.color)}>
                        <StatusIcon className="h-5 w-5" />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">
                            {shipment.pickup_city || 'Onbekend'} → {shipment.delivery_city || 'Onbekend'}
                          </h4>
                          <Badge variant="secondary" className={cn("shrink-0", statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {shipment.order_number && (
                            <span className="font-mono">{shipment.order_number}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(shipment.trip_date), 'd MMM yyyy', { locale: nl })}
                          </span>
                          {shipment.cargo_description && (
                            <span className="truncate max-w-[200px]">{shipment.cargo_description}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {trackingEnabled && shipment.tracking_token && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTrackShipment(shipment.tracking_token!);
                              }}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              Volgen
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyTrackingLink(shipment.tracking_token!);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              const submission = item.data as Submission;
              const statusConfig = getSubmissionStatusConfig(submission.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card 
                  key={`submission-${submission.id}`}
                  className="hover:shadow-md transition-all duration-200 cursor-pointer group border-dashed"
                  onClick={() => onViewSubmission(submission.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={cn("p-3 rounded-xl", statusConfig.color)}>
                        <StatusIcon className="h-5 w-5" />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">Aanvraag</Badge>
                          <h4 className="font-semibold truncate">
                            {submission.pickup_city} → {submission.delivery_city}
                          </h4>
                          <Badge variant="secondary" className={cn("shrink-0", statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {submission.reference_number && (
                            <span className="font-mono">{submission.reference_number}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(submission.pickup_date), 'd MMM yyyy', { locale: nl })}
                          </span>
                          <span className="text-xs">
                            Ingediend: {format(new Date(submission.created_at), 'd MMM HH:mm', { locale: nl })}
                          </span>
                        </div>
                        {submission.rejection_reason && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                            <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                            {submission.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {submission.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRebookSubmission(submission);
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Opnieuw
                          </Button>
                        )}
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

export default ShipmentsList;
