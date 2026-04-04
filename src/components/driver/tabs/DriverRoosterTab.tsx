import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAssignedShifts, useAvailableShifts } from '@/hooks/useProgramShifts';
import { useDriverTrips } from '@/hooks/useDriverTrips';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Truck,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Phone,
  ArrowRight,
  Package,
  Weight,
  Route,
  Building2,
  User,
  Hash,
  LayoutGrid,
  List,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, getWeek, isToday, isBefore, isSameMonth, isSameWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ShiftStatus = 'assigned' | 'open' | 'requested' | 'cancelled';

interface RouteStopData {
  id: string;
  address: string;
  city: string | null;
  company_name: string | null;
  status: string;
  stop_order: number;
  stop_type: string;
  time_window_start: string | null;
  time_window_end: string | null;
  customer_reference: string | null;
  waybill_number: string | null;
}

interface ShiftData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  city: string;
  locationName?: string;
  status: ShiftStatus;
  routeId?: string;
  notes?: string;
  vehicleType?: string;
  client?: string;
  isTrip?: boolean;
  orderNumber?: string;
  deliveryCity?: string;
  // Enhanced fields
  weightKg?: number | null;
  cargoDescription?: string | null;
  routeStops?: RouteStopData[];
  customerPhone?: string | null;
  customerContact?: string | null;
  customerReference?: string | null;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
}

interface DriverRoosterTabProps {
  onShiftClick?: (shiftId: string) => void;
  onNavigateToRoute?: (routeId: string) => void;
}

const filterOptions = [
  { key: 'all' as const, label: 'Alles' },
  { key: 'assigned' as const, label: 'Toegekend' },
  { key: 'open' as const, label: 'Open' },
  { key: 'requested' as const, label: 'Aangevraagd' },
];

const springConfig = { type: 'spring' as const, stiffness: 300, damping: 25 };

export function DriverRoosterTab({ onShiftClick, onNavigateToRoute }: DriverRoosterTabProps) {
  const { user } = useAuth();
  const { data: assignedShifts, isLoading: loadingAssigned } = useDriverAssignedShifts(user?.id);
  const { data: availableShifts, isLoading: loadingAvailable } = useAvailableShifts();
  const { trips, loading: loadingTrips } = useDriverTrips();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'open' | 'requested'>('all');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const handlePrevMonth = () => {
    setSwipeDirection('right');
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSwipeDirection('left');
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handlePrevWeek = () => {
    setSwipeDirection('right');
    setCurrentDate(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSwipeDirection('left');
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const handlePrev = viewMode === 'month' ? handlePrevMonth : handlePrevWeek;
  const handleNext = viewMode === 'month' ? handleNextMonth : handleNextWeek;

  // Week view days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: nl });
    }
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `Week ${weekNumber} · ${format(ws, 'd', { locale: nl })}–${format(we, 'd MMM', { locale: nl })}`;
  }, [viewMode, currentDate, weekNumber]);

  const loading = loadingAssigned || loadingAvailable || loadingTrips;

  // Merge program_shifts + trips into unified ShiftData[]
  const allShifts: ShiftData[] = useMemo(() => {
    const assigned = (assignedShifts || []).map(s => ({
      id: s.id,
      date: s.trip_date,
      startTime: s.start_time || '08:00',
      endTime: s.end_time || '17:00',
      city: s.pickup_city || 'Onbekend',
      locationName: s.pickup_company || undefined,
      status: 'assigned' as ShiftStatus,
      routeId: s.id,
      vehicleType: 'Bestelwagen',
      client: s.pickup_company || undefined,
    }));

    const available = (availableShifts || []).map(s => ({
      id: s.id,
      date: s.trip_date,
      startTime: s.start_time || '08:00',
      endTime: s.end_time || '17:00',
      city: s.pickup_city || 'Onbekend',
      locationName: s.pickup_company || undefined,
      status: 'open' as ShiftStatus,
      vehicleType: 'Bestelwagen',
      client: s.pickup_company || undefined,
    }));

    // Convert trips to ShiftData - these are real orders assigned to the driver
    const tripShifts: ShiftData[] = (trips || [])
      .filter(t => !['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd', 'geannuleerd'].includes(t.status))
      .map(t => ({
        id: t.id,
        date: t.trip_date,
        startTime: '08:00',
        endTime: '17:00',
        city: t.pickup_city || t.pickup_address || 'Onbekend',
        locationName: t.customer?.company_name || undefined,
        status: 'assigned' as ShiftStatus,
        routeId: t.id,
        vehicleType: t.vehicle ? `${t.vehicle.brand || ''} ${t.vehicle.model || ''} (${t.vehicle.license_plate})`.trim() : undefined,
        client: t.customer?.company_name || undefined,
        notes: t.notes || t.cargo_description || undefined,
        isTrip: true,
        orderNumber: t.order_number || undefined,
        deliveryCity: t.delivery_city || t.delivery_address || undefined,
        // Enhanced fields
        weightKg: t.weight_kg,
        cargoDescription: t.cargo_description,
        routeStops: (t.route_stops || []).map(rs => ({
          id: rs.id,
          address: rs.address,
          city: rs.city,
          company_name: rs.company_name,
          status: rs.status,
          stop_order: rs.stop_order,
          stop_type: rs.stop_type,
          time_window_start: rs.time_window_start,
          time_window_end: rs.time_window_end,
          customer_reference: rs.customer_reference,
          waybill_number: rs.waybill_number,
        })),
        customerPhone: t.customer?.phone,
        customerContact: t.customer?.contact_name,
        vehiclePlate: t.vehicle?.license_plate,
        vehicleBrand: t.vehicle?.brand,
        vehicleModel: t.vehicle?.model,
      }));

    // Deduplicate: if a trip and a shift share the same date + city, prefer the trip
    const tripDates = new Set(tripShifts.map(t => `${t.date}_${t.city}`));
    const filteredAssigned = assigned.filter(a => !tripDates.has(`${a.date}_${a.city}`));

    return [...filteredAssigned, ...tripShifts, ...available];
  }, [assignedShifts, availableShifts, trips]);

  const filteredShifts = useMemo(() => {
    if (filter === 'all') return allShifts;
    return allShifts.filter(s => s.status === filter);
  }, [allShifts, filter]);

  // Count per filter
  const filterCounts = useMemo(() => ({
    all: allShifts.length,
    assigned: allShifts.filter(s => s.status === 'assigned').length,
    open: allShifts.filter(s => s.status === 'open').length,
    requested: allShifts.filter(s => s.status === 'requested').length,
  }), [allShifts]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const startWeekDay = startOfWeek(start, { weekStartsOn: 1 });
    const paddingBefore = eachDayOfInterval({ start: startWeekDay, end: start }).slice(0, -1);
    return [...paddingBefore, ...days];
  }, [currentDate]);

  const getShiftsForDay = (date: Date, useAll = false) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const source = useAll ? allShifts : filteredShifts;
    return source.filter(s => s.date === dateStr);
  };

  const getAllShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allShifts.filter(s => s.date === dateStr);
  };

  const getStatusColor = (status: ShiftStatus) => {
    switch (status) {
      case 'assigned': return 'bg-blue-500';
      case 'open': return 'bg-emerald-500';
      case 'requested': return 'bg-amber-500';
      case 'cancelled': return 'bg-muted-foreground/40';
    }
  };

  const getStatusLabel = (status: ShiftStatus) => {
    switch (status) {
      case 'assigned': return 'Toegekend';
      case 'open': return 'Open';
      case 'requested': return 'Aangevraagd';
      case 'cancelled': return 'Geannuleerd';
    }
  };

  const getStatusBadgeClasses = (status: ShiftStatus) => {
    switch (status) {
      case 'assigned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'open': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'requested': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'cancelled': return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getStopStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-muted-foreground/40';
    }
  };

  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentDate)) {
      setSelectedDay(day);
    }
  };

  const handleShiftAction = (shift: ShiftData) => {
    if (shift.status === 'assigned' && shift.routeId) {
      onNavigateToRoute?.(shift.routeId);
    }
    setSelectedShift(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div 
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">Rooster laden...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overscroll-contain">
        {/* Header Section */}
        <div 
          className="px-4 pt-4 pb-2 space-y-4"
        >
          {/* Month/Week Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <div className="flex items-center gap-2">
                <h2
                  key={headerTitle}
                  className="font-bold text-xl capitalize tracking-tight"
                >
                  {headerTitle}
                </h2>
            </div>
            
            <button
              onClick={handleNext}
              className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-1">
            <div className="inline-flex items-center rounded-xl bg-muted/50 p-1 border border-border/30">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                  viewMode === 'month'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Maand
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                  viewMode === 'week'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Week
              </button>
            </div>
          </div>

          {/* Today Button */}
          {((viewMode === 'month' && !isSameMonth(currentDate, new Date())) ||
            (viewMode === 'week' && !isSameWeek(currentDate, new Date(), { weekStartsOn: 1 }))) && (
            <div 
              className="flex justify-center"
            >
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="h-8 rounded-full px-5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
              >
                Vandaag
              </Button>
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex justify-center gap-2 flex-wrap">
            {filterOptions.map((f, idx) => {
              const isActive = filter === f.key;
              const count = filterCounts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-card/60 backdrop-blur-sm text-muted-foreground border border-border/50 hover:bg-card hover:border-border"
                  )}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Grid with Swipe */}
        <ScrollArea className="flex-1 scroll-smooth-touch">
          <div className="px-3 pb-32 overflow-hidden">
            {viewMode === 'month' ? (
              <>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                    <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Swipeable Month Calendar */}
                  <div
                    key={format(currentDate, 'yyyy-MM')}),
                      animate: { x: 0, opacity: 1 },
                      exit: (dir: string) => ({ x: dir === 'left' ? -200 : 200, opacity: 0 }),
                    }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 80) handlePrevMonth();
                      else if (info.offset.x < -80) handleNextMonth();
                    }}
                    style={{ touchAction: 'pan-y' }}
                  >
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, i) => {
                        const dayShifts = getShiftsForDay(day);
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isPast = isBefore(day, new Date()) && !isToday(day);
                        const hasShifts = dayShifts.length > 0;

                        return (
                          <button
                            key={i}
                            onClick={() => handleDayClick(day)}
                            disabled={!isCurrentMonth}
                            className={cn(
                              "min-h-[68px] rounded-xl p-1.5 transition-all duration-200 text-left flex flex-col relative overflow-hidden",
                              isCurrentMonth
                                ? "bg-card/80 backdrop-blur-sm border border-border/30"
                                : "bg-muted/10 border border-transparent",
                              isToday(day) && "ring-2 ring-primary/60 ring-offset-1 ring-offset-background bg-primary/5",
                              isPast && isCurrentMonth && "opacity-50",
                              isCurrentMonth && "cursor-pointer"
                            )}
                          >
                            <span className={cn(
                              "text-[11px] font-medium mb-1",
                              isToday(day) ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"
                            )}>
                              {format(day, 'd')}
                            </span>
                            
                            {hasShifts && (
                              <div className="flex-1 flex items-end">
                                <div className="flex items-center gap-[3px] flex-wrap">
                                  {dayShifts.slice(0, 3).map(shift => (
                                    <div
                                      key={shift.id}
                                      className={cn(
                                        "w-[6px] h-[6px] rounded-full",
                                        getStatusColor(shift.status)
                                      )}
                                    />
                                  ))}
                                  {dayShifts.length > 3 && (
                                    <span className="text-[8px] font-bold text-muted-foreground ml-0.5">
                                      +{dayShifts.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-5 mt-6 pt-4 border-t border-border/20">
                  {[
                    { color: 'bg-blue-500', label: 'Toegekend' },
                    { color: 'bg-emerald-500', label: 'Open' },
                    { color: 'bg-amber-500', label: 'Aangevraagd' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", item.color)} />
                      <span className="text-[10px] text-muted-foreground/70 font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Week View */
                <div
                  key={`week-${weekNumber}-${format(currentDate, 'yyyy')}`}),
                    animate: { x: 0, opacity: 1 },
                    exit: (dir: string) => ({ x: dir === 'left' ? -200 : 200, opacity: 0 }),
                  }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 80) handlePrevWeek();
                    else if (info.offset.x < -80) handleNextWeek();
                  }}
                  style={{ touchAction: 'pan-y' }}
                  className="space-y-2"
                >
                  {weekDays.map((day, i) => {
                    const dayShifts = getShiftsForDay(day);
                    const isPast = isBefore(day, new Date()) && !isToday(day);
                    const today = isToday(day);

                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDay(day); }}
                        className={cn(
                          "w-full rounded-xl p-3 transition-all duration-200 text-left flex gap-3 items-start",
                          "bg-card/80 backdrop-blur-sm border border-border/30",
                          today && "ring-2 ring-primary/60 ring-offset-1 ring-offset-background bg-primary/5",
                          isPast && "opacity-50"
                        )}
                      >
                        {/* Day indicator */}
                        <div className={cn(
                          "flex flex-col items-center justify-center min-w-[44px] rounded-lg py-1.5",
                          today ? "bg-primary/10" : "bg-muted/40"
                        )}>
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider",
                            today ? "text-primary" : "text-muted-foreground/60"
                          )}>
                            {format(day, 'EEE', { locale: nl })}
                          </span>
                          <span className={cn(
                            "text-lg font-bold leading-tight",
                            today ? "text-primary" : "text-foreground"
                          )}>
                            {format(day, 'd')}
                          </span>
                        </div>

                        {/* Day content */}
                        <div className="flex-1 min-w-0">
                          {dayShifts.length === 0 ? (
                            <p className="text-xs text-muted-foreground/50 italic pt-2">Geen activiteiten</p>
                          ) : (
                            <div className="space-y-1.5">
                              {/* Status dots summary */}
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-[3px]">
                                  {dayShifts.slice(0, 4).map(shift => (
                                    <div key={shift.id} className={cn("w-[6px] h-[6px] rounded-full", getStatusColor(shift.status))} />
                                  ))}
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {dayShifts.length} {dayShifts.length === 1 ? 'activiteit' : 'activiteiten'}
                                </span>
                              </div>

                              {/* Preview of first 2 items */}
                              {dayShifts.slice(0, 2).map(shift => (
                                <div key={shift.id} className="flex items-center gap-1.5 text-[11px]">
                                  <span className="font-semibold text-muted-foreground/70 min-w-[36px]">{shift.startTime}</span>
                                  <span className="text-foreground truncate">
                                    {shift.isTrip
                                      ? `${shift.city} → ${shift.deliveryCity || '—'}`
                                      : shift.city
                                    }
                                  </span>
                                  {shift.isTrip && shift.weightKg && shift.weightKg > 0 && (
                                    <span className="text-[9px] text-orange-500 font-semibold shrink-0">{shift.weightKg}kg</span>
                                  )}
                                </div>
                              ))}
                              {dayShifts.length > 2 && (
                                <span className="text-[10px] text-muted-foreground/50">+{dayShifts.length - 2} meer</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 mt-2 shrink-0" />
                      </button>
                    );
                  })}
                </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Day View Sheet */}
      <Sheet open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
       <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
          {selectedDay && (() => {
            const dayShifts = getAllShiftsForDay(selectedDay);
            const tripCount = dayShifts.filter(s => s.isTrip).length;
            const shiftCount = dayShifts.filter(s => !s.isTrip).length;
            const totalHours = dayShifts.reduce((acc, s) => {
              const [sh, sm] = s.startTime.split(':').map(Number);
              const [eh, em] = s.endTime.split(':').map(Number);
              return acc + (eh + em / 60) - (sh + sm / 60);
            }, 0);
            const totalWeight = dayShifts.reduce((acc, s) => acc + (s.weightKg || 0), 0);
            const sorted = [...dayShifts].sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <>
                <SheetHeader className="pb-2">
                  <SheetTitle className="capitalize text-lg font-bold tracking-tight">
                    {format(selectedDay, 'EEEE d MMMM', { locale: nl })}
                  </SheetTitle>
                </SheetHeader>

                {/* Gradient Stats Header */}
                {dayShifts.length > 0 && (
                  <div
                    className="grid grid-cols-4 gap-2 pb-4"
                  >
                    <div className="relative overflow-hidden rounded-xl p-3 text-center bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border border-blue-500/20">
                      <Truck className="h-3.5 w-3.5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{tripCount}</p>
                      <p className="text-[9px] font-medium text-blue-500/80 uppercase tracking-wider">Ritten</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl p-3 text-center bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border border-purple-500/20">
                      <Clock className="h-3.5 w-3.5 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{shiftCount}</p>
                      <p className="text-[9px] font-medium text-purple-500/80 uppercase tracking-wider">Shifts</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl p-3 text-center bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/20">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{totalHours.toFixed(1)}</p>
                      <p className="text-[9px] font-medium text-emerald-500/80 uppercase tracking-wider">Uren</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl p-3 text-center bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent border border-orange-500/20">
                      <Weight className="h-3.5 w-3.5 text-orange-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{totalWeight > 0 ? totalWeight : '—'}</p>
                      <p className="text-[9px] font-medium text-orange-500/80 uppercase tracking-wider">kg</p>
                    </div>
                  </div>
                )}

                <ScrollArea className="flex-1 -mx-6 px-6">
                  {dayShifts.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">Geen activiteiten</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Er zijn geen ritten of shifts gepland voor deze dag.</p>
                    </div>
                  ) : (
                    <div className="relative pb-6">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />

                      {sorted.map((shift, idx) => (
                        <div
                          key={shift.id}
                          className="relative pl-10 pb-4 last:pb-0"
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute left-[11px] top-3 w-[9px] h-[9px] rounded-full ring-2 ring-background",
                            getStatusColor(shift.status)
                          )} />

                          {/* Time label */}
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">
                            {shift.startTime} – {shift.endTime}
                          </p>

                          <Card
                            className={cn(
                              "border-border/30 cursor-pointer transition-all duration-200 overflow-hidden",
                              "hover:shadow-md",
                              shift.isTrip
                                ? "bg-gradient-to-r from-blue-500/8 via-card/90 to-card border-l-2 border-l-blue-500/50"
                                : "bg-gradient-to-r from-emerald-500/8 via-card/90 to-card border-l-2 border-l-emerald-500/50"
                            )}
                            onClick={() => setSelectedShift(shift)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  {shift.isTrip && shift.orderNumber ? (
                                    <>
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[10px] font-bold text-primary/70">#{shift.orderNumber}</span>
                                        {shift.vehiclePlate && (
                                          <span className="text-[9px] text-muted-foreground/60 font-medium">• {shift.vehiclePlate}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                                        <span className="truncate">{shift.city}</span>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="truncate">{shift.deliveryCity || '—'}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="font-semibold text-sm">{shift.city}</p>
                                  )}
                                  {shift.client && (
                                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{shift.client}</p>
                                  )}

                                  {/* Extra info badges */}
                                  {shift.isTrip && (
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                      {(shift.routeStops?.length || 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[9px] font-semibold text-muted-foreground">
                                          <Route className="h-2.5 w-2.5" />
                                          {shift.routeStops!.length} stops
                                        </span>
                                      )}
                                      {shift.weightKg && shift.weightKg > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-[9px] font-semibold text-orange-600">
                                          <Weight className="h-2.5 w-2.5" />
                                          {shift.weightKg} kg
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Route stops preview */}
                                  {shift.isTrip && shift.routeStops && shift.routeStops.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {shift.routeStops.slice(0, 2).map((stop) => (
                                        <div key={stop.id} className="flex items-center gap-1.5">
                                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStopStatusColor(stop.status))} />
                                          <span className="text-[10px] text-muted-foreground truncate">
                                            {stop.company_name || stop.city || stop.address}
                                          </span>
                                        </div>
                                      ))}
                                      {shift.routeStops.length > 2 && (
                                        <span className="text-[9px] text-muted-foreground/50 ml-3">
                                          +{shift.routeStops.length - 2} meer
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Badge className={cn("border text-[10px] shrink-0", getStatusBadgeClasses(shift.status))}>
                                  {shift.isTrip ? 'Rit' : getStatusLabel(shift.status)}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Shift Detail Sheet */}
      <Sheet open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          {selectedShift && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="font-bold tracking-tight">
                  {selectedShift.isTrip ? `Rit #${selectedShift.orderNumber}` : 'Dienstdetails'}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-3 pb-6">
                  <Badge className={cn("text-xs px-3 py-1 border", getStatusBadgeClasses(selectedShift.status))}>
                    {getStatusLabel(selectedShift.status)}
                  </Badge>

                  {/* Route info for trips */}
                  {selectedShift.isTrip && selectedShift.deliveryCity && (
                    <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-r from-blue-500/8 via-card to-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="text-sm font-medium truncate">{selectedShift.city}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="text-sm font-medium truncate">{selectedShift.deliveryCity}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Route Stops Stepper */}
                  {selectedShift.isTrip && selectedShift.routeStops && selectedShift.routeStops.length > 0 && (
                    <Card className="overflow-hidden border-border/30 bg-gradient-to-br from-primary/5 via-card to-card">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Route className="h-3.5 w-3.5" />
                          Route Stops
                        </p>
                        <div className="relative">
                          {/* Vertical line */}
                          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
                          <div className="space-y-3">
                            {selectedShift.routeStops.map((stop, idx) => (
                              <div key={stop.id} className="relative pl-7 flex items-start gap-2">
                                {/* Status dot */}
                                <div className={cn(
                                  "absolute left-[3px] top-1.5 w-[9px] h-[9px] rounded-full ring-2 ring-card",
                                  getStopStatusColor(stop.status)
                                )} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground/60">#{stop.stop_order}</span>
                                    <span className="text-[9px] uppercase font-semibold text-muted-foreground/50">
                                      {stop.stop_type === 'pickup' ? 'Laden' : stop.stop_type === 'delivery' ? 'Lossen' : stop.stop_type}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium truncate">
                                    {stop.company_name || stop.address}
                                  </p>
                                  {stop.city && (
                                    <p className="text-[11px] text-muted-foreground/70 truncate">{stop.city}</p>
                                  )}
                                  {(stop.time_window_start || stop.time_window_end) && (
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                      {stop.time_window_start || '—'} – {stop.time_window_end || '—'}
                                    </p>
                                  )}
                                  {stop.waybill_number && (
                                    <p className="text-[10px] text-muted-foreground/50">
                                      <Hash className="h-2.5 w-2.5 inline mr-0.5" />
                                      {stop.waybill_number}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className={cn("text-[8px] shrink-0 border",
                                  stop.status === 'completed' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' :
                                  stop.status === 'in_progress' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                                  'border-border text-muted-foreground bg-muted/30'
                                )}>
                                  {stop.status === 'completed' ? 'Klaar' : stop.status === 'in_progress' ? 'Bezig' : 'Wacht'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cargo & Weight */}
                  {selectedShift.isTrip && (selectedShift.weightKg || selectedShift.cargoDescription) && (
                    <Card className="overflow-hidden border-orange-500/20 bg-gradient-to-r from-orange-500/8 via-card to-card">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-orange-500" />
                          Laadgegevens
                        </p>
                        {selectedShift.weightKg && selectedShift.weightKg > 0 && (
                          <div className="flex items-center gap-2">
                            <Weight className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">{selectedShift.weightKg} kg</span>
                          </div>
                        )}
                        {selectedShift.cargoDescription && (
                          <p className="text-sm text-muted-foreground">{selectedShift.cargoDescription}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Date & Time */}
                  <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium capitalize">
                          {format(new Date(selectedShift.date), 'EEEE d MMMM yyyy', { locale: nl })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{selectedShift.startTime} - {selectedShift.endTime}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location (non-trip) */}
                  {!selectedShift.isTrip && (
                    <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{selectedShift.city}</p>
                            {selectedShift.locationName && (
                              <p className="text-xs text-muted-foreground">{selectedShift.locationName}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Client Info */}
                  {selectedShift.isTrip && selectedShift.client && (
                    <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-r from-purple-500/8 via-card to-card">
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-purple-500" />
                          Klant
                        </p>
                        <p className="text-sm font-medium">{selectedShift.client}</p>
                        {selectedShift.customerContact && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span>{selectedShift.customerContact}</span>
                          </div>
                        )}
                        {selectedShift.customerPhone && (
                          <a 
                            href={`tel:${selectedShift.customerPhone}`}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{selectedShift.customerPhone}</span>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Vehicle Info */}
                  {selectedShift.isTrip && selectedShift.vehiclePlate && (
                    <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-r from-emerald-500/8 via-card to-card">
                      <CardContent className="p-4 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-emerald-500" />
                          Voertuig
                        </p>
                        <p className="text-sm font-bold">{selectedShift.vehiclePlate}</p>
                        {(selectedShift.vehicleBrand || selectedShift.vehicleModel) && (
                          <p className="text-xs text-muted-foreground">
                            {[selectedShift.vehicleBrand, selectedShift.vehicleModel].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Non-trip client & vehicle (legacy) */}
                  {!selectedShift.isTrip && (selectedShift.client || selectedShift.vehicleType) && (
                    <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
                      <CardContent className="p-4 space-y-3">
                        {selectedShift.client && (
                          <div className="flex items-center gap-3">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">{selectedShift.client}</p>
                          </div>
                        )}
                        {selectedShift.vehicleType && (
                          <div className="flex items-center gap-3">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">{selectedShift.vehicleType}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes */}
                  {selectedShift.notes && (
                    <Card className="border-amber-500/20 bg-amber-500/5">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold mb-1 text-amber-600">Notities</p>
                        <p className="text-sm text-muted-foreground">{selectedShift.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Primary CTA */}
                  <div className="pt-3">
                    {selectedShift.status === 'open' && (
                      <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => handleShiftAction(selectedShift)}>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Aanvragen
                      </Button>
                    )}
                    {selectedShift.status === 'requested' && (
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl text-amber-500 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
                        onClick={() => handleShiftAction(selectedShift)}
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Aanvraag intrekken
                      </Button>
                    )}
                    {selectedShift.status === 'assigned' && selectedShift.routeId && (
                      <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => handleShiftAction(selectedShift)}>
                        <Truck className="h-5 w-5 mr-2" />
                        Bekijk rit
                      </Button>
                    )}
                    {selectedShift.status === 'assigned' && !selectedShift.routeId && (
                      <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={() => window.location.href = 'tel:+31201234567'}>
                        <Phone className="h-5 w-5 mr-2" />
                        Contact planning
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
