import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Repeat,
  Search,
  Package,
  Scan,
  Keyboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  shortcut?: string;
  href?: string;
  action?: () => void;
  variant?: "default" | "primary" | "gold";
}

const defaultActions: QuickAction[] = [
  {
    id: "inbound",
    label: "Nieuwe Ontvangst",
    description: "Goederenontvangst registreren",
    icon: <ArrowDownToLine className="h-5 w-5" />,
    shortcut: "⌘I",
    href: "/wms/inbound",
    variant: "primary",
  },
  {
    id: "outbound",
    label: "Nieuwe Verzending",
    description: "Uitgaande order aanmaken",
    icon: <ArrowUpFromLine className="h-5 w-5" />,
    shortcut: "⌘O",
    href: "/wms/outbound",
  },
  {
    id: "picking",
    label: "Start Picking",
    description: "Wave of batch picking starten",
    icon: <ClipboardList className="h-5 w-5" />,
    shortcut: "⌘P",
    href: "/wms/picking",
  },
  {
    id: "transfer",
    label: "Inter-Warehouse",
    description: "Voorraadtransfer aanmaken",
    icon: <Repeat className="h-5 w-5" />,
    shortcut: "⌘T",
    href: "/wms/transfers",
  },
];

const variantStyles = {
  default: "bg-card/50 backdrop-blur-sm border-border/40 hover:border-border/60 hover:bg-card/80",
  primary: "bg-primary/5 backdrop-blur-sm border-primary/20 hover:border-primary/40 hover:bg-primary/10",
  gold: "bg-[hsl(var(--accent))]/5 backdrop-blur-sm border-[hsl(var(--accent))]/20 hover:border-[hsl(var(--accent))]/40 hover:bg-[hsl(var(--accent))]/10",
};

interface WMSQuickActionsProps {
  actions?: QuickAction[];
  className?: string;
}

export function WMSQuickActions({
  actions = defaultActions,
  className,
}: WMSQuickActionsProps) {
  const navigate = useNavigate();

  const handleAction = (action: QuickAction) => {
    if (action.action) {
      action.action();
    } else if (action.href) {
      navigate(action.href);
    }
  };

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 10 }}

          onClick={() => handleAction(action)}
          className={cn(
            "group relative flex items-center gap-3 px-4 py-3.5 rounded-xl border",
            "transition-all duration-200 text-left",
            variantStyles[action.variant || "default"]
          )}
        >
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
            action.variant === "primary" ? "bg-primary/10 text-primary" : 
            action.variant === "gold" ? "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]" :
            "bg-muted text-muted-foreground group-hover:text-foreground"
          )}>
            {action.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{action.label}</p>
            <p className="text-xs text-muted-foreground truncate">{action.description}</p>
          </div>
          {action.shortcut && (
            <Badge 
              variant="outline" 
              className="hidden lg:flex ml-auto text-[10px] font-mono opacity-50 group-hover:opacity-100 transition-opacity"
            >
              {action.shortcut}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}

// Command palette for WMS
export function WMSCommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands = [
    { label: "Dashboard", href: "/wms", icon: <Package className="h-4 w-4" /> },
    { label: "Voorraad bekijken", href: "/wms/inventory", icon: <Search className="h-4 w-4" /> },
    { label: "Nieuwe ontvangst", href: "/wms/inbound", icon: <ArrowDownToLine className="h-4 w-4" /> },
    { label: "Nieuwe verzending", href: "/wms/outbound", icon: <ArrowUpFromLine className="h-4 w-4" /> },
    { label: "Picking starten", href: "/wms/picking", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Transfer aanmaken", href: "/wms/transfers", icon: <Repeat className="h-4 w-4" /> },
    { label: "Scan product", href: "/wms/inventory", icon: <Scan className="h-4 w-4" /> },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Zoeken...</span>
        <Badge variant="secondary" className="ml-1 text-[10px] font-mono">
          ⌘K
        </Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek in WMS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted/50 border-0"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            
              {filtered.map((cmd, i) => (
                <motion.button
                  key={cmd.href}
                  initial={{ opacity: 0, y: -10 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => {
                    navigate(cmd.href);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                    {cmd.icon}
                  </div>
                  <span className="font-medium">{cmd.label}</span>
                </button>
              ))}
            
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" /> Navigeren
              </span>
              <span>↵ Selecteren</span>
            </div>
            <span>ESC om te sluiten</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
