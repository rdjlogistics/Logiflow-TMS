import { LucideIcon, Package, FileText, Bell, Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptyShipments({ onBook }: { onBook?: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="Geen zendingen"
      description="Je hebt nog geen zendingen. Maak je eerste boeking om te beginnen."
      action={onBook ? { label: "Nieuwe boeking", onClick: onBook } : undefined}
    />
  );
}

export function EmptyInvoices() {
  return (
    <EmptyState
      icon={FileText}
      title="Geen facturen"
      description="Er zijn nog geen facturen beschikbaar."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="Geen notificaties"
      description="Je bent helemaal bij! Er zijn geen nieuwe meldingen."
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="Geen resultaten"
      description={`Geen resultaten gevonden voor "${query}". Probeer een andere zoekterm.`}
    />
  );
}

export function EmptyCases({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="Geen cases"
      description="Er zijn geen openstaande cases. Alles is in orde!"
      action={onCreate ? { label: "Nieuwe case", onClick: onCreate } : undefined}
    />
  );
}

export function EmptyLabels() {
  return (
    <EmptyState
      icon={FileText}
      title="Geen labels beschikbaar"
      description="Labels zijn beschikbaar na bevestiging van de zending."
    />
  );
}
