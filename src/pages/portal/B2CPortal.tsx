import { useState } from "react";
import { toast } from "sonner";
import B2CLayout from "@/components/portal/b2c/B2CLayout";
import B2CShipmentsList from "@/components/portal/b2c/B2CShipmentsList";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const B2CPortal = () => {
  const { customer, customerId } = usePortalAuth();
  const { shipments, loading, refetch } = usePortalData(customerId);
  const [unreadNotifications] = useState(2);

  const handleNotificationsClick = () => {
    toast.info("Notificaties", {
      description: unreadNotifications > 0 
        ? `Je hebt ${unreadNotifications} nieuwe notificaties over je zendingen.`
        : "Geen nieuwe notificaties."
    });
  };

  return (
    <B2CLayout 
      userName={customer?.contactName || "Klant"} 
      unreadNotifications={unreadNotifications}
      onNotificationsClick={handleNotificationsClick}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Mijn Zendingen</h1>
          <p className="text-sm text-muted-foreground">Volg je pakketten in realtime</p>
        </div>
        
        <B2CShipmentsList shipments={shipments} loading={loading} />
      </div>
    </B2CLayout>
  );
};

export default B2CPortal;
