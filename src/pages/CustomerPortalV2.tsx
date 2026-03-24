import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerPortal } from "@/hooks/useCustomerPortal";
import { useCustomerContracts, type CustomerContract } from "@/hooks/useCustomerContracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle, LogOut } from "lucide-react";

// Imperial Components
import { ImperialLayout } from "@/components/customer-portal/ImperialLayout";
import { ImperialDashboard } from "@/components/customer-portal/ImperialDashboard";
import { ImperialShipmentsList } from "@/components/customer-portal/ImperialShipmentsList";
import { ImperialBookingWizard } from "@/components/customer-portal/ImperialBookingWizard";
import { NotificationsPanel } from "@/components/customer-portal/NotificationsPanel";
import { CustomerContractsList } from "@/components/customer/CustomerContractsList";
import { CustomerContractSigningDialog } from "@/components/customer/CustomerContractSigningDialog";

// Import portal theme
import "@/styles/portal-theme.css";

const CustomerPortalV2 = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const {
    customer,
    settings,
    shipments,
    submissions,
    notifications,
    templates,
    savedAddresses,
    products,
    stats,
    loading,
    authLoading,
    error,
    refetch,
    markNotificationRead,
    markAllNotificationsRead,
    logAuditEvent,
    completeOnboarding,
  } = useCustomerPortal();

  // Contracts
  const {
    contracts,
    isLoading: contractsLoading,
    refetch: refetchContracts,
    signContract,
    isSigning,
    declineContract,
    isDeclining,
    logViewEvent,
    stats: contractStats,
  } = useCustomerContracts(customer?.id || null);

  // UI State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<CustomerContract | null>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleViewShipment = useCallback((id: string) => {
    logAuditEvent('shipment', id, 'VIEW');
  }, [logAuditEvent]);

  const handleTrackShipment = useCallback((trackingToken: string) => {
    window.open(`/track/${trackingToken}`, '_blank');
  }, []);

  const handleBookingSuccess = useCallback(() => {
    refetch();
    setActiveTab("shipments");
  }, [refetch]);

  const handleNotificationClick = useCallback((notification: { entity_type?: string | null; entity_id?: string | null }) => {
    setNotificationsOpen(false);
    if (notification.entity_type === 'shipment' && notification.entity_id) {
      handleViewShipment(notification.entity_id);
    } else if (notification.entity_type === 'contract') {
      setActiveTab("account");
    }
  }, [handleViewShipment]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center imperial-bg">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[hsl(var(--portal-gold))]/20 blur-xl rounded-full" />
            <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--portal-gold))] mx-auto mb-4 relative z-10" />
          </div>
          <p className="text-gray-300 font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center imperial-bg p-4">
        <Card className="max-w-md w-full portal-glass border-[hsl(var(--portal-gold))]/30">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white">Geen toegang</CardTitle>
            <CardDescription className="text-gray-400">
              {error || "Uw account is nog niet gekoppeld aan een klantprofiel. Neem contact op met uw charter."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signOut()} variant="outline" className="w-full border-[hsl(var(--portal-gold))]/50 text-[hsl(var(--portal-gold))] hover:bg-[hsl(var(--portal-gold))]/10">
              <LogOut className="mr-2 h-4 w-4" />
              Uitloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Map shipments to Imperial format
  const imperialShipments = shipments.map(s => ({
    id: s.id,
    status: s.status,
    pickup_city: s.pickup_city || null,
    delivery_city: s.delivery_city || null,
    trip_date: s.trip_date,
    order_number: s.order_number || null,
    tracking_token: s.tracking_token || null,
    reference: s.order_number || s.id.slice(0, 8),
    carrier: 'LogiFlow'
  }));

  // Map stats to Imperial format
  const imperialStats = {
    activeShipments: stats.activeShipments,
    pendingSubmissions: stats.pendingSubmissions,
    deliveredThisMonth: stats.totalShipments - stats.activeShipments,
    problemShipments: 0,
    onTimePercentage: 96,
    totalSavings: 1250
  };

  return (
    <>
      <ImperialLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        companyName={customer.company_name}
        customerId={customer.id}
        unreadNotifications={stats.unreadNotifications}
        onNotificationsClick={() => setNotificationsOpen(true)}
      >
        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <ImperialDashboard
            stats={imperialStats}
            activeShipments={imperialShipments.slice(0, 5)}
            onNewBooking={() => setActiveTab("book")}
            onViewShipments={() => setActiveTab("shipments")}
            onViewShipment={handleViewShipment}
            onImportCSV={() => setActiveTab("book")}
          />
        )}

        {/* Shipments List */}
        {activeTab === "shipments" && (
          <ImperialShipmentsList
            shipments={imperialShipments}
            loading={false}
            onViewShipment={handleViewShipment}
            onTrackShipment={handleTrackShipment}
          />
        )}

        {/* Booking Wizard */}
        {activeTab === "book" && (
          <ImperialBookingWizard
            customerId={customer.id}
            tenantId={customer.tenant_id}
            products={products}
            savedAddresses={savedAddresses}
            templates={templates}
            onSuccess={handleBookingSuccess}
          />
        )}

        {/* Account */}
        {activeTab === "account" && (
          <div className="space-y-6 p-4 pb-24">
            <div className="portal-glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Account</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--portal-gold))]/10">
                  <span className="text-gray-400">Bedrijf</span>
                  <span className="text-white font-medium">{customer.company_name}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--portal-gold))]/10">
                  <span className="text-gray-400">E-mail</span>
                  <span className="text-white font-medium">{customer.email}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--portal-gold))]/10">
                  <span className="text-gray-400">Telefoon</span>
                  <span className="text-white font-medium">{customer.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Contracts Section */}
            <div className="portal-glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contracten & Documenten</h3>
              <CustomerContractsList
                contracts={contracts}
                isLoading={contractsLoading}
                onRefresh={refetchContracts}
                onContractClick={(contract) => {
                  setSelectedContract(contract);
                  setShowContractDialog(true);
                }}
                stats={contractStats}
              />
            </div>

            {/* Logout */}
            <Button 
              onClick={() => signOut()} 
              variant="outline" 
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Uitloggen
            </Button>
          </div>
        )}
      </ImperialLayout>

      {/* Notifications Panel */}
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* Contract Signing Dialog */}
      <CustomerContractSigningDialog
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        contract={selectedContract}
        onSign={signContract}
        onDecline={declineContract}
        onView={logViewEvent}
        isSigning={isSigning}
        isDeclining={isDeclining}
      />
    </>
  );
};

export default CustomerPortalV2;
