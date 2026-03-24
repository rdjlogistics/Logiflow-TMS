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
  { id: "new", icon: Plus, label: "Nieuw", path: "/order/new", isCta: true },
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
        className="border-t border-white/[0.08]"
        style={{
          background: "linear-gradient(180deg, hsl(228 60% 10% / 0.95), hsl(228 60% 8% / 0.98))",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
        }}
      >
        <div className="grid grid-cols-5 gap-0 px-1 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  haptic(tab.isCta ? "medium" : "selection");
                  navigate(tab.path + (tab.search || ""));
                }}
                whileTap={{ scale: 0.92 }}
                className="relative flex flex-col items-center justify-center py-1 px-1 min-w-0 min-h-[44px] touch-manipulation select-none"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="flex flex-col items-center gap-0.5">
                  {tab.isCta ? (
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20"
                    )}>
                      <motion.div
                        animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      >
                        <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
                      </motion.div>
                    </div>
                  ) : (
                    <motion.div
                      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
                        isActive && "bg-primary/15 border border-primary/20"
                      )}
                    >
                      <tab.icon
                        className={cn(
                          "h-[22px] w-[22px] transition-colors duration-200",
                          isActive ? "text-white" : "text-blue-300/70"
                        )}
                        strokeWidth={isActive ? 2.2 : 1.5}
                      />
                    </motion.div>
                  )}

                  {!tab.isCta && (
                    <span
                      className={cn(
                        "text-[11px] leading-none truncate transition-colors duration-200",
                        isActive
                          ? "font-semibold text-white"
                          : "font-normal text-blue-300/60"
                      )}
                    >
                      {tab.label}
                    </span>
                  )}
                </div>

                {/* Bottom glow indicator */}
                {isActive && !tab.isCta && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -bottom-2 w-5 h-[2px] rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
