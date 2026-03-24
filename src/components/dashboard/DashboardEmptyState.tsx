import React, { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileUp, 
  Plus, 
  Settings, 
  Wallet,
  ArrowRight,
  Sparkles,
  Route
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupAction {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed?: boolean;
  primary?: boolean;
}

interface DashboardEmptyStateProps {
  hasOrders: boolean;
  hasRates: boolean;
  hasBankConnected: boolean;
  hasCustomers: boolean;
}

const DashboardEmptyState = forwardRef<HTMLDivElement, DashboardEmptyStateProps>(
  ({ hasOrders, hasRates, hasBankConnected, hasCustomers }, ref) => {
  const setupActions: SetupAction[] = [
    {
      label: "Importeer orders",
      description: "Upload bestaande orders via CSV of Excel",
      icon: FileUp,
      href: "/orders?action=import",
      completed: hasOrders,
      primary: !hasOrders,
    },
    {
      label: "Maak testorder",
      description: "Creëer een voorbeeldorder om te starten",
      icon: Plus,
      href: "/orders",
      completed: hasOrders,
    },
    {
      label: "Stel tarieven in",
      description: "Configureer je standaard prijzen en toeslagen",
      icon: Settings,
      href: "/pricing/rates",
      completed: hasRates,
    },
    {
      label: "Koppel bank",
      description: "Verbind je bankrekening voor automatische matching",
      icon: Wallet,
      href: "/finance/settings",
      completed: hasBankConnected,
    },
  ];

  const incompleteActions = setupActions.filter(a => !a.completed);
  const allComplete = incompleteActions.length === 0;

  if (allComplete) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card/90 to-muted/30 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Welkom bij je Command Center</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Nog geen data om te tonen. Voltooi onderstaande stappen om te beginnen.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {incompleteActions.map((action) => (
            <Link key={action.label} to={action.href}>
              <div
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl transition-all duration-200",
                  "border hover:shadow-md cursor-pointer group",
                  action.primary
                    ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                    : "bg-muted/30 border-border/50 hover:border-border"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  action.primary ? "bg-primary/10" : "bg-muted"
                )}>
                  <action.icon className={cn(
                    "h-4 w-4",
                    action.primary ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    action.primary && "text-primary"
                  )}>
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border/50">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((setupActions.length - incompleteActions.length) / setupActions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {setupActions.length - incompleteActions.length}/{setupActions.length} voltooid
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

DashboardEmptyState.displayName = "DashboardEmptyState";

export default DashboardEmptyState;
