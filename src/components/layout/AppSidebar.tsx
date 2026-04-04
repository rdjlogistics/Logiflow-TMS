import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { useFeatureGate, type FeatureKey } from "@/hooks/useFeatureGate";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Users,
  Truck,
  Route,
  Heart,
  Gift,
  Sparkles,
  FileText,
  CreditCard,
  LogOut,
  Navigation,
  MessageSquare,
  Package,
  Building2,
  ClipboardList,
  Bot,
  UserCog,
  Network,
  Moon,
  Sun,
  Clock,
  Settings,
  Calendar,
  Hand,
  CalendarCheck,
  History,
  FileSignature,
  Wallet,
  TrendingUp,
  Fuel,
  Receipt,
  Target,
  UsersRound,
  Award,
  FileSearch,
  AlertTriangle,
  Shield,
  Key,
  Mail,
  Database,
  Radar,
  Bell,
  HeartPulse,
  ShieldCheck,
  Euro,
  ClipboardCheck,
  ArrowRightLeft,
  UserCircle,
  ExternalLink,
  Warehouse,
  PackageSearch,
  ScanLine,
  ArrowLeftRight,
  Leaf,
  BarChart3,
  Zap,
  ShoppingCart,
  Lock,
  Crown,
  Rocket,
  Car,
  AlertCircle,
  ChevronDown,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompany } from "@/hooks/useCompany";
import { useTheme } from "@/components/ThemeProvider";
import { PlanBadge } from "@/components/subscription/PlanBadge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import * as React from "react";

// Feature key mapping
const FEATURE_GATE_MAP: Record<string, FeatureKey> = {
  "/route-optimization": "route_optimalisatie",
  "/ai/dispatch": "ai_dispatch",
  "/maintenance/predictive": "fleet_advanced",
  "/co2": "fleet_advanced",
  "/sla": "sla_monitoring",
  "/enterprise/exceptions": "exception_management",
  "/enterprise/alerts": "proactive_alerts",
  "/ai/anomaly": "exception_management",
  "/planning/program": "dienstplanning",
  "/planning/applications": "dienstplanning",
  "/planning/availability": "dienstplanning",
  "/enterprise/rosters": "dienstplanning",
  "/finance/cashflow": "cashflow_dashboard",
  "/finance/fuel-cards": "fleet_advanced",
  "/enterprise/audit": "exception_management",
  "/enterprise/disputes": "exception_management",
  "/charter": "tendering",
  "/charter/pools": "tendering",
  "/charter/scorecards": "tendering",
  "/pricing/contracts": "rate_contracts",
  "/pricing/dynamic": "rate_contracts",
  "/wms": "wms",
  "/wms/inventory": "wms",
  "/wms/inbound": "wms",
  "/wms/outbound": "wms",
  "/wms/picking": "wms",
  "/wms/transfers": "wms",
  "/admin/api": "api_access",
  "/network": "vervoerders_netwerk",
};

// ==========================================
// CONSOLIDATED MENU STRUCTURE (6 sections)
// ==========================================

const mainItems = [
  { title: "Command Center", icon: LayoutDashboard, href: "/" },
  { title: "Orderoverzicht", icon: ClipboardList, href: "/orders" },
];

// 1. OPERATIE — Core real-time operations
const operatieItems = [
  { title: "Track Eigen Chauffeurs", icon: Navigation, href: "/track-chauffeurs" },
  { title: "Route Optimalisatie", icon: Route, href: "/route-optimization" },
  { title: "Messenger", icon: MessageSquare, href: "/messenger" },
  { title: "E-mail Inbox", icon: Mail, href: "/email" },
  { title: "AI Assistent", icon: Bot, href: "/chatgpt" },
  { title: "Digitale POD", icon: ClipboardCheck, href: "/operations/pod" },
  { title: "Auto Dispatch", icon: Zap, href: "/ai/dispatch" },
];

// 2a. VLOOT — Asset management (voertuigen, brandstof, onderhoud, uitstoot)
const vlootItems = [
  { title: "Vlootbeheer", icon: Truck, href: "/fleet" },
  { title: "CO₂ Rapportage", icon: Leaf, href: "/co2" },
  { title: "Tankstations", icon: Fuel, href: "/fuel-stations" },
];

// 2b. PLANNING — Personnel scheduling
const planningItems = [
  { title: "Programma", icon: Calendar, href: "/planning/program" },
  { title: "Aanmeldingen", icon: Hand, href: "/planning/applications" },
  { title: "Beschikbaarheid", icon: CalendarCheck, href: "/planning/availability" },
];

// 3. RELATIEBEHEER — Customers, address book, products, network
const relatiesBaseItems = [
  { title: "Klanten", icon: Users, href: "/customers" },
  { title: "Adresboek", icon: Building2, href: "/address-book" },
  { title: "Producten", icon: Package, href: "/products" },
  { title: "Charter Netwerk", icon: Network, href: "/network" },
];

// 3b. CHAUFFEURS & PARTNERS — Carriers + driver portal
const chauffeursBaseItems = [
  { title: "Charters & Eigen Chauffeurs", icon: Truck, href: "/carriers" },
];

// 4. FINANCIEEL — Finance + Charter & Tarieven merged
const financieelItems = [
  { title: "Facturen", icon: FileText, href: "/invoices" },
  { title: "Inkoopfacturen", icon: Receipt, href: "/purchase-invoices" },
  { title: "Debiteuren", icon: Users, href: "/finance/receivables" },
  { title: "Betalingen", icon: CreditCard, href: "/payments" },
  { title: "Cashflow", icon: Wallet, href: "/finance/cashflow" },
  { title: "Tankpassen", icon: Fuel, href: "/finance/fuel-cards" },
  { title: "Claims", icon: ClipboardCheck, href: "/claims" },
  { title: "Charter aanvragen", icon: ShoppingCart, href: "/charter" },
  { title: "Tariefcontracten", icon: Euro, href: "/pricing/contracts" },
  { title: "Dynamische tarieven", icon: Zap, href: "/pricing/dynamic" },
];

// 5. ANALYTICS — Monitoring & reporting
const analyticsItems = [
  { title: "KPI Dashboard", icon: BarChart3, href: "/kpi" },
  { title: "SLA Monitoring", icon: Shield, href: "/sla" },
  { title: "Rapportage", icon: TrendingUp, href: "/reporting" },
  { title: "Exceptions", icon: AlertCircle, href: "/enterprise/exceptions" },
  { title: "Alerts", icon: Bell, href: "/enterprise/alerts" },
  { title: "System Health", icon: HeartPulse, href: "/enterprise/health" },
  { title: "Anomaly Detection", icon: Radar, href: "/ai/anomaly" },
];

// 6. BEHEER — Admin + WMS + Portals + Audit merged
const beheerItems = [
  { title: "Security", icon: ShieldCheck, href: "/enterprise/security" },
  { title: "Audit Wachtrij", icon: FileSearch, href: "/enterprise/audit" },
  { title: "Geschillen", icon: AlertTriangle, href: "/enterprise/disputes" },
  { title: "Contractbeheer", icon: FileSignature, href: "/admin/contracts" },
  { title: "Sjablonen", icon: FileText, href: "/admin/document-templates" },
  { title: "Chartergroepen", icon: UsersRound, href: "/charter/pools" },
  { title: "Scorekaarten", icon: Award, href: "/charter/scorecards" },
  { title: "API & Webhooks", icon: Key, href: "/admin/api" },
  { title: "Integraties", icon: ArrowRightLeft, href: "/integrations/edi" },
  { title: "Migratie Hub", icon: Database, href: "/admin/migration" },
];

// WMS items kept as sub-section inside Beheer
const wmsItems = [
  { title: "WMS Dashboard", icon: Warehouse, href: "/wms" },
  { title: "Inventory", icon: PackageSearch, href: "/wms/inventory" },
  { title: "Ontvangst", icon: Package, href: "/wms/inbound" },
  { title: "Verzending", icon: Route, href: "/wms/outbound" },
  { title: "Picking", icon: ScanLine, href: "/wms/picking" },
  { title: "Transfers", icon: ArrowLeftRight, href: "/wms/transfers" },
];

interface MenuSection {
  title: string;
  items: { title: string; icon: any; href: string; external?: boolean }[];
  defaultOpen?: boolean;
}

// All flat items for search
const getAllItems = (sections: MenuSection[]) => {
  const all = [...mainItems];
  sections.forEach(s => all.push(...s.items));
  return all;
};

const CollapsibleMenuSection = ({
  section,
  isAnyActive,
  isCollapsed,
  isFeatureEnabled,
}: {
  section: MenuSection;
  isAnyActive: boolean;
  isCollapsed: boolean;
  isFeatureEnabled: (key: FeatureKey) => boolean;
}) => {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  // No auto-close on internal navigation — user closes menu manually

  const storageKey = `sidebar:section:${section.title}`;
  const [isOpen, setIsOpen] = React.useState(() => {
    try {
      const persisted = window.localStorage.getItem(storageKey);
      if (persisted === "open") return true;
      if (persisted === "closed") return false;
    } catch { /* ignore */ }
    return Boolean(section.defaultOpen || isAnyActive);
  });

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    try { window.localStorage.setItem(storageKey, next ? "open" : "closed"); } catch { /* ignore */ }
  };

  React.useEffect(() => {
    if (isAnyActive) handleOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyActive]);

  if (isCollapsed) {
    return (
      <SidebarMenu className="space-y-0.5">
        {section.items.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}
                className={`relative h-9 rounded-lg transition-all duration-150 justify-center ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
              >
                <Link to={item.href} className="flex items-center justify-center" aria-current={isActive ? "page" : undefined}>
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors group/trigger">
        <span className="text-[11px] tracking-wide font-medium">{section.title}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="space-y-0.5 mt-0.5">
          {section.items.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            const gateKey = FEATURE_GATE_MAP[item.href];
            const isLocked = gateKey ? !isFeatureEnabled(gateKey) : false;
            return (
              <SidebarMenuItem key={item.href}>
                {isLocked ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild className="relative h-9 rounded-lg opacity-40 cursor-not-allowed">
                          <span className="flex items-center gap-3 px-3">
                            <item.icon className="h-4 w-4" />
                            <span className="text-[13px]">{item.title}</span>
                            <Lock className="h-3 w-3 ml-auto" />
                          </span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <p className="text-xs font-medium">Upgrade vereist</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <SidebarMenuButton asChild isActive={isActive}
                    className={`relative h-9 rounded-lg transition-all duration-150 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
                  >
                    <Link to={item.href} className="flex items-center gap-3 px-3" aria-current={isActive ? "page" : undefined}
                      target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined}
                    >
                      <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="text-[13px] truncate">{item.title}</span>
                      {item.external && <ExternalLink className="h-3 w-3 ml-auto flex-shrink-0 opacity-50" />}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
};

const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { company } = useCompany();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  // No auto-close — menu stays open until user dismisses it
  const { isFeatureEnabled } = useFeatureGate();
  const { plan: currentPlan, isTrialing, trialDaysLeft } = useSubscriptionPlan();
  const [searchQuery, setSearchQuery] = React.useState("");
  const {
    canAccessOperations,
    canAccessPlanning,
    canAccessFleet,
    canAccessAnalytics,
    canAccessCRM,
    canAccessWMS,
    canAccessTendering,
    canAccessFinance,
    canAccessAdmin,
    canAccessDriverPortal,
    canAccessCustomerPortal,
    loading: permLoading,
  } = usePermissions();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("auto");
    else setTheme("light");
  };

  const isActiveInSection = (items: { href: string }[]) =>
    items.some(item => location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href)));

  // Relatiebeheer items (base + customer portals)
  const relatiesItems: { title: string; icon: any; href: string; external?: boolean }[] = [...relatiesBaseItems];
  if (canAccessCustomerPortal) {
    relatiesItems.push(
      { title: "B2B Dashboard", icon: Building2, href: "/portal/b2b", external: true },
      { title: "B2C Home", icon: UserCircle, href: "/portal/b2c", external: true },
    );
  }

  // Chauffeurs & Partners items (base + driver portal)
  const chauffeursItems: { title: string; icon: any; href: string; external?: boolean }[] = [...chauffeursBaseItems];
  if (canAccessDriverPortal) {
    chauffeursItems.push(
      { title: "Chauffeur Dashboard", icon: Truck, href: "/driver", external: true },
      { title: "Chauffeur Onboarding", icon: UserCog, href: "/driver/onboarding", external: true },
    );
  }

  // Beheer without WMS (WMS is now its own section)
  const allSections: (MenuSection & { visible: boolean })[] = [
    { title: "Operatie", items: operatieItems, defaultOpen: true, visible: permLoading || canAccessOperations },
    { title: "Vloot", items: vlootItems, visible: permLoading || canAccessFleet },
    { title: "Planning", items: planningItems, visible: permLoading || canAccessPlanning },
    { title: "Relatiebeheer", items: relatiesItems, visible: permLoading || canAccessCRM || canAccessCustomerPortal },
    { title: "Chauffeurs & Partners", items: chauffeursItems, visible: permLoading || canAccessDriverPortal || canAccessCRM },
    { title: "Financieel", items: financieelItems, visible: permLoading || canAccessFinance || canAccessTendering },
    { title: "Analytics", items: analyticsItems, visible: permLoading || canAccessAnalytics },
    { title: "Magazijn (WMS)", items: wmsItems, visible: permLoading || canAccessWMS },
    { title: "Beheer", items: beheerItems, visible: permLoading || canAccessAdmin },
  ];

  const sections: MenuSection[] = allSections
    .filter(s => s.visible && s.items.length > 0)
    .map(({ visible: _v, ...rest }) => rest);

  // Search filtering
  const allItems = React.useMemo(() => getAllItems(sections), [sections]);
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allItems.filter(item => item.title.toLowerCase().includes(q));
  }, [searchQuery, allItems]);

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-sidebar/95 backdrop-blur-xl" />
      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Header */}
        <SidebarHeader className="border-b border-sidebar-border/20 p-4 flex-shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              {company?.logo_url ? (
                <img src={company.logo_url} alt={company.name || 'Logo'} className="w-8 h-8 object-contain" />
              ) : (
                <Truck className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-display font-bold text-sm text-sidebar-foreground tracking-tight">{company?.name || 'LogiFlow'}</h1>
                <p className="text-[10px] text-sidebar-foreground/40">
                  {currentPlan?.name || 'TMS'}{isTrialing && trialDaysLeft > 0 ? ` · Trial ${trialDaysLeft}d` : ''}
                </p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2 overflow-y-auto" role="navigation" aria-label="Hoofdnavigatie" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}>
          {/* Search bar */}
          {!isCollapsed && (
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/30" />
                <input
                  type="text"
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-[13px] rounded-lg bg-sidebar-accent/40 border-0 text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
          )}

          {/* Search results */}
          {filteredItems ? (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {filteredItems.length === 0 && (
                    <p className="text-[12px] text-sidebar-foreground/40 px-3 py-4 text-center">Geen resultaten</p>
                  )}
                  {filteredItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}
                          className={`relative h-9 rounded-lg transition-all duration-150 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
                        >
                          <Link to={item.href} className="flex items-center gap-3 px-3"
                            onClick={() => { setSearchQuery(""); }}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                            <span className="text-[13px]">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <>
              {/* Main nav */}
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {mainItems.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}
                            className={`relative h-10 rounded-lg transition-all duration-150 ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
                          >
                            <Link to={item.href} aria-current={isActive ? "page" : undefined}
                              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'}`}
                            >
                              <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                              {!isCollapsed && <span className="font-medium text-[13px]">{item.title}</span>}
                              {isActive && !isCollapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Sections */}
              <div className="mt-2 space-y-1">
                {sections.map((section) => (
                  <CollapsibleMenuSection
                    key={section.title}
                    section={section}
                    isAnyActive={isActiveInSection(section.items)}
                    isCollapsed={isCollapsed}
                    isFeatureEnabled={isFeatureEnabled}
                  />
                ))}
              </div>
            </>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border/20 p-3 flex-shrink-0">
          {!isCollapsed && <PlanBadge />}
          {isCollapsed && <PlanBadge compact />}
          <Link to="/admin/settings">
            <Button variant="ghost" size="sm"
              className={`w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-9 text-[12px] mt-1 ${isCollapsed ? 'px-2 justify-center' : ''} ${location.pathname.startsWith('/admin/settings') ? 'bg-sidebar-accent text-sidebar-foreground font-medium' : ''}`}
            >
              <Settings className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && <span>Instellingen</span>}
            </Button>
          </Link>
          <div className="flex gap-1.5 mt-1">
            <Button variant="ghost" size="sm" onClick={cycleTheme}
              className={`flex-1 justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-9 text-[12px] ${isCollapsed ? 'px-2 justify-center' : ''}`}
            >
              {isCollapsed ? (
                resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
              ) : (
                <>
                  {theme === "auto" ? <Clock className="mr-2 h-3.5 w-3.5" /> : resolvedTheme === "dark" ? <Sun className="mr-2 h-3.5 w-3.5" /> : <Moon className="mr-2 h-3.5 w-3.5" />}
                  <span>{theme === "auto" ? "Auto" : theme === "dark" ? "Licht" : "Donker"}</span>
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}
              className="text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 h-9 px-2.5"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
