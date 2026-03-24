import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Package, 
  PlusCircle, 
  User,
  Bell,
  LogOut,
  Settings,
  FileText,
  HelpCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import "@/styles/portal-theme.css";

interface ImperialLayoutProps {
  children: ReactNode;
  companyName: string;
  customerId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadNotifications: number;
  onNotificationsClick: () => void;
}

const bottomNavItems = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "shipments", label: "Zendingen", icon: Package },
  { id: "book", label: "Boeken", icon: PlusCircle },
  { id: "account", label: "Account", icon: User },
];

const menuItems = [
  { id: "contracts", label: "Contracten", icon: FileText },
  { id: "invoices", label: "Facturen", icon: FileText },
  { id: "settings", label: "Instellingen", icon: Settings },
  { id: "support", label: "Hulp & FAQ", icon: HelpCircle },
];

export const ImperialLayout = ({
  children,
  companyName,
  customerId,
  activeTab,
  onTabChange,
  unreadNotifications,
  onNotificationsClick,
}: ImperialLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/demo");
  };

  return (
    <div className="portal-imperial min-h-screen flex flex-col">
      {/* Header - Minimal & Authoritative */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--portal-border))]" 
        style={{ background: 'var(--portal-glass-bg)', backdropFilter: 'blur(20px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(var(--portal-gold))] to-[hsl(var(--portal-gold-muted))] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[hsl(222,47%,6%)]" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-sm tracking-tight text-[hsl(var(--portal-text))]">LogiFlow</h1>
              <p className="text-xs text-[hsl(var(--portal-text-muted))] truncate max-w-[120px]">{companyName}</p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button 
              onClick={onNotificationsClick}
              className="relative p-2 rounded-lg hover:bg-[hsl(var(--portal-surface))] transition-colors"
            >
              <Bell className="h-5 w-5 text-[hsl(var(--portal-text-secondary))]" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[hsl(var(--portal-gold))] text-[8px] font-bold text-[hsl(222,47%,6%)] flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Account Menu Overlay */}
      {showAccountMenu && activeTab === "account" && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowAccountMenu(false)}
        />
      )}

      {/* Account Slide-up Menu */}
      {activeTab === "account" && (
        <div className="fixed inset-x-0 bottom-[72px] z-40 portal-animate-slide-up">
          <div className="container mx-auto px-4 pb-4">
            <div className="portal-glass p-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[hsl(var(--portal-border))]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary-muted))] flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--portal-text))]">{companyName}</p>
                  <p className="text-sm text-[hsl(var(--portal-text-muted))]">Klant Account</p>
                </div>
              </div>

              <div className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[hsl(var(--portal-surface))] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-[hsl(var(--portal-text-secondary))]" />
                      <span className="text-[hsl(var(--portal-text))]">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[hsl(var(--portal-text-muted))]" />
                  </button>
                ))}

                <div className="pt-4 mt-4 border-t border-[hsl(var(--portal-border))]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[hsl(var(--portal-danger)/.1)] transition-colors text-[hsl(var(--portal-danger))]"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Uitloggen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - 4 Items */}
      <nav className="portal-bottom-nav">
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const isActive = activeTab === item.id || 
              (item.id === "account" && ["contracts", "invoices", "settings", "support"].includes(activeTab));
            const isBook = item.id === "book";
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "portal-nav-item",
                  isActive && "active",
                  isBook && "relative"
                )}
              >
                {isBook ? (
                  <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-br from-[hsl(var(--portal-gold))] to-[hsl(var(--portal-gold-muted))] flex items-center justify-center shadow-lg portal-pulse-gold">
                    <item.icon className="h-6 w-6 text-[hsl(222,47%,6%)]" />
                  </div>
                ) : (
                  <item.icon className="h-5 w-5" />
                )}
                <span className={cn(isBook && "mt-1")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ImperialLayout;
