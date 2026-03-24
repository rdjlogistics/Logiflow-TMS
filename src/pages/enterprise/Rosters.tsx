import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Users, Clock, Truck, AlertTriangle, CheckCircle, Loader2, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";

const Rosters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["rosters", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return { drivers: [], shifts: [] };

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const driversResult = await supabase
        .from("drivers")
        .select("id, name, status")
        .eq("tenant_id", companyId)
        .eq("status", "active")
        .order("name");

      const shiftsData = await (supabase
        .from("program_shifts")
        .select("id, assigned_driver_id, start_time, end_time, status") as any)
        .eq("company_id", companyId)
        .limit(200);

      return {
        drivers: driversResult.data ?? [],
        shifts: (shiftsData?.data ?? []) as any[],
      };
    },
    enabled: !!user,
  });

  const drivers = data?.drivers ?? [];
  const shifts = data?.shifts ?? [];
  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  // Build schedule grid
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const getShiftForDriver = (driverId: string, dayIndex: number) => {
    const targetDate = new Date(weekStart);
    targetDate.setDate(targetDate.getDate() + dayIndex);
    const dateStr = format(targetDate, "yyyy-MM-dd");
    return shifts.find((s: any) => s.assigned_driver_id === driverId && s.shift_date === dateStr);
  };

  const totalHours = shifts.reduce((sum: number, s: any) => {
    if (!s.start_time || !s.end_time) return sum;
    const start = new Date(`2000-01-01T${s.start_time}`);
    const end = new Date(`2000-01-01T${s.end_time}`);
    return sum + (end.getTime() - start.getTime()) / 3600000;
  }, 0);

  return (
    <DashboardLayout title="Roosters">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Actieve eigen chauffeurs</p><p className="text-2xl font-bold">{drivers.length}</p></div><Users className="h-8 w-8 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Geplande diensten</p><p className="text-2xl font-bold">{shifts.length}</p></div><Calendar className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Totaal uren</p><p className="text-2xl font-bold">{Math.round(totalHours)}</p></div><Clock className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Week</p><p className="text-2xl font-bold">{getISOWeek(now)}</p></div><Truck className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Weekrooster</CardTitle>
                <Badge variant="outline">Week {getISOWeek(now)}, {now.getFullYear()}</Badge>
              </div>
              <Button size="sm" onClick={() => navigate("/planning/program")}>
                <Plus className="h-4 w-4 mr-2" /> Dienst Toevoegen
              </Button>
            </div>
            <CardDescription>Overzicht van alle diensten deze week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Geen actieve eigen chauffeurs gevonden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-sm">Eigen chauffeur</th>
                      {weekDays.map(day => (
                        <th key={day} className="text-center py-3 px-2 font-medium text-sm min-w-[80px]">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver: any) => (
                      <tr key={driver.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{driver.name}</td>
                        {weekDays.map((_, i) => {
                          const shift = getShiftForDriver(driver.id, i);
                          return (
                            <td key={i} className="text-center py-3 px-2">
                              {shift ? (
                                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                                  {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Rosters;
