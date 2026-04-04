import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Layers,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Package,
  MapPin,
  MoreHorizontal,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePickWaves, usePickTasks, useCreatePickWave, useWarehouses } from "@/hooks/useWMS";
import { WMSGlassCard, WMSCardTitle, WMSStatCard } from "@/components/wms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const waveStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Open", color: "bg-muted text-foreground", icon: <Clock className="h-3 w-3" /> },
  released: { label: "Vrijgegeven", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: <PlayCircle className="h-3 w-3" /> },
  in_progress: { label: "In uitvoering", color: "bg-violet-500/15 text-violet-600 border-violet-500/30", icon: <Layers className="h-3 w-3" /> },
  completed: { label: "Afgerond", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: <PauseCircle className="h-3 w-3" /> },
};

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Wachtend", color: "bg-muted text-foreground" },
  assigned: { label: "Toegewezen", color: "bg-blue-500/15 text-blue-600" },
  in_progress: { label: "Bezig", color: "bg-violet-500/15 text-violet-600" },
  completed: { label: "Afgerond", color: "bg-emerald-500/15 text-emerald-600" },
  short: { label: "Tekort", color: "bg-amber-500/15 text-amber-600" },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/15 text-red-600" },
};

export default function WMSPicking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("in_progress");
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWave, setNewWave] = useState({
    warehouse_id: "",
    priority: "3",
    picking_strategy: "wave",
  });

  const { data: waves, isLoading: wavesLoading } = usePickWaves(
    activeTab !== "all" ? activeTab : undefined
  );
  const { data: tasks, isLoading: tasksLoading } = usePickTasks(selectedWaveId || undefined);
  const { data: warehouses } = useWarehouses();
  const createWave = useCreatePickWave();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredWaves = waves?.filter(
    (wave) =>
      wave.wave_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wave.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateWave = () => {
    if (!newWave.warehouse_id) {
      toast({ title: "Selecteer een magazijn", variant: "destructive" });
      return;
    }
    
    createWave.mutate(
      {
        ...newWave,
        priority: parseInt(newWave.priority),
        status: "open",
        total_orders: 0,
        total_lines: 0,
        total_quantity: 0,
      } as any,
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setNewWave({ warehouse_id: "", priority: "3", picking_strategy: "wave" });
        },
      }
    );
  };

  const handleUpdateWaveStatus = async (waveId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "in_progress") {
        updates.started_at = new Date().toISOString();
      } else if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("pick_waves")
        .update(updates)
        .eq("id", waveId);

      if (error) throw error;

      toast({ title: `Wave status: ${waveStatusConfig[status]?.label || status}` });
      queryClient.invalidateQueries({ queryKey: ["pick-waves"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("pick_tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      toast({ title: `Task ${status === "completed" ? "afgerond" : "bijgewerkt"}` });
      queryClient.invalidateQueries({ queryKey: ["pick-tasks"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const counts = {
    open: waves?.filter((w) => w.status === "open").length || 0,
    in_progress: waves?.filter((w) => w.status === "in_progress").length || 0,
    completed: waves?.filter((w) => w.status === "completed").length || 0,
    totalLines: waves?.reduce((sum, w) => sum + (w.total_lines || 0), 0) || 0,
  };

  return (
    <DashboardLayout title="Picking">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <p className="text-muted-foreground">
            Wave picking, batch picking en FIFO strategieën
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={async () => {
            if (!warehouses?.length) {
              toast({ title: "Geen magazijn", description: "Selecteer eerst een magazijn.", variant: "destructive" });
              return;
            }
            toast({ title: "Auto-Wave gestart", description: "Het systeem groepeert orders automatisch in optimale waves..." });
            try {
              // Query real pending outbound orders for this warehouse
              const { count: orderCount } = await supabase
                .from("outbound_orders")
                .select("id", { count: "exact", head: true })
                .eq("warehouse_id", warehouses[0].id)
                .in("status", ["pending", "allocated"]);
              
              const realOrderCount = orderCount || 0;
              if (realOrderCount === 0) {
                toast({ title: "Geen orders", description: "Er zijn geen openstaande orders om te groeperen.", variant: "destructive" });
                return;
              }

              createWave.mutate({
                warehouse_id: warehouses[0].id,
                priority: 2,
                picking_strategy: "wave",
                status: "open",
                total_orders: realOrderCount,
                total_lines: realOrderCount, // 1 line per order as baseline
                total_quantity: realOrderCount, // Updated when picks are generated
              } as any, {
                onSuccess: () => {
                  toast({ title: "Auto-Wave aangemaakt", description: `${realOrderCount} orders zijn automatisch gegroepeerd in een nieuwe wave.` });
                },
                onError: () => {
                  toast({ title: "Fout", description: "Kon geen auto-wave aanmaken.", variant: "destructive" });
                }
              });
            } catch (error) {
              toast({ title: "Fout", description: "Auto-wave generatie mislukt.", variant: "destructive" });
            }
          >
            <Zap className="h-4 w-4" />
            Auto-Wave
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuwe Wave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Pick Wave</DialogTitle>
                <DialogDescription>
                  Maak een nieuwe picking wave aan
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Magazijn *</Label>
                  <Select value={newWave.warehouse_id} onValueChange={(v) => setNewWave({ ...newWave, warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecteer magazijn" /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioriteit</Label>
                    <Select value={newWave.priority} onValueChange={(v) => setNewWave({ ...newWave, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">P1 - Kritiek</SelectItem>
                        <SelectItem value="2">P2 - Hoog</SelectItem>
                        <SelectItem value="3">P3 - Normaal</SelectItem>
                        <SelectItem value="4">P4 - Laag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Strategie</Label>
                    <Select value={newWave.picking_strategy} onValueChange={(v) => setNewWave({ ...newWave, picking_strategy: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wave">Wave Picking</SelectItem>
                        <SelectItem value="batch">Batch Picking</SelectItem>
                        <SelectItem value="zone">Zone Picking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuleren</Button>
                <Button onClick={handleCreateWave} disabled={createWave.isPending}>
                  {createWave.isPending ? "Bezig..." : "Aanmaken"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <WMSStatCard title="Open waves" value={counts.open} icon={<Clock className="h-full w-full" />} variant="default" />
        <WMSStatCard title="In uitvoering" value={counts.in_progress} icon={<Layers className="h-full w-full" />} variant="gold" />
        <WMSStatCard title="Afgerond vandaag" value={counts.completed} icon={<CheckCircle2 className="h-full w-full" />} variant="success" />
        <WMSStatCard title="Totaal pick lines" value={counts.totalLines} icon={<Package className="h-full w-full" />} variant="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waves List */}
        <WMSGlassCard
          header={
            <WMSCardTitle subtitle={`${filteredWaves?.length || 0} waves`}>
              Pick Waves
            </WMSCardTitle>
          }
          actions={
            <div className="relative w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          }
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="in_progress" className="flex-1">Actief</TabsTrigger>
              <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">Klaar</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {wavesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredWaves?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Geen waves gevonden</p>
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Wave
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredWaves?.map((wave, index) => {
                    const status = waveStatusConfig[wave.status] || waveStatusConfig.open;
                    const progress = wave.total_lines > 0
                      ? Math.round((wave.total_quantity / wave.total_lines) * 100)
                      : 0;

                    return (
                      <div
                        key={wave.id}
                        onClick={() => setSelectedWaveId(wave.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedWaveId === wave.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-mono font-medium">{wave.wave_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {wave.warehouse?.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={status.color} variant="outline">
                              <span className="mr-1">{status.icon}</span>
                              {status.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {wave.status === "open" && (
                                  <DropdownMenuItem onClick={() => handleUpdateWaveStatus(wave.id, "in_progress")}>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Start Wave
                                  </DropdownMenuItem>
                                )}
                                {wave.status === "in_progress" && (
                                  <DropdownMenuItem onClick={() => handleUpdateWaveStatus(wave.id, "completed")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Afronden
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground text-xs">Orders</p>
                            <p className="font-medium">{wave.total_orders}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Lines</p>
                            <p className="font-medium">{wave.total_lines}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Stuks</p>
                            <p className="font-medium">{wave.total_quantity}</p>
                          </div>
                        </div>

                        {wave.status === "in_progress" && (
                          <Progress value={progress} className="h-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </WMSGlassCard>

        {/* Pick Tasks for Selected Wave */}
        <WMSGlassCard
          header={
            <WMSCardTitle subtitle={selectedWaveId ? `${tasks?.length || 0} taken` : "Selecteer een wave"}>
              Pick Tasks
            </WMSCardTitle>
          }
        >
          {!selectedWaveId ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecteer een wave uit de lijst</p>
            </div>
          ) : tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Geen taken in deze wave</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {tasks?.map((task, index) => {
                const status = taskStatusConfig[task.status] || taskStatusConfig.pending;

                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {task.sequence_number || index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.product?.name || "Product"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="font-mono">{task.from_location?.code || "-"}</span>
                          <span>•</span>
                          <span>{task.quantity} {task.product?.unit_of_measure || "stuk"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color} variant="outline">
                        {status.label}
                      </Badge>
                      {task.status === "pending" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WMSGlassCard>
      </div>
    </DashboardLayout>
  );
}
