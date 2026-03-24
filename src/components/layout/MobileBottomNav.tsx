import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, FileText, Plus, Bell, Settings, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type NavTab = {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  search?: string;
  isCta?: boolean;
};

const tabs: NavTab[] = [
  { id: "home", icon: Home, label: "Home", path: "/" },
  { id: "orders", icon: FileText, label: "Orders", path: "/orders" },
  { id: "new", icon: Plus, label: "Nieuw", path: "/order/new", isCta: true },
  { id: "meldingen", icon: Bell, label: "Meldingen", path: "/admin/settings", search: "?tab=notificaties" },
  { id: "instellingen", icon: Settings, label: "Instellingen", path: "/admin/settings" },
];

function getActiveTab(pathname: string, search: string): string {
  // Meldingen: only active when ?tab=notificaties is present
  if (pathname === "/admin/settings" && search.includes("tab=notificaties")) {
    return "meldingen";
  }
  // Instellingen: /admin/settings without notificaties tab
  if (pathname.startsWith("/admin/settings")) {
    return "instellingen";
  }
  if (pathname === "/") return "home";
  if (pathname.startsWith("/orders") || pathname.startsWith("/order")) return "orders";
  return "home";
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname, location.search);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      role="navigation"
      aria-label="Hoofdnavigatie"
    >
      {/* Gradient accent line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Glass bar */}
      <div className="bg-background/60 backdrop-blur-3xl border-t border-border/20">
        <div className="grid grid-cols-5 gap-0 px-1 py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            if (tab.isCta) {
              return (
                <div key={tab.id} className="flex items-center justify-center">
                  <motion.button
                    onClick={() => {
                      haptic("medium");
                      navigate(tab.path);
                    }}
                    whileTap={{ scale: 0.85 }}
                    className="relative flex flex-col items-center justify-center touch-manipulation select-none"
                    aria-label={tab.label}
                  >
                    {/* Pulse ring */}
                    <motion.div
                      className="absolute w-14 h-14 rounded-2xl border border-primary/30"
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    {/* Orb */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center -mt-3">
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold mt-0.5 text-primary">
                      Nieuw
                    </span>
                  </motion.button>
                </div>
              );
            }

            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  haptic("selection");
                  navigate(tab.path + (tab.search || ""));
                }}
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-colors min-w-0 touch-manipulation select-none"
                )}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active pill background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl bg-primary/8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                      isActive && "text-primary"
                    )}
                  >
                    <motion.div
                      animate={isActive ? { scale: 1.12 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <tab.icon
                        className={cn(
                          "h-[22px] w-[22px] transition-colors duration-200",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                    </motion.div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-0 truncate transition-colors duration-200",
                      isActive
                        ? "font-bold text-primary"
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                </div>

                {/* Active dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary shadow-sm shadow-primary/50"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
