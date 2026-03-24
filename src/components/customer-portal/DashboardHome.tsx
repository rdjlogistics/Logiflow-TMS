import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp,
  FileCheck,
  MapPin,
  Zap,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { PortalStats, Shipment, Submission, BookingTemplate } from "@/hooks/useCustomerPortal";

interface DashboardHomeProps {
  stats: PortalStats;
  recentShipments: Shipment[];
  pendingSubmissions: Submission[];
  favoriteTemplates: BookingTemplate[];
  onNewBooking: () => void;
  onViewShipments: () => void;
  onViewShipment: (id: string) => void;
  onUseTemplate: (template: BookingTemplate) => void;
  showOnboarding: boolean;
  onCompleteOnboarding: () => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'aanvraag':
    case 'pending':
      return { label: 'In afwachting', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', icon: Clock };
    case 'gepland':
    case 'approved':
      return { label: 'Gepland', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Package };
    case 'onderweg':
      return { label: 'Onderweg', color: 'bg-primary/20 text-primary', icon: Truck };
    case 'afgeleverd':
    case 'delivered':
      return { label: 'Afgeleverd', color: 'bg-green-500/20 text-green-700 dark:text-green-400', icon: CheckCircle2 };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground', icon: Package };
  }
};

export const DashboardHome = ({
  stats,
  recentShipments,
  pendingSubmissions,
  favoriteTemplates,
  onNewBooking,
  onViewShipments,
  onViewShipment,
  onUseTemplate,
  showOnboarding,
  onCompleteOnboarding,
}: DashboardHomeProps) => {
  const activeShipments = recentShipments.filter(s => 
    ['aanvraag', 'gepland', 'geladen', 'onderweg'].includes(s.status)
  ).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Onboarding Banner */}
      {showOnboarding && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Welkom bij het Klantenportaal!</h3>
                  <p className="text-sm text-muted-foreground">
                    Ontdek hoe u snel en eenvoudig zendingen kunt boeken.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCompleteOnboarding}>
                  Overslaan
                </Button>
                <Button size="sm" onClick={onNewBooking}>
                  Start tour
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Actieve Zendingen</p>
                <p className="text-3xl font-bold text-primary">{stats.activeShipments}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <Truck className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Afwachting</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingSubmissions}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Afgeleverd (maand)</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.deliveredThisMonth}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On-Time %</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.onTimePercentage}%</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300" onClick={onNewBooking}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Nieuwe Zending Boeken</h3>
                <p className="text-sm text-muted-foreground">In 3 stappen uw transport regelen</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300" onClick={onViewShipments}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Zendingen Volgen</h3>
                <p className="text-sm text-muted-foreground">Bekijk de status van uw zendingen</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Favorite Templates */}
      {favoriteTemplates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-amber-500" />
              Favoriete Sjablonen
            </CardTitle>
            <CardDescription>Snel boeken met opgeslagen routes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {favoriteTemplates.slice(0, 3).map((template) => {
                const payload = template.payload_json;
                const pickup = payload.pickup as { city?: string } | undefined;
                const delivery = payload.delivery as { city?: string } | undefined;
                
                return (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start text-left"
                    onClick={() => onUseTemplate(template)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Star className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {pickup?.city || '?'} → {delivery?.city || '?'}
                        </p>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Shipments */}
      {activeShipments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  Actieve Zendingen
                </CardTitle>
                <CardDescription>Uw lopende transporten</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onViewShipments}>
                Alles bekijken
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeShipments.map((shipment) => {
                const statusConfig = getStatusConfig(shipment.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={shipment.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => onViewShipment(shipment.id)}
                  >
                    <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {shipment.pickup_city || 'Onbekend'} → {shipment.delivery_city || 'Onbekend'}
                        </p>
                        <Badge variant="secondary" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shipment.order_number || 'Geen ordernummer'} • {format(new Date(shipment.trip_date), 'd MMMM', { locale: nl })}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stress Killers / KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <FileCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">POD Beschikbaar</p>
                <p className="text-2xl font-bold">{stats.podPercentage}%</p>
                <p className="text-xs text-muted-foreground">van voltooide zendingen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adreskwaliteit</p>
                <p className="text-2xl font-bold">{stats.addressQualityScore}%</p>
                <p className="text-xs text-muted-foreground">geverifieerde adressen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totaal Zendingen</p>
                <p className="text-2xl font-bold">{stats.totalShipments}</p>
                <p className="text-xs text-muted-foreground">dit jaar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
