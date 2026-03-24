import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { notifyCustomerStatusChange } from "@/lib/customerNotifications";

interface Driver {
  id: string;
  name: string;
}

interface QuickAssignDriverButtonProps {
  tripId: string;
  orderNumber: string | null;
  currentStatus?: string;
  customerId?: string | null;
  drivers: Driver[];
  onAssigned?: () => void;
  size?: "sm" | "xs";
}

export function QuickAssignDriverButton({
  tripId,
  orderNumber,
  currentStatus,
  customerId,
  drivers,
  onAssigned,
  size = "sm",
}: QuickAssignDriverButtonProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAssign = async (driverId: string, driverName: string) => {
    setIsAssigning(true);
    try {
      // Auto-transition aanvraag/draft → gepland when assigning driver
      const updates: Record<string, any> = { driver_id: driverId };
      if (currentStatus === 'aanvraag' || currentStatus === 'draft') {
        updates.status = 'gepland';
      }
      const { error } = await supabase
        .from("trips")
        .update(updates as any)
        .eq("id", tripId);
      if (error) throw error;

      // Log audit event and send notifications for auto status transition
      if (currentStatus === 'aanvraag' || currentStatus === 'draft') {
        // B2B push notification
        notifyCustomerStatusChange(customerId, tripId, 'gepland', orderNumber);

        try {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          await supabase.from('order_events').insert({
            order_id: tripId,
            event_type: 'STATUS_UPDATED',
            actor_user_id: userId,
            payload: { old_value: currentStatus, new_value: 'gepland', source: 'driver_assigned_auto', driver_id: driverId },
          });
        } catch { /* non-blocking */ }
      }

      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      onAssigned?.();
      toast({
         title: "Eigen chauffeur toegewezen",
         description: `${driverName} is toegewezen aan order ${orderNumber || tripId.slice(0, 8)}.`,
      });
    } catch {
      toast({
        title: "Fout",
        description: "Kon eigen chauffeur niet toewijzen.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          className={
            size === "xs"
              ? "h-6 px-2 text-[10px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              : "h-7 px-2.5 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
          }
          disabled={isAssigning}
        >
          {isAssigning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
          Wijs toe
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[250px] overflow-y-auto w-[200px]"
        onClick={(e) => e.stopPropagation()}
      >
        {drivers.length === 0 ? (
          <DropdownMenuItem disabled>Geen eigen chauffeurs beschikbaar</DropdownMenuItem>
        ) : (
          drivers.map((driver) => (
            <DropdownMenuItem
              key={driver.id}
              onClick={() => handleAssign(driver.id, driver.name)}
            >
              {driver.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
