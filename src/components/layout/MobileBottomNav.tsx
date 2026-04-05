import { useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, Plus, Euro, Settings, LucideIcon } from "lucide-react";
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
  { id: "finance", icon: Euro, label: "Financieel", path: "/finance/cashflow" },
  { id: "instellingen", icon: Settings, label: "Meer", path: "/admin/settings" },
];

function getActiveTab(pathname: string, search: string): string {
  if (pathname.startsWith("/admin/settings")) return "instellingen";
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
          background: "rgba(10, 12, 20, 0.82)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
        }}
      >
        <div className="grid grid-cols-4 px-2 py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            if (tab.isCta) {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    haptic("medium");
                    navigate(tab.path);
                  }}
                  className="flex items-center justify-center -mt-3.5 touch-manipulation select-none active:scale-90 transition-transform duration-100"
                  aria-label={tab.label}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30 ring-2 ring-white/[0.08] flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptic("selection");
                  navigate(tab.path + (tab.search || ""));
                }}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px] touch-manipulation select-none active:scale-90 transition-transform duration-100"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <div className="absolute -top-1 w-5 h-[2.5px] rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-all duration-300" />
                )}

                <tab.icon
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
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
