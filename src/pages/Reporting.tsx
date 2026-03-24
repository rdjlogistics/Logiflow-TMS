import DashboardLayout from "@/components/layout/DashboardLayout";
import { ReportingDashboard } from "@/components/reporting/ReportingDashboard";

const Reporting = () => {
  return (
    <DashboardLayout title="Rapportage & Analytics">
      <ReportingDashboard />
    </DashboardLayout>
  );
};

export default Reporting;
