import { Home, Calendar, MessageSquare, Route, User, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DriverTab = 'home' | 'rooster' | 'chat' | 'ritten' | 'profiel';

interface BottomNavItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

const BottomNavItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  badge, 
  onClick,
}: BottomNavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 relative min-w-0",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
        isActive && "bg-primary/15"
      )}>
        <Icon className={cn(
          "h-5 w-5 transition-transform duration-200", 
          isActive && "scale-110"
        )} />
      </div>
      <span className={cn(
        "text-[10px] font-medium mt-0.5 truncate", 
        isActive && "font-semibold"
      )}>{label}</span>
      {badge && badge > 0 && (
        <div className="absolute top-0.5 right-1/2 translate-x-4 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
        </div>
      )}
    </button>
  );
};

interface DriverBottomNavProps {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
  badges?: Partial<Record<DriverTab, number>>;
}

export function DriverBottomNav({ activeTab, onTabChange, badges = {} }: DriverBottomNavProps) {
  const tabs: { id: DriverTab; icon: LucideIcon; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'rooster', icon: Calendar, label: 'Rooster' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'ritten', icon: Route, label: 'Ritten' },
    { id: 'profiel', icon: User, label: 'Profiel' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/40 z-40 pb-safe">
      <div className="grid grid-cols-5 gap-0.5 px-2 py-1.5">
        {tabs.map((tab) => (
          <BottomNavItem
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            isActive={activeTab === tab.id}
            badge={badges[tab.id]}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>
    </div>
  );
}