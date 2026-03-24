import { useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Check,
  X,
  Clock,
  MapPin,
  User,
  Star,
  AlertTriangle,
  Calendar,
  Truck,
  TrendingUp,
  ArrowRight,
  Hand,
} from "lucide-react";
import {
  usePendingApplications,
  useApproveApplication,
  useRejectApplication,
  type ShiftApplication,
} from "@/hooks/useShiftApplications";

export default function PlanningApplications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: applications = [], isLoading } = usePendingApplications();
  const approveApplication = useApproveApplication();
  const rejectApplication = useRejectApplication();

  const filteredApplications = applications.filter((app) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        app.driver?.full_name?.toLowerCase().includes(q) ||
        app.shift?.pickup_city?.toLowerCase().includes(q) ||
        app.shift?.delivery_city?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by shift
  const groupedByShift = filteredApplications.reduce((acc, app) => {
    const shiftId = app.shift_id;
    if (!acc[shiftId]) {
      acc[shiftId] = {
        shift: app.shift,
        applications: [],
      };
    }
    acc[shiftId].applications.push(app);
    return acc;
  }, {} as Record<string, { shift: any; applications: ShiftApplication[] }>);

  const handleReject = async () => {
    if (!rejectingId) return;
    await rejectApplication.mutateAsync({
      applicationId: rejectingId,
      reason: rejectionReason,
    });
    setRejectingId(null);
    setRejectionReason("");
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return "bg-muted";
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const ApplicationCard = ({ application }: { application: ShiftApplication }) => {
    const score = application.driver_score?.overall_score || 100;
    const isNewDriver = !application.driver_score || (application.driver_score.shifts_last_30_days || 0) === 0;

    return (
      <Card className="group premium-card hover:shadow-lg transition-all duration-300 overflow-hidden">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Driver info header with avatar */}
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 ring-2 ring-background shadow-sm">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm md:text-base truncate">{application.driver?.full_name || "Onbekend"}</h4>
                  {isNewDriver && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                      <Star className="h-2.5 w-2.5 mr-0.5" />
                      Nieuw
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(application.created_at), "d MMM HH:mm", { locale: nl })}
                </p>
              </div>
            </div>

            {/* Score visualization - Premium circular progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Betrouwbaarheidsscore</span>
                <span className={`text-lg font-bold ${
                  score >= 85 ? 'text-green-600' : 
                  score >= 70 ? 'text-amber-600' : 'text-red-600'
                }`}>{score}%</span>
              </div>
              <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                    score >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
                    score >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 
                    'bg-gradient-to-r from-red-500 to-orange-400'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              
              {application.driver_score && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2.5 bg-gradient-to-b from-muted/30 to-muted/60 rounded-lg border border-border/30">
                    <div className="text-sm font-bold text-foreground">{application.driver_score.reliability_score}%</div>
                    <div className="text-[10px] text-muted-foreground">Betrouwbaar</div>
                  </div>
                  <div className="text-center p-2.5 bg-gradient-to-b from-muted/30 to-muted/60 rounded-lg border border-border/30">
                    <div className="text-sm font-bold text-foreground">{application.driver_score.punctuality_score}%</div>
                    <div className="text-[10px] text-muted-foreground">Punctueel</div>
                  </div>
                  <div className="text-center p-2.5 bg-gradient-to-b from-muted/30 to-muted/60 rounded-lg border border-border/30">
                    <div className="text-sm font-bold text-foreground">{application.driver_score.shifts_last_30_days || 0}</div>
                    <div className="text-[10px] text-muted-foreground">30 dagen</div>
                  </div>
                </div>
              )}

              {application.driver_score && application.driver_score.no_show_count > 0 && (
                <Badge variant="destructive" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {application.driver_score.no_show_count} no-show
                </Badge>
              )}
            </div>

            {/* Note with enhanced styling */}
            {application.driver_note && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
                <span className="text-xs text-muted-foreground font-medium">Opmerking chauffeur:</span>
                <p className="text-sm mt-1 line-clamp-2">{application.driver_note}</p>
              </div>
            )}

            {/* Actions - Premium buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-10 gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm"
                onClick={() => approveApplication.mutate(application.id)}
                disabled={approveApplication.isPending}
              >
                <Check className="h-4 w-4" />
                Goedkeuren
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-10 gap-2 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30"
                onClick={() => setRejectingId(application.id)}
              >
                <X className="h-4 w-4" />
                Afwijzen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout title="Aanmeldingen">
      <div className="space-y-5 md:space-y-6">
        {/* Header with enhanced styling */}
        <div className="flex items-center gap-3">
          <div className="icon-gradient">
            <Hand className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Aanmeldingen</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Beoordeel en keur chauffeurs goed voor ritten
            </p>
          </div>
        </div>

        {/* Search with glass effect */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken op chauffeur of locatie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats with premium styling */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="text-2xl md:text-3xl font-bold text-primary">{applications.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Openstaand</div>
            </CardContent>
          </Card>
          <Card className="stat-card" style={{ '--gradient-primary': 'var(--gradient-accent)' } as React.CSSProperties}>
            <CardContent className="p-4">
              <div className="text-2xl md:text-3xl font-bold">{Object.keys(groupedByShift).length}</div>
              <div className="text-sm text-muted-foreground mt-1">Ritten</div>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Applications */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedByShift).length === 0 ? (
          <Card className="premium-card">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-4">
                <Hand className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Geen openstaande aanmeldingen</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Wanneer chauffeurs zich aanmelden voor ritten verschijnen ze hier
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedByShift).map(([shiftId, { shift, applications }]) => (
              <Card key={shiftId} className="premium-card overflow-hidden">
                <CardHeader className="pb-4 px-4 md:px-6 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base md:text-lg font-display truncate">
                        {shift?.title || "Rit"}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {shift?.trip_date && format(parseISO(shift.trip_date), "EEE d MMM", { locale: nl })}
                        </span>
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {shift?.start_time?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span className="truncate max-w-[100px] md:max-w-none">{shift?.pickup_city}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="truncate max-w-[100px] md:max-w-none">{shift?.delivery_city}</span>
                        </span>
                      </div>
                    </div>
                    <Badge className="self-start bg-primary/10 text-primary border-primary/20 font-semibold">
                      {applications.length} aanmelding{applications.length !== 1 ? "en" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {applications.map((app) => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reject Dialog */}
        <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aanmelding afwijzen</DialogTitle>
              <DialogDescription>
                Geef optioneel een reden op waarom deze chauffeur niet wordt geselecteerd
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reden (optioneel)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Bijv. Andere chauffeur geselecteerd"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectingId(null)}>
                  Annuleren
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectApplication.isPending}
                >
                  {rejectApplication.isPending ? "Bezig..." : "Afwijzen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
