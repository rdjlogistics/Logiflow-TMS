import { ReactNode, useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  RefreshCw,
  FileText,
  Ticket,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Truck,
  Download,
  Upload,
  Users,
  ClipboardCheck,
  MapPin,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompactThemeToggle } from "@/components/ui/theme-toggle";

interface B2BLayoutProps {
  children: ReactNode;
  companyName: string;
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
  onRefresh?: () => Promise<void> | void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/portal/b2b" },
  { id: "shipments", label: "Zendingen", icon: Package, href: "/portal/b2b/shipments" },
  { id: "book", label: "Nieuwe Zending", icon: PlusCircle, href: "/portal/b2b/book" },
  { id: "addresses", label: "Adresboek", icon: MapPin, href: "/portal/b2b/addresses" },
  { id: "recurring", label: "Herhaalorders", icon: Repeat, href: "/portal/b2b/recurring" },
  { id: "deliveries", label: "Afleveringen", icon: ClipboardCheck, href: "/portal/b2b/deliveries" },
  { id: "labels", label: "Labels", icon: Download, href: "/portal/b2b/labels" },
  { id: "invoices", label: "Facturen", icon: FileText, href: "/portal/b2b/invoices" },
  { id: "cases", label: "Cases", icon: Ticket, href: "/portal/b2b/cases" },
  { id: "settings", label: "Instellingen", icon: Settings, href: "/portal/b2b/settings" },
];

export const B2BLayout = ({
  children,
  companyName,
  unreadNotifications = 0,
  onNotificationsClick,
  onRefresh,
}: B2BLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSupported, isSubscribed, subscribe, permission } = usePushNotifications();
  const [pushDismissed, setPushDismissed] = useState(() => 
    localStorage.getItem('b2b-push-dismissed') === 'true'
  );

  // Show push notification prompt after first load for eligible users
  const showPushBanner = isSupported && !isSubscribed && permission !== 'denied' && !pushDismissed;

  const handleEnablePush = async () => {
    await subscribe();
  };

  const handleDismissPush = () => {
    setPushDismissed(true);
    localStorage.setItem('b2b-push-dismissed', 'true');
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
      toast.success("Gegevens bijgewerkt");
    }
  };

  const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !onRefresh,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/portal/login");
  };

  const isActive = (href: string) => {
    if (href === "/portal/b2b") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop - Premium Glassmorphism */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border/30 bg-card/40 backdrop-blur-xl">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border/30">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center shadow-glow-gold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Truck className="h-5 w-5 text-gold-foreground" />
          </motion.div>
          <div>
            <h1 className="font-display font-bold text-sm text-foreground">LogiFlow</h1>
            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{companyName}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Hoofdmenu">
          {navItems.map((item) => (
            <motion.div key={item.id} whileTap={{ scale: 0.98 }}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary backdrop-blur-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.id === "cases" && unreadNotifications > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
                    {unreadNotifications}
                  </Badge>
                )}
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/30 flex items-center gap-2">
          <CompactThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-destructive rounded-xl"
            aria-label="Uitloggen"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Uitloggen
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar - Premium */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-xl border-r border-border/30 pt-safe"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center shadow-glow-gold">
                  <Truck className="h-5 w-5 text-gold-foreground" />
                </div>
                <span className="font-display font-bold text-sm">LogiFlow B2B</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl"
                aria-label="Menu sluiten"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="px-3 py-4 space-y-1" role="navigation" aria-label="Mobiel menu">
              {navItems.map((item) => (
                <motion.div key={item.id} whileTap={{ scale: 0.98 }}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all touch-manipulation",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/30 pb-safe">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-muted-foreground hover:text-destructive rounded-xl py-3 touch-manipulation"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Uitloggen
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header - Premium Glassmorphism */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-background/60 backdrop-blur-xl border-b border-border/30 pt-safe">
          <div className="flex items-center gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-xl touch-manipulation"
                onClick={() => setSidebarOpen(true)}
                aria-label="Menu openen"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </motion.div>
            <h2 className="font-display font-semibold text-lg hidden sm:block">B2B Portaal</h2>
          </div>

          <div className="flex items-center gap-2">
            <CompactThemeToggle />
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex gap-2 rounded-xl touch-manipulation"
                aria-label="Orders importeren"
                onClick={() => navigate("/portal/b2b")}
              >
                <Upload className="h-4 w-4" />
                Importeer
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative rounded-xl touch-manipulation"
                aria-label={`Notificaties${unreadNotifications > 0 ? `, ${unreadNotifications} ongelezen` : ''}`}
                onClick={onNotificationsClick || (() => navigate("/portal/b2b/cases"))}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <motion.span 
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </motion.span>
                )}
              </Button>
            </motion.div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{companyName}</span>
            </div>
          </div>
        </header>

      {/* Page Content with Pull-to-Refresh */}
        <main 
          ref={containerRef}
          className="p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto relative"
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          {/* Pull indicator */}
          <AnimatePresence>
            {(pullDistance > 0 || isRefreshing) && (
              <motion.div
                className="absolute left-0 right-0 flex flex-col items-center justify-center z-10 pointer-events-none"
                style={{ top: 0, height: pullDistance }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  "bg-card/95 backdrop-blur-sm border border-border/30 shadow-lg",
                  progress >= 1 && "border-primary/40"
                )}>
                  {isRefreshing ? (
                    <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <motion.div animate={{ rotate: progress * 180 }}>
                      <RefreshCw className={cn(
                        "h-5 w-5 transition-colors",
                        progress >= 1 ? "text-primary" : "text-muted-foreground"
                      )} />
                    </motion.div>
                  )}
                </div>
                {progress >= 0.5 && !isRefreshing && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-[11px] text-muted-foreground font-medium"
                  >
                    {progress >= 1 ? "Loslaten om te verversen" : "Trek om te verversen"}
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            style={{ transform: `translateY(${pullDistance}px)` }}
            className="min-h-full"
          >
            {/* Push notification banner */}
            <AnimatePresence>
              {showPushBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Bell className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Blijf op de hoogte van uw zendingen</p>
                      <p className="text-xs text-muted-foreground">Ontvang meldingen bij statuswijzigingen</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={handleDismissPush} className="text-xs rounded-xl">
                      Later
                    </Button>
                    <Button size="sm" onClick={handleEnablePush} className="rounded-xl text-xs">
                      Inschakelen
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {children}
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/30 pb-safe" role="navigation" aria-label="Mobiele navigatie">
          <div className="flex items-stretch justify-around">
            {[
              { icon: LayoutDashboard, label: "Dashboard", href: "/portal/b2b" },
              { icon: Package, label: "Zendingen", href: "/portal/b2b/shipments" },
              { icon: PlusCircle, label: "Nieuw", href: "/portal/b2b/book", accent: true },
              { icon: FileText, label: "Facturen", href: "/portal/b2b/invoices" },
              { icon: Ticket, label: "Cases", href: "/portal/b2b/cases", badge: unreadNotifications },
            ].map((tab) => (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] touch-manipulation transition-colors relative",
                  isActive(tab.href)
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                {tab.accent ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center shadow-glow-gold -mt-3">
                    <tab.icon className="h-5 w-5 text-gold-foreground" />
                  </div>
                ) : (
                  <div className="relative">
                    <tab.icon className="h-5 w-5" />
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                  </div>
                )}
                <span className={cn("text-[10px] font-medium", tab.accent && "-mt-0.5")}>{tab.label}</span>
                {isActive(tab.href) && !tab.accent && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default B2BLayout;
