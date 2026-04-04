import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  Package, 
  PlusCircle, 
  HelpCircle,
  User,
  Bell,
  Truck,
} from "lucide-react";

interface B2CLayoutProps {
  children: ReactNode;
  userName?: string;
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
}

const navItems = [
  { id: "shipments", label: "Zendingen", icon: Package, href: "/portal/b2c" },
  { id: "book", label: "Versturen", icon: PlusCircle, href: "/portal/b2c/book" },
  { id: "help", label: "Help", icon: HelpCircle, href: "/portal/b2c/help" },
  { id: "account", label: "Account", icon: User, href: "/portal/b2c/account" },
];

export const B2CLayout = ({
  children,
  userName = "Klant",
  unreadNotifications = 0,
  onNotificationsClick,
}: B2CLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/portal/b2c") {
      return location.pathname === href || location.pathname.startsWith("/portal/b2c/track");
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - Glassmorphism Premium */}
      <header className="sticky top-0 z-40 bg-card/60 backdrop-blur-xl border-b border-border/30 pt-safe">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center shadow-glow-gold">
              <Truck className="h-5 w-5 text-gold-foreground" />
            </div>
            <span className="font-display font-bold text-base hidden sm:block">LogiFlow</span>
          </motion.div>

          {/* Notifications */}
          <motion.button 
            onClick={onNotificationsClick || (() => toast.info("Notificaties", { description: "Je hebt geen nieuwe notificaties." }))}
            className="relative p-3 rounded-xl hover:bg-muted/50 transition-colors touch-manipulation"
            aria-label={`Notificaties${unreadNotifications > 0 ? `, ${unreadNotifications} ongelezen` : ''}`}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <motion.span 
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gold text-[10px] font-bold text-gold-foreground flex items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
              >
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </motion.span>
            )}
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-28">
        {children}
      </main>

      {/* Bottom Navigation - Premium Glassmorphism with Safe Area */}
      <nav 
        className="fixed bottom-0 inset-x-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border/30 pb-safe"
        role="navigation"
        aria-label="Hoofdnavigatie"
      >
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const isBook = item.id === "book";
            
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all min-w-[60px] touch-manipulation",
                  active ? "text-primary" : "text-muted-foreground",
                  isBook && "relative",
                  !isBook && active && "bg-primary/10"
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                {isBook ? (
                  <motion.div 
                    className="w-14 h-14 -mt-7 rounded-2xl bg-gradient-to-br from-gold to-gold-muted flex items-center justify-center shadow-glow-gold"
                    whileHover={{ scale: 1.05 }}
                  >
                    <item.icon className="h-7 w-7 text-gold-foreground" />
                  </motion.div>
                ) : (
                  <item.icon className={cn("h-6 w-6 transition-colors", active && "text-primary")} />
                )}
                <span className={cn(
                  "text-[11px] font-medium transition-colors",
                  isBook && "mt-1",
                  active && "text-primary"
                )}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default B2CLayout;
