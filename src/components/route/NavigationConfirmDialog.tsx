import React, { useState, useEffect, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Navigation } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NavApp } from "@/lib/navigation-urls";

interface Stop {
  id: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priority: string;
}

interface NavigationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stops: Stop[];
  onConfirm: (selectedStops: Stop[]) => void;
  navApp: NavApp;
}

const appLabels: Record<NavApp, { title: string; icon: string; buttonLabel: string }> = {
  google: { title: "Google Maps", icon: "🗺️", buttonLabel: "Openen in Google Maps" },
  waze: { title: "Waze", icon: "👻", buttonLabel: "Openen in Waze" },
  apple: { title: "Apple Kaarten", icon: "🍎", buttonLabel: "Openen in Apple Kaarten" },
};

export const NavigationConfirmDialog: React.FC<NavigationConfirmDialogProps> = ({
  open,
  onOpenChange,
  stops,
  onConfirm,
  navApp,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const labels = appLabels[navApp];

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(stops.map((s) => s.id)));
    }
  }, [open, stops]);

  const allSelected = selectedIds.size === stops.length;
  const selectedCount = selectedIds.size;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(stops.map((s) => s.id)));
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedStops = useMemo(
    () => stops.filter((s) => selectedIds.has(s.id)),
    [stops, selectedIds]
  );

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" size="sm">Hoog</Badge>;
      case "medium":
        return <Badge variant="secondary" size="sm">Medium</Badge>;
      case "low":
        return <Badge variant="outline" size="sm">Laag</Badge>;
      default:
        return null;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {navApp === "google" ? (
              <MapPin className="h-5 w-5" />
            ) : (
              <Navigation className="h-5 w-5" />
            )}
            {labels.icon} Route openen in {labels.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Selecteer welke stops je wilt opnemen in de route. {selectedCount} van {stops.length} stops geselecteerd.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Select all toggle */}
        <div className="flex items-center gap-2 pb-1 border-b">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none">
            {allSelected ? "Alles deselecteren" : "Alles selecteren"}
          </label>
        </div>

        {/* Stop list */}
        <ScrollArea className="max-h-[340px] -mx-1 px-1">
          <div className="space-y-1">
            {stops.map((stop, idx) => (
              <label
                key={stop.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(stop.id)}
                  onCheckedChange={() => toggle(stop.id)}
                />
                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{stop.address}</p>
                  {stop.city && (
                    <p className="text-xs text-muted-foreground truncate">{stop.city}</p>
                  )}
                </div>
                {priorityBadge(stop.priority)}
              </label>
            ))}
          </div>
        </ScrollArea>

        {/* Warning for >25 stops (Google Maps only) */}
        {navApp === "google" && selectedCount > 25 && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Meer dan 25 stops geselecteerd. De route wordt automatisch opgesplitst in meerdere tabbladen.
            </span>
          </div>
        )}

        {/* Warning for Waze / Apple Maps (multiple tabs) */}
        {navApp !== "google" && selectedCount > 1 && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {labels.title} ondersteunt geen multi-stop routes. Elke stop wordt in een apart tabblad geopend ({selectedCount} tabbladen).
            </span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            disabled={selectedCount < 1}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(selectedStops);
              onOpenChange(false);
            }}
          >
            {labels.buttonLabel} ({selectedCount})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
