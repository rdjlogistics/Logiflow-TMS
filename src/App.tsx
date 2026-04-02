import { Suspense, ReactNode } from "react";
import { LazyMotion } from "framer-motion";

const loadFramerFeatures = () =>
  import("framer-motion").then((m) => m.domAnimation);
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


// Auth page - lazy loaded (only needed on /auth route)
const Auth = lazyWithRetry(() => import("./pages/Auth"));
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Lazy load ALL pages including Dashboard for better initial bundle
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
// ControlTower removed — consolidated into Dashboard (Command Center)
const Procurement = lazyWithRetry(() => import("./pages/Procurement"));

const Customers = lazyWithRetry(() => import("./pages/Customers"));



const OrderForm = lazyWithRetry(() => import("./pages/OrderForm"));
const OrderOverview = lazyWithRetry(() => import("./pages/OrderOverview"));
const RecurringOrders = lazyWithRetry(() => import("./pages/RecurringOrders"));
const Invoices = lazyWithRetry(() => import("./pages/Invoices"));
const InvoiceDetail = lazyWithRetry(() => import("./pages/InvoiceDetail"));
const InvoicesNew = lazyWithRetry(() => import("./pages/InvoicesNew"));
const InvoiceSend = lazyWithRetry(() => import("./pages/InvoiceSend"));
const Payments = lazyWithRetry(() => import("./pages/Payments"));
const RoutePlanning = lazyWithRetry(() => import("./pages/RoutePlanning"));
const GPSTracking = lazyWithRetry(() => import("./pages/GPSTracking"));
const InternalTrackTrace = lazyWithRetry(() => import("./pages/InternalTrackTrace"));
const CustomerTrackTrace = lazyWithRetry(() => import("./pages/CustomerTrackTrace"));
const Messenger = lazyWithRetry(() => import("./pages/Messenger"));
const DriverPortal = lazyWithRetry(() => import("./pages/DriverPortal"));
const DriverOnboarding = lazyWithRetry(() => import("./pages/DriverOnboarding"));
const InstallApp = lazyWithRetry(() => import("./pages/InstallApp"));
const Products = lazyWithRetry(() => import("./pages/Products"));
const Carriers = lazyWithRetry(() => import("./pages/Carriers"));
const CarrierDetail = lazyWithRetry(() => import("./pages/CarrierDetail"));
const AddressBook = lazyWithRetry(() => import("./pages/AddressBook"));
const ChatGPT = lazyWithRetry(() => import("./pages/ChatGPT"));
const CustomerPortalV2 = lazyWithRetry(() => import("./pages/CustomerPortalV2"));
const CustomerUserLinking = lazyWithRetry(() => import("./pages/CustomerUserLinking"));
const AdminSettings = lazyWithRetry(() => import("./pages/AdminSettings"));
const ContractTemplates = lazyWithRetry(() => import("./pages/ContractTemplates"));
const ContractManagement = lazyWithRetry(() => import("./pages/ContractManagement"));
const PlanningProgram = lazyWithRetry(() => import("./pages/PlanningProgram"));
const PlanningApplications = lazyWithRetry(() => import("./pages/PlanningApplications"));
const PlanningAvailability = lazyWithRetry(() => import("./pages/PlanningAvailability"));
const PlanningSettings = lazyWithRetry(() => import("./pages/PlanningSettings"));
const PlanningAuditLog = lazyWithRetry(() => import("./pages/PlanningAuditLog"));
const DriverAvailableShifts = lazyWithRetry(() => import("./pages/DriverAvailableShifts"));
const DriverAssignment = lazyWithRetry(() => import("./pages/DriverAssignment"));
const DriverLogin = lazyWithRetry(() => import("./pages/DriverLogin"));
const DriverResetPassword = lazyWithRetry(() => import("./pages/DriverResetPassword"));
const Network = lazyWithRetry(() => import("./pages/Network"));
const EmailDashboard = lazyWithRetry(() => import("./pages/EmailDashboard"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Community
const CommunityWorkspaces = lazyWithRetry(() => import("./pages/community/CommunityWorkspaces"));
const JointOrders = lazyWithRetry(() => import("./pages/community/JointOrders"));
const CommunityLedger = lazyWithRetry(() => import("./pages/community/CommunityLedger"));
const CommunitySettlements = lazyWithRetry(() => import("./pages/community/CommunitySettlements"));
const FreightMarketplace = lazyWithRetry(() => import("./pages/community/FreightMarketplace"));

// CRM
const RelationshipVault = lazyWithRetry(() => import("./pages/crm/RelationshipVault"));
const MomentsEngine = lazyWithRetry(() => import("./pages/crm/MomentsEngine"));
const GiftCenter = lazyWithRetry(() => import("./pages/crm/GiftCenter"));
const GiftPolicy = lazyWithRetry(() => import("./pages/crm/GiftPolicy"));
const RFQInbox = lazyWithRetry(() => import("./pages/crm/RFQInbox"));

// Finance - named exports need special handling
const CashflowCockpit = lazyWithRetry(() => import("./pages/finance/CashflowCockpit"));
const FuelCards = lazyWithRetry(() => import("./pages/finance/FuelCards"));
const AIFinanceCoach = lazyWithRetry(() => import("./pages/finance/AIFinanceCoach"));
const Collections = lazyWithRetry(() => import("./pages/finance/Collections"));
const CreditDashboard = lazyWithRetry(() => import("./pages/finance/CreditDashboard"));
const Receivables = lazyWithRetry(() => import("./pages/finance/Receivables"));
const PurchaseInvoices = lazyWithRetry(() => import("./pages/finance/PurchaseInvoices"));
const PurchaseInvoicesNew = lazyWithRetry(() => import("./pages/finance/PurchaseInvoicesNew"));
const PurchaseInvoiceDetail = lazyWithRetry(() => import("./pages/finance/PurchaseInvoiceDetail"));
const PurchaseInvoiceSendPage = lazyWithRetry(() => import("./pages/finance/PurchaseInvoiceSendPage"));
const ProfitMargin = lazyWithRetry(() => import("./pages/finance/MarginIntelligence"));
const Costs = lazyWithRetry(() => import("./pages/finance/Costs"));
const BankPayments = lazyWithRetry(() => import("./pages/finance/BankReconciliation"));
const Reports = lazyWithRetry(() => import("./pages/finance/Reports"));
const Goals = lazyWithRetry(() => import("./pages/finance/Goals"));
const Reporting = lazyWithRetry(() => import("./pages/Reporting"));

// Tendering
// Charter sectie (vroeger: tendering)
const CarrierPools = lazyWithRetry(() => import("./pages/tendering/CarrierPools"));
const CarrierScorecards = lazyWithRetry(() => import("./pages/tendering/CarrierScorecards"));

// Enterprise - named exports
const AutomationSimulator = lazyWithRetry(() => import("./pages/enterprise/AutomationSimulator"));
const ReconciliationQueue = lazyWithRetry(() => import("./pages/enterprise/ReconciliationQueue"));
const SystemHealth = lazyWithRetry(() => import("./pages/enterprise/SystemHealth"));
const PolicyCenter = lazyWithRetry(() => import("./pages/enterprise/PolicyCenter"));
const SecurityCenter = lazyWithRetry(() => import("./pages/enterprise/SecurityCenter"));
const AIRecommendations = lazyWithRetry(() => import("./pages/enterprise/AIRecommendations"));
const HoldsInbox = lazyWithRetry(() => import("./pages/enterprise/HoldsInbox"));
const DataQuality = lazyWithRetry(() => import("./pages/enterprise/DataQuality"));
const AutopilotHealth = lazyWithRetry(() => import("./pages/enterprise/AutopilotHealth"));
const AIPlanView = lazyWithRetry(() => import("./pages/enterprise/AIPlanView"));
const AuditQueue = lazyWithRetry(() => import("./pages/enterprise/AuditQueue"));
const Disputes = lazyWithRetry(() => import("./pages/enterprise/Disputes"));
const FreightSettlements = lazyWithRetry(() => import("./pages/enterprise/FreightSettlements"));
const AuditRules = lazyWithRetry(() => import("./pages/enterprise/AuditRules"));
const EDIImports = lazyWithRetry(() => import("./pages/enterprise/EDIImports"));
const Webhooks = lazyWithRetry(() => import("./pages/enterprise/Webhooks"));
const APIKeys = lazyWithRetry(() => import("./pages/enterprise/APIKeys"));
const EmailIngest = lazyWithRetry(() => import("./pages/enterprise/EmailIngest"));
const MappingSchemas = lazyWithRetry(() => import("./pages/enterprise/MappingSchemas"));
const IntegrationLogs = lazyWithRetry(() => import("./pages/enterprise/IntegrationLogs"));
const ExceptionsInbox = lazyWithRetry(() => import("./pages/enterprise/ExceptionsInbox"));
const Playbooks = lazyWithRetry(() => import("./pages/enterprise/Playbooks"));
const AlertsEscalations = lazyWithRetry(() => import("./pages/enterprise/AlertsEscalations"));
const SLAMonitor = lazyWithRetry(() => import("./pages/enterprise/SLAMonitor"));

const DriverDocs = lazyWithRetry(() => import("./pages/compliance/DriverDocs"));
const VehicleDocs = lazyWithRetry(() => import("./pages/compliance/VehicleDocs"));
const ExpiryAlerts = lazyWithRetry(() => import("./pages/compliance/ExpiryAlerts"));
const Rosters = lazyWithRetry(() => import("./pages/enterprise/Rosters"));
const Constraints = lazyWithRetry(() => import("./pages/enterprise/Constraints"));

// Pricing & Claims
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage"));
const CheckoutSuccess = lazyWithRetry(() => import("./pages/CheckoutSuccess"));
const OnboardingWizard = lazyWithRetry(() => import("./pages/OnboardingWizard"));
const RateContracts = lazyWithRetry(() => import("./pages/pricing/RateContracts"));
const DynamicPricing = lazyWithRetry(() => import("./pages/pricing/DynamicPricing"));
const ClaimsInbox = lazyWithRetry(() => import("./pages/claims/ClaimsInbox"));

// Migration & Admin
const MigrationHub = lazyWithRetry(() => import("./pages/migration/MigrationHub"));
const QAChecklist = lazyWithRetry(() => import("./pages/admin/QAChecklist"));
const BrandingSettings = lazyWithRetry(() => import("./pages/admin/BrandingSettings"));
const DocumentTemplates = lazyWithRetry(() => import("./pages/admin/DocumentTemplates"));
const DriverOnboardingPage = lazyWithRetry(() => import("./pages/admin/DriverOnboarding"));

const HelpCenter = lazyWithRetry(() => import("./pages/admin/HelpCenter"));
const AccountingIntegrations = lazyWithRetry(() => import("./pages/admin/AccountingIntegrations"));
const PublicAPI = lazyWithRetry(() => import("./pages/admin/PublicAPI"));
const DocumentVerification = lazyWithRetry(() => import("./pages/admin/DocumentVerification"));
const AIUsage = lazyWithRetry(() => import("./pages/admin/AIUsage"));
const SuperAdminDashboard = lazyWithRetry(() => import("./pages/admin/SuperAdminDashboard"));
const LaunchChecklist = lazyWithRetry(() => import("./pages/admin/LaunchChecklist"));
const StressTest = lazyWithRetry(() => import("./pages/admin/StressTest"));

// AI & Integrations
const TelematicsIntegration = lazyWithRetry(() => import("./pages/integrations/TelematicsIntegration"));
const EDIIntegration = lazyWithRetry(() => import("./pages/integrations/EDIIntegration"));
const CustomsNCTS = lazyWithRetry(() => import("./pages/integrations/CustomsNCTS"));
const AutoDispatch = lazyWithRetry(() => import("./pages/ai/AutoDispatch"));
const WhatIfSimulation = lazyWithRetry(() => import("./pages/ai/WhatIfSimulation"));
const SmartDocumentOCR = lazyWithRetry(() => import("./pages/ai/SmartDocumentOCR"));
const AnomalyDetection = lazyWithRetry(() => import("./pages/ai/AnomalyDetection"));

// Operations & Maintenance
const DigitalPOD = lazyWithRetry(() => import("./pages/operations/DigitalPOD"));
const PredictiveMaintenance = lazyWithRetry(() => import("./pages/maintenance/PredictiveMaintenance"));
const CustomerSelfService = lazyWithRetry(() => import("./pages/portal/CustomerSelfService"));
const NotificationChannels = lazyWithRetry(() => import("./pages/notifications/NotificationChannels"));

// Portal Guard - lazy loaded
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

// WMS - lazy load each page
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

// E-commerce Integrations
const EcommerceIntegrations = lazyWithRetry(() => import("./pages/integrations/EcommerceIntegrations"));

// Live Tracking removed - integrated into Route Planning

// Carrier Portal (public + authenticated)
const CarrierPaymentPortal = lazyWithRetry(() => import("./pages/carrier/CarrierPaymentPortal"));
const CarrierPortal = lazyWithRetry(() => import("./pages/carrier/CarrierPortal"));

// Procurement / RFQ — import already defined above (line 29)

// New Essential Modules
const FleetManagement = lazyWithRetry(() => import("./pages/FleetManagement"));
const RateManagement = lazyWithRetry(() => import("./pages/RateManagement"));
const CO2Reporting = lazyWithRetry(() => import("./pages/CO2Reporting"));
const KPIDashboard = lazyWithRetry(() => import("./pages/KPIDashboard"));
const SLAMonitoring = lazyWithRetry(() => import("./pages/SLAMonitoring"));

// Legal Pages
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/legal/TermsOfService"));
const RouteOptimization = lazyWithRetry(() => import("./pages/RouteOptimization"));
const EmailInbox = lazyWithRetry(() => import("./pages/EmailInbox"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - data is fresh for 5 minutes (reduces API calls under high load)
      staleTime: 5 * 60 * 1000,
      // Cache time - keep in cache for 10 minutes (better for 1000 users)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Reduce refetch on window focus to prevent thundering herd
      refetchOnWindowFocus: false,
      // Refetch on reconnect for data consistency
      refetchOnReconnect: 'always',
      // Disable background refetching by default
      refetchInterval: false,
      // Network mode for better offline handling
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure with delay
      retry: 1,
      retryDelay: 1000,
      // Network mode for mutations
      networkMode: 'offlineFirst',
    },
  },
});

// Loading fallback component
const PageLoader = () => <PageLoadingSkeleton />;

// Helper: wrap element in ProtectedRoute (no role restriction — any authenticated user)
const PR = ({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) => (
  <ProtectedRoute redirectTo={redirectTo}>{children}</ProtectedRoute>
);

// Helper: admin-only ProtectedRoute
const AdminPR = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
);

// Helper: admin + medewerker ProtectedRoute
const StaffPR = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedRoles={["admin", "medewerker"]}>{children}</ProtectedRoute>
);

// Helper: driver + admin ProtectedRoute (driver portal)
const DriverPR = ({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) => (
  <ProtectedRoute allowedRoles={["chauffeur", "admin"]} redirectTo={redirectTo}>{children}</ProtectedRoute>
);

// Children render IMMEDIATELY — Copilot loads async in background, never blocks UI
// CopilotProvider is now statically imported — no lazy wrapper needed

const App = () => (
  <ErrorBoundary>
    <LazyMotion features={loadFramerFeatures}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="nextgen-tms-theme">
        <AuthProvider>
            <NotificationProvider>
            <TooltipProvider>
              <Suspense fallback={null}><LazyCopilotProvider>
                  <Toaster />
                  <Sonner />
                  
                  <BrowserRouter>
                    <GlobalUXProvider>
                      <Suspense fallback={null}>
                        <CommandPalette />
                      </Suspense>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Auth routes - public */}
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/login" element={<Auth />} />
                          <Route path="/demo" element={<Auth />} />
                          <Route path="/pricing" element={<PricingPage />} />
                          <Route path="/checkout/success" element={<CheckoutSuccess />} />
                          <Route path="/onboarding" element={<PR><OnboardingWizard /></PR>} />
                          
                          {/* Public Carrier Portal */}
                          <Route path="/carrier-portal/:token" element={<CarrierPaymentPortal />} />
                          
                          {/* Public Tracking routes */}
                          <Route path="/track" element={<CustomerTrackTrace />} />
                          <Route path="/track/:token" element={<CustomerTrackTrace />} />
                          
                          {/* Protected routes */}
                          <Route path="/" element={<PR><Dashboard /></PR>} />
                          <Route path="/control-tower" element={<Navigate to="/" replace />} />
                          <Route path="/procurement" element={<Navigate to="/charter" replace />} />
                          <Route path="/customers" element={<PR><Customers /></PR>} />
                          <Route path="/drivers" element={<Navigate to="/carriers?tab=chauffeurs" replace />} />
                          <Route path="/vehicles" element={<Navigate to="/fleet" replace />} />
                          <Route path="/trips" element={<PR><Trips /></PR>} />
                          <Route path="/orders" element={<PR><OrderOverview /></PR>} />
                          <Route path="/orders/edit/:orderId" element={<PR><OrderForm /></PR>} />
                          <Route path="/orders/edit" element={<PR><OrderForm /></PR>} />
                          <Route path="/orders/recurring" element={<PR><RecurringOrders /></PR>} />
                          <Route path="/invoices" element={<StaffPR><Invoices /></StaffPR>} />
                          <Route path="/invoices/:id" element={<StaffPR><InvoiceDetail /></StaffPR>} />
                          <Route path="/invoices/new" element={<StaffPR><InvoicesNew /></StaffPR>} />
                          <Route path="/invoices/:id/send" element={<StaffPR><InvoiceSend /></StaffPR>} />
                          <Route path="/purchase-invoices" element={<StaffPR><PurchaseInvoices /></StaffPR>} />
                          <Route path="/purchase-invoices/new" element={<StaffPR><PurchaseInvoicesNew /></StaffPR>} />
                          <Route path="/purchase-invoices/:id" element={<StaffPR><PurchaseInvoiceDetail /></StaffPR>} />
                          <Route path="/purchase-invoices/:id/send" element={<StaffPR><PurchaseInvoiceSendPage /></StaffPR>} />
                          <Route path="/payments" element={<AdminPR><Payments /></AdminPR>} />
                          <Route path="/track-chauffeurs" element={<PR><GPSTracking /></PR>} />
                          <Route path="/gps-tracking" element={<Navigate to="/track-chauffeurs" replace />} />
                          <Route path="/route-planning" element={<PR><RoutePlanning /></PR>} />
                          <Route path="/tracking" element={<PR><InternalTrackTrace /></PR>} />
                          <Route path="/messenger" element={<PR><Messenger /></PR>} />
                          <Route path="/products" element={<PR><Products /></PR>} />
                          <Route path="/carriers/:id" element={<PR><CarrierDetail /></PR>} />
                          <Route path="/carriers" element={<PR><Carriers /></PR>} />
                          <Route path="/address-book" element={<PR><AddressBook /></PR>} />
                          <Route path="/driver/login" element={<DriverLogin />} />
                          <Route path="/driver/reset-password" element={<DriverResetPassword />} />
                          <Route path="/driver" element={<DriverPR redirectTo="/driver/login"><DriverPortal /></DriverPR>} />
                          <Route path="/carrier" element={<PR><CarrierPortal /></PR>} />
                          <Route path="/driver/onboarding" element={<DriverPR redirectTo="/driver/login"><DriverOnboarding /></DriverPR>} />
                          <Route path="/driver/shifts" element={<DriverPR redirectTo="/driver/login"><DriverAvailableShifts /></DriverPR>} />
                          <Route path="/driver/assign" element={<DriverPR redirectTo="/driver/login"><DriverAssignment /></DriverPR>} />
                          <Route path="/install" element={<InstallApp />} />
                          <Route path="/chatgpt" element={<PR><ChatGPT /></PR>} />
                          <Route path="/portal-v2" element={<PR><CustomerPortalV2 /></PR>} />
                          <Route path="/portal" element={<PR><CustomerPortalV2 /></PR>} />
                          <Route path="/customer" element={<PR><CustomerPortalV2 /></PR>} />
                          <Route path="/planning" element={<Navigate to="/planning/program" replace />} />
                          <Route path="/planning/program" element={<PR><PlanningProgram /></PR>} />
                          <Route path="/planning/applications" element={<PR><PlanningApplications /></PR>} />
                          <Route path="/planning/availability" element={<PR><PlanningAvailability /></PR>} />
                          <Route path="/planning/audit-log" element={<PR><PlanningAuditLog /></PR>} />
                          <Route path="/planning/settings" element={<PR><PlanningSettings /></PR>} />
                          <Route path="/admin/customer-linking" element={<AdminPR><CustomerUserLinking /></AdminPR>} />
                          <Route path="/admin/settings" element={<AdminPR><AdminSettings /></AdminPR>} />
                          <Route path="/admin/ai-usage" element={<AdminPR><AIUsage /></AdminPR>} />
                          <Route path="/admin/contract-templates" element={<AdminPR><ContractTemplates /></AdminPR>} />
                          <Route path="/admin/contracts" element={<AdminPR><ContractManagement /></AdminPR>} />
                          <Route path="/admin/migration" element={<AdminPR><MigrationHub /></AdminPR>} />
                          <Route path="/admin/qa" element={<AdminPR><QAChecklist /></AdminPR>} />
                          <Route path="/admin/branding" element={<AdminPR><BrandingSettings /></AdminPR>} />
                          <Route path="/admin/document-templates" element={<StaffPR><DocumentTemplates /></StaffPR>} />
                          <Route path="/admin/driver-onboarding" element={<AdminPR><DriverOnboardingPage /></AdminPR>} />

                          <Route path="/admin/help" element={<PR><HelpCenter /></PR>} />
                          <Route path="/admin/super" element={<AdminPR><SuperAdminDashboard /></AdminPR>} />
                          <Route path="/admin/launch-checklist" element={<AdminPR><LaunchChecklist /></AdminPR>} />
                          <Route path="/admin/stress-test" element={<AdminPR><StressTest /></AdminPR>} />
                          <Route path="/admin/document-verification" element={<AdminPR><DocumentVerification /></AdminPR>} />
                          <Route path="/email-dashboard" element={<AdminPR><EmailDashboard /></AdminPR>} />
                          <Route path="/network" element={<PR><Network /></PR>} />
                          {/* CRM */}
                          <Route path="/crm/vault" element={<PR><RelationshipVault /></PR>} />
                          <Route path="/crm/moments" element={<PR><MomentsEngine /></PR>} />
                          <Route path="/crm/gifts" element={<PR><GiftCenter /></PR>} />
                          <Route path="/crm/gift-policy" element={<PR><GiftPolicy /></PR>} />
                          
                          {/* Community */}
                          <Route path="/community" element={<PR><CommunityWorkspaces /></PR>} />
                          <Route path="/community/joint-orders" element={<PR><JointOrders /></PR>} />
                          <Route path="/community/ledger" element={<PR><CommunityLedger /></PR>} />
                          <Route path="/community/settlements" element={<PR><CommunitySettlements /></PR>} />
                          <Route path="/community/marketplace" element={<PR><FreightMarketplace /></PR>} />
                          
                          {/* Finance — admin only (financial admin) */}
                          <Route path="/finance/cashflow" element={<AdminPR><CashflowCockpit /></AdminPR>} />
                          <Route path="/finance/fuel-cards" element={<AdminPR><FuelCards /></AdminPR>} />
                          <Route path="/finance/ai-coach" element={<AdminPR><AIFinanceCoach /></AdminPR>} />
                          <Route path="/finance/receivables" element={<AdminPR><Receivables /></AdminPR>} />
                          <Route path="/finance/collections" element={<Navigate to="/finance/receivables" replace />} />
                          <Route path="/finance/credit-dashboard" element={<Navigate to="/finance/receivables" replace />} />
                          <Route path="/finance/margin" element={<AdminPR><ProfitMargin /></AdminPR>} />
                          <Route path="/finance/costs" element={<AdminPR><Costs /></AdminPR>} />
                          <Route path="/finance/bank" element={<AdminPR><BankPayments /></AdminPR>} />
                          <Route path="/finance/reports" element={<AdminPR><Reports /></AdminPR>} />
                          <Route path="/finance/goals" element={<AdminPR><Goals /></AdminPR>} />
                          <Route path="/reporting" element={<StaffPR><Reporting /></StaffPR>} />
                          
                          {/* Tendering */}
                          {/* Charter sectie (vervoerderselectie & inkoop) */}
                          <Route path="/charter" element={<StaffPR><Procurement /></StaffPR>} />
                          <Route path="/charter/pools" element={<PR><CarrierPools /></PR>} />
                          <Route path="/charter/scorecards" element={<PR><CarrierScorecards /></PR>} />
                          {/* Legacy tendering routes → redirect naar charter */}
                          <Route path="/tendering" element={<Navigate to="/charter" replace />} />
                          <Route path="/tendering/templates" element={<Navigate to="/charter" replace />} />
                          <Route path="/tendering/pools" element={<Navigate to="/charter/pools" replace />} />
                          <Route path="/tendering/scorecards" element={<Navigate to="/charter/scorecards" replace />} />
                          <Route path="/tendering/history" element={<Navigate to="/charter" replace />} />
                          
                          {/* Enterprise — admin-only for system config, staff for operations */}
                          <Route path="/enterprise/simulator" element={<AdminPR><AutomationSimulator /></AdminPR>} />
                          <Route path="/enterprise/reconciliation" element={<AdminPR><ReconciliationQueue /></AdminPR>} />
                          <Route path="/enterprise/health" element={<AdminPR><SystemHealth /></AdminPR>} />
                          <Route path="/enterprise/policy" element={<AdminPR><PolicyCenter /></AdminPR>} />
                          <Route path="/enterprise/security" element={<AdminPR><SecurityCenter /></AdminPR>} />
                          <Route path="/enterprise/recommendations" element={<StaffPR><AIRecommendations /></StaffPR>} />
                          <Route path="/enterprise/holds" element={<StaffPR><HoldsInbox /></StaffPR>} />
                          <Route path="/enterprise/data-quality" element={<AdminPR><DataQuality /></AdminPR>} />
                          <Route path="/enterprise/autopilot" element={<AdminPR><AutopilotHealth /></AdminPR>} />
                          <Route path="/enterprise/ai-plan" element={<StaffPR><AIPlanView /></StaffPR>} />
                          <Route path="/enterprise/audit" element={<StaffPR><AuditQueue /></StaffPR>} />
                          <Route path="/enterprise/disputes" element={<StaffPR><Disputes /></StaffPR>} />
                          <Route path="/enterprise/settlements" element={<StaffPR><FreightSettlements /></StaffPR>} />
                          <Route path="/enterprise/rules" element={<AdminPR><AuditRules /></AdminPR>} />
                          <Route path="/enterprise/edi" element={<AdminPR><EDIImports /></AdminPR>} />
                          <Route path="/enterprise/webhooks" element={<AdminPR><Webhooks /></AdminPR>} />
                          <Route path="/enterprise/api-keys" element={<AdminPR><APIKeys /></AdminPR>} />
                          <Route path="/enterprise/email-ingest" element={<AdminPR><EmailIngest /></AdminPR>} />
                          <Route path="/enterprise/schemas" element={<AdminPR><MappingSchemas /></AdminPR>} />
                          <Route path="/enterprise/logs" element={<StaffPR><IntegrationLogs /></StaffPR>} />
                          <Route path="/enterprise/exceptions" element={<StaffPR><ExceptionsInbox /></StaffPR>} />
                          <Route path="/enterprise/playbooks" element={<StaffPR><Playbooks /></StaffPR>} />
                          <Route path="/enterprise/alerts" element={<StaffPR><AlertsEscalations /></StaffPR>} />
                          <Route path="/enterprise/sla" element={<StaffPR><SLAMonitor /></StaffPR>} />
                          <Route path="/enterprise/driver-docs" element={<StaffPR><DriverDocs /></StaffPR>} />
                          <Route path="/enterprise/vehicle-docs" element={<StaffPR><VehicleDocs /></StaffPR>} />
                          <Route path="/enterprise/expiry-alerts" element={<StaffPR><ExpiryAlerts /></StaffPR>} />
                          <Route path="/enterprise/rosters" element={<StaffPR><Rosters /></StaffPR>} />
                          <Route path="/enterprise/constraints" element={<StaffPR><Constraints /></StaffPR>} />
                          
                          {/* Pricing & Claims */}
                          <Route path="/pricing/contracts" element={<PR><RateContracts /></PR>} />
                          <Route path="/pricing/dynamic" element={<PR><DynamicPricing /></PR>} />
                          <Route path="/claims" element={<PR><ClaimsInbox /></PR>} />
                          
                          {/* Integrations — admin only */}
                          <Route path="/integrations/telematics" element={<AdminPR><TelematicsIntegration /></AdminPR>} />
                          <Route path="/integrations/edi" element={<AdminPR><EDIIntegration /></AdminPR>} />
                          <Route path="/integrations/customs" element={<AdminPR><CustomsNCTS /></AdminPR>} />
                          <Route path="/integrations/ecommerce" element={<AdminPR><EcommerceIntegrations /></AdminPR>} />
                          <Route path="/integrations/accounting" element={<AdminPR><AccountingIntegrations /></AdminPR>} />
                          <Route path="/integrations/api" element={<AdminPR><PublicAPI /></AdminPR>} />
                          <Route path="/admin/api" element={<AdminPR><PublicAPI /></AdminPR>} />
                          
                          {/* AI */}
                          <Route path="/ai/dispatch" element={<PR><AutoDispatch /></PR>} />
                          <Route path="/ai/whatif" element={<PR><WhatIfSimulation /></PR>} />
                          <Route path="/ai/ocr" element={<PR><SmartDocumentOCR /></PR>} />
                          <Route path="/ai/anomaly" element={<PR><AnomalyDetection /></PR>} />
                          
                          {/* Operations */}
                          <Route path="/operations/pod" element={<PR><DigitalPOD /></PR>} />
                          <Route path="/operations/dispatch" element={<PR><AutoDispatch /></PR>} />
                          
                          {/* Maintenance */}
                          <Route path="/maintenance/predictive" element={<PR><PredictiveMaintenance /></PR>} />
                          
                          {/* Portal */}
                          <Route path="/self-service" element={<PR><CustomerSelfService /></PR>} />
                          <Route path="/notifications/channels" element={<PR><NotificationChannels /></PR>} />
                          
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
                          
                          {/* WMS Routes */}
                          <Route path="/wms" element={<PR><WMSDashboard /></PR>} />
                          <Route path="/wms/inventory" element={<PR><WMSInventory /></PR>} />
                          <Route path="/wms/inbound" element={<PR><WMSInbound /></PR>} />
                          <Route path="/wms/outbound" element={<PR><WMSOutbound /></PR>} />
                          <Route path="/wms/picking" element={<PR><WMSPicking /></PR>} />
                          <Route path="/wms/transfers" element={<PR><WMSTransfers /></PR>} />
                          <Route path="/wms/warehouses" element={<PR><WMSWarehouses /></PR>} />
                          <Route path="/wms/products" element={<PR><WMSProducts /></PR>} />
                          
                          {/* CRM RFQ Inbox */}
                          <Route path="/crm/rfq" element={<PR><RFQInbox /></PR>} />
                          
                          {/* Fuel Stations */}
                          <Route path="/fuel-stations" element={<PR><FuelStations /></PR>} />
                          
                          {/* Live Tracking */}
                          
                          {/* New Essential Modules */}
                          <Route path="/fleet" element={<PR><FleetManagement /></PR>} />
                          <Route path="/rates" element={<PR><RateManagement /></PR>} />
                          <Route path="/co2" element={<PR><CO2Reporting /></PR>} />
                          <Route path="/kpi" element={<PR><KPIDashboard /></PR>} />
                          <Route path="/sla" element={<PR><SLAMonitoring /></PR>} />
                          
                          {/* Route Optimization */}
                          <Route path="/route-optimization" element={<PR><RouteOptimization /></PR>} />

                          {/* Email Inbox */}
                          <Route path="/email" element={<PR><EmailInbox /></PR>} />
                          
                          {/* Legal Pages - public */}
                          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                          <Route path="/legal/terms" element={<TermsOfService />} />
                          
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        <LegalConsentBanner />
                      </Suspense>
                    </GlobalUXProvider>
                  </BrowserRouter>
              </LazyCopilotProvider></Suspense>
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </LazyMotion>
  </ErrorBoundary>
);

export default App;