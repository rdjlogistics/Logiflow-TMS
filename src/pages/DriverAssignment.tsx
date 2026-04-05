import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Truck, 
  User, 
  MapPin, 
  Clock, 
  Check, 
  Search,
  Star,
  Zap,
  ChevronRight,
  Phone,
  MessageCircle,
  Filter,
  Brain,
  CheckSquare,
  Square,
  RefreshCw,
  TrendingUp,
  Route,
  Award,
  X,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Trip {
  id: string;
  order_number: string;
  pickup_city: string | null;
  delivery_city: string | null;
  trip_date: string | null;
  status: string;
  driver_id: string | null;
  customer?: { company_name: string } | null;
}

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  rating: number | null;
  on_time_percentage: number | null;
  current_city: string | null;
  status: string;
  total_trips?: number;
}

interface DriverWithScore extends Driver {
  matchScore: number;
  scoreReasons: string[];
  distanceKm?: number;
  todayTrips: number;
}

// Cities with approximate coordinates for distance calculation
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'rotterdam': { lat: 51.9244, lng: 4.4777 },
  'utrecht': { lat: 52.0907, lng: 5.1214 },
  'den haag': { lat: 52.0705, lng: 4.3007 },
  'eindhoven': { lat: 51.4416, lng: 5.4697 },
  'tilburg': { lat: 51.5555, lng: 5.0913 },
  'groningen': { lat: 53.2194, lng: 6.5665 },
  'breda': { lat: 51.5719, lng: 4.7683 },
  'nijmegen': { lat: 51.8126, lng: 5.8372 },
  'arnhem': { lat: 51.9851, lng: 5.8987 },
  'maastricht': { lat: 50.8514, lng: 5.6910 },
  'zwolle': { lat: 52.5168, lng: 6.0830 },
  'almere': { lat: 52.3508, lng: 5.2647 },
  'haarlem': { lat: 52.3873, lng: 4.6462 },
  'venlo': { lat: 51.3704, lng: 6.1724 },
};

// Calculate distance between two cities
const calculateDistance = (city1: string, city2: string): number | null => {
  const c1 = CITY_COORDS[city1.toLowerCase()];
  const c2 = CITY_COORDS[city2.toLowerCase()];
  if (!c1 || !c2) return null;
  
  const R = 6371; // Earth's radius in km
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLon = (c2.lng - c1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
};

interface AssignmentResult {
  driverName: string;
  tripCount: number;
  tripNumbers: string[];
}

const DriverAssignment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [searchTrips, setSearchTrips] = useState("");
  const [searchDrivers, setSearchDrivers] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isCalculatingScores, setIsCalculatingScores] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [lastAssignment, setLastAssignment] = useState<AssignmentResult | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    minRating: 0,
    cities: [] as string[],
    minOnTime: 0,
  });

  // Fetch unassigned trips
  const { data: trips = [], isLoading: tripsLoading, refetch: refetchTrips } = useQuery({
    queryKey: ["unassigned-trips"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("trips")
        .select("id, order_number, pickup_city, delivery_city, trip_date, status, driver_id, customer:customers(company_name)")
        .is("driver_id", null)
        .is("deleted_at", null)
        .gte("trip_date", today)
        .in("status", ["draft", "aanvraag", "offerte", "gepland", "geladen", "onderweg"])
        .order("trip_date", { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as Trip[];
    }
  });

  // Fetch available drivers with today's trip count
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["available-drivers-extended"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, phone, rating, on_time_percentage, current_city, status, total_trips")
        .eq("status", "active")
        .order("rating", { ascending: false });
      
      if (error) throw error;
      return data as Driver[];
    }
  });

  // Fetch today's trip count per driver
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTripCounts = [] } = useQuery({
    queryKey: ["today-trip-counts", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("driver_id")
        .eq("trip_date", today)
        .not("driver_id", "is", null);
      if (error) throw error;
      return data as { driver_id: string }[];
    }
  });

  const todayTripsMap = useMemo(() => {
    const map = new Map<string, number>();
    todayTripCounts.forEach(t => {
      map.set(t.driver_id, (map.get(t.driver_id) || 0) + 1);
    });
    return map;
  }, [todayTripCounts]);

  // Get unique cities for filter
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    drivers.forEach(d => {
      if (d.current_city) cities.add(d.current_city);
    });
    return Array.from(cities).sort();
  }, [drivers]);

  // Calculate AI match scores for drivers
  const calculateMatchScores = useCallback((driversList: Driver[], tripPickupCity: string | null): DriverWithScore[] => {
    return driversList.map(driver => {
      let score = 50; // Base score
      const reasons: string[] = [];
      
      // Distance score (max +30)
      let distanceKm: number | undefined;
      if (tripPickupCity && driver.current_city) {
        distanceKm = calculateDistance(driver.current_city, tripPickupCity) ?? undefined;
        if (distanceKm !== undefined) {
          if (distanceKm < 20) {
            score += 30;
            reasons.push(`🎯 Zeer dichtbij (${distanceKm}km)`);
          } else if (distanceKm < 50) {
            score += 20;
            reasons.push(`📍 Nabij (${distanceKm}km)`);
          } else if (distanceKm < 100) {
            score += 10;
            reasons.push(`🚛 Redelijke afstand (${distanceKm}km)`);
          } else {
            reasons.push(`📍 ${distanceKm}km afstand`);
          }
        }
      }
      
      // Rating score (max +20)
      if (driver.rating) {
        const ratingBonus = Math.round((driver.rating - 3) * 10);
        score += ratingBonus;
        if (driver.rating >= 4.5) {
          reasons.push(`⭐ Top rating (${driver.rating.toFixed(1)})`);
        } else if (driver.rating >= 4.0) {
          reasons.push(`⭐ Goede rating (${driver.rating.toFixed(1)})`);
        }
      }
      
      // On-time percentage (max +20)
      if (driver.on_time_percentage) {
        if (driver.on_time_percentage >= 95) {
          score += 20;
          reasons.push(`✅ Uitstekend op tijd (${driver.on_time_percentage}%)`);
        } else if (driver.on_time_percentage >= 90) {
          score += 15;
          reasons.push(`✓ Betrouwbaar (${driver.on_time_percentage}% op tijd)`);
        } else if (driver.on_time_percentage >= 80) {
          score += 5;
        }
      }
      
      // Experience bonus (max +10)
      if (driver.total_trips && driver.total_trips > 200) {
        score += 10;
        reasons.push(`🏆 Ervaren (${driver.total_trips}+ ritten)`);
      } else if (driver.total_trips && driver.total_trips > 100) {
        score += 5;
        reasons.push(`📦 ${driver.total_trips} ritten`);
      }
      
      // Cap score at 100
      score = Math.min(100, Math.max(0, score));
      
      // Real today's trips from database
      const todayTrips = todayTripsMap.get(driver.id) || 0;
      if (todayTrips === 0) {
        reasons.unshift("💚 Vrij vandaag");
      } else {
        reasons.push(`📋 ${todayTrips} rit(ten) vandaag`);
      }
      
      return {
        ...driver,
        matchScore: score,
        scoreReasons: reasons,
        distanceKm,
        todayTrips,
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [todayTripsMap]);

  // Scored drivers based on selected trip(s)
  const scoredDrivers = useMemo(() => {
    if (selectedTrips.length === 0) return [];
    
    // Use the first selected trip for scoring
    const firstTrip = trips.find(t => t.id === selectedTrips[0]);
    return calculateMatchScores(drivers, firstTrip?.pickup_city ?? null);
  }, [drivers, selectedTrips, trips, calculateMatchScores]);

  // Filter trips
  const filteredTrips = useMemo(() => 
    trips.filter(t => 
      t.order_number?.toLowerCase().includes(searchTrips.toLowerCase()) ||
      t.pickup_city?.toLowerCase().includes(searchTrips.toLowerCase()) ||
      t.delivery_city?.toLowerCase().includes(searchTrips.toLowerCase()) ||
      t.customer?.company_name?.toLowerCase().includes(searchTrips.toLowerCase())
    ), [trips, searchTrips]
  );

  // Filter drivers with advanced filters
  const filteredDrivers = useMemo(() => {
    let result = scoredDrivers.filter(d => 
      d.name?.toLowerCase().includes(searchDrivers.toLowerCase()) ||
      d.current_city?.toLowerCase().includes(searchDrivers.toLowerCase())
    );
    
    // Apply filters
    if (filters.minRating > 0) {
      result = result.filter(d => (d.rating ?? 0) >= filters.minRating);
    }
    if (filters.cities.length > 0) {
      result = result.filter(d => d.current_city && filters.cities.includes(d.current_city));
    }
    if (filters.minOnTime > 0) {
      result = result.filter(d => (d.on_time_percentage ?? 0) >= filters.minOnTime);
    }
    
    return result;
  }, [scoredDrivers, searchDrivers, filters]);

  const selectedTripData = trips.find(t => t.id === selectedTrips[0]);

  // Assign driver mutation
  const assignMutation = useMutation({
    mutationFn: async ({ tripIds, driverId, driverName }: { tripIds: string[]; driverId: string; driverName: string }) => {
      for (const tripId of tripIds) {
        const { error } = await supabase
          .from("trips")
          .update({ driver_id: driverId, status: "gepland" })
          .eq("id", tripId);
        
        if (error) throw error;
      }
      
      // Send push notification to driver
      const tripData = trips.filter(t => tripIds.includes(t.id));
      const tripInfo = tripData.length === 1 
        ? `${tripData[0].pickup_city} → ${tripData[0].delivery_city}`
        : `${tripData.length} ritten toegewezen`;
      
      try {
        const { data: pushData } = await supabase.functions.invoke('send-push-notification', {
          body: {
            driver_id: driverId,
            title: '🚚 Nieuwe rit toegewezen!',
            body: tripInfo,
            notification_type: 'trip_assigned',
            data: {
              trip_id: tripIds[0],
              trip_count: tripIds.length,
            },
          },
        });
        if (pushData?.fallback_channel) {
          toast({
            title: `📱 Notificatie via ${pushData.fallback_channel === "whatsapp" ? "WhatsApp" : "SMS"}`,
            description: pushData.message || "Push niet beschikbaar, fallback gebruikt.",
            variant: "default",
            className: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-700",
          });
        } else if (pushData?.success === false) {
          toast({
            title: "⚠️ Notificatie niet verzonden",
            description: pushData.message || "Chauffeur heeft geen push notificaties of telefoonnummer.",
            variant: "default",
            className: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-700",
          });
        }
      } catch (err) {
        // Don't fail the assignment if notification fails
        console.error('Push notification failed:', err);
      }
      
      return { driverName, tripIds };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["unassigned-trips"] });
      
      // Get trip numbers for success screen
      const assignedTripNumbers = trips
        .filter(t => variables.tripIds.includes(t.id))
        .map(t => t.order_number);
      
      setLastAssignment({
        driverName: result.driverName,
        tripCount: variables.tripIds.length,
        tripNumbers: assignedTripNumbers,
      });
      setShowSuccessScreen(true);
      setSelectedTrips([]);
      setBulkMode(false);
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon chauffeur niet toewijzen.",
        variant: "destructive",
      });
    }
  });

  const handleAssign = (driverId: string, driverName: string) => {
    if (selectedTrips.length === 0) return;
    assignMutation.mutate({ tripIds: selectedTrips, driverId, driverName });
  };

  const handleContinueAssigning = () => {
    setShowSuccessScreen(false);
    setLastAssignment(null);
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const remainingTripsCount = trips.length - (lastAssignment?.tripCount || 0);

  const toggleTripSelection = (tripId: string) => {
    if (bulkMode) {
      setSelectedTrips(prev => 
        prev.includes(tripId) 
          ? prev.filter(id => id !== tripId)
          : [...prev, tripId]
      );
    } else {
      setSelectedTrips([tripId]);
    }
  };

  const selectAllTrips = () => {
    setSelectedTrips(filteredTrips.map(t => t.id));
  };

  const clearSelection = () => {
    setSelectedTrips([]);
  };

  const handleRefreshScores = async () => {
    setIsCalculatingScores(true);
    await queryClient.invalidateQueries({ queryKey: ["available-drivers-extended"] });
    await queryClient.invalidateQueries({ queryKey: ["today-trip-counts", today] });
    setIsCalculatingScores(false);
    toast({
      title: "🤖 AI Scores bijgewerkt",
      description: "Match scores zijn opnieuw berekend met actuele data.",
    });
  };

  const handleCall = (phone: string) => {
    // Clean phone number and use anchor click for iOS compatibility
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const link = document.createElement('a');
    link.href = `tel:${cleanPhone}`;
    link.click();
  };

  const handleWhatsApp = (phone: string, driverName: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '').replace('+', '');
    const message = encodeURIComponent(`Hoi ${driverName}, heb je beschikbaarheid voor een rit?`);
    const link = document.createElement('a');
    link.href = `https://wa.me/${cleanPhone}?text=${message}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/10 border-success/30';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-muted border-border';
  };

  return (
    <div className="min-h-screen bg-background pb-safe-area-inset-bottom">
      {/* iOS-style Header with Safe Area */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-safe-area-inset-top">
        <div className="flex items-center h-14 px-4 gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full hover:bg-muted/80 transition-all active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1 truncate">Chauffeur Toewijzen</h1>
          <div className="flex items-center gap-2">
            {selectedTrips.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                {selectedTrips.length}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">{trips.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 pb-28 max-w-3xl mx-auto">
        {/* Step Indicator - Compact Mobile */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide">
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
            selectedTrips.length === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs">1</span>
            Rit{bulkMode ? 'ten' : ''}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
            selectedTrips.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs">2</span>
            Chauffeur
          </div>
        </div>

        
          {showSuccessScreen && lastAssignment ? (
            /* Success Screen */
            <div
              key="success" className="animate-fade-in "text-center py-8"
            >
              {/* Success Animation */}
              <div className="animate-fade-in "w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-success/20 to-emerald-500/20 flex items-center justify-center"
              >
                <div className="animate-fade-in "w-16 h-16 rounded-full bg-success flex items-center justify-center"
                >
                  <Check className="h-8 w-8 text-white" />
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold mb-2">Toewijzing Voltooid!</h2>
                <p className="text-muted-foreground mb-4">
                  {lastAssignment.tripCount === 1 
                    ? `Rit #${lastAssignment.tripNumbers[0]} is toegewezen aan`
                    : `${lastAssignment.tripCount} ritten zijn toegewezen aan`
                  }
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-semibold mb-6">
                  <User className="h-5 w-5" />
                  {lastAssignment.driverName}
                </div>
              </div>

              {/* Assignment Details */}
              {lastAssignment.tripCount > 1 && (
                <div className="animate-fade-in "mb-6 p-4 rounded-xl bg-muted/50 max-w-sm mx-auto"
                >
                  <p className="text-sm text-muted-foreground mb-2">Toegewezen ritten:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {lastAssignment.tripNumbers.map((num, i) => (
                      <Badge key={i} variant="secondary" className="font-mono">
                        #{num}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Next Actions */}
              <div className="animate-fade-in "space-y-3"
              >
                {remainingTripsCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                    <div className="flex items-center justify-center gap-2 text-amber-600">
                      <Truck className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Nog {remainingTripsCount} {remainingTripsCount === 1 ? 'rit' : 'ritten'} zonder chauffeur
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-sm mx-auto">
                  {remainingTripsCount > 0 && (
                    <Button
                      onClick={handleContinueAssigning}
                      className="h-14 rounded-2xl text-base font-medium gap-2 touch-manipulation active:scale-[0.98] transition-transform"
                    >
                      <ChevronRight className="h-5 w-5" />
                      Volgende rit toewijzen
                    </Button>
                  )}
                  
                  <Button
                    variant={remainingTripsCount > 0 ? "outline" : "default"}
                    onClick={handleGoToDashboard}
                    className="h-14 rounded-2xl text-base font-medium gap-2 touch-manipulation active:scale-[0.98] transition-transform"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Terug naar dashboard
                  </Button>

                  {remainingTripsCount === 0 && (
                    <div className="animate-fade-in "p-4 rounded-xl bg-success/10 border border-success/20 mt-2"
                    >
                      <div className="flex items-center justify-center gap-2 text-success">
                        <Sparkles className="h-5 w-5" />
                        <span className="font-medium">Alle ritten zijn toegewezen!</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedTrips.length === 0 ? (
            /* Step 1: Select Trip(s) */
            <motion.div
              key="trips"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Controls - iOS Optimized */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek rit, stad of klant..."
                    value={searchTrips}
                    onChange={(e) => setSearchTrips(e.target.value)}
                    className="pl-10 h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 text-base touch-manipulation"
                    style={{ fontSize: '16px' }} // Prevent iOS zoom
                  />
                </div>
                <Button
                  variant={bulkMode ? "default" : "outline"}
                  size="icon"
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    if (bulkMode) clearSelection();
                  }}
                  className="h-12 w-12 rounded-2xl touch-manipulation active:scale-95 transition-transform"
                >
                  <CheckSquare className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchTrips()}
                  className="h-12 w-12 rounded-2xl touch-manipulation active:scale-95 transition-transform"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </div>

              {/* Bulk Mode Controls */}
              {bulkMode && (
                <div className="animate-fade-in "mb-4 flex items-center gap-2"
                >
                  <Button variant="outline" size="sm" onClick={selectAllTrips}>
                    Alles selecteren
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Wissen
                  </Button>
                  {selectedTrips.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        // Scroll to drivers section
                        document.getElementById('drivers-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="ml-auto"
                    >
                      Ga naar chauffeurs →
                    </Button>
                  )}
                </div>
              )}

              {/* Trip List */}
              <div className="space-y-2">
                {tripsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
                  ))
                ) : filteredTrips.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Geen openstaande ritten</p>
                  </div>
                ) : (
                  filteredTrips.map((trip, index) => (
                    <button
                      key={trip.id} transition={{ delay: Math.min(index * 0.02, 0.2) }}
                      onClick={() => toggleTripSelection(trip.id)}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left transition-all touch-manipulation",
                        "bg-card border",
                        selectedTrips.includes(trip.id) 
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                          : "border-border/50 active:border-primary/50 active:bg-primary/5",
                        "active:scale-[0.98]",
                        "group"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {bulkMode && (
                          <div className="pt-0.5">
                            {selectedTrips.includes(trip.id) ? (
                              <CheckSquare className="h-6 w-6 text-primary" />
                            ) : (
                              <Square className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-sm font-semibold text-primary">
                              #{trip.order_number}
                            </span>
                            {trip.customer?.company_name && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                • {trip.customer.company_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium">
                              {trip.pickup_city || "–"} → {trip.delivery_city || "–"}
                            </span>
                          </div>
                          {trip.trip_date && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(trip.trip_date), "EEE d MMM", { locale: nl })}
                            </div>
                          )}
                        </div>
                        {!bulkMode && (
                          <ChevronRight className="h-6 w-6 text-muted-foreground group-active:text-primary transition-colors" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Select Driver with AI Scores */
            <motion.div
              id="drivers-section"
              key="drivers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Selected Trip Summary */}
              <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {selectedTrips.length > 1 ? `${selectedTrips.length} ritten geselecteerd` : 'Geselecteerde rit'}
                    </p>
                    {selectedTrips.length === 1 && selectedTripData && (
                      <p className="font-semibold">
                        #{selectedTripData.order_number} • {selectedTripData.pickup_city} → {selectedTripData.delivery_city}
                      </p>
                    )}
                    {selectedTrips.length > 1 && (
                      <p className="font-semibold">Bulk toewijzing</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    Wijzig
                  </Button>
                </div>
              </div>

              {/* AI Match Score Header */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI Match Scores</p>
                    <p className="text-xs text-muted-foreground">Beste matches bovenaan</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshScores}
                  disabled={isCalculatingScores}
                  className="gap-1.5"
                >
                  {isCalculatingScores ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Herbereken
                </Button>
              </div>

              {/* Search & Filter - iOS Optimized */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek chauffeur..."
                    value={searchDrivers}
                    onChange={(e) => setSearchDrivers(e.target.value)}
                    className="pl-10 h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 text-base touch-manipulation"
                    style={{ fontSize: '16px' }} // Prevent iOS zoom
                  />
                </div>
                
                {/* Filter Sheet - iOS Optimized */}
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-12 w-12 rounded-2xl touch-manipulation active:scale-95 transition-transform",
                        (filters.minRating > 0 || filters.cities.length > 0 || filters.minOnTime > 0) && "border-primary bg-primary/5"
                      )}
                    >
                      <Filter className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Geavanceerde Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      {/* Min Rating */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Minimale rating: {filters.minRating > 0 ? filters.minRating.toFixed(1) : 'Alle'}
                        </label>
                        <Slider
                          value={[filters.minRating]}
                          onValueChange={([v]) => setFilters(f => ({ ...f, minRating: v }))}
                          min={0}
                          max={5}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Min On-Time */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Minimaal op tijd: {filters.minOnTime > 0 ? `${filters.minOnTime}%` : 'Alle'}
                        </label>
                        <Slider
                          value={[filters.minOnTime]}
                          onValueChange={([v]) => setFilters(f => ({ ...f, minOnTime: v }))}
                          min={0}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Cities */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">Locaties</label>
                        <div className="flex flex-wrap gap-2">
                          {availableCities.map(city => (
                            <Button
                              key={city}
                              variant={filters.cities.includes(city) ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFilters(f => ({
                                ...f,
                                cities: f.cities.includes(city)
                                  ? f.cities.filter(c => c !== city)
                                  : [...f.cities, city]
                              }))}
                            >
                              {city}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Reset */}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setFilters({ minRating: 0, cities: [], minOnTime: 0 })}
                      >
                        Filters wissen
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Driver List with Scores - iOS Optimized */}
              <div className="space-y-3 pb-8">
                {driversLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
                  ))
                ) : filteredDrivers.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <User className="h-14 w-14 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Geen beschikbare chauffeurs</p>
                  </div>
                ) : (
                  filteredDrivers.map((driver, index) => (
                    <div
                      key={driver.id} className="animate-fade-in {cn(
                        "p-4 rounded-2xl transition-all touch-manipulation",
                        "bg-card border",
                        getScoreBg(driver.matchScore),
                        "active:scale-[0.99]",
                        "group"
                      )}
                    >
                      {/* Mobile-First Layout */}
                      <div className="flex items-start gap-3">
                        {/* Score Badge */}
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0",
                          driver.matchScore >= 80 ? "bg-success/20" : driver.matchScore >= 60 ? "bg-amber-500/20" : "bg-muted"
                        )}>
                          <span className={cn("text-2xl font-bold", getScoreColor(driver.matchScore))}>
                            {driver.matchScore}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">match</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-base truncate">{driver.name}</p>
                            {index === 0 && driver.matchScore >= 70 && (
                              <Badge variant="secondary" className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] px-1.5 py-0.5 flex-shrink-0">
                                <Award className="h-3 w-3 mr-0.5" />
                                TOP
                              </Badge>
                            )}
                          </div>
                          
                          {/* Quick Stats - Horizontal Scroll on Mobile */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 overflow-x-auto scrollbar-hide">
                            {driver.current_city && (
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <MapPin className="h-3.5 w-3.5" />
                                {driver.current_city}
                              </span>
                            )}
                            {driver.rating && (
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {driver.rating.toFixed(1)}
                              </span>
                            )}
                            {driver.on_time_percentage && (
                              <span className="flex items-center gap-1 text-success whitespace-nowrap">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {driver.on_time_percentage}%
                              </span>
                            )}
                          </div>

                          {/* Score Reasons - Limit 2 on mobile */}
                          <div className="flex flex-wrap gap-1">
                            {driver.scoreReasons.slice(0, 2).map((reason, i) => (
                              <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions - Full Width on Mobile */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button
                          onClick={() => handleAssign(driver.id, driver.name)}
                          disabled={assignMutation.isPending}
                          className="flex-1 h-12 gap-2 rounded-xl touch-manipulation active:scale-[0.98] transition-transform text-base font-medium"
                        >
                          {assignMutation.isPending ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                          {assignMutation.isPending ? 'Bezig...' : 'Toewijzen'}
                        </Button>
                        
                        {/* Contact buttons - Larger for iOS */}
                        {driver.phone && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-xl touch-manipulation active:scale-95 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCall(driver.phone!);
                              }}
                            >
                              <Phone className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-xl touch-manipulation active:scale-95 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsApp(driver.phone!, driver.name);
                              }}
                            >
                              <MessageCircle className="h-5 w-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        
      </div>
    </div>
  );
};

export default DriverAssignment;
