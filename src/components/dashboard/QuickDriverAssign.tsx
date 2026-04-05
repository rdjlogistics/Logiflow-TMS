import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  MapPin, 
  Search,
  Star,
  Check,
  X,
  Truck,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  rating: number | null;
  on_time_percentage: number | null;
  current_city: string | null;
  status: string;
}

interface QuickDriverAssignProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  tripInfo?: {
    orderNumber?: string;
    pickupCity?: string;
    deliveryCity?: string;
  };
  onSuccess?: () => void;
}

export const QuickDriverAssign = ({ 
  open, 
  onOpenChange, 
  tripId, 
  tripInfo,
  onSuccess 
}: QuickDriverAssignProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchDrivers, setSearchDrivers] = useState("");

  // Fetch available drivers
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["available-drivers-quick"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, phone, rating, on_time_percentage, current_city, status")
        .eq("status", "active")
        .order("rating", { ascending: false });
      
      if (error) throw error;
      return data as Driver[];
    },
    enabled: open
  });

  // Assign driver mutation
  const assignMutation = useMutation({
    mutationFn: async (driverId: string) => {
      if (!tripId) throw new Error("No trip selected");
      
      const { error } = await supabase
        .from("trips")
        .update({ driver_id: driverId, status: "gepland" })
        .eq("id", tripId);
      
      if (error) throw error;
    },
    onSuccess: async (_data, driverId) => {
      queryClient.invalidateQueries({ queryKey: ["unassigned-trips"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["action-queue"] });
      toast({
        title: "✓ Chauffeur toegewezen",
        description: `Rit ${tripInfo?.orderNumber || ""} is succesvol toegewezen.`,
      });

      // Send push notification to driver
      try {
        const { data: pushData } = await supabase.functions.invoke('send-push-notification', {
          body: {
            driver_id: driverId,
            title: '🚚 Nieuwe rit toegewezen!',
            body: `${tripInfo?.pickupCity || "–"} → ${tripInfo?.deliveryCity || "–"}`,
            notification_type: 'trip_assigned',
            data: { trip_id: tripId },
          },
        });
        if (pushData?.fallback_channel) {
          toast({
            title: `📱 Notificatie via ${pushData.fallback_channel === "whatsapp" ? "WhatsApp" : "SMS"}`,
            description: pushData.message || "Push niet beschikbaar, fallback gebruikt.",
            variant: "default",
            className: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-700",
          });
        } else if (pushData?.success === false) {
          toast({
            title: "⚠️ Notificatie niet verzonden",
            description: pushData.message || "Chauffeur heeft geen push notificaties of telefoonnummer.",
            variant: "default",
            className: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700",
          });
        }
      } catch (err) {
        console.error('Push notification failed:', err);
      }

      onOpenChange(false);
      setSearchDrivers("");
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon chauffeur niet toewijzen.",
        variant: "destructive",
      });
    }
  });

  const filteredDrivers = useMemo(() => 
    drivers.filter(d => 
      d.name?.toLowerCase().includes(searchDrivers.toLowerCase()) ||
      d.current_city?.toLowerCase().includes(searchDrivers.toLowerCase())
    ), [drivers, searchDrivers]
  );

  const handleAssign = (driverId: string) => {
    assignMutation.mutate(driverId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <span>Chauffeur Toewijzen</span>
              {tripInfo?.orderNumber && (
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  #{tripInfo.orderNumber} • {tripInfo.pickupCity || "–"} → {tripInfo.deliveryCity || "–"}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek chauffeur..."
              value={searchDrivers}
              onChange={(e) => setSearchDrivers(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-4 pt-2 space-y-2">
            {driversLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Geen beschikbare chauffeurs</p>
              </div>
            ) : (
              
                {filteredDrivers.map((driver, index) => (
                  <button key={driver.id} onClick={() => handleAssign(driver.id)}
                    disabled={assignMutation.isPending}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all",
                      "bg-card border border-border/50",
                      "hover:border-success/50 hover:bg-success/5 hover:shadow-lg hover:shadow-success/5",
                      "active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "group"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{driver.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {driver.current_city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {driver.current_city}
                            </span>
                          )}
                          {driver.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {driver.rating.toFixed(1)}
                            </span>
                          )}
                          {driver.on_time_percentage && (
                            <span className="text-success font-medium">
                              {driver.on_time_percentage}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        "bg-muted group-hover:bg-success group-hover:text-white"
                      )}>
                        {assignMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default QuickDriverAssign;
