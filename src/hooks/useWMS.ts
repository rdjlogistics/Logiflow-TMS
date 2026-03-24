import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useToast } from "./use-toast";
import type {
  Warehouse,
  WarehouseZone,
  StorageLocation,
  WMSProduct,
  Inventory,
  OutboundOrder,
  PickWave,
  PickTask,
  WarehouseTransfer,
  CycleCount,
  WMSDashboardStats,
  InboundOrder,
} from "@/types/wms";

// ============ WAREHOUSES ============

export function useWarehouses() {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["warehouses", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("tenant_id", companyId!)
        .order("name");

      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!companyId,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (warehouse: Partial<Warehouse>) => {
      const { data, error } = await supabase
        .from("warehouses")
        .insert({ ...warehouse, tenant_id: companyId! } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: "Magazijn aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout bij aanmaken", description: error.message, variant: "destructive" });
    },
  });
}

// ============ ZONES ============

export function useWarehouseZones(warehouseId?: string) {
  return useQuery({
    queryKey: ["warehouse-zones", warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_zones")
        .select("*")
        .eq("warehouse_id", warehouseId!)
        .order("code");

      if (error) throw error;
      return data as WarehouseZone[];
    },
    enabled: !!warehouseId,
  });
}

// ============ STORAGE LOCATIONS ============

export function useStorageLocations(warehouseId?: string) {
  return useQuery({
    queryKey: ["storage-locations", warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_locations")
        .select("*, zone:warehouse_zones(*)")
        .eq("warehouse_id", warehouseId!)
        .order("code");

      if (error) throw error;
      return data as StorageLocation[];
    },
    enabled: !!warehouseId,
  });
}

// ============ PRODUCTS ============

export function useWMSProducts() {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["wms-products", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_products")
        .select("*")
        .eq("tenant_id", companyId!)
        .order("name");

      if (error) throw error;
      return data as WMSProduct[];
    },
    enabled: !!companyId,
  });
}

export function useCreateWMSProduct() {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (product: Partial<WMSProduct>) => {
      const { data, error } = await supabase
        .from("wms_products")
        .insert({ ...product, tenant_id: companyId! } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-products"] });
      toast({ title: "Product aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout bij aanmaken", description: error.message, variant: "destructive" });
    },
  });
}

// ============ INVENTORY ============

export function useInventory(warehouseId?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["inventory", companyId, warehouseId],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select(`
          *,
          product:wms_products(*),
          warehouse:warehouses(*),
          location:storage_locations(*)
        `)
        .eq("tenant_id", companyId!);

      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId!);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as Inventory[];
    },
    enabled: !!companyId,
  });
}

export function useLowStockProducts() {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["low-stock-products", companyId],
    queryFn: async () => {
      const { data: inventory, error } = await supabase
        .from("inventory")
        .select(`
          *,
          product:wms_products(*)
        `)
        .eq("tenant_id", companyId!);

      if (error) throw error;

      return (inventory as Inventory[]).filter(inv => 
        inv.product && inv.available_quantity < (inv.product.min_stock_level || 0)
      );
    },
    enabled: !!companyId,
  });
}

// ============ INBOUND ORDERS ============

export function useInboundOrders(status?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["inbound-orders", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("inbound_orders")
        .select(`
          *,
          warehouse:warehouses(*)
        `)
        .eq("tenant_id", companyId!);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as InboundOrder[];
    },
    enabled: !!companyId,
  });
}

export function useInboundOrderWithLines(orderId: string) {
  return useQuery({
    queryKey: ["inbound-order", orderId],
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("inbound_orders")
        .select(`*, warehouse:warehouses(*)`)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      const { data: lines, error: linesError } = await supabase
        .from("inbound_order_lines")
        .select(`*, product:wms_products(*), target_location:storage_locations(*)`)
        .eq("inbound_order_id", orderId);

      if (linesError) throw linesError;

      return { ...order, lines } as InboundOrder;
    },
    enabled: !!orderId,
  });
}

export function useCreateInboundOrder() {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: Partial<InboundOrder>) => {
      const orderNumber = `IN-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("inbound_orders")
        .insert({ ...order, tenant_id: companyId!, order_number: orderNumber } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-orders"] });
      toast({ title: "Inbound order aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout bij aanmaken", description: error.message, variant: "destructive" });
    },
  });
}

// ============ OUTBOUND ORDERS ============

export function useOutboundOrders(status?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["outbound-orders", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("outbound_orders")
        .select(`
          *,
          warehouse:warehouses(*),
          customer:customers(company_name)
        `)
        .eq("tenant_id", companyId!);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("priority").order("required_date");

      if (error) throw error;
      return data as OutboundOrder[];
    },
    enabled: !!companyId,
  });
}

export function useCreateOutboundOrder() {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: Partial<OutboundOrder>) => {
      const orderNumber = `OUT-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("outbound_orders")
        .insert({ ...order, tenant_id: companyId!, order_number: orderNumber } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      toast({ title: "Outbound order aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout bij aanmaken", description: error.message, variant: "destructive" });
    },
  });
}

// ============ PICK WAVES ============

export function usePickWaves(status?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["pick-waves", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("pick_waves")
        .select(`*, warehouse:warehouses(*)`)
        .eq("tenant_id", companyId!);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("priority").order("created_at", { ascending: false });

      if (error) throw error;
      return data as PickWave[];
    },
    enabled: !!companyId,
  });
}

export function useCreatePickWave() {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (wave: Partial<PickWave>) => {
      const waveNumber = `WAVE-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("pick_waves")
        .insert({ ...wave, tenant_id: companyId!, wave_number: waveNumber } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pick-waves"] });
      toast({ title: "Pick wave aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout bij aanmaken", description: error.message, variant: "destructive" });
    },
  });
}

// ============ PICK TASKS ============

export function usePickTasks(waveId?: string, status?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["pick-tasks", companyId, waveId, status],
    queryFn: async () => {
      let query = supabase
        .from("pick_tasks")
        .select(`
          *,
          product:wms_products(*),
          from_location:storage_locations(*),
          wave:pick_waves(*)
        `)
        .eq("tenant_id", companyId!);

      if (waveId) query = query.eq("wave_id", waveId);
      if (status) query = query.eq("status", status);

      const { data, error } = await query.order("sequence_number").order("priority");

      if (error) throw error;
      return data as PickTask[];
    },
    enabled: !!companyId,
  });
}

// ============ WAREHOUSE TRANSFERS ============

export function useWarehouseTransfers(status?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["warehouse-transfers", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("warehouse_transfers")
        .select(`
          *,
          from_warehouse:warehouses!warehouse_transfers_from_warehouse_id_fkey(*),
          to_warehouse:warehouses!warehouse_transfers_to_warehouse_id_fkey(*)
        `)
        .eq("tenant_id", companyId!);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as WarehouseTransfer[];
    },
    enabled: !!companyId,
  });
}

export function useCreateWarehouseTransfer() {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const companyId = company?.id;
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transfer: Partial<WarehouseTransfer>) => {
      const transferNumber = `TR-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("warehouse_transfers")
        .insert({ ...transfer, tenant_id: companyId!, transfer_number: transferNumber } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
      toast({ title: "Transfer aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout bij aanmaken", description: error.message, variant: "destructive" });
    },
  });
}

// ============ CYCLE COUNTS ============

export function useCycleCounts(status?: string) {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["cycle-counts", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("cycle_counts")
        .select(`
          *,
          warehouse:warehouses(*),
          zone:warehouse_zones(*)
        `)
        .eq("tenant_id", companyId!);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data as CycleCount[];
    },
    enabled: !!companyId,
  });
}

// ============ DASHBOARD STATS ============

export function useWMSDashboardStats() {
  const { company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["wms-dashboard-stats", companyId],
    queryFn: async (): Promise<WMSDashboardStats> => {
      const [
        warehousesRes,
        productsRes,
        inventoryRes,
        inboundRes,
        outboundRes,
        wavesRes,
        transfersRes,
      ] = await Promise.all([
        supabase.from("warehouses").select("id", { count: "exact" }).eq("tenant_id", companyId!).eq("is_active", true),
        supabase.from("wms_products").select("id", { count: "exact" }).eq("tenant_id", companyId!).eq("is_active", true),
        supabase.from("inventory").select("quantity, unit_cost, product:wms_products(min_stock_level)").eq("tenant_id", companyId!),
        supabase.from("inbound_orders").select("id", { count: "exact" }).eq("tenant_id", companyId!).eq("status", "pending"),
        supabase.from("outbound_orders").select("id", { count: "exact" }).eq("tenant_id", companyId!).in("status", ["pending", "allocated"]),
        supabase.from("pick_waves").select("id", { count: "exact" }).eq("tenant_id", companyId!).eq("status", "in_progress"),
        supabase.from("warehouse_transfers").select("id", { count: "exact" }).eq("tenant_id", companyId!).in("status", ["pending", "in_transit"]),
      ]);

      const inventory = (inventoryRes.data || []) as any[];
      const totalValue = inventory.reduce((sum, inv) => sum + (inv.quantity * (inv.unit_cost || 0)), 0);
      const lowStock = inventory.filter(inv => 
        inv.product?.min_stock_level && inv.quantity < inv.product.min_stock_level
      ).length;

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { count: expiringCount } = await supabase
        .from("inventory")
        .select("id", { count: "exact" })
        .eq("tenant_id", companyId!)
        .lt("expiry_date", thirtyDaysFromNow.toISOString())
        .gt("expiry_date", new Date().toISOString());

      return {
        totalWarehouses: warehousesRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalInventoryValue: totalValue,
        lowStockProducts: lowStock,
        expiringProducts: expiringCount || 0,
        pendingInbound: inboundRes.count || 0,
        pendingOutbound: outboundRes.count || 0,
        pickingInProgress: wavesRes.count || 0,
        pendingTransfers: transfersRes.count || 0,
      };
    },
    enabled: !!companyId,
  });
}
