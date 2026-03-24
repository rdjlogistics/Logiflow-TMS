import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Repeat,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Warehouse,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWarehouseTransfers, useCreateWarehouseTransfer, useWarehouses } from "@/hooks/useWMS";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { motion } from "framer-motion";
import { WMSGlassCard, WMSCardTitle, WMSStatCard } from "@/components/wms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Concept", color: "bg-muted text-foreground", icon: <Clock className="h-3 w-3" /> },
  pending: { label: "Wachtend", color: "bg-amber-500/15 text-amber-600", icon: <Clock className="h-3 w-3" /> },
  in_transit: { label: "Onderweg", color: "bg-blue-500/15 text-blue-600", icon: <Truck className="h-3 w-3" /> },
  received: { label: "Ontvangen", color: "bg-emerald-500/15 text-emerald-600", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/15 text-red-600", icon: <Clock className="h-3 w-3" /> },
};

export default function WMSTransfers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({ from_warehouse_id: "", to_warehouse_id: "", notes: "" });

  const { data: transfers, isLoading } = useWarehouseTransfers(activeTab !== "all" ? activeTab : undefined);
  const { data: warehouses } = useWarehouses();
  const createTransfer = useCreateWarehouseTransfer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredTransfers = transfers?.filter((t) =>
    t.transfer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.from_warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.to_warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTransfer = () => {
    if (!newTransfer.from_warehouse_id || !newTransfer.to_warehouse_id) {
      toast({ title: "Selecteer beide magazijnen", variant: "destructive" });
      return;
    }
    createTransfer.mutate(newTransfer as any, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewTransfer({ from_warehouse_id: "", to_warehouse_id: "", notes: "" });
      },
    });
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "in_transit") updates.shipped_date = new Date().toISOString();
      if (status === "received") updates.received_date = new Date().toISOString();
      
      const { error } = await supabase.from("warehouse_transfers").update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: `Transfer ${statusConfig[status]?.label}` });
      queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const counts = {
    draft: transfers?.filter((t) => t.status === "draft").length || 0,
    pending: transfers?.filter((t) => t.status === "pending").length || 0,
    in_transit: transfers?.filter((t) => t.status === "in_transit").length || 0,
    received: transfers?.filter((t) => t.status === "received").length || 0,
  };

  return (
    <DashboardLayout title="Inter-Warehouse Transfers">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <p className="text-muted-foreground">Beheer voorraadtransfers tussen magazijnen</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nieuwe Transfer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuwe Transfer</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Van Magazijn *</Label>
                <Select value={newTransfer.from_warehouse_id} onValueChange={(v) => setNewTransfer({ ...newTransfer, from_warehouse_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                  <SelectContent>{warehouses?.map((wh) => <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Naar Magazijn *</Label>
                <Select value={newTransfer.to_warehouse_id} onValueChange={(v) => setNewTransfer({ ...newTransfer, to_warehouse_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                  <SelectContent>{warehouses?.filter(w => w.id !== newTransfer.from_warehouse_id).map((wh) => <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Input value={newTransfer.notes} onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })} placeholder="Extra info..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleCreateTransfer} disabled={createTransfer.isPending}>{createTransfer.isPending ? "Bezig..." : "Aanmaken"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <WMSStatCard title="Concept" value={counts.draft} icon={<Clock className="h-full w-full" />} variant="default" />
        <WMSStatCard title="Wachtend" value={counts.pending} icon={<Clock className="h-full w-full" />} variant="warning" />
        <WMSStatCard title="Onderweg" value={counts.in_transit} icon={<Truck className="h-full w-full" />} variant="primary" />
        <WMSStatCard title="Ontvangen" value={counts.received} icon={<CheckCircle2 className="h-full w-full" />} variant="success" />
      </div>

      <WMSGlassCard header={<WMSCardTitle subtitle={`${filteredTransfers?.length || 0} transfers`}>Transfers</WMSCardTitle>} actions={
        <div className="relative w-[300px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Zoeken..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-base" /></div>
      } noPadding>
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4"><TabsTrigger value="pending">Wachtend</TabsTrigger><TabsTrigger value="in_transit">Onderweg</TabsTrigger><TabsTrigger value="received">Ontvangen</TabsTrigger><TabsTrigger value="all">Alle</TabsTrigger></TabsList>
            <TabsContent value={activeTab}>
              {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div> : filteredTransfers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Geen transfers gevonden</p></div>
              ) : (
                <div className="space-y-3">{filteredTransfers?.map((transfer, i) => {
                  const status = statusConfig[transfer.status] || statusConfig.draft;
                  return (
                    <motion.div key={transfer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div><p className="font-mono font-medium">{transfer.transfer_number}</p>{transfer.shipped_date && <p className="text-xs text-muted-foreground">Verzonden: {format(new Date(transfer.shipped_date), "dd MMM yyyy", { locale: nl })}</p>}</div>
                        <div className="flex items-center gap-2">
                          <Badge className={status.color} variant="outline"><span className="mr-1">{status.icon}</span>{status.label}</Badge>
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {transfer.status === "pending" && <DropdownMenuItem onClick={() => handleUpdateStatus(transfer.id, "in_transit")}><Truck className="h-4 w-4 mr-2" />Verzenden</DropdownMenuItem>}
                              {transfer.status === "in_transit" && <DropdownMenuItem onClick={() => handleUpdateStatus(transfer.id, "received")}><CheckCircle2 className="h-4 w-4 mr-2" />Ontvangen</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1"><div className="p-2 rounded-lg bg-muted"><Warehouse className="h-4 w-4" /></div><div><p className="font-medium text-sm">{transfer.from_warehouse?.name}</p><p className="text-xs text-muted-foreground">Van</p></div></div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <div className="flex items-center gap-2 flex-1"><div className="p-2 rounded-lg bg-primary/10"><Warehouse className="h-4 w-4 text-primary" /></div><div><p className="font-medium text-sm">{transfer.to_warehouse?.name}</p><p className="text-xs text-muted-foreground">Naar</p></div></div>
                      </div>
                    </motion.div>
                  );
                })}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </WMSGlassCard>
    </DashboardLayout>
  );
}
