import { Suspense, ReactNode } from "react";
import { Loader2, Truck } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders";
import { GlobalUXProvider } from "@/components/providers/GlobalUXProvider";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy load heavy components that aren't needed for initial render
const LazyCopilotProvider = lazyWithRetry(() => import("@/components/copilot/CopilotProvider").then(m => ({ default: m.CopilotProvider })));
const CommandPalette = lazyWithRetry(() => import("@/components/command-palette/CommandPalette").then(m => ({ default: m.CommandPalette })));
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { NotificationProvider } from "@/components/notifications/NotificationCenter";
import { LegalConsentBanner } from "@/components/legal/LegalConsentBanner";

// Auth page - lazy loaded
const Auth = lazyWithRetry(() => import("./pages/Auth"));
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Lazy load ALL pages
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Customers = lazyWithRetry(() => import("./pages/Customers"));
const OrderForm = lazyWithRetry(() => import("./pages/OrderForm"));
const OrderOverview = lazyWithRetry(() => import("./pages/OrderOverview"));
const Invoices = lazyWithRetry(() => import("./pages/Invoices"));
const InvoiceDetail = lazyWithRetry(() => import("./pages/InvoiceDetail"));
const InvoicesNew = lazyWithRetry(() => import("./pages/InvoicesNew"));
const InvoiceSend = lazyWithRetry(() => import("./pages/InvoiceSend"));
const GPSTracking = lazyWithRetry(() => import("./pages/GPSTracking"));
const InternalTrackTrace = lazyWithRetry(() => import("./pages/InternalTrackTrace"));
const CustomerTrackTrace = lazyWithRetry(() => import("./pages/CustomerTrackTrace"));
const Messenger = lazyWithRetry(() => import("./pages/Messenger"));
const DriverPortal = lazyWithRetry(() => import("./pages/DriverPortal"));
const DriverOnboarding = lazyWithRetry(() => import("./pages/DriverOnboarding"));
const Products = lazyWithRetry(() => import("./pages/Products"));
const Carriers = lazyWithRetry(() => import("./pages/Carriers"));
const CarrierDetail = lazyWithRetry(() => import("./pages/CarrierDetail"));
const AddressBook = lazyWithRetry(() => import("./pages/AddressBook"));
const ChatGPT = lazyWithRetry(() => import("./pages/ChatGPT"));
const AdminSettings = lazyWithRetry(() => import("./pages/AdminSettings"));
const ContractManagement = lazyWithRetry(() => import("./pages/ContractManagement"));
const PlanningProgram = lazyWithRetry(() => import("./pages/PlanningProgram"));
const PlanningApplications = lazyWithRetry(() => import("./pages/PlanningApplications"));
const PlanningAvailability = lazyWithRetry(() => import("./pages/PlanningAvailability"));
const DriverAvailableShifts = lazyWithRetry(() => import("./pages/DriverAvailableShifts"));
const DriverAssignment = lazyWithRetry(() => import("./pages/DriverAssignment"));
const DriverLogin = lazyWithRetry(() => import("./pages/DriverLogin"));
const DriverResetPassword = lazyWithRetry(() => import("./pages/DriverResetPassword"));
const Network = lazyWithRetry(() => import("./pages/Network"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Finance
const CashflowCockpit = lazyWithRetry(() => import("./pages/finance/CashflowCockpit"));
const FuelCards = lazyWithRetry(() => import("./pages/finance/FuelCards"));
const Receivables = lazyWithRetry(() => import("./pages/finance/Receivables"));
const PurchaseInvoices = lazyWithRetry(() => import("./pages/finance/PurchaseInvoices"));
const PurchaseInvoicesNew = lazyWithRetry(() => import("./pages/finance/PurchaseInvoicesNew"));
const PurchaseInvoiceDetail = lazyWithRetry(() => import("./pages/finance/PurchaseInvoiceDetail"));
const PurchaseInvoiceSendPage = lazyWithRetry(() => import("./pages/finance/PurchaseInvoiceSendPage"));
const Costs = lazyWithRetry(() => import("./pages/finance/Costs"));
const BankPayments = lazyWithRetry(() => import("./pages/finance/BankReconciliation"));
const DieselModule = lazyWithRetry(() => import("./pages/finance/DieselModule"));
const CreditNotes = lazyWithRetry(() => import("./pages/finance/CreditNotes"));
const Reporting = lazyWithRetry(() => import("./pages/Reporting"));

// Charter (tendering)
const Procurement = lazyWithRetry(() => import("./pages/Procurement"));
const CarrierPools = lazyWithRetry(() => import("./pages/tendering/CarrierPools"));
const CarrierScorecards = lazyWithRetry(() => import("./pages/tendering/CarrierScorecards"));

// Enterprise
const ReconciliationQueue = lazyWithRetry(() => import("./pages/enterprise/ReconciliationQueue"));
const SystemHealth = lazyWithRetry(() => import("./pages/enterprise/SystemHealth"));
const SecurityCenter = lazyWithRetry(() => import("./pages/enterprise/SecurityCenter"));
const AIRecommendations = lazyWithRetry(() => import("./pages/enterprise/AIRecommendations"));
const HoldsInbox = lazyWithRetry(() => import("./pages/enterprise/HoldsInbox"));
const AuditQueue = lazyWithRetry(() => import("./pages/enterprise/AuditQueue"));
const Disputes = lazyWithRetry(() => import("./pages/enterprise/Disputes"));
const ExceptionsInbox = lazyWithRetry(() => import("./pages/enterprise/ExceptionsInbox"));
const AlertsEscalations = lazyWithRetry(() => import("./pages/enterprise/AlertsEscalations"));
const Rosters = lazyWithRetry(() => import("./pages/enterprise/Rosters"));

// Compliance
const DriverDocs = lazyWithRetry(() => import("./pages/compliance/DriverDocs"));
const VehicleDocs = lazyWithRetry(() => import("./pages/compliance/VehicleDocs"));
const ExpiryAlerts = lazyWithRetry(() => import("./pages/compliance/ExpiryAlerts"));

// Pricing & Claims
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));
const CheckoutSuccess = lazyWithRetry(() => import("./pages/CheckoutSuccess"));
const OnboardingWizard = lazyWithRetry(() => import("./pages/OnboardingWizard"));
const RateContracts = lazyWithRetry(() => import("./pages/pricing/RateContracts"));
const DynamicPricing = lazyWithRetry(() => import("./pages/pricing/DynamicPricing"));
const ClaimsInbox = lazyWithRetry(() => import("./pages/claims/ClaimsInbox"));
const QuotesDashboard = lazyWithRetry(() => import("./pages/sales/QuotesDashboard"));

// Migration & Admin
const MigrationHub = lazyWithRetry(() => import("./pages/migration/MigrationHub"));
const DocumentTemplates = lazyWithRetry(() => import("./pages/admin/DocumentTemplates"));
const HelpCenter = lazyWithRetry(() => import("./pages/admin/HelpCenter"));
const AIUsage = lazyWithRetry(() => import("./pages/admin/AIUsage"));
const WorkflowAutomation = lazyWithRetry(() => import("./pages/admin/WorkflowAutomation"));
const MultiLocation = lazyWithRetry(() => import("./pages/admin/MultiLocation"));
const APIAccess = lazyWithRetry(() => import("./pages/admin/APIAccess"));

// AI
const AutoDispatch = lazyWithRetry(() => import("./pages/ai/AutoDispatch"));
const AnomalyDetection = lazyWithRetry(() => import("./pages/ai/AnomalyDetection"));
const SmartOCR = lazyWithRetry(() => import("./pages/ai/SmartOCR"));

// Operations & Maintenance
const DigitalPOD = lazyWithRetry(() => import("./pages/operations/DigitalPOD"));
const PredictiveMaintenance = lazyWithRetry(() => import("./pages/maintenance/PredictiveMaintenance"));

// Integrations
const EDIIntegration = lazyWithRetry(() => import("./pages/integrations/EDIIntegration"));
const AccountingIntegration = lazyWithRetry(() => import("./pages/integrations/AccountingIntegration"));
const EcommerceHub = lazyWithRetry(() => import("./pages/integrations/EcommerceHub"));

// Portal Guard
const PortalGuard = lazyWithRetry(() => import("@/components/portal/shared/PortalGuard"));
// Portals
const PortalLogin = lazyWithRetry(() => import("./pages/portal/PortalLogin"));
const B2BPortal = lazyWithRetry(() => import("./pages/portal/B2BPortal"));
const B2BShipments = lazyWithRetry(() => import("./pages/portal/B2BShipments"));
const B2BBook = lazyWithRetry(() => import("./pages/portal/B2BBook"));
const B2BLabels = lazyWithRetry(() => import("./pages/portal/B2BLabels"));
const B2BInvoices = lazyWithRetry(() => import("./pages/portal/B2BInvoices"));
const B2BCases = lazyWithRetry(() => import("./pages/portal/B2BCases"));
const B2BSettings = lazyWithRetry(() => import("./pages/portal/B2BSettings"));
const B2BDeliveries = lazyWithRetry(() => import("./pages/portal/B2BDeliveries"));
const B2BShipmentDetail = lazyWithRetry(() => import("./pages/portal/B2BShipmentDetail"));
const B2BAddressBook = lazyWithRetry(() => import("./pages/portal/B2BAddressBook"));
const B2BRecurringOrders = lazyWithRetry(() => import("./pages/portal/B2BRecurringOrders"));
const B2BOnboarding = lazyWithRetry(() => import("./pages/portal/B2BOnboarding"));
const B2CPortal = lazyWithRetry(() => import("./pages/portal/B2CPortal"));
const B2CBook = lazyWithRetry(() => import("./pages/portal/B2CBook"));
const B2CHelp = lazyWithRetry(() => import("./pages/portal/B2CHelp"));
const B2CAccount = lazyWithRetry(() => import("./pages/portal/B2CAccount"));
const B2CTrack = lazyWithRetry(() => import("./pages/portal/B2CTrack"));

// WMS
const WMSDashboard = lazyWithRetry(() => import("./pages/wms/WMSDashboard"));
const WMSInventory = lazyWithRetry(() => import("./pages/wms/WMSInventory"));
const WMSInbound = lazyWithRetry(() => import("./pages/wms/WMSInbound"));
const WMSOutbound = lazyWithRetry(() => import("./pages/wms/WMSOutbound"));
const WMSPicking = lazyWithRetry(() => import("./pages/wms/WMSPicking"));
const WMSTransfers = lazyWithRetry(() => import("./pages/wms/WMSTransfers"));
const WMSWarehouses = lazyWithRetry(() => import("./pages/wms/WMSWarehouses"));
const WMSProducts = lazyWithRetry(() => import("./pages/wms/WMSProducts"));

// Fuel Stations
const FuelStations = lazyWithRetry(() => import("./pages/FuelStations"));

// Carrier Portal
const CarrierPaymentPortal = lazyWithRetry(() => import("./pages/carrier/CarrierPaymentPortal"));
const CarrierPortal = lazyWithRetry(() => import("./pages/carrier/CarrierPortal"));

// Essential Modules
const FleetManagement = lazyWithRetry(() => import("./pages/FleetManagement"));
const RateManagement = lazyWithRetry(() => import("./pages/RateManagement"));
const CO2Reporting = lazyWithRetry(() => import("./pages/CO2Reporting"));
const KPIDashboard = lazyWithRetry(() => import("./pages/KPIDashboard"));

// Legal Pages
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/legal/TermsOfService"));
const RouteOptimization = lazyWithRetry(() => import("./pages/RouteOptimization"));
const EmailInbox = lazyWithRetry(() => import("./pages/EmailInbox"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchInterval: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});

// Loading fallback component
const PageLoader = () => <PageLoadingSkeleton />;

// Auth-specific loader
const AuthLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400/80 border-r-blue-400/25 animate-spin" style={{ animationDuration: '1.1s' }} />
        <div className="w-12 h-12 rounded-[14px] bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] flex items-center justify-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_24px_-6px_rgba(59,130,246,0.2)]">
          <Truck className="h-[22px] w-[22px] text-blue-400" strokeWidth={1.5} />
        </div>
      </div>
      <h1 className="text-lg font-semibold tracking-tight mb-1.5" style={{ color: '#e2e8f0' }}>LogiFlow TMS</h1>
      <p className="text-[13px]" style={{ color: '#64748b' }}>Bezig met laden…</p>
    </div>
  </div>
);

// Helper: wrap element in ProtectedRoute
const PR = ({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) => (
  <ProtectedRoute redirectTo={redirectTo}>{children}</ProtectedRoute>
);

const AdminPR = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
);

const StaffPR = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedRoles={["admin", "medewerker"]}>{children}</ProtectedRoute>
);

const DriverPR = ({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) => (
  <ProtectedRoute allowedRoles={["chauffeur", "admin"]} redirectTo={redirectTo}>{children}</ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" storageKey="nextgen-tms-theme">
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Auth routes — OUTSIDE CopilotProvider */}
                  <Route path="/auth" element={<Suspense fallback={<AuthLoader />}><Auth /></Suspense>} />
                  <Route path="/login" element={<Suspense fallback={<AuthLoader />}><Auth /></Suspense>} />
                  
                  {/* Everything else */}
                  <Route path="*" element={
                    <Suspense fallback={<AuthLoader />}>
                      <LazyCopilotProvider>
                        <GlobalUXProvider>
                          <Suspense fallback={null}>
                            <CommandPalette />
                          </Suspense>
                          <main role="main">
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                          <Route path="/pricing" element={<PricingPage />} />
                          <Route path="/checkout/success" element={<CheckoutSuccess />} />
                          <Route path="/onboarding" element={<PR><OnboardingWizard /></PR>} />
                          
                          {/* Public */}
                          <Route path="/carrier-portal/:token" element={<CarrierPaymentPortal />} />
                          <Route path="/track" element={<CustomerTrackTrace />} />
                          <Route path="/track/:token" element={<CustomerTrackTrace />} />
                          
                          {/* Core */}
                          <Route path="/" element={<PR><Dashboard /></PR>} />
                          <Route path="/customers" element={<PR><Customers /></PR>} />
                          <Route path="/orders" element={<PR><OrderOverview /></PR>} />
                          <Route path="/orders/edit/:orderId" element={<PR><OrderForm /></PR>} />
                          <Route path="/orders/edit" element={<PR><OrderForm /></PR>} />
                          <Route path="/invoices" element={<StaffPR><Invoices /></StaffPR>} />
                          <Route path="/invoices/:id" element={<StaffPR><InvoiceDetail /></StaffPR>} />
                          <Route path="/invoices/new" element={<StaffPR><InvoicesNew /></StaffPR>} />
                          <Route path="/invoices/:id/send" element={<StaffPR><InvoiceSend /></StaffPR>} />
                          <Route path="/purchase-invoices" element={<StaffPR><PurchaseInvoices /></StaffPR>} />
                          <Route path="/purchase-invoices/new" element={<StaffPR><PurchaseInvoicesNew /></StaffPR>} />
                          <Route path="/purchase-invoices/:id" element={<StaffPR><PurchaseInvoiceDetail /></StaffPR>} />
                          <Route path="/purchase-invoices/:id/send" element={<StaffPR><PurchaseInvoiceSendPage /></StaffPR>} />
                          <Route path="/track-chauffeurs" element={<PR><GPSTracking /></PR>} />
                          <Route path="/tracking" element={<PR><InternalTrackTrace /></PR>} />
                          <Route path="/messenger" element={<PR><Messenger /></PR>} />
                          <Route path="/products" element={<PR><Products /></PR>} />
                          <Route path="/carriers/:id" element={<PR><CarrierDetail /></PR>} />
                          <Route path="/carriers" element={<PR><Carriers /></PR>} />
                          <Route path="/address-book" element={<PR><AddressBook /></PR>} />
                          
                          {/* Driver */}
                          <Route path="/driver/login" element={<DriverLogin />} />
                          <Route path="/driver/reset-password" element={<DriverResetPassword />} />
                          <Route path="/driver" element={<DriverPR redirectTo="/driver/login"><DriverPortal /></DriverPR>} />
                          <Route path="/carrier" element={<PR><CarrierPortal /></PR>} />
                          <Route path="/driver/onboarding" element={<DriverPR redirectTo="/driver/login"><DriverOnboarding /></DriverPR>} />
                          <Route path="/driver/shifts" element={<DriverPR redirectTo="/driver/login"><DriverAvailableShifts /></DriverPR>} />
                          <Route path="/driver/assign" element={<DriverPR redirectTo="/driver/login"><DriverAssignment /></DriverPR>} />
                          
                          <Route path="/chatgpt" element={<PR><ChatGPT /></PR>} />
                          
                          {/* Planning */}
                          <Route path="/planning/program" element={<PR><PlanningProgram /></PR>} />
                          <Route path="/planning/applications" element={<PR><PlanningApplications /></PR>} />
                          <Route path="/planning/availability" element={<PR><PlanningAvailability /></PR>} />
                          
                          {/* Admin */}
                          <Route path="/admin/settings" element={<AdminPR><AdminSettings /></AdminPR>} />
                          <Route path="/admin/ai-usage" element={<AdminPR><AIUsage /></AdminPR>} />
                          <Route path="/admin/contracts" element={<AdminPR><ContractManagement /></AdminPR>} />
                          <Route path="/admin/migration" element={<AdminPR><MigrationHub /></AdminPR>} />
                          <Route path="/admin/document-templates" element={<StaffPR><DocumentTemplates /></StaffPR>} />
                          <Route path="/admin/help" element={<PR><HelpCenter /></PR>} />
                          <Route path="/admin/workflows" element={<AdminPR><WorkflowAutomation /></AdminPR>} />
                          <Route path="/admin/api" element={<AdminPR><AdminSettings /></AdminPR>} />
                          <Route path="/network" element={<PR><Network /></PR>} />
                          <Route path="/email" element={<PR><EmailInbox /></PR>} />
                          
                          {/* Finance */}
                          <Route path="/finance/cashflow" element={<AdminPR><CashflowCockpit /></AdminPR>} />
                          <Route path="/finance/fuel-cards" element={<AdminPR><FuelCards /></AdminPR>} />
                          <Route path="/finance/receivables" element={<AdminPR><Receivables /></AdminPR>} />
                          <Route path="/finance/costs" element={<AdminPR><Costs /></AdminPR>} />
                          <Route path="/finance/bank" element={<AdminPR><BankPayments /></AdminPR>} />
                          <Route path="/finance/diesel" element={<AdminPR><DieselModule /></AdminPR>} />
                          <Route path="/reporting" element={<StaffPR><Reporting /></StaffPR>} />
                          
                          {/* Sales */}
                          <Route path="/sales/quotes" element={<PR><QuotesDashboard /></PR>} />
                          
                          {/* Charter */}
                          <Route path="/charter" element={<StaffPR><Procurement /></StaffPR>} />
                          <Route path="/charter/pools" element={<PR><CarrierPools /></PR>} />
                          <Route path="/charter/scorecards" element={<PR><CarrierScorecards /></PR>} />
                          
                          {/* Enterprise */}
                          <Route path="/enterprise/reconciliation" element={<AdminPR><ReconciliationQueue /></AdminPR>} />
                          <Route path="/enterprise/health" element={<AdminPR><SystemHealth /></AdminPR>} />
                          <Route path="/enterprise/security" element={<AdminPR><SecurityCenter /></AdminPR>} />
                          <Route path="/enterprise/recommendations" element={<StaffPR><AIRecommendations /></StaffPR>} />
                          <Route path="/enterprise/holds" element={<StaffPR><HoldsInbox /></StaffPR>} />
                          <Route path="/enterprise/audit" element={<StaffPR><AuditQueue /></StaffPR>} />
                          <Route path="/enterprise/disputes" element={<StaffPR><Disputes /></StaffPR>} />
                          <Route path="/enterprise/exceptions" element={<StaffPR><ExceptionsInbox /></StaffPR>} />
                          <Route path="/enterprise/alerts" element={<StaffPR><AlertsEscalations /></StaffPR>} />
                          <Route path="/enterprise/rosters" element={<StaffPR><Rosters /></StaffPR>} />
                          <Route path="/enterprise/driver-docs" element={<StaffPR><DriverDocs /></StaffPR>} />
                          <Route path="/enterprise/vehicle-docs" element={<StaffPR><VehicleDocs /></StaffPR>} />
                          <Route path="/enterprise/expiry-alerts" element={<StaffPR><ExpiryAlerts /></StaffPR>} />
                          
                          {/* Pricing & Claims */}
                          <Route path="/pricing/contracts" element={<PR><RateContracts /></PR>} />
                          <Route path="/pricing/dynamic" element={<PR><DynamicPricing /></PR>} />
                          <Route path="/claims" element={<PR><ClaimsInbox /></PR>} />
                          
                          {/* Integrations */}
                          <Route path="/integrations/edi" element={<AdminPR><EDIIntegration /></AdminPR>} />
                          
                          {/* AI */}
                          <Route path="/ai/dispatch" element={<PR><AutoDispatch /></PR>} />
                          <Route path="/ai/anomaly" element={<PR><AnomalyDetection /></PR>} />
                          
                          {/* Operations */}
                          <Route path="/operations/pod" element={<PR><DigitalPOD /></PR>} />
                          
                          {/* Maintenance */}
                          <Route path="/maintenance/predictive" element={<PR><PredictiveMaintenance /></PR>} />
                          
                          {/* B2B Portal */}
                          <Route path="/portal/login" element={<PortalLogin />} />
                          <Route path="/portal/b2b/onboarding" element={<PortalGuard skipOnboardingCheck><B2BOnboarding /></PortalGuard>} />
                          <Route path="/portal/b2b" element={<PortalGuard><B2BPortal /></PortalGuard>} />
                          <Route path="/portal/b2b/shipments" element={<PortalGuard><B2BShipments /></PortalGuard>} />
                          <Route path="/portal/b2b/shipments/:id" element={<PortalGuard><B2BShipmentDetail /></PortalGuard>} />
                          <Route path="/portal/b2b/book" element={<PortalGuard><B2BBook /></PortalGuard>} />
                          <Route path="/portal/b2b/labels" element={<PortalGuard><B2BLabels /></PortalGuard>} />
                          <Route path="/portal/b2b/invoices" element={<PortalGuard><B2BInvoices /></PortalGuard>} />
                          <Route path="/portal/b2b/cases" element={<PortalGuard><B2BCases /></PortalGuard>} />
                          <Route path="/portal/b2b/deliveries" element={<PortalGuard><B2BDeliveries /></PortalGuard>} />
                          <Route path="/portal/b2b/settings" element={<PortalGuard><B2BSettings /></PortalGuard>} />
                          <Route path="/portal/b2b/addresses" element={<PortalGuard><B2BAddressBook /></PortalGuard>} />
                          <Route path="/portal/b2b/recurring" element={<PortalGuard><B2BRecurringOrders /></PortalGuard>} />
                          
                          {/* B2C Portal */}
                          <Route path="/portal/b2c" element={<PortalGuard><B2CPortal /></PortalGuard>} />
                          <Route path="/portal/b2c/book" element={<PortalGuard><B2CBook /></PortalGuard>} />
                          <Route path="/portal/b2c/help" element={<PortalGuard><B2CHelp /></PortalGuard>} />
                          <Route path="/portal/b2c/account" element={<PortalGuard><B2CAccount /></PortalGuard>} />
                          <Route path="/portal/b2c/track" element={<PortalGuard><B2CTrack /></PortalGuard>} />
                          
                          {/* WMS */}
                          <Route path="/wms" element={<PR><WMSDashboard /></PR>} />
                          <Route path="/wms/inventory" element={<PR><WMSInventory /></PR>} />
                          <Route path="/wms/inbound" element={<PR><WMSInbound /></PR>} />
                          <Route path="/wms/outbound" element={<PR><WMSOutbound /></PR>} />
                          <Route path="/wms/picking" element={<PR><WMSPicking /></PR>} />
                          <Route path="/wms/transfers" element={<PR><WMSTransfers /></PR>} />
                          <Route path="/wms/warehouses" element={<PR><WMSWarehouses /></PR>} />
                          <Route path="/wms/products" element={<PR><WMSProducts /></PR>} />
                          
                          {/* Fuel Stations */}
                          <Route path="/fuel-stations" element={<PR><FuelStations /></PR>} />
                          
                          {/* Essential Modules */}
                          <Route path="/fleet" element={<PR><FleetManagement /></PR>} />
                          <Route path="/rates" element={<PR><RateManagement /></PR>} />
                          <Route path="/co2" element={<PR><CO2Reporting /></PR>} />
                          <Route path="/kpi" element={<PR><KPIDashboard /></PR>} />
                          
                          {/* Route Optimization */}
                          <Route path="/route-optimization" element={<PR><RouteOptimization /></PR>} />
                          
                          {/* Legal */}
                          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                          <Route path="/legal/terms" element={<TermsOfService />} />
                          
                          <Route path="*" element={<NotFound />} />
                            </Routes>
                            <LegalConsentBanner />
                          </Suspense>
                          </main>
                        </GlobalUXProvider>
                      </LazyCopilotProvider>
                    </Suspense>
                  } />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
