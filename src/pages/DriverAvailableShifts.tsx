import { useState } from "react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Clock,
  Truck,
  Euro,
  Calendar,
  Hand,
  Check,
  ArrowRight,
  MessageSquare,
  Loader2,
  Filter,
  Briefcase,
  CheckCircle2,
  XCircle,
  HourglassIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAvailableShifts, useDriverAssignedShifts, type ProgramShift } from "@/hooks/useProgramShifts";
import { useApplyForShift, useDriverApplications, useCancelApplication, type ShiftApplication } from "@/hooks/useShiftApplications";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function DriverAvailableShifts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [applyingShiftId, setApplyingShiftId] = useState<string | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [simpleMode, setSimpleMode] = useState(false);

  const { data: availableShifts = [], isLoading: loadingAvailable } = useAvailableShifts();
  const { data: myShifts = [], isLoading: loadingMine } = useDriverAssignedShifts(user?.id);
  const { data: myApplications = [], isLoading: loadingApps } = useDriverApplications(user?.id);
  const applyForShift = useApplyForShift();
  const cancelApplication = useCancelApplication();

  // Filter out shifts user already applied to
  const appliedShiftIds = new Set(myApplications.map((a) => a.shift_id));
  const filteredAvailable = availableShifts.filter((shift) => {
    // Already applied?
    if (appliedShiftIds.has(shift.id)) return false;
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !shift.pickup_city?.toLowerCase().includes(q) &&
        !shift.delivery_city?.toLowerCase().includes(q) &&
        !shift.title?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    // Vehicle filter
    if (vehicleFilter !== "all" && shift.vehicle_type !== vehicleFilter) {
      return false;
    }
    return true;
  });

  const handleApply = async () => {
    if (!applyingShiftId) return;
    await applyForShift.mutateAsync({ shiftId: applyingShiftId, note: applyNote });
    setApplyingShiftId(null);
    setApplyNote("");
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Vandaag";
    if (isTomorrow(date)) return "Morgen";
    return format(date, "EEE d MMM", { locale: nl });
  };

  const vehicleTypes = [...new Set(availableShifts.map((s) => s.vehicle_type).filter(Boolean))];

  const ShiftCard = ({ shift, showApply = true }: { shift: ProgramShift; showApply?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow touch-friendly">
      <CardContent className="p-4">
        {/* Date & Time - prominent */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {format(parseISO(shift.trip_date), "EEE", { locale: nl })}
              </span>
              <span className="text-lg font-bold text-primary">
                {format(parseISO(shift.trip_date), "d")}
              </span>
            </div>
            <div>
              <div className="font-semibold">{getDateLabel(shift.trip_date)}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {shift.start_time?.slice(0, 5)}
                {shift.end_time && ` - ${shift.end_time.slice(0, 5)}`}
                {shift.estimated_duration_hours > 0 && (
                  <span className="text-xs">({shift.estimated_duration_hours}u)</span>
                )}
              </div>
            </div>
          </div>
          {shift.vehicle_type && (
            <Badge variant="outline" className="text-xs shrink-0">
              <Truck className="h-3 w-3 mr-1" />
              {shift.vehicle_type}
            </Badge>
          )}
        </div>

        {/* Route */}
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
              <div className="w-0.5 h-6 bg-border" />
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{shift.pickup_city || shift.pickup_address}</div>
              <div className="text-xs text-muted-foreground truncate">{shift.pickup_company}</div>
              <div className="my-1" />
              <div className="font-medium truncate">{shift.delivery_city || shift.delivery_address}</div>
              <div className="text-xs text-muted-foreground truncate">{shift.delivery_company}</div>
            </div>
          </div>
        </div>

        {/* Compensation */}
        {shift.show_compensation_to_driver && shift.compensation_amount > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 rounded-lg">
            <Euro className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-600 text-lg">
              €{shift.compensation_amount.toFixed(2)}
            </span>
            {shift.compensation_type === "hourly" && (
              <span className="text-sm text-muted-foreground">/uur</span>
            )}
            {shift.compensation_type === "per_km" && (
              <span className="text-sm text-muted-foreground">/km</span>
            )}
            {shift.surge_bonus > 0 && (
              <Badge variant="destructive" className="ml-auto">
                +€{shift.surge_bonus} BONUS
              </Badge>
            )}
          </div>
        )}

        {/* Requirements */}
        {(shift.requires_tail_lift || shift.requires_adr || shift.requires_cooling) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {shift.requires_tail_lift && (
              <Badge variant="secondary" className="text-xs">Laadklep</Badge>
            )}
            {shift.requires_adr && (
              <Badge variant="secondary" className="text-xs">ADR</Badge>
            )}
            {shift.requires_cooling && (
              <Badge variant="secondary" className="text-xs">Koeling</Badge>
            )}
          </div>
        )}

        {/* Actions */}
        {showApply && (
          <div className="flex gap-2">
            <Button
              className="flex-1 h-12 text-base font-semibold gap-2"
              onClick={() => setApplyingShiftId(shift.id)}
            >
              <Hand className="h-5 w-5" />
              Aanmelden
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => navigate("/messenger")}
              title="Chat met planning"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const MyShiftCard = ({ shift }: { shift: ProgramShift }) => {
    const isCompleted = shift.status === "completed";

    return (
      <Card className={`hover:shadow-md transition-shadow ${isCompleted ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isCompleted ? "bg-green-500/20" : "bg-primary/10"}`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <>
                    <span className="text-xs font-medium text-primary">
                      {format(parseISO(shift.trip_date), "EEE", { locale: nl })}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {format(parseISO(shift.trip_date), "d")}
                    </span>
                  </>
                )}
              </div>
              <div>
                <div className="font-semibold">{getDateLabel(shift.trip_date)}</div>
                <div className="text-sm text-muted-foreground">
                  {shift.start_time?.slice(0, 5)}
                </div>
              </div>
            </div>
            <Badge variant={isCompleted ? "secondary" : "default"}>
              {isCompleted ? "Afgerond" : "Bevestigd"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{shift.pickup_city}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span>{shift.delivery_city}</span>
          </div>

          {!isCompleted && (
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => navigate("/driver")}
            >
              Open in portaal
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const ApplicationCard = ({ application }: { application: ShiftApplication }) => {
    const shift = application.shift as any;
    if (!shift) return null;

    const statusConfig = {
      pending: { label: "In afwachting", icon: HourglassIcon, color: "text-yellow-600" },
      approved: { label: "Goedgekeurd", icon: CheckCircle2, color: "text-green-600" },
      rejected: { label: "Afgewezen", icon: XCircle, color: "text-red-600" },
      reserve: { label: "Reserve", icon: Clock, color: "text-blue-600" },
      cancelled: { label: "Geannuleerd", icon: XCircle, color: "text-muted-foreground" },
    };

    const config = statusConfig[application.status];

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <config.icon className={`h-5 w-5 ${config.color}`} />
              <span className={`font-medium ${config.color}`}>{config.label}</span>
            </div>
            {application.status === "pending" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelApplication.mutate(application.id)}
                disabled={cancelApplication.isPending}
              >
                Annuleren
              </Button>
            )}
          </div>

          <div className="text-sm mb-2">
            <div className="font-medium">{getDateLabel(shift.trip_date)} {shift.start_time?.slice(0, 5)}</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {shift.pickup_city} → {shift.delivery_city}
            </div>
          </div>

          {application.rejection_reason && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              Reden: {application.rejection_reason}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login vereist</h2>
            <p className="text-muted-foreground mb-4">
              Log in om beschikbare ritten te bekijken
            </p>
            <Button onClick={() => navigate("/auth")}>Inloggen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Ritten</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSimpleMode(!simpleMode)}
          >
            {simpleMode ? "Uitgebreid" : "Eenvoudig"}
          </Button>
        </div>
      </header>

      <main className="p-4 pb-24">
        <Tabs defaultValue="available" className="space-y-4">
          <TabsList className="w-full h-12">
            <TabsTrigger value="available" className="flex-1 h-10 text-sm">
              <Hand className="h-4 w-4 mr-2" />
              Beschikbaar
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex-1 h-10 text-sm">
              <Briefcase className="h-4 w-4 mr-2" />
              Mijn ritten
            </TabsTrigger>
            {!simpleMode && (
              <TabsTrigger value="applications" className="flex-1 h-10 text-sm">
                <Clock className="h-4 w-4 mr-2" />
                Aanvragen
              </TabsTrigger>
            )}
          </TabsList>

          {/* Available Shifts */}
          <TabsContent value="available" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="w-[140px] h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type} value={type!}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* List */}
            {loadingAvailable ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAvailable.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Geen ritten beschikbaar</h3>
                  <p className="text-muted-foreground">
                    Check later terug voor nieuwe ritten
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAvailable.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Shifts */}
          <TabsContent value="mine" className="space-y-4">
            {loadingMine ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : myShifts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Geen toegewezen ritten</h3>
                  <p className="text-muted-foreground">
                    Meld je aan voor beschikbare ritten
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Upcoming first */}
                {myShifts
                  .filter((s) => s.status !== "completed")
                  .map((shift) => (
                    <MyShiftCard key={shift.id} shift={shift} />
                  ))}
                {/* Completed at bottom */}
                {myShifts
                  .filter((s) => s.status === "completed")
                  .map((shift) => (
                    <MyShiftCard key={shift.id} shift={shift} />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Applications */}
          {!simpleMode && (
            <TabsContent value="applications" className="space-y-4">
              {loadingApps ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : myApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-1">Geen aanvragen</h3>
                    <p className="text-muted-foreground">
                      Je aanmeldingen verschijnen hier
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {myApplications.map((app) => (
                    <ApplicationCard key={app.id} application={app} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Apply Dialog */}
      <Dialog open={!!applyingShiftId} onOpenChange={(open) => !open && setApplyingShiftId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanmelden voor rit</DialogTitle>
            <DialogDescription>
              Bevestig je beschikbaarheid voor deze rit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Opmerking (optioneel)</Label>
              <Textarea
                value={applyNote}
                onChange={(e) => setApplyNote(e.target.value)}
                placeholder="Bijv. flexibel met tijden"
                rows={3}
              />
            </div>
            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={handleApply}
              disabled={applyForShift.isPending}
            >
              {applyForShift.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              Bevestig aanmelding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-2 safe-bottom">
        <div className="flex justify-around">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/driver/shifts")}
          >
            <Hand className="h-5 w-5" />
            <span className="text-xs mt-1">Ritten</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/driver")}
          >
            <Briefcase className="h-5 w-5" />
            <span className="text-xs mt-1">Portaal</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/planning/availability")}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Kalender</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
