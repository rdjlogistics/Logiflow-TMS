import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RateContract, Zone, RateLane } from "@/hooks/useRateContractEngine";
import {
  Plus,
  Trash2,
  Edit,
  Loader2,
  MapPin,
  Route,
  Save,
  X,
} from "lucide-react";

interface ContractLanesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: RateContract | null;
  zones: Zone[];
}

export function ContractLanesDialog({
  open,
  onOpenChange,
  contract,
  zones,
}: ContractLanesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLane, setEditingLane] = useState<Partial<RateLane> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch lanes for this contract
  const { data: lanes = [], isLoading } = useQuery({
    queryKey: ["rate_lanes", contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const { data, error } = await supabase
        .from("rate_lanes")
        .select(`
          *,
          origin_zone:zones!rate_lanes_origin_zone_id_fkey(id, name),
          destination_zone:zones!rate_lanes_destination_zone_id_fkey(id, name)
        `)
        .eq("contract_id", contract.id)
        .order("priority");
      if (error) throw error;
      return data as RateLane[];
    },
    enabled: !!contract?.id && open,
  });

  // Create lane mutation
  const createLane = useMutation({
    mutationFn: async (lane: Partial<RateLane>) => {
      const insertData = {
        contract_id: contract!.id,
        origin_zone_id: lane.origin_zone_id || null,
        destination_zone_id: lane.destination_zone_id || null,
        service_level: lane.service_level || "standard",
        vehicle_type: lane.vehicle_type || null,
        base_price: lane.base_price || 0,
        base_included_km: lane.base_included_km || 0,
        min_charge: lane.min_charge || 0,
        price_per_km: lane.price_per_km || 0,
        price_per_stop: lane.price_per_stop || 0,
        time_window_fee: lane.time_window_fee || 0,
        weekend_fee: lane.weekend_fee || 0,
        night_fee: lane.night_fee || 0,
        rounding_rule: lane.rounding_rule || "none",
        grace_minutes_waiting: lane.grace_minutes_waiting || 15,
        waiting_tiers_json: lane.waiting_tiers_json || [],
        priority: lane.priority || 100,
        is_active: lane.is_active ?? true,
      };
      const { data, error } = await supabase
        .from("rate_lanes")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_lanes", contract?.id] });
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Tariefroute toegevoegd" });
      setShowAddForm(false);
      setEditingLane(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij toevoegen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lane mutation
  const updateLane = useMutation({
    mutationFn: async (lane: Partial<RateLane> & { id: string }) => {
      const { data, error } = await supabase
        .from("rate_lanes")
        .update({
          origin_zone_id: lane.origin_zone_id,
          destination_zone_id: lane.destination_zone_id,
          service_level: lane.service_level,
          vehicle_type: lane.vehicle_type,
          base_price: lane.base_price,
          min_charge: lane.min_charge,
          price_per_km: lane.price_per_km,
          price_per_stop: lane.price_per_stop,
          is_active: lane.is_active,
        })
        .eq("id", lane.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_lanes", contract?.id] });
      toast({ title: "Tariefroute bijgewerkt" });
      setEditingLane(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lane mutation
  const deleteLane = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_lanes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_lanes", contract?.id] });
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Tariefroute verwijderd" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddNew = () => {
    setEditingLane({
      origin_zone_id: "",
      destination_zone_id: "",
      service_level: "standard",
      base_price: 0,
      min_charge: 0,
      price_per_km: 0,
      price_per_stop: 0,
      is_active: true,
    });
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!editingLane) return;
    if (editingLane.id) {
      updateLane.mutate(editingLane as Partial<RateLane> & { id: string });
    } else {
      createLane.mutate(editingLane);
    }
  };

  const handleEdit = (lane: RateLane) => {
    setEditingLane({
      id: lane.id,
      origin_zone_id: lane.origin_zone_id || "",
      destination_zone_id: lane.destination_zone_id || "",
      service_level: lane.service_level || "standard",
      base_price: lane.base_price,
      min_charge: lane.min_charge,
      price_per_km: lane.price_per_km,
      price_per_stop: lane.price_per_stop,
      is_active: lane.is_active,
    });
    setShowAddForm(true);
  };

  const isSaving = createLane.isPending || updateLane.isPending;

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Tariefroutes - {contract.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : showAddForm && editingLane ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium">
                {editingLane.id ? "Route Bewerken" : "Nieuwe Route"}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Oorsprong Zone</Label>
                  <Select
                    value={editingLane.origin_zone_id || "any"}
                    onValueChange={(v) =>
                      setEditingLane({
                        ...editingLane,
                        origin_zone_id: v === "any" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alle zones</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bestemming Zone</Label>
                  <Select
                    value={editingLane.destination_zone_id || "any"}
                    onValueChange={(v) =>
                      setEditingLane({
                        ...editingLane,
                        destination_zone_id: v === "any" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alle zones</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Level</Label>
                  <Select
                    value={editingLane.service_level || "standard"}
                    onValueChange={(v) =>
                      setEditingLane({ ...editingLane, service_level: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="standard">Standaard</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="same_day">Same Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Actief</Label>
                  <div className="flex items-center h-10">
                    <Switch
                      checked={editingLane.is_active ?? true}
                      onCheckedChange={(v) =>
                        setEditingLane({ ...editingLane, is_active: v })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Basisprijs (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLane.base_price || 0}
                    onChange={(e) =>
                      setEditingLane({
                        ...editingLane,
                        base_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min. bedrag (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLane.min_charge || 0}
                    onChange={(e) =>
                      setEditingLane({
                        ...editingLane,
                        min_charge: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Per km (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLane.price_per_km || 0}
                    onChange={(e) =>
                      setEditingLane({
                        ...editingLane,
                        price_per_km: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Per stop (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLane.price_per_stop || 0}
                    onChange={(e) =>
                      setEditingLane({
                        ...editingLane,
                        price_per_stop: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingLane(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuleren
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Opslaan
                </Button>
              </div>
            </div>
          ) : lanes.length === 0 ? (
            <div className="text-center py-12">
              <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Geen tariefroutes gedefinieerd
              </h3>
              <p className="text-muted-foreground mb-4">
                Voeg routes toe om tarieven per zone-combinatie te bepalen.
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste Route Toevoegen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Route Toevoegen
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Van → Naar</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Basis</TableHead>
                    <TableHead className="text-right">Per km</TableHead>
                    <TableHead className="text-right">Per stop</TableHead>
                    <TableHead className="text-right">Min.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lanes.map((lane) => (
                    <TableRow key={lane.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span>{lane.origin_zone?.name || "Alle"}</span>
                          <span className="text-muted-foreground">→</span>
                          <MapPin className="h-3 w-3 text-primary/70" />
                          <span>{lane.destination_zone?.name || "Alle"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lane.service_level === "economy"
                            ? "Economy"
                            : lane.service_level === "express"
                            ? "Express"
                            : lane.service_level === "same_day"
                            ? "Same Day"
                            : "Standaard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{lane.base_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{lane.price_per_km.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{lane.price_per_stop.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{lane.min_charge.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={lane.is_active ? "default" : "secondary"}
                        >
                          {lane.is_active ? "Actief" : "Inactief"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(lane)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLane.mutate(lane.id)}
                            disabled={deleteLane.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
