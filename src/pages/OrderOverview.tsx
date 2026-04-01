import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { ToastAction } from "@/components/ui/toast";
import { useOrderSubstatuses } from "@/hooks/useOrderSubstatuses";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Truck,
  AlertTriangle,
  Clock,
  Plus,
  Bot,
  Inbox,
  MapPin,
  Calendar,
  Euro,
  Building2,
  MoreVertical,
  Package,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  Upload,
  Repeat,
  Keyboard,
  Map,
  SlidersHorizontal,
  Pen,
  Camera,
  Navigation,
  FileCheck,
  ShieldCheck,
  ReceiptEuro,
  Send,
  FileText,
} from "lucide-react";
import { DispatchOrderDialog } from "@/components/orders/DispatchOrderDialog";
import CustomerSubmissionsTab from "@/components/orders/CustomerSubmissionsTab";
import { OrderImportDialog } from "@/components/orders/OrderImportDialog";
import { OrderExportDialog } from "@/components/orders/OrderExportDialog";
import { QuickEditPopover } from "@/components/orders/QuickEditPopover";
import { RecurringOrderDialog } from "@/components/orders/RecurringOrderDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import OrderMobileCard from "@/components/orders/OrderMobileCard";
import EnhancedSearchBar from "@/components/orders/EnhancedSearchBar";
import KeyboardShortcutsHelp from "@/components/orders/KeyboardShortcutsHelp";
import PullToRefreshIndicator from "@/components/orders/PullToRefreshIndicator";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';
import QuickStatsHeader from "@/components/orders/QuickStatsHeader";
import AdvancedFiltersPanel from "@/components/orders/AdvancedFiltersPanel";
import EnhancedBulkActionsBar from "@/components/orders/EnhancedBulkActionsBar";
import OrderLocationMap from "@/components/orders/OrderLocationMap";
import { QuickAssignDriverButton } from "@/components/orders/QuickAssignDriverButton";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";

type TripStatus = "offerte" | "aanvraag" | "draft" | "gepland" | "geladen" | "onderweg" | "afgeleverd" | "afgerond" | "gecontroleerd" | "gefactureerd" | "geannuleerd";

interface Trip {
  id: string;
  order_number: string | null;
  trip_date: string;
  customer_id: string | null;
  carrier_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  status: TripStatus;
  pickup_address: string;
  pickup_city: string | null;
  pickup_postal_code: string | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  product_id: string | null;
  cargo_description: string | null;
  remarks_waybill: string | null;
  remarks_internal: string | null;
  sales_total: number | null;
  purchase_total: number | null;
  gross_profit: number | null;
  profit_margin_pct: number | null;
  customers?: { company_name: string; email?: string; contact_name?: string } | null;
  carriers?: { company_name: string } | null;
  vehicles?: { license_plate: string; vehicle_type: string | null } | null;
  products?: { name: string } | null;
  company_id: string | null;
}

interface RouteStop {
  id: string;
  trip_id: string;
  stop_order: number;
  stop_type: string;
  address: string;
  city: string | null;
  customer_reference: string | null;
  waybill_number: string | null;
  status: string | null;
}

interface StopProofSummary {
  stop_id: string;
  trip_id: string;
  receiver_first_name: string | null;
  receiver_last_name: string | null;
  arrival_time: string | null;
  signature_url: string | null;
  photo_urls: string[] | null;
  latitude: number | null;
  longitude: number | null;
  sub_status: string | null;
  waiting_minutes: number | null;
  loading_minutes: number | null;
  actual_distance_km: number | null;
  note: string | null;
}

interface FilterOption {
  id: string;
  name: string;
}

interface QuickStats {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  plannedCount: number;
  enRouteCount: number;
  completedCount: number;
  unassignedCount: number;
}

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

const OrderOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: orderSubstatuses } = useOrderSubstatuses();
  const { canAccessChatGPT, isAdmin, role } = useUserRole();
  const canEdit = isAdmin || role === 'medewerker';
  const isMobile = useIsMobile();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("orders");
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);

  // Data state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [stopProofs, setStopProofs] = useState<Record<string, StopProofSummary>>({});
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Quick stats
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgMargin: 0,
    plannedCount: 0,
    enRouteCount: 0,
    completedCount: 0,
    unassignedCount: 0,
  });

  // Filter options
  const [customers, setCustomers] = useState<FilterOption[]>([]);
  const [carriers, setCarriers] = useState<FilterOption[]>([]);
  const [vehicles, setVehicles] = useState<FilterOption[]>([]);
  const [products, setProducts] = useState<FilterOption[]>([]);
  const [driversList, setDriversList] = useState<FilterOption[]>([]);

  // Active filters
  const [unassignedFilter, setUnassignedFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(endOfYear(new Date()), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [periodPreset, setPeriodPreset] = useState<string>("this_year");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Selection
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("trip_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Import/Export/Recurring/Shortcuts dialogs
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [marginRange, setMarginRange] = useState<[number, number]>([0, 100]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pull-to-refresh for mobile
  const handleRefresh = useCallback(async () => {
    await fetchOrders();
    await fetchQuickStats();
  }, []);

  const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // N = New order
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        navigate('/orders/edit');
      }
      
      // / = Focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape = Clear search
      if (e.key === 'Escape' && searchTerm) {
        e.preventDefault();
        setSearchTerm('');
        searchInputRef.current?.blur();
      }

      // ? = Show shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, searchTerm]);

  useEffect(() => {
    fetchFilterOptions();
    fetchPendingSubmissionsCount();
  }, []);

  const fetchPendingSubmissionsCount = async () => {
    const { count } = await supabase
      .from("customer_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingSubmissionsCount(count || 0);
  };

  // Debounce search term to avoid re-fetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders();
    fetchQuickStats();
  }, [statusFilter, productFilter, carrierFilter, customerFilter, vehicleFilter, dateFrom, dateTo, debouncedSearchTerm, currentPage, itemsPerPage, sortColumn, sortDirection, unassignedFilter]);

  // Realtime: auto-refresh when trips table changes
  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-realtime-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        fetchOrders();
        fetchQuickStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchFilterOptions = async () => {
    const [customersRes, carriersRes, vehiclesRes, productsRes] = await Promise.all([
      supabase.from("customers").select("id, company_name").order("company_name"),
      supabase.from("carriers").select("id, company_name").order("company_name"),
      supabase.from("vehicles").select("id, license_plate").eq("is_active", true).order("license_plate"),
      supabase.from("products").select("id, name").eq("is_active", true).order("name"),
    ]);
    const driversRes: { data: { id: string; name: string }[] | null } = await supabase.from("drivers").select("id, name").eq("status", "active").order("name");

    setCustomers(customersRes.data?.map(c => ({ id: c.id, name: c.company_name })) || []);
    setCarriers(carriersRes.data?.map(c => ({ id: c.id, name: c.company_name })) || []);
    setVehicles(vehiclesRes.data?.map(v => ({ id: v.id, name: v.license_plate })) || []);
    setProducts(productsRes.data?.map(p => ({ id: p.id, name: p.name })) || []);
    setDriversList(driversRes.data?.map(d => ({ id: d.id, name: d.name })) || []);
  };

  const fetchQuickStats = async () => {
    try {
      let query = supabase
        .from("trips")
        .select("status, sales_total, purchase_total, gross_profit, profit_margin_pct, driver_id, carrier_id")
        .is("deleted_at", null);
      if (dateFrom) query = query.gte("trip_date", dateFrom);
      if (dateTo) query = query.lte("trip_date", dateTo);
      if (customerFilter !== "all") query = query.eq("customer_id", customerFilter);
      if (carrierFilter !== "all") query = query.eq("carrier_id", carrierFilter);

      const { data } = await query;

      if (data) {
        const pricedOrders = data.filter(t => (t.sales_total || 0) > 0);
        const stats: QuickStats = {
          totalOrders: data.length,
          totalRevenue: data.reduce((sum, t) => sum + (t.sales_total || 0), 0),
          totalProfit: data.reduce((sum, t) => {
            const profit = (t.sales_total || 0) - (t.purchase_total || 0);
            return sum + profit;
          }, 0),
          avgMargin: data.reduce((sum, t) => sum + (t.sales_total || 0), 0) > 0
            ? (data.reduce((sum, t) => sum + ((t.sales_total || 0) - (t.purchase_total || 0)), 0) / data.reduce((sum, t) => sum + (t.sales_total || 0), 0)) * 100
            : 0,
          plannedCount: data.filter(t => t.status === "gepland").length,
          enRouteCount: data.filter(t => t.status === "onderweg").length,
          completedCount: data.filter(t => ['afgerond', 'afgeleverd', 'gecontroleerd', 'gefactureerd'].includes(t.status)).length,
          unassignedCount: data.filter(t => !t.driver_id && !t.carrier_id).length,
        };
        setQuickStats(stats);
      }
    } catch (err) {
      console.error('Quick stats failed:', err);
      toast({ title: "Statistieken laden mislukt", variant: "destructive" });
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("trips")
        .select(`
          *,
          customers(company_name, email, contact_name),
          carriers(company_name),
          vehicles(license_plate, vehicle_type),
          products(name)
        `, { count: "exact" })
        .is("deleted_at", null);

      // Apply filters
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      if (carrierFilter !== "all") {
        query = query.eq("carrier_id", carrierFilter);
      }
      if (customerFilter !== "all") {
        query = query.eq("customer_id", customerFilter);
      }
      if (vehicleFilter !== "all") {
        query = query.eq("vehicle_id", vehicleFilter);
      }
      if (dateFrom) {
        query = query.gte("trip_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("trip_date", dateTo);
      }
      if (productFilter !== "all") {
        query = query.eq("product_id", productFilter);
      }
      if (unassignedFilter) {
        query = query.is("driver_id", null).is("carrier_id", null);
      }
      if (debouncedSearchTerm) {
        query = query.or(`order_number.ilike.%${debouncedSearchTerm}%,pickup_city.ilike.%${debouncedSearchTerm}%,delivery_city.ilike.%${debouncedSearchTerm}%,cargo_description.ilike.%${debouncedSearchTerm}%,pickup_address.ilike.%${debouncedSearchTerm}%,delivery_address.ilike.%${debouncedSearchTerm}%`);
      }

      // Sorting
      query = query.order(sortColumn, { ascending: sortDirection === "asc" });

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setTrips((data || []) as unknown as Trip[]);
      setTotalCount(count || 0);

      // Fetch route stops + stop proofs for these trips
      if (data && data.length > 0) {
        const tripIds = data.map(t => t.id);
        const [stopsRes, proofsRes] = await Promise.all([
          supabase
            .from("route_stops")
            .select("id, trip_id, stop_order, stop_type, address, city, customer_reference, waybill_number, status")
            .in("trip_id", tripIds)
            .order("stop_order"),
          supabase
            .from("stop_proofs")
            .select("stop_id, trip_id, receiver_first_name, receiver_last_name, arrival_time, signature_url, photo_urls, latitude, longitude, sub_status, waiting_minutes, loading_minutes, actual_distance_km, note")
            .in("trip_id", tripIds),
        ]);
        setRouteStops(stopsRes.data || []);
        
        // Build proof record indexed by stop_id
        const proofRecord: Record<string, StopProofSummary> = {};
        (proofsRes.data || []).forEach((p: any) => {
          proofRecord[p.stop_id] = p;
        });
        setStopProofs(proofRecord);
      } else {
        setRouteStops([]);
        setStopProofs({});
      }
    } catch {
      toast({ title: "Fout bij ophalen orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodPreset = (preset: string) => {
    setPeriodPreset(preset);
    const now = new Date();
    switch (preset) {
      case "this_year":
        setDateFrom(format(startOfYear(now), "yyyy-MM-dd"));
        setDateTo(format(endOfYear(now), "yyyy-MM-dd"));
        break;
      case "this_month":
        setDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
        setDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        setDateFrom(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
        setDateTo(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
        break;
      case "this_week":
        setDateFrom(format(startOfWeek(now, { locale: nl }), "yyyy-MM-dd"));
        setDateTo(format(endOfWeek(now, { locale: nl }), "yyyy-MM-dd"));
        break;
    }
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(trips.map(t => t.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleDelete = (id: string) => {
    setDeleteOrderId(id);
  };

  const confirmDelete = async () => {
    if (!deleteOrderId) return;
    const deletedId = deleteOrderId;
    setIsDeleting(true);
    try {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        await supabase.from("order_events").insert({
          order_id: deletedId,
          event_type: "ORDER_DELETED",
          actor_user_id: userId,
          payload: { deleted_at: new Date().toISOString() },
        });
      } catch {
        // Silent - event logging failure should not block deletion
      }
      
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", deletedId);
      if (error) throw error;
      toast({
        title: "Order verwijderd",
        action: (
          <ToastAction
            altText="Ongedaan maken"
            onClick={async () => {
              const { error } = await supabase
                .from("trips")
                .update({ deleted_at: null } as any)
                .eq("id", deletedId);
              if (!error) {
                toast({ title: "Order hersteld" });
                fetchOrders();
              }
            }}
          >
            Ongedaan maken
          </ToastAction>
        ),
        duration: 8000,
      });
      fetchOrders();
    } catch {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteOrderId(null);
    }
  };

  const handleDuplicate = async (trip: Trip) => {
    try {
      // Generate a new order number for the duplicate
      const { data: orderNumber } = await supabase.rpc('generate_order_number');

      const { data: newTrip, error } = await supabase
        .from("trips")
        .insert({
          company_id: trip.company_id,
          customer_id: trip.customer_id,
          carrier_id: trip.carrier_id,
          driver_id: trip.driver_id,
          vehicle_id: trip.vehicle_id,
          product_id: trip.product_id,
          trip_date: format(new Date(), "yyyy-MM-dd"),
          pickup_address: trip.pickup_address,
          pickup_city: trip.pickup_city,
          pickup_postal_code: trip.pickup_postal_code,
          delivery_address: trip.delivery_address,
          delivery_city: trip.delivery_city,
          delivery_postal_code: trip.delivery_postal_code,
          cargo_description: trip.cargo_description,
          sales_total: trip.sales_total,
          purchase_total: trip.purchase_total,
          gross_profit: trip.gross_profit,
          profit_margin_pct: trip.profit_margin_pct,
          status: "gepland",
          order_number: orderNumber || undefined,
          remarks_waybill: trip.remarks_waybill,
          remarks_internal: trip.remarks_internal,
        })
        .select()
        .single();

      if (error) throw error;

      const tripStops = routeStops.filter(s => s.trip_id === trip.id);
      if (tripStops.length > 0 && newTrip) {
        await supabase.from("route_stops").insert(
          tripStops.map(s => ({
            trip_id: newTrip.id,
            stop_order: s.stop_order,
            stop_type: s.stop_type,
            address: s.address,
            city: s.city,
            customer_reference: s.customer_reference,
            waybill_number: s.waybill_number,
          }))
        );
      }

      toast({ title: "Order gedupliceerd" });
      fetchOrders();
    } catch {
      toast({ title: "Fout bij dupliceren", variant: "destructive" });
    }
  };

  const getStopsForTrip = (tripId: string) => {
    return routeStops.filter(s => s.trip_id === tripId).sort((a, b) => a.stop_order - b.stop_order);
  };

  const getRowStatusClass = (trip: Trip) => {
    // Aanvraag = klantaanvraag, speciale amber styling
    if (trip.status === "aanvraag") {
      return "bg-amber-500/8 hover:bg-amber-500/12 border-l-[3px] border-l-amber-600";
    }
    // Draft = concept, subtiele grijze styling
    if (trip.status === "draft") {
      return "bg-muted/10 hover:bg-muted/20 border-l-[3px] border-l-muted-foreground/40";
    }
    if (!trip.driver_id && !trip.carrier_id) {
      return "bg-destructive/5 hover:bg-destructive/8 border-l-[3px] border-l-destructive";
    }
    // Afgeleverd = alle stops afgemeld → groen
    if (trip.status === "afgeleverd" || trip.status === "afgerond") {
      return "bg-emerald-500/5 hover:bg-emerald-500/8 border-l-[3px] border-l-emerald-500";
    }
    // Gecontroleerd = afgemeld naar planning → donkerblauw
    if (trip.status === "gecontroleerd") {
      return "bg-blue-800/5 hover:bg-blue-800/8 border-l-[3px] border-l-blue-800";
    }
    // Gefactureerd → grijs
    if (trip.status === "gefactureerd") {
      return "bg-muted/30 hover:bg-muted/40 border-l-[3px] border-l-muted-foreground/30";
    }
    // Onderweg = deels afgemeld → amber
    if (trip.status === "onderweg") {
      return "bg-amber-500/5 hover:bg-amber-500/8 border-l-[3px] border-l-amber-500";
    }
    if (trip.status === "geladen") {
      return "bg-orange-500/5 hover:bg-orange-500/8 border-l-[3px] border-l-orange-500";
    }
    if (trip.status === "offerte") {
      return "bg-cyan-500/5 hover:bg-cyan-500/8 border-l-[3px] border-l-cyan-600";
    }
    return "hover:bg-muted/30 border-l-[3px] border-l-transparent";
  };

  const getStatusBadge = (trip: Trip) => {
    if (!trip.driver_id && !trip.carrier_id) {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="destructive" className="text-[10px] gap-1 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Geen chauffeur
          </Badge>
          {canEdit && (
            <QuickAssignDriverButton
              tripId={trip.id}
              orderNumber={trip.order_number}
              currentStatus={trip.status}
              customerId={trip.customer_id}
              drivers={driversList}
              onAssigned={fetchOrders}
              size="xs"
            />
          )}
        </div>
      );
    }
    if (trip.status === "afgeleverd" || trip.status === "afgerond") {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Afgeleverd
          </Badge>
          {(trip as any).delivery_confirmation_sent_at && (
            <Badge className="bg-blue-900 hover:bg-blue-950 text-white text-[10px] gap-1 font-medium">
              <Send className="h-2.5 w-2.5" />
              Bevestigd
            </Badge>
          )}
        </div>
      );
    }
    if (trip.status === "gecontroleerd") {
      return (
        <Badge className="bg-blue-800 hover:bg-blue-900 text-white text-[10px] gap-1 font-medium">
          <ShieldCheck className="h-3 w-3" />
          Gecontroleerd
        </Badge>
      );
    }
    if (trip.status === "gefactureerd") {
      return (
        <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
          <ReceiptEuro className="h-3 w-3" />
          Gefactureerd
        </Badge>
      );
    }
    if (trip.status === "onderweg") {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] gap-1 font-medium">
          <Truck className="h-3 w-3" />
          Onderweg
        </Badge>
      );
    }
    if (trip.status === "geladen") {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] gap-1 font-medium">
          <Package className="h-3 w-3" />
          Geladen
        </Badge>
      );
    }
    if (trip.status === "geannuleerd") {
      return (
        <Badge variant="secondary" className="text-[10px] gap-1 font-medium text-muted-foreground">
          <XCircle className="h-3 w-3" />
          Geannuleerd
        </Badge>
      );
    }
    if (trip.status === "offerte") {
      return (
        <Badge className="bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] gap-1 font-medium">
          <FileText className="h-3 w-3" />
          Offerte
        </Badge>
      );
    }
    if (trip.status === "aanvraag") {
      return (
        <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] gap-1 font-medium">
          <Inbox className="h-3 w-3" />
          Aanvraag
        </Badge>
      );
    }
    if (trip.status === "draft") {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 font-medium text-muted-foreground border-muted-foreground/40">
          <Pen className="h-3 w-3" />
          Concept
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] gap-1 font-medium">
        <Clock className="h-3 w-3" />
        Gepland
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout title="Orderoverzicht">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight">Orders</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:hidden">
              <ThemeToggle variant="icon" className="h-8 w-8" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 backdrop-blur-xl bg-popover/95">
                  <DropdownMenuItem onClick={() => setShowLocationMap(v => !v)}>
                    <Map className="h-4 w-4 mr-2" />
                    {showLocationMap ? 'Kaart verbergen' : 'Kaart tonen'}
                  </DropdownMenuItem>
                  {canEdit && (
                    <>
                      <DropdownMenuItem onClick={() => setRecurringDialogOpen(true)}>
                        <Repeat className="h-4 w-4 mr-2" />
                        Nieuwe Herhaalorder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/orders/recurring')}>
                        <Repeat className="h-4 w-4 mr-2" />
                        Alle Herhaalorders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  {canEdit && selectedOrders.size === 0 && (
                    <DropdownMenuItem onClick={() => setSelectionMode(prev => !prev)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {selectionMode ? 'Selectie uit' : 'Selecteren'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* iOS Segmented Control Tabs */}
          <div className="flex items-center gap-3">
            <TabsList className="w-full sm:w-auto bg-white/[0.06] dark:bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] dark:border-white/[0.08] rounded-2xl p-1 h-11">
              <TabsTrigger value="orders" className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs sm:text-sm rounded-xl h-9 px-4 data-[state=active]:bg-white/[0.1] dark:data-[state=active]:bg-white/[0.1] data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-[0_0_20px_rgba(255,255,255,0.05)] data-[state=active]:text-foreground transition-all duration-300">
                <Truck className="h-3.5 w-3.5" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="submissions" className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs sm:text-sm rounded-xl h-9 px-4 data-[state=active]:bg-white/[0.1] dark:data-[state=active]:bg-white/[0.1] data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-[0_0_20px_rgba(255,255,255,0.05)] data-[state=active]:text-foreground transition-all duration-300">
                <Inbox className="h-3.5 w-3.5" />
                Aanvragen
                {pendingSubmissionsCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] animate-pulse shadow-lg shadow-destructive/30">
                    {pendingSubmissionsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle variant="icon" className="h-9 w-9" />
              <Button
                variant={showLocationMap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLocationMap(v => !v)}
                className="gap-2"
              >
                <Map className="h-4 w-4" />
                Kaart
              </Button>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Repeat className="mr-2 h-4 w-4" />
                      Herhaalorder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRecurringDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuwe Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders/recurring')}>
                      <Repeat className="h-4 w-4 mr-2" />
                      Alle Templates Bekijken
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              {canEdit && (
                <Button onClick={() => navigate("/orders/edit")} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe order
                </Button>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="orders" className="mt-0 space-y-6">
          {/* Quick Stats Header - Interactive with animations */}
          <QuickStatsHeader
            stats={quickStats}
            onStatClick={(statType) => {
              if (statType === 'needs_driver') {
                setUnassignedFilter(true);
                setStatusFilter('all');
                setSearchTerm('');
                setCurrentPage(1);
                toast({ title: "Filter: Aandacht nodig", description: "Toont orders zonder chauffeur of charter" });
              } else if (statType === 'onderweg') {
                setStatusFilter('onderweg');
                setCurrentPage(1);
              } else if (statType === 'afgerond') {
                setStatusFilter('afgerond');
                setCurrentPage(1);
              } else if (statType === 'gepland') {
                setStatusFilter('gepland');
                setCurrentPage(1);
              } else if (statType === 'all') {
                setStatusFilter('all');
                setCurrentPage(1);
              }
            }}
          />

          {/* Filter bar with Advanced Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <AdvancedFiltersPanel
                filters={{
                  status: statusFilter,
                  product: productFilter,
                  carrier: carrierFilter,
                  customer: customerFilter,
                  vehicle: vehicleFilter,
                  dateFrom,
                  dateTo,
                  periodPreset,
                  marginMin: marginRange[0] > 0 ? marginRange[0] : undefined,
                  marginMax: marginRange[1] < 100 ? marginRange[1] : undefined,
                }}
                onFiltersChange={(newFilters) => {
                  if (newFilters.status !== undefined) { setStatusFilter(newFilters.status); setCurrentPage(1); }
                  if (newFilters.product !== undefined) { setProductFilter(newFilters.product); setCurrentPage(1); }
                  if (newFilters.carrier !== undefined) { setCarrierFilter(newFilters.carrier); setCurrentPage(1); }
                  if (newFilters.customer !== undefined) { setCustomerFilter(newFilters.customer); setCurrentPage(1); }
                  if (newFilters.vehicle !== undefined) { setVehicleFilter(newFilters.vehicle); setCurrentPage(1); }
                  if (newFilters.dateFrom !== undefined) { setDateFrom(newFilters.dateFrom); setCurrentPage(1); }
                  if (newFilters.dateTo !== undefined) { setDateTo(newFilters.dateTo); setCurrentPage(1); }
                  if (newFilters.periodPreset !== undefined) { handlePeriodPreset(newFilters.periodPreset); }
                  if (newFilters.marginMin !== undefined || newFilters.marginMax !== undefined) {
                    setMarginRange([newFilters.marginMin ?? 0, newFilters.marginMax ?? 100]);
                  }
                }}
                customers={customers}
                carriers={carriers}
                vehicles={vehicles}
                products={products}
                onReset={() => {
                  setStatusFilter('all');
                  setProductFilter('all');
                  setCustomerFilter('all');
                  setCarrierFilter('all');
                  setVehicleFilter('all');
                  setSearchTerm('');
                  setMarginRange([0, 100]);
                  setCurrentPage(1);
                }}
              />

              {/* Quick Status Badges */}
              <div className="hidden md:flex items-center gap-2">
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}>
                    Status: {statusFilter}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {customerFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setCustomerFilter('all'); setCurrentPage(1); }}>
                    Klant geselecteerd
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {carrierFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setCarrierFilter('all'); setCurrentPage(1); }}>
                    Charter geselecteerd
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {unassignedFilter && (
                  <Badge variant="destructive" className="gap-1 cursor-pointer hover:opacity-80" onClick={() => { setUnassignedFilter(false); setCurrentPage(1); }}>
                    Onbemand
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Zoeken... (druk /)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-10 text-sm bg-background/80 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
          </div>

          {/* Location Map Toggle */}
          <AnimatePresence>
            {showLocationMap && trips.length > 0 && (
              <OrderLocationMap
                orders={trips}
                onOrderSelect={(orderId) => {
                  const newSelected = new Set(selectedOrders);
                  if (newSelected.has(orderId)) {
                    newSelected.delete(orderId);
                  } else {
                    newSelected.add(orderId);
                  }
                  setSelectedOrders(newSelected);
                }}
              />
            )}
          </AnimatePresence>

          {/* Enhanced Bulk Actions Bar */}
          {canEdit && selectedOrders.size > 0 && (
            <div className={cn(isMobile && "fixed bottom-0 left-0 right-0 z-50 pb-safe bg-background/95 backdrop-blur-sm border-t border-border/50 shadow-2xl px-3 py-2")}>
              <EnhancedBulkActionsBar
                selectedIds={selectedOrders}
                orders={trips}
                drivers={driversList}
                onClear={() => { setSelectedOrders(new Set()); setSelectionMode(false); }}
                onRefresh={fetchOrders}
              />
            </div>
          )}

          {/* Content - Table or Cards */}
          <Card className="premium-card overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton rows={8} columns={6} />
              ) : trips.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Geen orders gevonden"
                  description="Pas je filters aan of maak een nieuwe order aan."
                  action={{ label: "Nieuwe order", onClick: () => navigate("/orders/edit"), icon: Plus }}
                />
              ) : isMobile ? (
                /* Mobile card view with pull-to-refresh */
                <div ref={containerRef} className="relative min-h-[200px]">
                  <PullToRefreshIndicator
                    pullProgress={progress}
                    isRefreshing={isRefreshing}
                    pullDistance={pullDistance}
                  />
                  <motion.div
                    className="space-y-3 p-3"
                    style={{ transform: `translateY(${pullDistance}px)` }}
                  >
                    <AnimatePresence mode="popLayout">
                      {trips.map((trip, index) => {
                        const stops = getStopsForTrip(trip.id);
                        return (
                          <motion.div
                            key={trip.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.02 }}
                          >
                            <OrderMobileCard
                              trip={trip}
                              stops={stops}
                              onDuplicate={() => handleDuplicate(trip)}
                              onDelete={() => handleDelete(trip.id)}
                              drivers={driversList}
                              onAssigned={fetchOrders}
                              selectionMode={selectionMode}
                              selected={selectedOrders.has(trip.id)}
                              onSelect={(id) => {
                                const newSelected = new Set(selectedOrders);
                                if (newSelected.has(id)) {
                                  newSelected.delete(id);
                                } else {
                                  newSelected.add(id);
                                }
                                setSelectedOrders(newSelected);
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                  
                  {/* Mobile pagination */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-safe">
                    <span className="text-xs text-muted-foreground">
                      {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} van {totalCount}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop table view */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20 border-b-2 border-border/60">
                        {canEdit && (
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedOrders.size === trips.length && trips.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("order_number")}>
                          <div className="flex items-center gap-1">
                            Order nr.
                            {sortColumn === "order_number" && <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("trip_date")}>
                          <div className="flex items-center gap-1">
                            Datum
                            {sortColumn === "trip_date" && <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                          </div>
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("customer_id")}>
                          <div className="flex items-center gap-1">
                            Klant
                            {sortColumn === "customer_id" && <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                          </div>
                        </TableHead>
                        <TableHead>Charter</TableHead>
                        <TableHead className="min-w-[350px]">Bestemmingen</TableHead>
                        <TableHead>Referenties</TableHead>
                        <TableHead>Opmerkingen</TableHead>
                        <TableHead>Goederen</TableHead>
                        <TableHead className="w-24">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((trip, tripIndex) => {
                        const stops = getStopsForTrip(trip.id);
                        const computedProfit = (trip.sales_total || 0) - (trip.purchase_total || 0);
                        const computedMarginPct = (trip.sales_total || 0) > 0
                          ? (computedProfit / (trip.sales_total || 1)) * 100
                          : 0;
                        const marginClass = computedProfit > 0 ? "text-success" : "text-destructive";
                        const marginBgClass = computedProfit > 0
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive";

                        return (
                          <Fragment key={trip.id}>
                            {/* Main row */}
                            <TableRow
                              className={cn(getRowStatusClass(trip), "cursor-pointer transition-colors group border-b-0")}
                              onClick={() => navigate(`/orders/edit/${trip.id}`)}
                            >
                              {canEdit && (
                                <TableCell onClick={(e) => e.stopPropagation()} className="py-3">
                                  <Checkbox
                                    checked={selectedOrders.has(trip.id)}
                                    onCheckedChange={(checked) => handleSelectOrder(trip.id, !!checked)}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="py-3">
                                <div className="space-y-1">
                                  <span className="font-semibold text-[13px] antialiased">{trip.order_number || "Concept"}</span>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {getStatusBadge(trip)}
                                    {(() => {
                                      const tripStops = getStopsForTrip(trip.id);
                                      const subStatuses = tripStops
                                        .map(s => stopProofs[s.id]?.sub_status)
                                        .filter(Boolean);
                                      const uniqueSubStatuses = [...new Set(subStatuses)];
                                      const checkoutIndicators: { label: string; className: string }[] = [];
                                      const totalWaiting = tripStops.reduce((sum, s) => sum + (stopProofs[s.id]?.waiting_minutes || 0), 0);
                                      const totalLoading = tripStops.reduce((sum, s) => sum + (stopProofs[s.id]?.loading_minutes || 0), 0);
                                      const hasNote = tripStops.some(s => stopProofs[s.id]?.note);
                                      const totalDistance = tripStops.reduce((sum, s) => sum + (stopProofs[s.id]?.actual_distance_km || 0), 0);

                                      return (
                                        <>
                                          {uniqueSubStatuses.map(ss => {
                                            const subColor = orderSubstatuses?.find(s => s.name === ss)?.color;
                                            return (
                                              <Badge key={ss} variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium"
                                                style={subColor ? { borderColor: subColor, color: subColor } : undefined}>
                                                {ss}
                                              </Badge>
                                            );
                                          })}
                                          {totalWaiting > 0 && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium bg-warning/10 border-warning/30 text-warning" title={`Wachttijd: ${totalWaiting} min`}>
                                              ⏱ {totalWaiting}m
                                            </Badge>
                                          )}
                                          {totalLoading > 0 && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium bg-blue-500/10 border-blue-500/30 text-blue-600" title={`Laadtijd: ${totalLoading} min`}>
                                              📦 {totalLoading}m
                                            </Badge>
                                          )}
                                          {totalDistance > 0 && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium bg-muted border-muted-foreground/30 text-muted-foreground" title={`Afstand: ${totalDistance} km`}>
                                              🛣 {totalDistance}km
                                            </Badge>
                                          )}
                                          {hasNote && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium bg-accent border-accent-foreground/20 text-accent-foreground" title="Opmerking aanwezig">
                                              💬
                                            </Badge>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-[13px] font-medium antialiased">
                                  {format(new Date(trip.trip_date), "dd MMM", { locale: nl })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(trip.trip_date), "EEEE", { locale: nl })}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-[13px] antialiased">{trip.products?.name || "-"}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-[13px] font-medium antialiased">{trip.customers?.company_name || "-"}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-[13px] antialiased">
                                  <div className="font-medium">{trip.carriers?.company_name || "-"}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {trip.vehicles?.license_plate || "-"}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-[13px] space-y-0.5 antialiased min-w-[350px]">
                                  {stops.length > 0 ? stops.slice(0, 3).map((stop, idx) => {
                                    const proof = stopProofs[stop.id];
                                    const isCompleted = stop.status === 'completed';
                                    const isFirstPickup = idx === 0 && stop.stop_type === 'pickup';
                                    return (
                                      <div key={stop.id} className="flex items-center gap-1.5">
                                        <span className={`font-medium flex-shrink-0 ${stop.stop_type === "pickup" ? "text-success" : "text-destructive"}`}>
                                          {stop.stop_type === "pickup" ? "▲" : "▼"}
                                        </span>
                                        <span className={cn("truncate font-medium tracking-wide", isCompleted && "font-semibold")}>
                                          {stop.city || stop.address}
                                          {isCompleted && <span className="text-emerald-500 ml-0.5">*</span>}
                                        </span>
                                        {isFirstPickup && isCompleted && (
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 font-semibold flex-shrink-0">
                                            Afgehaald
                                          </Badge>
                                        )}
                                        {proof && (
                                          <div className="flex items-center gap-0.5 flex-shrink-0">
                                            {proof.signature_url && <Pen className="h-3 w-3 text-emerald-500" />}
                                            {proof.photo_urls && proof.photo_urls.length > 0 && <Camera className="h-3 w-3 text-blue-500" />}
                                            {proof.latitude && <Navigation className="h-3 w-3 text-amber-500" />}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }) : (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-success font-medium">▲</span>
                                        <span className="truncate font-medium tracking-wide">{trip.pickup_city || "-"}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-destructive font-medium">▼</span>
                                        <span className="truncate font-medium tracking-wide">{trip.delivery_city || "-"}</span>
                                      </div>
                                    </div>
                                  )}
                                  {stops.length > 3 && (
                                    <span className="text-muted-foreground text-xs">+{stops.length - 3} meer</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-[13px] max-w-[100px] antialiased">
                                  {stops.length > 0 ? stops.slice(0, 2).map((stop) => (
                                    <div key={stop.id} className="truncate">
                                      {stop.waybill_number || stop.customer_reference || "-"}
                                    </div>
                                  )) : "-"}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-[13px] max-w-[120px] truncate antialiased" title={trip.remarks_waybill || trip.remarks_internal || ""}>
                                  {trip.remarks_waybill || trip.remarks_internal || "-"}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-[13px] truncate max-w-[100px] block antialiased">{trip.cargo_description || "-"}</span>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()} className="py-3">
                                <div className="flex items-center gap-0.5">
                                  {canEdit && trip.status === "aanvraag" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                        title="Accepteren"
                                        onClick={async () => {
                                          try {
                                            const { error } = await supabase.from("trips").update({ status: "gepland" }).eq("id", trip.id);
                                            if (error) throw error;
                                             const userId = (await supabase.auth.getUser()).data.user?.id;
                                             await supabase.from("order_events").insert({
                                              order_id: trip.id,
                                               event_type: "STATUS_UPDATED",
                                               actor_user_id: userId,
                                               payload: { old_value: "aanvraag", new_value: "gepland", source: "accept_action" },
                                            });
                                            notifyCustomerStatusChange(trip.customer_id, trip.id, 'gepland', trip.order_number);
                                            toast({ title: "Aanvraag geaccepteerd" });
                                            fetchOrders();
                                          } catch {
                                            toast({ title: "Fout bij accepteren", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Afwijzen"
                                        onClick={async () => {
                                          try {
                                            const { error } = await supabase.from("trips").update({ status: "geannuleerd" }).eq("id", trip.id);
                                            if (error) throw error;
                                             const userId2 = (await supabase.auth.getUser()).data.user?.id;
                                             await supabase.from("order_events").insert({
                                              order_id: trip.id,
                                               event_type: "STATUS_UPDATED",
                                               actor_user_id: userId2,
                                               payload: { old_value: "aanvraag", new_value: "geannuleerd", source: "reject_action" },
                                            });
                                            notifyCustomerStatusChange(trip.customer_id, trip.id, 'geannuleerd', trip.order_number);
                                            toast({ title: "Aanvraag afgewezen" });
                                            fetchOrders();
                                          } catch {
                                            toast({ title: "Fout bij afwijzen", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Bewerken" onClick={() => navigate(`/orders/edit/${trip.id}`)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {canEdit && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Stuur naar charter" onClick={() => setDispatchOrderId(trip.id)}>
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canEdit && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Dupliceren" onClick={() => handleDuplicate(trip)}>
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Verwijderen" onClick={() => handleDelete(trip.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Financial sub-row */}
                            <TableRow className="border-b border-border/30 group-hover:bg-muted/5 hover:bg-muted/5">
                              <TableCell colSpan={11} className="py-1.5 px-4">
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: tripIndex * 0.02, ease: "easeOut" }}
                                  className="flex items-center justify-between bg-gradient-to-r from-muted/5 via-transparent to-muted/5 rounded-md px-4 py-1"
                                >
                                  <div className="flex items-center gap-6 text-[13px] antialiased" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <span className="text-xs uppercase tracking-wider font-medium opacity-60">Verkoop</span>
                                      <span className="font-semibold text-foreground tabular-nums">{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(trip.sales_total || 0)}</span>
                                      {canEdit && (
                                        <QuickEditPopover
                                          tripId={trip.id}
                                          field="sales_total"
                                          currentValue={trip.sales_total}
                                          onUpdate={fetchOrders}
                                        />
                                      )}
                                    </div>
                                    <span className="text-muted-foreground/30 select-none">·</span>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <span className="text-xs uppercase tracking-wider font-medium opacity-60">Inkoop</span>
                                      <span className="font-medium text-foreground tabular-nums">{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(trip.purchase_total || 0)}</span>
                                      {canEdit && (
                                        <QuickEditPopover
                                          tripId={trip.id}
                                          field="purchase_total"
                                          currentValue={trip.purchase_total}
                                          onUpdate={fetchOrders}
                                        />
                                      )}
                                    </div>
                                    <span className="text-muted-foreground/30 select-none">·</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground opacity-60">Marge</span>
                                      <span className={cn("text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded-full", marginBgClass)}>
                                        {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(computedProfit)}
                                        <span className="text-[11px] font-normal ml-1 opacity-80">({computedMarginPct.toFixed(0)}%)</span>
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom pagination - desktop only */}
          {!isMobile && trips.length > 0 && (
           <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  Toont {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} van {totalCount} orders
                </span>
                <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={String(opt)}>{opt} / pagina</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                  Eerste
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  Vorige
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Volgende
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                  Laatste
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-0">
          <CustomerSubmissionsTab 
            onSubmissionCountChange={(count) => setPendingSubmissionsCount(count)} 
          />
        </TabsContent>
      </Tabs>

      <OrderImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <OrderExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <RecurringOrderDialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen} />
      <KeyboardShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Charter Dispatch Dialog */}
      {dispatchOrderId && (() => {
        const trip = trips.find(t => t.id === dispatchOrderId);
        if (!trip) return null;
        return (
          <DispatchOrderDialog
            open={!!dispatchOrderId}
            onOpenChange={(open) => { if (!open) setDispatchOrderId(null); }}
            order={{
              id: trip.id,
              order_number: trip.order_number,
              pickup_address: trip.pickup_address,
              pickup_city: trip.pickup_city,
              delivery_address: trip.delivery_address,
              delivery_city: trip.delivery_city,
              trip_date: trip.trip_date,
              purchase_total: trip.purchase_total,
            }}
            onSuccess={fetchOrders}
          />
        );
      })()}
      <DeleteConfirmDialog
        open={!!deleteOrderId}
        onOpenChange={(open) => { if (!open) setDeleteOrderId(null); }}
        title="Order verwijderen"
        description="Weet je zeker dat je deze order wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default OrderOverview;
