import { useRef } from "react";
import B2CLayout from "@/components/portal/b2c/B2CLayout";
import B2CShipmentsList from "@/components/portal/b2c/B2CShipmentsList";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const B2CPortal = () => {
  const { customer, customerId } = usePortalAuth();
  const { shipments, loading, refetch } = usePortalData(customerId);
  const shipmentsRef = useRef<HTMLDivElement>(null);

  // Real notification count based on recent shipment activity (in transit or pending)
  const unreadNotifications = shipments.filter(
    (s: any) => s.status === 'onderweg' || s.status === 'geladen' || s.status === 'gepland'
  ).length;

  const handleNotificationsClick = () => {
    // Scroll to the shipments list to show active shipments
    shipmentsRef.current?.scrollIntoView({ behavior: 'smooth' });
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
