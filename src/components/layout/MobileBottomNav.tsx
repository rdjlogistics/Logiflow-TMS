import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  { id: "new", icon: Plus, label: "Nieuw", path: "/orders/edit", isCta: true },
  { id: "meldingen", icon: Bell, label: "Meldingen", path: "/admin/settings", search: "?tab=notificaties" },
  { id: "instellingen", icon: Settings, label: "Instellingen", path: "/admin/settings" },
];

function getActiveTab(pathname: string, search: string): string {
  if (pathname === "/admin/settings" && search.includes("tab=notificaties")) {
    return "meldingen";
  }
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
      <div
        className="border-t border-white/[0.06]"
        style={{
          background: "linear-gradient(180deg, hsl(228 60% 9% / 0.92), hsl(228 60% 7% / 0.97))",
          backdropFilter: "blur(48px) saturate(200%)",
          WebkitBackdropFilter: "blur(48px) saturate(200%)",
        }}
      >
        <div className="grid grid-cols-5 px-2 py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            if (tab.isCta) {
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    haptic("medium");
                    navigate(tab.path);
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center -mt-3 touch-manipulation select-none"
                  aria-label={tab.label}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 ring-[3px] ring-background flex items-center justify-center">
                    <Plus className="h-[18px] w-[18px] text-primary-foreground" strokeWidth={2.4} />
                  </div>
                </motion.button>
              );
            }

            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  haptic("selection");
                  navigate(tab.path + (tab.search || ""));
                }}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1 min-h-[42px] touch-manipulation select-none"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute -top-1.5 w-4 h-[3px] rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}

                <tab.icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-150",
                    isActive ? "text-white" : "text-white/35"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />

                <span
                  className={cn(
                    "text-[10px] leading-none tracking-wide transition-colors duration-150",
                    isActive
                      ? "font-semibold text-white"
                      : "font-normal text-white/35"
                  )}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
