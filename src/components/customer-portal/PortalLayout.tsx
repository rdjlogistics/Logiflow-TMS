import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  LogOut, 
  Home, 
  Plus, 
  Package, 
  FileText,
  HelpCircle,
  Bell,
  User,
  Menu,
  MapPin,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CustomerAIButton } from "@/components/portal-ai";
import { cn } from "@/lib/utils";

interface PortalLayoutProps {
  children: ReactNode;
  companyName: string;
  customerId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadNotifications: number;
  onNotificationsClick: () => void;
}

const navigationItems = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "book", label: "Boeken", icon: Plus },
  { id: "shipments", label: "Zendingen", icon: Package },
  { id: "locations", label: "Locaties", icon: MapPin },
  { id: "templates", label: "Sjablonen", icon: FileSpreadsheet },
  { id: "import", label: "Import", icon: Upload },
  { id: "contracts", label: "Contracten", icon: FileText },
  { id: "support", label: "Support", icon: HelpCircle },
];

export const PortalLayout = ({
  children,
  companyName,
  customerId,
  activeTab,
  onTabChange,
  unreadNotifications,
  onNotificationsClick,
}: PortalLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Premium Header */}
      <header className="border-b border-border/40 bg-background/90 backdrop-blur-2xl sticky top-0 z-50 shadow-lg shadow-black/5">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Company */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-primary/60 blur-lg opacity-40" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/25">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg tracking-tight">Klantenportaal</h1>
              <p className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">{companyName}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "gap-2 rounded-xl transition-all duration-300",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative rounded-xl"
              onClick={onNotificationsClick}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-amber-500 to-orange-500 border-0 shadow-lg shadow-amber-500/40 animate-pulse"
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </Button>

            {/* AI Assistant */}
            <CustomerAIButton tenantId={customerId} />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl hidden sm:flex">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="font-medium">{companyName}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "default" : "ghost"}
                      className="justify-start gap-3"
                      onClick={() => onTabChange(item.id)}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  ))}
                  <div className="border-t border-border my-4" />
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    Uitloggen
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08]"
        style={{
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
          background: "rgba(10, 12, 20, 0.82)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
        }}
      >
        <div className="grid grid-cols-4 px-2 py-1">
          {navigationItems.slice(0, 4).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px] touch-manipulation select-none active:scale-90 transition-transform duration-100"
              >
                {isActive && (
                  <div className="absolute -top-1 w-5 h-[2.5px] rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-all duration-300" />
                )}
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors duration-200",
                    isActive ? "text-white" : "text-white/40"
                  )}
                  strokeWidth={isActive ? 1.8 : 1.5}
                />
                <span
                  className={cn(
                    "text-[10px] leading-none tracking-wide transition-colors duration-200",
                    isActive ? "font-medium text-white" : "font-normal text-white/40"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default PortalLayout;
