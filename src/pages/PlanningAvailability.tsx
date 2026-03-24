import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays, 
  Users, 
  Clock, 
  MapPin, 
  Search,
  Filter,
  Star,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Truck
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DriverAvailability {
  id: string;
  driver_id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  preferred_regions: string[] | null;
  preferred_vehicle_types: string[] | null;
  max_distance_km: number | null;
}

interface DriverWithScore {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  score: number;
  reliability_score: number | null;
  punctuality_score: number | null;
  shifts_last_30_days: number | null;
  is_standby: boolean;
  standby_regions: string[] | null;
}

const PlanningAvailability = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  // Week days for the current view
  const weekDays = useMemo(() => {
    const start = weekStart;
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [weekStart]);

  // Fetch all drivers with their scores
  const { data: drivers = [] } = useQuery({
    queryKey: ['planning-drivers'],
    queryFn: async () => {
      // Get profiles with chauffeur role
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'chauffeur');

      if (rolesError) throw rolesError;

      const driverUserIds = roles?.map(r => r.user_id) || [];
      const driverProfiles = profiles?.filter(p => driverUserIds.includes(p.user_id)) || [];

      // Resolve drivers.id from auth.uid() for driver_scores lookup
      const { data: driverRecords } = await supabase
        .from('drivers')
        .select('id, user_id')
        .in('user_id', driverUserIds);

      const userToDriverId = Object.fromEntries(
        (driverRecords || []).map(d => [d.user_id, d.id])
      );
      const realDriverIds = Object.values(userToDriverId).filter(Boolean) as string[];

      // Get scores using resolved drivers.id
      const { data: scores } = realDriverIds.length > 0
        ? await supabase
            .from('driver_scores')
            .select('*')
            .in('driver_id', realDriverIds)
        : { data: null };

      return driverProfiles.map(profile => {
        const driverId = userToDriverId[profile.user_id];
        const driverScore = scores?.find(s => s.driver_id === driverId);
        return {
          ...profile,
          score: driverScore?.overall_score ?? 100,
          reliability_score: driverScore?.reliability_score ?? null,
          punctuality_score: driverScore?.punctuality_score ?? null,
          shifts_last_30_days: driverScore?.shifts_last_30_days ?? 0,
          is_standby: driverScore?.is_standby ?? false,
          standby_regions: driverScore?.standby_regions ?? null,
        } as DriverWithScore;
      });
    },
  });

  // Fetch availability for the current week
  const { data: availabilityData = [] } = useQuery({
    queryKey: ['driver-availability', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('driver_availability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return data as DriverAvailability[];
    },
  });

  // Navigate weeks
  const goToPreviousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDate(new Date());
  };

  // Get availability for a specific driver and date
  const getDriverAvailability = (driverId: string, date: Date): DriverAvailability | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilityData.find(a => a.driver_id === driverId && a.date === dateStr) || null;
  };

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatch = driver.full_name?.toLowerCase().includes(search);
        if (!nameMatch) return false;
      }

      // Availability filter for selected date
      if (availabilityFilter !== 'all') {
        const availability = getDriverAvailability(driver.user_id, selectedDate);
        if (availabilityFilter === 'available' && !availability?.is_available) return false;
        if (availabilityFilter === 'unavailable' && availability?.is_available !== false) return false;
        if (availabilityFilter === 'standby' && !driver.is_standby) return false;
      }

      return true;
    });
  }, [drivers, searchTerm, availabilityFilter, selectedDate, availabilityData]);

  // Count available drivers per day
  const getAvailableCount = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilityData.filter(a => a.date === dateStr && a.is_available).length;
  };

  return (
    <DashboardLayout 
      title="Beschikbaarheid" 
      description="Bekijk en beheer de beschikbaarheid van chauffeurs"
    >
      <div className="space-y-5 md:space-y-6">
        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <div className="icon-gradient-accent">
            <CalendarDays className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Beschikbaarheid</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Bekijk en beheer de beschikbaarheid van chauffeurs
            </p>
          </div>
        </div>

        {/* Week Navigation with premium styling */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl" onClick={goToToday}>
                  Vandaag
                </Button>
              </div>
              <h2 className="font-semibold text-base md:text-lg text-center sm:text-left font-display">
                {format(weekStart, 'd MMM', { locale: nl })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: nl })}
              </h2>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">{drivers.length}</span> chauffeurs
              </div>
            </div>

            {/* Week Day Headers - Enhanced */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory md:grid md:grid-cols-7 md:overflow-visible md:pb-0">
              {weekDays.map(day => {
                const availableCount = getAvailableCount(day);
                const isSelected = isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative flex-shrink-0 w-18 md:w-auto p-3 rounded-xl text-center transition-all border-2 snap-center overflow-hidden",
                      isSelected 
                        ? "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                        : today 
                          ? "bg-primary/15 border-primary/50 hover:border-primary/70 ring-1 ring-primary/20 shadow-glow-soft" 
                          : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    {/* Today accent bar with shimmer */}
                    {today && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary rounded-t-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent animate-shimmer -translate-x-full" />
                      </div>
                    )}
...
                    {/* "Vandaag" label with glow ring */}
                    {today && !isSelected && (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-primary animate-pulse-soft">Vandaag</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters with glass effect */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek chauffeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-card"
            />
          </div>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-11 bg-card">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle chauffeurs</SelectItem>
              <SelectItem value="available">Beschikbaar</SelectItem>
              <SelectItem value="unavailable">Niet beschikbaar</SelectItem>
              <SelectItem value="standby">Stand-by</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selected Date Info with premium styling */}
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-lg shadow-primary/25">
                <CalendarDays className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg md:text-xl font-display truncate">
                  {format(selectedDate, 'EEEE d MMMM', { locale: nl })}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-semibold text-green-600">{getAvailableCount(selectedDate)}</span> van {drivers.length} beschikbaar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Availability Grid with premium cards */}
        <div className="grid gap-3">
          {filteredDrivers.length === 0 ? (
            <Card className="premium-card">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">Geen chauffeurs gevonden</p>
              </CardContent>
            </Card>
          ) : (
            filteredDrivers.map(driver => {
              const availability = getDriverAvailability(driver.user_id, selectedDate);
              const isAvailable = availability?.is_available ?? null;

              return (
                <Card 
                  key={driver.user_id}
                  className={cn(
                    "premium-card transition-all",
                    isAvailable === true && "border-green-500/40 bg-gradient-to-r from-green-500/5 to-transparent",
                    isAvailable === false && "border-red-500/40 bg-gradient-to-r from-red-500/5 to-transparent"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Driver Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Driver Avatar & Status */}
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ring-2 ring-background shadow-sm">
                            <Truck className="h-6 w-6 text-muted-foreground" />
                          </div>
                          {isAvailable !== null && (
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-background",
                              isAvailable ? "bg-green-500" : "bg-red-500"
                            )}>
                              {isAvailable ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              ) : (
                                <XCircle className="h-3 w-3 text-white" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Driver Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm md:text-base truncate">
                              {driver.full_name || 'Onbekende chauffeur'}
                            </h4>
                            {driver.is_standby && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                                Stand-by
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded">
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              <span className="font-medium">{driver.score}</span>
                            </div>
                            <span className="hidden sm:inline text-muted-foreground/60">•</span>
                            <span className="hidden sm:inline">{driver.shifts_last_30_days || 0} ritten afgelopen 30 dagen</span>
                          </div>
                        </div>
                      </div>

                      {/* Availability Details */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-0">
                        {isAvailable === true && availability && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-green-500 text-white font-semibold">
                              Beschikbaar
                            </Badge>
                            {(availability.start_time || availability.end_time) && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                                <Clock className="h-3.5 w-3.5" />
                                {availability.start_time || '00:00'} - {availability.end_time || '23:59'}
                              </span>
                            )}
                          </div>
                        )}
                        {isAvailable === false && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/30 font-semibold">
                              Niet beschikbaar
                            </Badge>
                            {availability?.notes && (
                              <span className="text-sm text-muted-foreground max-w-[200px] truncate hidden md:inline">
                                {availability.notes}
                              </span>
                            )}
                          </div>
                        )}
                        {isAvailable === null && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Onbekend
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlanningAvailability;
