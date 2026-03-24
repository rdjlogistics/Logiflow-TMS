import { useState, useMemo, useRef, useCallback } from "react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Clock,
  Truck,
  Euro,
  Users,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Send,
  Pause,
  CalendarIcon,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  UserCircle,
  GripVertical,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import {
  useProgramShifts,
  useCreateShift,
  useUpdateShift,
  usePublishShift,
  useDeleteShift,
  type ProgramShift,
  type ShiftStatus,
  type CreateShiftData,
} from "@/hooks/useProgramShifts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

const statusConfig: Record<ShiftStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Concept", variant: "outline" },
  published: { label: "Open", variant: "secondary" },
  paused: { label: "Gepauzeerd", variant: "outline" },
  filled: { label: "Toegewezen", variant: "default" },
  in_progress: { label: "Onderweg", variant: "default" },
  completed: { label: "Afgerond", variant: "secondary" },
  cancelled: { label: "Geannuleerd", variant: "destructive" },
};

const vehicleTypes = [
  "Bus Klein",
  "Bus Groot",
  "Sprinter",
  "Vrachtwagen 7.5t",
  "Vrachtwagen 12t",
  "Trekker + Trailer",
];

const compensationTypes = [
  { value: "fixed", label: "Vast bedrag" },
  { value: "hourly", label: "Per uur" },
  { value: "per_trip", label: "Per rit" },
  { value: "per_km", label: "Per km" },
];

export default function PlanningProgram() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ProgramShift | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "agenda">("agenda");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedShift, setDraggedShift] = useState<ProgramShift | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [driverPanelOpen, setDriverPanelOpen] = useState(true);
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);
  const [pickShiftDialog, setPickShiftDialog] = useState<{ driverId: string; driverName: string; dateKey: string; shifts: ProgramShift[] } | null>(null);
  
  // Touch drag-and-drop state
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDragShift, setTouchDragShift] = useState<ProgramShift | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Undo state for shift moves
  const lastMoveRef = useRef<{ shiftId: string; originalDate: string } | null>(null);
  
  // Swipe navigation state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);
  const agendaContainerRef = useRef<HTMLDivElement>(null);
  
  // Week transition animation state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<"left" | "right" | null>(null);
  const previousWeekRef = useRef(weekStart);
  
  // Custom week setter with animation
  const animatedSetWeekStart = useCallback((newWeek: Date | ((prev: Date) => Date)) => {
    const resolvedWeek = typeof newWeek === "function" ? newWeek(weekStart) : newWeek;
    const direction = resolvedWeek > weekStart ? "left" : "right";
    
    setTransitionDirection(direction);
    setIsTransitioning(true);
    
    // After exit animation, update week
    setTimeout(() => {
      setWeekStart(resolvedWeek);
      // After a brief moment, trigger enter animation
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 50);
    }, 150);
  }, [weekStart]);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateShiftData>>({
    trip_date: new Date().toISOString().split("T")[0],
    start_time: "08:00",
    pickup_address: "",
    delivery_address: "",
    compensation_type: "fixed",
    compensation_amount: 0,
    show_compensation_to_driver: true,
    create_order_on_approval: true,
  });

  const { data: shifts = [], isLoading } = useProgramShifts({
    status: statusFilter !== "all" ? [statusFilter as ShiftStatus] : undefined,
    dateFrom: dateFilter ? format(dateFilter, "yyyy-MM-dd") : undefined,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, company_name").order("company_name");
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["profiles-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      return (data || []).filter(d => d.full_name);
    },
  });

  const filteredDrivers = useMemo(() => {
    if (!driverSearchQuery) return drivers;
    const q = driverSearchQuery.toLowerCase();
    return drivers.filter(d => d.full_name?.toLowerCase().includes(q));
  }, [drivers, driverSearchQuery]);

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const publishShift = usePublishShift();
  const deleteShift = useDeleteShift();

  // Week days for agenda view
  const weekDays = useMemo(() => {
    const start = weekStart;
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [weekStart]);

  // Group shifts by date for agenda view
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, ProgramShift[]> = {};
    shifts.forEach((shift) => {
      const key = shift.trip_date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(shift);
    });
    return grouped;
  }, [shifts]);

  const filteredShifts = shifts.filter((shift) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        shift.title?.toLowerCase().includes(q) ||
        shift.pickup_city?.toLowerCase().includes(q) ||
        shift.delivery_city?.toLowerCase().includes(q) ||
        shift.customer?.company_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Drag and drop handlers — shifts
  const handleDragStart = (e: React.DragEvent, shift: ProgramShift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/shift-id", shift.id);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedShift(null);
    setDragOverDate(null);
    setDragOverShiftId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  // Drag and drop handlers — drivers
  const handleDriverDragStart = (e: React.DragEvent, driverId: string, driverName: string) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/driver-id", driverId);
    e.dataTransfer.setData("application/driver-name", driverName);
  };

  const isDriverDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("application/driver-id");

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isDriverDrag(e) ? "copy" : "move";
    setDragOverDate(dateKey);
  };

  const handleShiftDragOver = (e: React.DragEvent, shiftId: string) => {
    if (!isDriverDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOverShiftId(shiftId);
  };

  const handleShiftDragLeave = () => {
    setDragOverShiftId(null);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  // Assign driver to a specific shift
  const assignDriverToShift = useCallback(async (shiftId: string, driverId: string, driverName: string) => {
    try {
      await updateShift.mutateAsync({
        id: shiftId,
        assigned_driver_id: driverId,
        status: "filled" as ShiftStatus,
      });
      toast.success(`${driverName} toegewezen`, {
        action: {
          label: "Ongedaan maken",
          onClick: async () => {
            try {
              await updateShift.mutateAsync({
                id: shiftId,
                assigned_driver_id: null,
                status: "published" as ShiftStatus,
              });
              toast.success("Toewijzing ongedaan gemaakt");
            } catch {
              toast.error("Kon toewijzing niet ongedaan maken");
            }
          },
        },
        duration: 8000,
      });
    } catch {
      toast.error("Kon chauffeur niet toewijzen");
    }
  }, [updateShift]);

  // Drop driver on a specific shift card
  const handleDriverDropOnShift = async (e: React.DragEvent, shift: ProgramShift) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverShiftId(null);
    setDragOverDate(null);

    const driverId = e.dataTransfer.getData("application/driver-id");
    const driverName = e.dataTransfer.getData("application/driver-name");
    if (!driverId) return;

    if (shift.assigned_driver_id) {
      toast.error("Deze rit heeft al een chauffeur");
      return;
    }

    await assignDriverToShift(shift.id, driverId, driverName);
  };

  // Drop driver on a day column — show picker if multiple unassigned shifts
  const handleDriverDropOnDay = async (e: React.DragEvent, dateKey: string) => {
    const driverId = e.dataTransfer.getData("application/driver-id");
    const driverName = e.dataTransfer.getData("application/driver-name");
    if (!driverId) return;

    const dayShifts = (shiftsByDate[dateKey] || []).filter(s => !s.assigned_driver_id);
    if (dayShifts.length === 0) {
      toast.error("Geen onbezette ritten op deze dag");
      return;
    }
    if (dayShifts.length === 1) {
      await assignDriverToShift(dayShifts[0].id, driverId, driverName);
      return;
    }
    // Multiple unassigned shifts — open picker dialog
    setPickShiftDialog({ driverId, driverName, dateKey, shifts: dayShifts });
  };

  // Undo function for shift moves
  const undoLastMove = useCallback(async () => {
    if (!lastMoveRef.current) return;
    
    const { shiftId, originalDate } = lastMoveRef.current;
    const originalDateFormatted = format(parseISO(originalDate), "EEEE d MMMM", { locale: nl });
    
    try {
      await updateShift.mutateAsync({
        id: shiftId,
        trip_date: originalDate,
      });
      toast.success(`Rit teruggezet naar ${originalDateFormatted}`);
      lastMoveRef.current = null;
    } catch (error) {
      toast.error("Kon verplaatsing niet ongedaan maken");
    }
  }, [updateShift]);

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOverDate(null);
    setDragOverShiftId(null);

    // Check if this is a driver drag
    if (e.dataTransfer.types.includes("application/driver-id")) {
      await handleDriverDropOnDay(e, targetDate);
      return;
    }
    
    if (!draggedShift) return;
    
    // Don't update if dropped on same date
    if (draggedShift.trip_date === targetDate) {
      setDraggedShift(null);
      return;
    }
    
    const originalDate = draggedShift.trip_date;
    const shiftId = draggedShift.id;
    const newDateFormatted = format(parseISO(targetDate), "EEEE d MMMM", { locale: nl });
    
    try {
      // Update the shift date
      await updateShift.mutateAsync({
        id: shiftId,
        trip_date: targetDate,
      });
      
      // Store for undo
      lastMoveRef.current = { shiftId, originalDate };
      
      toast.success(`Rit verplaatst naar ${newDateFormatted}`, {
        action: {
          label: "Ongedaan maken",
          onClick: () => undoLastMove(),
        },
        duration: 8000,
      });
    } catch (error) {
      toast.error("Kon rit niet verplaatsen");
    }
    
    setDraggedShift(null);
  };

  // Touch drag-and-drop handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, shift: ProgramShift) => {
    const touch = e.touches[0];
    
    // Start long press timer (500ms)
    longPressTimerRef.current = setTimeout(() => {
      // Vibrate if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      setTouchDragShift(shift);
      setIsTouchDragging(true);
      setTouchPosition({ x: touch.clientX, y: touch.clientY });
      toast.info("Sleep naar een andere dag", { duration: 2000 });
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if moving before it triggers
    if (longPressTimerRef.current && !isTouchDragging) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!isTouchDragging || !touchDragShift) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    
    // Find which day we're over
    let foundDate: string | null = null;
    dayRefs.current.forEach((element, dateKey) => {
      const rect = element.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        foundDate = dateKey;
      }
    });
    setDragOverDate(foundDate);
  }, [isTouchDragging, touchDragShift]);

  const handleTouchEnd = useCallback(async () => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!isTouchDragging || !touchDragShift) {
      setIsTouchDragging(false);
      setTouchDragShift(null);
      setTouchPosition(null);
      return;
    }
    
    // If we have a valid drop target
    if (dragOverDate && touchDragShift.trip_date !== dragOverDate) {
      const originalDate = touchDragShift.trip_date;
      const shiftId = touchDragShift.id;
      const newDateFormatted = format(parseISO(dragOverDate), "EEEE d MMMM", { locale: nl });
      
      try {
        await updateShift.mutateAsync({
          id: shiftId,
          trip_date: dragOverDate,
        });
        
        // Store for undo
        lastMoveRef.current = { shiftId, originalDate };
        
        toast.success(`Rit verplaatst naar ${newDateFormatted}`, {
          action: {
            label: "Ongedaan maken",
            onClick: () => {
              if (lastMoveRef.current) {
                const { shiftId: id, originalDate: date } = lastMoveRef.current;
                updateShift.mutateAsync({ id, trip_date: date }).then(() => {
                  toast.success(`Rit teruggezet naar ${format(parseISO(date), "EEEE d MMMM", { locale: nl })}`);
                  lastMoveRef.current = null;
                }).catch(() => {
                  toast.error("Kon verplaatsing niet ongedaan maken");
                });
              }
            },
          },
          duration: 8000,
        });
      } catch (error) {
        toast.error("Kon rit niet verplaatsen");
      }
    }
    
    setIsTouchDragging(false);
    setTouchDragShift(null);
    setTouchPosition(null);
    setDragOverDate(null);
  }, [isTouchDragging, touchDragShift, dragOverDate, updateShift]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsTouchDragging(false);
    setTouchDragShift(null);
    setTouchPosition(null);
    setDragOverDate(null);
  }, []);

  // Ref callback for day containers
  const setDayRef = useCallback((dateKey: string) => (el: HTMLDivElement | null) => {
    if (el) {
      dayRefs.current.set(dateKey, el);
    } else {
      dayRefs.current.delete(dateKey);
    }
  }, []);

  // Swipe navigation handlers for week switching
  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    // Don't start swipe if we're in drag mode or touching a draggable item
    if (isTouchDragging) return;
    
    const touch = e.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isSwipingRef.current = false;
  }, [isTouchDragging]);

  const handleSwipeMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current || isTouchDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    
    // Only count as horizontal swipe if more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      isSwipingRef.current = true;
      // Limit the visual offset
      const maxOffset = 100;
      setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.5)));
    }
  }, [isTouchDragging]);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeStartRef.current) {
      setSwipeOffset(0);
      return;
    }
    
    const swipeThreshold = 50; // minimum pixels for swipe
    const swipeTimeThreshold = 300; // max time in ms for quick swipe
    const timeDelta = Date.now() - swipeStartRef.current.time;
    
    if (isSwipingRef.current && Math.abs(swipeOffset) > 20) {
      // Quick swipe or far enough swipe
      if (timeDelta < swipeTimeThreshold || Math.abs(swipeOffset) > swipeThreshold) {
        if (swipeOffset > 0) {
          // Swipe right = previous week
          animatedSetWeekStart(prev => subWeeks(prev, 1));
        } else {
          // Swipe left = next week
          animatedSetWeekStart(prev => addWeeks(prev, 1));
        }
      }
    }
    
    swipeStartRef.current = null;
    isSwipingRef.current = false;
    setSwipeOffset(0);
  }, [swipeOffset, animatedSetWeekStart]);


  const handleCreateShift = async () => {
    if (!formData.pickup_address || !formData.delivery_address || !formData.trip_date || !formData.start_time) {
      return;
    }
    await createShift.mutateAsync(formData as CreateShiftData);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;
    await updateShift.mutateAsync({ id: editingShift.id, ...formData });
    setEditingShift(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      trip_date: new Date().toISOString().split("T")[0],
      start_time: "08:00",
      pickup_address: "",
      delivery_address: "",
      compensation_type: "fixed",
      compensation_amount: 0,
      show_compensation_to_driver: true,
      create_order_on_approval: true,
    });
  };

  const openEditDialog = (shift: ProgramShift) => {
    setEditingShift(shift);
    setFormData({
      title: shift.title || "",
      customer_id: shift.customer_id || undefined,
      trip_date: shift.trip_date,
      start_time: shift.start_time,
      end_time: shift.end_time || undefined,
      pickup_company: shift.pickup_company || "",
      pickup_address: shift.pickup_address,
      pickup_postal_code: shift.pickup_postal_code || "",
      pickup_city: shift.pickup_city || "",
      delivery_company: shift.delivery_company || "",
      delivery_address: shift.delivery_address,
      delivery_postal_code: shift.delivery_postal_code || "",
      delivery_city: shift.delivery_city || "",
      vehicle_type: shift.vehicle_type || undefined,
      requires_tail_lift: shift.requires_tail_lift,
      requires_adr: shift.requires_adr,
      requires_cooling: shift.requires_cooling,
      compensation_type: shift.compensation_type,
      compensation_amount: shift.compensation_amount,
      show_compensation_to_driver: shift.show_compensation_to_driver,
      drivers_needed: shift.drivers_needed,
      notes: shift.notes || "",
      driver_instructions: shift.driver_instructions || "",
      create_order_on_approval: shift.create_order_on_approval,
    });
  };

  const ShiftForm = () => (
    <div className="space-y-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-1 md:pr-2">
      {/* Basis */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">Basis</h4>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Titel (optioneel)</Label>
            <Input
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Bijv. Express levering Amsterdam"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Klant</Label>
            <Select
              value={formData.customer_id || ""}
              onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecteer klant" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label className="text-sm">Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-10">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.trip_date ? format(parseISO(formData.trip_date), "d MMM yyyy", { locale: nl }) : "Kies datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.trip_date ? parseISO(formData.trip_date) : undefined}
                  onSelect={(d) => setFormData({ ...formData, trip_date: d ? format(d, "yyyy-MM-dd") : "" })}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Starttijd</Label>
            <Input
              type="time"
              value={formData.start_time || ""}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Eindtijd</Label>
            <Input
              type="time"
              value={formData.end_time || ""}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="h-10"
            />
          </div>
        </div>
      </div>

      {/* Locaties */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">Ophalen</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label className="text-sm">Bedrijf</Label>
            <Input
              value={formData.pickup_company || ""}
              onChange={(e) => setFormData({ ...formData, pickup_company: e.target.value })}
              placeholder="Bedrijfsnaam"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label className="text-sm">Adres *</Label>
            <Input
              value={formData.pickup_address || ""}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
              placeholder="Straat + huisnummer"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Postcode</Label>
            <Input
              value={formData.pickup_postal_code || ""}
              onChange={(e) => setFormData({ ...formData, pickup_postal_code: e.target.value })}
              placeholder="1234 AB"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Stad</Label>
            <Input
              value={formData.pickup_city || ""}
              onChange={(e) => setFormData({ ...formData, pickup_city: e.target.value })}
              placeholder="Stad"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">Afleveren</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label className="text-sm">Bedrijf</Label>
            <Input
              value={formData.delivery_company || ""}
              onChange={(e) => setFormData({ ...formData, delivery_company: e.target.value })}
              placeholder="Bedrijfsnaam"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label className="text-sm">Adres *</Label>
            <Input
              value={formData.delivery_address || ""}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              placeholder="Straat + huisnummer"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Postcode</Label>
            <Input
              value={formData.delivery_postal_code || ""}
              onChange={(e) => setFormData({ ...formData, delivery_postal_code: e.target.value })}
              placeholder="1234 AB"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Stad</Label>
            <Input
              value={formData.delivery_city || ""}
              onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
              placeholder="Stad"
              className="h-10"
            />
          </div>
        </div>
      </div>

      {/* Voertuig & Vereisten */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">Voertuig & Vereisten</h4>
        <div className="space-y-1.5">
          <Label className="text-sm">Voertuigtype</Label>
          <Select
            value={formData.vehicle_type || ""}
            onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecteer type" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-3 md:gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={formData.requires_tail_lift || false}
              onCheckedChange={(v) => setFormData({ ...formData, requires_tail_lift: v })}
            />
            Laadklep
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={formData.requires_adr || false}
              onCheckedChange={(v) => setFormData({ ...formData, requires_adr: v })}
            />
            ADR
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={formData.requires_cooling || false}
              onCheckedChange={(v) => setFormData({ ...formData, requires_cooling: v })}
            />
            Koeling
          </label>
        </div>
      </div>

      {/* Vergoeding */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">Vergoeding</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Type</Label>
            <Select
              value={formData.compensation_type || "fixed"}
              onValueChange={(v) => setFormData({ ...formData, compensation_type: v as any })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {compensationTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Bedrag (€)</Label>
            <Input
              type="number"
              value={formData.compensation_amount || 0}
              onChange={(e) => setFormData({ ...formData, compensation_amount: parseFloat(e.target.value) || 0 })}
              className="h-10"
            />
          </div>
          <div className="col-span-2 md:col-span-1 flex items-end">
            <label className="flex items-center gap-2 text-sm h-10">
              <Switch
                checked={formData.show_compensation_to_driver ?? true}
                onCheckedChange={(v) => setFormData({ ...formData, show_compensation_to_driver: v })}
              />
              Toon aan chauffeur
            </label>
          </div>
        </div>
      </div>

      {/* Extra */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">Extra</h4>
        <div className="space-y-1.5">
          <Label className="text-sm">Notities (intern)</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Instructies voor chauffeur</Label>
          <Textarea
            value={formData.driver_instructions || ""}
            onChange={(e) => setFormData({ ...formData, driver_instructions: e.target.value })}
            rows={2}
            className="resize-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={formData.create_order_on_approval ?? true}
            onCheckedChange={(v) => setFormData({ ...formData, create_order_on_approval: v })}
          />
          Maak TMS order aan bij goedkeuring
        </label>
      </div>
    </div>
  );

  const ShiftCard = ({ shift }: { shift: ProgramShift }) => (
    <Card className="group premium-card hover:shadow-lg transition-all duration-300 touch-manipulation overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Status indicator bar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge 
                variant={statusConfig[shift.status].variant} 
                className={`text-[10px] md:text-xs font-medium ${
                  shift.status === 'published' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                  shift.status === 'filled' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                  shift.status === 'in_progress' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                  shift.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                  ''
                }`}
              >
                {statusConfig[shift.status].label}
              </Badge>
              {shift.vehicle_type && (
                <Badge variant="outline" className="text-[10px] md:text-xs bg-muted/50">
                  <Truck className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                  <span className="truncate max-w-[60px] md:max-w-none">{shift.vehicle_type}</span>
                </Badge>
              )}
            </div>

            {/* Title / Customer */}
            <h3 className="font-semibold text-sm md:text-base truncate group-hover:text-primary transition-colors">
              {shift.title || shift.customer?.company_name || "Rit"}
            </h3>

            {/* Date & Time with enhanced styling */}
            <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <CalendarIcon className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                {format(parseISO(shift.trip_date), "EEE d MMM", { locale: nl })}
              </span>
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                {shift.start_time?.slice(0, 5)}
                {shift.end_time && ` - ${shift.end_time.slice(0, 5)}`}
              </span>
            </div>

            {/* Route with visual connection */}
            <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-border/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-sm font-medium truncate">{shift.pickup_city || "Ophalen"}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-0.5 bg-border" />
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="w-6 h-0.5 bg-border" />
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-sm font-medium truncate">{shift.delivery_city || "Afleveren"}</span>
                <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              </div>
            </div>

            {/* Compensation with enhanced styling */}
            {shift.show_compensation_to_driver && shift.compensation_amount > 0 && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-semibold">
                <Euro className="h-3.5 w-3.5" />
                {shift.compensation_amount.toFixed(2)}
                {shift.compensation_type === "hourly" && "/uur"}
                {shift.compensation_type === "per_km" && "/km"}
              </div>
            )}

            {/* Assigned driver or applications with enhanced visual */}
            <div className="mt-3 pt-3 border-t border-border/50">
              {shift.assigned_driver_id ? (
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <span className="font-medium truncate">{shift.assigned_driver?.full_name || "Toegewezen"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span>Nog geen chauffeur</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:h-9 md:w-9 opacity-60 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openEditDialog(shift)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Bewerken
              </DropdownMenuItem>
              {shift.status === "draft" && (
                <DropdownMenuItem onClick={() => publishShift.mutate(shift.id)} className="gap-2 text-blue-600">
                  <Send className="h-4 w-4" />
                  Publiceren
                </DropdownMenuItem>
              )}
              {shift.status === "published" && (
                <DropdownMenuItem onClick={() => updateShift.mutate({ id: shift.id, status: "paused" })} className="gap-2">
                  <Pause className="h-4 w-4" />
                  Pauzeren
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                setFormData({
                  ...shift as any,
                  title: `${shift.title || "Rit"} (kopie)`,
                });
                setIsCreateDialogOpen(true);
              }} className="gap-2">
                <Copy className="h-4 w-4" />
                Dupliceren
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={() => {
                  setShiftToDelete(shift.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout title="Programma">
      <div className="space-y-5 md:space-y-6">
        {/* Header with enhanced styling */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-gradient">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold tracking-tight">Programma</h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Plan en beheer ritten voor chauffeurs</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-premium gap-2 w-full sm:w-auto h-10">
                <Plus className="h-4 w-4" />
                Nieuwe rit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-lg font-display">Nieuwe rit plannen</DialogTitle>
                <DialogDescription className="text-sm">
                  Plan een rit waar chauffeurs zich op kunnen aanmelden
                </DialogDescription>
              </DialogHeader>
              <ShiftForm />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-10">
                  Annuleren
                </Button>
                <Button onClick={handleCreateShift} disabled={createShift.isPending} className="btn-premium h-10">
                  {createShift.isPending ? "Bezig..." : "Opslaan als concept"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Toggle & Filters with enhanced styling */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* View mode toggle with enhanced styling */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex bg-muted/50 rounded-xl p-1 border border-border/50">
                  <Button
                    variant={viewMode === "agenda" ? "default" : "ghost"}
                    size="sm"
                    className={`h-9 px-4 gap-2 rounded-lg transition-all ${viewMode === "agenda" ? "shadow-sm" : ""}`}
                    onClick={() => setViewMode("agenda")}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">Agenda</span>
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className={`h-9 px-4 gap-2 rounded-lg transition-all ${viewMode === "list" ? "shadow-sm" : ""}`}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Lijst</span>
                  </Button>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoeken..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-background/50"
                  />
                </div>
              </div>
              
              {/* Filters row with badges */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-10 shrink-0 bg-background/50">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="draft">Concept</SelectItem>
                    <SelectItem value="published">Open</SelectItem>
                    <SelectItem value="filled">Toegewezen</SelectItem>
                    <SelectItem value="in_progress">Onderweg</SelectItem>
                    <SelectItem value="completed">Afgerond</SelectItem>
                  </SelectContent>
                </Select>
                {viewMode === "list" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2 h-10 px-4 shrink-0 bg-background/50">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="text-sm">{dateFilter ? format(dateFilter, "d MMM", { locale: nl }) : "Datum"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                      />
                      {dateFilter && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full h-8" onClick={() => setDateFilter(undefined)}>
                            Wis filter
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
                
                {/* Quick stats */}
                <div className="hidden md:flex items-center gap-2 ml-auto">
                  <Badge variant="secondary" className="h-8 px-3 gap-1.5">
                    <span className="font-bold text-primary">{shifts.length}</span>
                    <span className="text-muted-foreground">ritten</span>
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agenda View */}
        {viewMode === "agenda" && (
          <div className="flex gap-4">
          <Card className="flex-1 min-w-0">
            <CardContent className="p-2 md:p-4">
              {/* Week Navigation */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => animatedSetWeekStart(subWeeks(weekStart, 1))}
                  disabled={isTransitioning}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <p className={`font-semibold text-sm md:text-base transition-opacity duration-150 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
                    {format(weekStart, "d MMM", { locale: nl })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d MMM yyyy", { locale: nl })}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => animatedSetWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    disabled={isTransitioning}
                  >
                    Naar vandaag
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => animatedSetWeekStart(addWeeks(weekStart, 1))}
                  disabled={isTransitioning}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile: Driver panel (collapsible) */}
              <div className="md:hidden mb-3">
                <button
                  onClick={() => setDriverPanelOpen(!driverPanelOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-full py-2"
                >
                  <Users className="h-4 w-4" />
                  Chauffeurs ({filteredDrivers.length})
                  <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${driverPanelOpen ? "rotate-90" : ""}`} />
                </button>
                {driverPanelOpen && (
                  <div className="space-y-1 pb-2">
                    {filteredDrivers.slice(0, 8).map((driver) => (
                      <div
                        key={driver.user_id}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
                      >
                        <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{driver.full_name}</span>
                      </div>
                    ))}
                    {filteredDrivers.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center">+{filteredDrivers.length - 8} meer</p>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile: Vertical day cards with swipe navigation */}
              <div 
                ref={agendaContainerRef}
                className={`md:hidden space-y-2 transition-all duration-200 ease-out ${
                  isTransitioning 
                    ? transitionDirection === "left" 
                      ? "opacity-0 -translate-x-8" 
                      : "opacity-0 translate-x-8"
                    : "opacity-100 translate-x-0"
                }`}
                style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined }}
                onTouchStart={handleSwipeStart}
                onTouchMove={(e) => {
                  handleSwipeMove(e);
                  handleTouchMove(e);
                }}
                onTouchEnd={() => {
                  handleSwipeEnd();
                  handleTouchEnd();
                }}
                onTouchCancel={() => {
                  handleSwipeEnd();
                  handleTouchCancel();
                }}
              >
                {/* Swipe hint indicator */}
                {Math.abs(swipeOffset) > 30 && (
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                    <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                      {swipeOffset > 0 ? (
                        <>
                          <ChevronLeft className="h-4 w-4" />
                          Vorige week
                        </>
                      ) : (
                        <>
                          Volgende week
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </div>
                  </div>
                )}
                {weekDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayShifts = shiftsByDate[dateKey] || [];
                  const filteredDayShifts = dayShifts.filter((shift) => {
                    if (statusFilter !== "all" && shift.status !== statusFilter) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      return (
                        shift.title?.toLowerCase().includes(q) ||
                        shift.pickup_city?.toLowerCase().includes(q) ||
                        shift.delivery_city?.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });
                  
                  return (
                    <div
                      key={dateKey}
                      ref={setDayRef(dateKey)}
                      className={`rounded-lg border p-2.5 transition-all ${
                        isToday(day) ? "border-primary bg-primary/5" : ""
                      } ${dragOverDate === dateKey ? "border-primary border-2 bg-primary/10 scale-[1.02]" : ""}`}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateKey)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium uppercase ${
                            isToday(day) ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {format(day, "EEE", { locale: nl })}
                          </span>
                          <span className={`text-lg font-bold ${
                            isToday(day) ? "text-primary" : ""
                          }`}>
                            {format(day, "d")}
                          </span>
                        </div>
                        {filteredDayShifts.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {filteredDayShifts.length} rit{filteredDayShifts.length !== 1 ? "ten" : ""}
                          </Badge>
                        )}
                      </div>
                      
                      {filteredDayShifts.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {dragOverDate === dateKey ? "Sleep hier naartoe" : "Geen ritten"}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredDayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, shift)}
                              onDragEnd={handleDragEnd}
                              onTouchStart={(e) => handleTouchStart(e, shift)}
                              className={`flex items-center gap-2 p-2 rounded-md bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted transition-all select-none ${
                                draggedShift?.id === shift.id || touchDragShift?.id === shift.id ? "opacity-50 scale-95 ring-2 ring-primary" : ""
                              }`}
                              onClick={() => !draggedShift && !isTouchDragging && openEditDialog(shift)}
                            >
                              <div className={`w-1 h-8 rounded-full shrink-0 ${
                                shift.status === "draft" ? "bg-muted-foreground" :
                                shift.status === "published" ? "bg-blue-500" :
                                shift.status === "filled" ? "bg-green-500" :
                                shift.status === "in_progress" ? "bg-amber-500" :
                                shift.status === "completed" ? "bg-green-600" :
                                "bg-destructive"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="font-medium">{shift.start_time?.slice(0, 5)}</span>
                                </div>
                                <p className="text-sm font-medium truncate mt-0.5">
                                  {shift.pickup_city} → {shift.delivery_city}
                                </p>
                              </div>
                              <Badge variant={statusConfig[shift.status].variant} className="text-[10px] shrink-0">
                                {statusConfig[shift.status].label}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Touch drag ghost element */}
              {isTouchDragging && touchDragShift && touchPosition && (
                <div
                  className="fixed pointer-events-none z-50 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium"
                  style={{
                    left: touchPosition.x - 60,
                    top: touchPosition.y - 20,
                    transform: "translate(0, 0)",
                  }}
                >
                  {touchDragShift.pickup_city} → {touchDragShift.delivery_city}
                </div>
              )}


              {/* Desktop: Week grid */}
              <div className={`hidden md:grid grid-cols-7 gap-2 transition-all duration-200 ease-out ${
                isTransitioning 
                  ? transitionDirection === "left" 
                    ? "opacity-0 -translate-x-4" 
                    : "opacity-0 translate-x-4"
                  : "opacity-100 translate-x-0"
              }`}>
                {weekDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayShifts = shiftsByDate[dateKey] || [];
                  const filteredDayShifts = dayShifts.filter((shift) => {
                    if (statusFilter !== "all" && shift.status !== statusFilter) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      return (
                        shift.title?.toLowerCase().includes(q) ||
                        shift.pickup_city?.toLowerCase().includes(q) ||
                        shift.delivery_city?.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });
                  
                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[180px] rounded-lg border p-2 transition-all ${
                        isToday(day) ? "border-primary bg-primary/5" : ""
                      } ${dragOverDate === dateKey ? "border-primary border-2 bg-primary/10 scale-[1.02]" : ""}`}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateKey)}
                    >
                      {/* Day header */}
                      <div className="text-center mb-2 pb-2 border-b">
                        <span className={`text-xs font-medium uppercase ${
                          isToday(day) ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {format(day, "EEE", { locale: nl })}
                        </span>
                        <p className={`text-lg font-bold ${
                          isToday(day) ? "text-primary" : ""
                        }`}>
                          {format(day, "d")}
                        </p>
                      </div>
                      
                      {/* Drop zone indicator */}
                      {dragOverDate === dateKey && filteredDayShifts.length === 0 && (
                        <div className="flex items-center justify-center h-16 border-2 border-dashed border-primary/50 rounded-md mb-1">
                          <p className="text-xs text-primary">Sleep hier</p>
                        </div>
                      )}
                      
                      {/* Shifts */}
                      <div className="space-y-1">
                        {filteredDayShifts.slice(0, 4).map((shift) => (
                          <div
                            key={shift.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, shift)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleShiftDragOver(e, shift.id)}
                            onDragLeave={handleShiftDragLeave}
                            onDrop={(e) => handleDriverDropOnShift(e, shift)}
                            className={`text-xs p-1.5 rounded cursor-grab active:cursor-grabbing transition-all truncate ${
                              draggedShift?.id === shift.id ? "opacity-50 scale-95" : ""
                            } ${
                              dragOverShiftId === shift.id && !shift.assigned_driver_id
                                ? "ring-2 ring-primary bg-primary/10"
                                : dragOverShiftId === shift.id && shift.assigned_driver_id
                                ? "ring-2 ring-destructive bg-destructive/10"
                                : ""
                            } ${
                              shift.status === "draft" ? "bg-muted hover:bg-muted/80" :
                              shift.status === "published" ? "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50" :
                              shift.status === "filled" ? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50" :
                              shift.status === "in_progress" ? "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50" :
                              "bg-muted hover:bg-muted/80"
                            }`}
                            onClick={() => !draggedShift && openEditDialog(shift)}
                            title={`${shift.start_time?.slice(0, 5)} - ${shift.pickup_city} → ${shift.delivery_city}${shift.assigned_driver_id ? ' (bezet)' : ' (sleep chauffeur hiernaartoe)'}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{shift.start_time?.slice(0, 5)}</span>
                              <span className="text-muted-foreground truncate">
                                {shift.pickup_city}
                              </span>
                              {shift.assigned_driver_id && (
                                <UserCircle className="h-3 w-3 text-green-600 shrink-0 ml-auto" />
                              )}
                            </div>
                          </div>
                        ))}
                        {filteredDayShifts.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{filteredDayShifts.length - 4} meer
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Driver Panel — Desktop */}
          <Card className="hidden md:block w-[220px] shrink-0 self-start sticky top-4">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  Chauffeurs
                </h3>
                <Badge variant="secondary" className="text-[10px]">{filteredDrivers.length}</Badge>
              </div>
              <Input
                placeholder="Zoek chauffeur..."
                value={driverSearchQuery}
                onChange={(e) => setDriverSearchQuery(e.target.value)}
                className="h-8 text-xs mb-2"
              />
              <ScrollArea className="h-[calc(100vh-360px)] -mx-1 px-1">
                <div className="space-y-1">
                  {filteredDrivers.map((driver) => (
                    <div
                      key={driver.user_id}
                      draggable
                      onDragStart={(e) => handleDriverDragStart(e, driver.user_id, driver.full_name || "")}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted transition-colors text-xs select-none"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                      <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{driver.full_name}</span>
                    </div>
                  ))}
                  {filteredDrivers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Geen chauffeurs gevonden</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Pick Shift Dialog — when driver dropped on day with multiple unassigned shifts */}
        <Dialog open={!!pickShiftDialog} onOpenChange={(open) => !open && setPickShiftDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Rit kiezen voor {pickShiftDialog?.driverName}</DialogTitle>
              <DialogDescription className="text-sm">
                Er zijn meerdere onbezette ritten op {pickShiftDialog?.dateKey ? format(parseISO(pickShiftDialog.dateKey), "EEEE d MMMM", { locale: nl }) : ""}. Kies er één.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {pickShiftDialog?.shifts.map((shift) => (
                <button
                  key={shift.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  onClick={async () => {
                    if (pickShiftDialog) {
                      await assignDriverToShift(shift.id, pickShiftDialog.driverId, pickShiftDialog.driverName);
                      setPickShiftDialog(null);
                    }
                  }}
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{shift.start_time?.slice(0, 5)} {shift.end_time ? `- ${shift.end_time.slice(0, 5)}` : ""}</p>
                    <p className="text-xs text-muted-foreground truncate">{shift.pickup_city} → {shift.delivery_city}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* List View */}
        {viewMode === "list" && (
          <>
            {isLoading ? (
              <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-40 md:h-48" />
                  </Card>
                ))}
              </div>
            ) : filteredShifts.length === 0 ? (
              <Card>
                <CardContent className="py-8 md:py-12 text-center">
                  <CalendarDays className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-3 md:mb-4" />
                  <h3 className="font-semibold text-base md:text-lg mb-1">Geen ritten gevonden</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {searchQuery || statusFilter !== "all" || dateFilter
                      ? "Pas je filters aan"
                      : "Begin met je eerste rit"}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe rit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-lg">Rit bewerken</DialogTitle>
            </DialogHeader>
            <ShiftForm />
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditingShift(null)} className="h-10">
                Annuleren
              </Button>
              <Button onClick={handleUpdateShift} disabled={updateShift.isPending} className="h-10">
                {updateShift.isPending ? "Bezig..." : "Opslaan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Rit verwijderen"
          description="Weet je zeker dat je deze rit wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
          onConfirm={() => {
            if (shiftToDelete) {
              deleteShift.mutate(shiftToDelete);
              setDeleteDialogOpen(false);
              setShiftToDelete(null);
            }
          }}
          isLoading={deleteShift.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
