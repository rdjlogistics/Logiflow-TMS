import { Home, Calendar, MessageSquare, Route, User, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DriverTab = 'home' | 'rooster' | 'chat' | 'ritten' | 'profiel';

interface DriverBottomNavProps {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
  badges?: Partial<Record<DriverTab, number>>;
}

const driverTabs: { id: DriverTab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'rooster', icon: Calendar, label: 'Rooster' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'ritten', icon: Route, label: 'Ritten' },
  { id: 'profiel', icon: User, label: 'Profiel' },
];

export function DriverBottomNav({ activeTab, onTabChange, badges = {} }: DriverBottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08]"
      style={{
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        background: "rgba(10, 12, 20, 0.82)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
      }}
    >
      <div className="grid grid-cols-5 px-2 py-1">
        {driverTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = badges[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px] touch-manipulation select-none active:scale-90 transition-transform duration-100"
            >
              {isActive && (
                <div className="absolute -top-1 w-5 h-[2.5px] rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-all duration-300" />
              )}

              <div className="relative">
                <tab.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors duration-200",
                    isActive ? "text-white" : "text-white/40"
                  )}
                  strokeWidth={isActive ? 1.8 : 1.5}
                />
                {badge && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  </span>
                )}
              </div>

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
  );
}
