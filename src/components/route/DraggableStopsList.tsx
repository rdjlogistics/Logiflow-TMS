import React, { useState, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { Announce } from "@/components/accessibility/FocusStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GripVertical,
  MapPin,
  Package,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Settings,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import type { OptimizableStop } from "@/hooks/useAdvancedRouteOptimization";

interface DraggableStopsListProps {
  stops: OptimizableStop[];
  onStopsChange: (stops: OptimizableStop[]) => void;
  onAddStop?: () => void;
  isLoading?: boolean;
}

const priorityConfig = {
  normal: { label: "Normaal", color: "bg-muted text-muted-foreground" },
  high: { label: "Hoog", color: "bg-yellow-500/20 text-yellow-600" },
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-600" },
};

const stopTypeConfig = {
  pickup: { label: "Ophalen", color: "bg-primary", icon: Package },
  delivery: { label: "Afleveren", color: "bg-accent", icon: MapPin },
  stop: { label: "Tussenstop", color: "bg-secondary", icon: MapPin },
};

const DraggableStopsList: React.FC<DraggableStopsListProps> = ({
  stops,
  onStopsChange,
  onAddStop,
  isLoading,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragAnnouncement, setDragAnnouncement] = useState('');

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
    haptic('medium');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newStops = [...stops];
      const [movedStop] = newStops.splice(draggedIndex, 1);
      newStops.splice(dragOverIndex, 0, movedStop);
      onStopsChange(newStops);
      haptic('success');
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, stops, onStopsChange]);

  const moveStop = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= stops.length) return;

      const newStops = [...stops];
      [newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
      onStopsChange(newStops);
    },
    [stops, onStopsChange]
  );

  const updateStop = useCallback(
    (index: number, updates: Partial<OptimizableStop>) => {
      const newStops = [...stops];
      newStops[index] = { ...newStops[index], ...updates };
      onStopsChange(newStops);
    },
    [stops, onStopsChange]
  );

  const removeStop = useCallback(
    (index: number) => {
      const newStops = stops.filter((_, i) => i !== index);
      onStopsChange(newStops);
    },
    [stops, onStopsChange]
  );

  const formatTimeWindow = (start?: string | null, end?: string | null): string | null => {
    if (!start && !end) return null;
    const startTime = start ? new Date(start).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    const endTime = end ? new Date(end).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    return `${startTime} - ${endTime}`;
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-primary" />
            Stops
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 bg-muted/30 rounded-xl animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-primary" />
            Stops ({stops.length})
          </CardTitle>
          {onAddStop && (
            <Button size="sm" variant="outline" onClick={onAddStop}>
              <Plus className="h-4 w-4 mr-1" />
              Stop toevoegen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stops.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Geen stops toegevoegd. Importeer een bestand of voeg handmatig stops toe.
          </p>
        ) : (
          <div className="space-y-1" data-stops-container>
            <Announce message={dragAnnouncement} priority="assertive" />
            {stops.map((stop, index) => {
              const typeConfig = stopTypeConfig[stop.stopType] || stopTypeConfig.stop;
              const priority = priorityConfig[stop.priority || "normal"];
              const TypeIcon = typeConfig.icon;
              const timeWindow = formatTimeWindow(stop.timeWindowStart, stop.timeWindowEnd);
              const isLast = index === stops.length - 1;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div key={stop.id} className="relative">
                  {/* Connection line */}
                  {!isLast && (
                    <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-primary/20 z-0" />
                  )}

                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative flex gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing z-10 ${
                      isDragging
                        ? "opacity-50 bg-primary/10 border border-primary/30"
                        : isDragOver
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    {/* Drag handle and stop number */}
                    <div className="relative flex flex-col items-center gap-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${typeConfig.color}`}
                      >
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <button
                        type="button"
                        data-grip-handle
                        aria-label={`Verplaats stop ${index + 1}`}
                        aria-roledescription="versleepbaar"
                        className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' && index > 0) {
                            e.preventDefault();
                            e.stopPropagation();
                            moveStop(index, 'up');
                            haptic('selection');
                            setDragAnnouncement(`Stop ${index + 1} verplaatst naar positie ${index}`);
                            requestAnimationFrame(() => {
                              const container = e.currentTarget.closest('[data-stops-container]');
                              const grips = container?.querySelectorAll<HTMLButtonElement>('[data-grip-handle]');
                              grips?.[index - 1]?.focus();
                            });
                          } else if (e.key === 'ArrowDown' && index < stops.length - 1) {
                            e.preventDefault();
                            e.stopPropagation();
                            moveStop(index, 'down');
                            haptic('selection');
                            setDragAnnouncement(`Stop ${index + 1} verplaatst naar positie ${index + 2}`);
                            requestAnimationFrame(() => {
                              const container = e.currentTarget.closest('[data-stops-container]');
                              const grips = container?.querySelectorAll<HTMLButtonElement>('[data-grip-handle]');
                              grips?.[index + 1]?.focus();
                            });
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Stop details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                            {stop.priority && stop.priority !== "normal" && (
                              <Badge className={priority.color}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {priority.label}
                              </Badge>
                            )}
                          </div>
                          {stop.companyName && (
                            <p className="font-medium text-sm truncate">{stop.companyName}</p>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {stop.address}
                            {stop.houseNumber && ` ${stop.houseNumber}`}
                            {stop.city && `, ${stop.city}`}
                          </p>
                          {!stop.latitude || !stop.longitude ? (
                            <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Geen coördinaten - geocoding nodig
                            </p>
                          ) : null}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Type</Label>
                                  <Select
                                    value={stop.stopType}
                                    onValueChange={(v) =>
                                      updateStop(index, { stopType: v as OptimizableStop["stopType"] })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pickup">Ophalen</SelectItem>
                                      <SelectItem value="delivery">Afleveren</SelectItem>
                                      <SelectItem value="stop">Tussenstop</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Prioriteit</Label>
                                  <Select
                                    value={stop.priority || "normal"}
                                    onValueChange={(v) =>
                                      updateStop(index, { priority: v as OptimizableStop["priority"] })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normaal</SelectItem>
                                      <SelectItem value="high">Hoog</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Tijdvenster start</Label>
                                  <Input
                                    type="time"
                                    value={
                                      stop.timeWindowStart
                                        ? new Date(stop.timeWindowStart).toLocaleTimeString("nl-NL", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : ""
                                    }
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const today = new Date();
                                        const [hours, minutes] = e.target.value.split(":");
                                        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                        updateStop(index, { timeWindowStart: today.toISOString() });
                                      } else {
                                        updateStop(index, { timeWindowStart: null });
                                      }
                                    }}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Tijdvenster eind</Label>
                                  <Input
                                    type="time"
                                    value={
                                      stop.timeWindowEnd
                                        ? new Date(stop.timeWindowEnd).toLocaleTimeString("nl-NL", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : ""
                                    }
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const today = new Date();
                                        const [hours, minutes] = e.target.value.split(":");
                                        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                        updateStop(index, { timeWindowEnd: today.toISOString() });
                                      } else {
                                        updateStop(index, { timeWindowEnd: null });
                                      }
                                    }}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Stoptijd (minuten)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={stop.serviceDuration || 0}
                                    onChange={(e) =>
                                      updateStop(index, { serviceDuration: parseInt(e.target.value) || 0 })
                                    }
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => moveStop(index, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => moveStop(index, "down")}
                            disabled={isLast}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeStop(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Time window */}
                      {timeWindow && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Tijdvenster: {timeWindow}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {stop.notes && (
                        <div className="flex items-start gap-2 mt-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{stop.notes}</span>
                        </div>
                      )}

                      {/* Document indicator */}
                      {stop.documentName && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-primary/80">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="truncate">{stop.documentName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DraggableStopsList;
