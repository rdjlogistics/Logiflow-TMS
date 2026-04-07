import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Clock, Truck, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { format, startOfWeek, getISOWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";

interface ShiftForm {
  assigned_driver_id: string;
  trip_date: string;
  start_time: string;
  end_time: string;
  title: string;
  pickup_address: string;
  delivery_address: string;
  notes: string;
}

const emptyShift: ShiftForm = {
  assigned_driver_id: "",
  trip_date: "",
  start_time: "08:00",
  end_time: "17:00",
  title: "",
  pickup_address: "-",
  delivery_address: "-",
  notes: "",
};

const Rosters = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [form, setForm] = useState<ShiftForm>(emptyShift);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rosters", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return { drivers: [], shifts: [], companyId: null };

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const [driversResult, shiftsResult] = await Promise.all([
        supabase
          .from("drivers")
          .select("id, name, status")
          .eq("tenant_id", companyId)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("program_shifts")
          .select("id, assigned_driver_id, start_time, end_time, status, trip_date, title, notes")
          .gte("trip_date", format(weekStart, "yyyy-MM-dd"))
          .lte("trip_date", format(weekEnd, "yyyy-MM-dd"))
          .order("start_time"),
      ]);

      return {
        drivers: driversResult.data ?? [],
        shifts: shiftsResult.data ?? [],
        companyId,
      };
    },
    enabled: !!user,
  });

  const drivers = data?.drivers ?? [];
  const shifts = data?.shifts ?? [];
  const companyId = data?.companyId;
  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const getShiftsForDriver = (driverId: string, dayIndex: number) => {
    const dateStr = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
    return shifts.filter((s: any) => s.assigned_driver_id === driverId && s.trip_date === dateStr);
  };

  const totalHours = shifts.reduce((sum: number, s: any) => {
    if (!s.start_time || !s.end_time) return sum;
    const start = new Date(`2000-01-01T${s.start_time}`);
    const end = new Date(`2000-01-01T${s.end_time}`);
    return sum + (end.getTime() - start.getTime()) / 3600000;
  }, 0);

  const openAdd = (driverId?: string, dayIndex?: number) => {
    const f = { ...emptyShift };
    if (driverId) f.assigned_driver_id = driverId;
    if (dayIndex !== undefined) f.trip_date = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
    setForm(f);
    setEditingShift(null);
    setDialogOpen(true);
  };

  const openEdit = (shift: any) => {
    setForm({
      assigned_driver_id: shift.assigned_driver_id || "",
      trip_date: shift.trip_date || "",
      start_time: shift.start_time?.slice(0, 5) || "08:00",
      end_time: shift.end_time?.slice(0, 5) || "17:00",
      title: shift.title || "",
      pickup_address: "-",
      delivery_address: "-",
      notes: shift.notes || "",
    });
    setEditingShift(shift);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.assigned_driver_id || !form.trip_date || !form.start_time) {
      toast({ title: "Vul alle verplichte velden in", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingShift) {
        const { error } = await supabase
          .from("program_shifts")
          .update({
            assigned_driver_id: form.assigned_driver_id,
            trip_date: form.trip_date,
            start_time: form.start_time,
            end_time: form.end_time || null,
            title: form.title || null,
            notes: form.notes || null,
          })
          .eq("id", editingShift.id);
        if (error) throw error;
        toast({ title: "Dienst bijgewerkt" });
      } else {
        const insertData: any = {
            assigned_driver_id: form.assigned_driver_id,
            trip_date: form.trip_date,
            start_time: form.start_time,
            end_time: form.end_time || null,
            title: form.title || null,
            notes: form.notes || null,
            pickup_address: form.pickup_address || "-",
            delivery_address: form.delivery_address || "-",
            status: "open" as const,
            created_by: user?.id,
          };
        const { error } = await supabase
          .from("program_shifts")
          .insert(insertData);
        if (error) throw error;
        toast({ title: "Dienst aangemaakt" });
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("program_shifts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Dienst verwijderd" });
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Roosters">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Chauffeurs</p><p className="text-2xl font-bold">{drivers.length}</p></div><Users className="h-7 w-7 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Diensten</p><p className="text-2xl font-bold">{shifts.length}</p></div><Calendar className="h-7 w-7 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Uren</p><p className="text-2xl font-bold">{Math.round(totalHours)}</p></div><Clock className="h-7 w-7 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Week</p><p className="text-2xl font-bold">{getISOWeek(now)}</p></div><Truck className="h-7 w-7 text-amber-500" /></div></CardContent></Card>
        </div>

        {/* Roster Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Weekrooster</CardTitle>
                <Badge variant="outline">Week {getISOWeek(now)}, {now.getFullYear()}</Badge>
              </div>
              <Button size="sm" onClick={() => openAdd()}>
                <Plus className="h-4 w-4 mr-2" /> Dienst Toevoegen
              </Button>
            </div>
            <CardDescription>
              {format(weekStart, "d MMM", { locale: nl })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: nl })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Geen actieve chauffeurs gevonden</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="min-w-full w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-sm w-[140px]">Chauffeur</th>
                      {weekDays.map((day, i) => (
                        <th key={day} className="text-center py-3 px-1 font-medium text-sm min-w-[90px]">
                          <div>{day}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {format(addDays(weekStart, i), "d/M")}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver: any) => (
                      <tr key={driver.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium text-sm">{driver.name}</td>
                        {weekDays.map((_, i) => {
                          const dayShifts = getShiftsForDriver(driver.id, i);
                          return (
                            <td key={i} className="text-center py-2 px-1">
                              {dayShifts.length > 0 ? (
                                <div className="space-y-1">
                                  {dayShifts.map((shift: any) => (
                                    <button
                                      key={shift.id}
                                      onClick={() => openEdit(shift)}
                                      className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer w-full"
                                      title={shift.title || "Klik om te bewerken"}
                                    >
                                      {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={() => openAdd(driver.id, i)}
                                  className="text-muted-foreground/30 hover:text-primary hover:bg-primary/5 rounded-md px-2 py-1 text-xs transition-colors w-full"
                                  title="Dienst toevoegen"
                                >
                                  +
                                </button>
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

        {/* Add/Edit Shift Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{editingShift ? "Dienst Bewerken" : "Dienst Toevoegen"}</DialogTitle>
              <DialogDescription>
                {editingShift ? "Pas de details van deze dienst aan." : "Plan een nieuwe dienst in voor een chauffeur."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Chauffeur *</Label>
                <Select value={form.assigned_driver_id} onValueChange={(v) => setForm(f => ({ ...f, assigned_driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecteer chauffeur" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input type="date" value={form.trip_date} onChange={(e) => setForm(f => ({ ...f, trip_date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Starttijd *</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Eindtijd</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Titel / Omschrijving</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Bijv. Dag dienst Amsterdam" />
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionele notities" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              {editingShift && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(editingShift.id)} className="mr-auto">
                  <Trash2 className="h-4 w-4 mr-1" /> Verwijder
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingShift ? "Opslaan" : "Toevoegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Dienst Verwijderen</DialogTitle>
              <DialogDescription>Weet je zeker dat je deze dienst wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuleren</Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Verwijderen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Rosters;
