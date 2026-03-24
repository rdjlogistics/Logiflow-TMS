import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import B2BDashboard from "@/components/portal/b2b/B2BDashboard";
import { BulkImportDialog } from "@/components/portal/b2b/BulkImportDialog";
import { usePortalData } from "@/components/portal/shared/usePortalData";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const B2BPortal = () => {
  const navigate = useNavigate();
  const { customer, customerId } = usePortalAuth();
  const { shipments, cases, invoices, stats, loading, refetch } = usePortalData(customerId);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Live notification count from open cases
  const unreadNotifications = cases.filter(c => c.status === 'open' || c.status === 'in_progress').length;

  const handleNotificationsClick = () => {
    toast.info("Notificaties", {
      description: `Je hebt ${unreadNotifications} nieuwe updates over je zendingen.`
    });
    navigate("/portal/b2b/cases");
  };

  return (
    <B2BLayout 
      companyName={customer?.companyName || "Mijn Bedrijf"} 
      unreadNotifications={unreadNotifications}
      onNotificationsClick={handleNotificationsClick}
      onRefresh={refetch}
    >
      <B2BDashboard
        stats={stats}
        recentShipments={shipments}
        onNewShipment={() => navigate("/portal/b2b/book")}
        onImport={() => setImportDialogOpen(true)}
        companyName={customer?.companyName}
        openCasesCount={unreadNotifications}
        loading={loading}
        invoices={invoices}
      />
      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={refetch}
      />
    </B2BLayout>
  );
};

export default B2BPortal;
