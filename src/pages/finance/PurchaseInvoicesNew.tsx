import DashboardLayout from "@/components/layout/DashboardLayout";
import { BatchPurchaseInvoiceWizard } from "@/components/purchase-invoices/BatchPurchaseInvoiceWizard";

const PurchaseInvoicesNew = () => {
  return (
    <DashboardLayout title="Nieuwe Inkoopfactuur">
      <BatchPurchaseInvoiceWizard />
    </DashboardLayout>
  );
};

export default PurchaseInvoicesNew;
