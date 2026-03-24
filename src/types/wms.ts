// WMS Types

export interface Warehouse {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  opening_hours?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WarehouseZone {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  zone_type: 'general' | 'cold' | 'bulk' | 'hazmat' | 'picking' | 'staging';
  temperature_min?: number;
  temperature_max?: number;
  is_active: boolean;
  created_at: string;
}

export interface StorageLocation {
  id: string;
  warehouse_id: string;
  zone_id?: string;
  code: string;
  aisle?: string;
  rack?: string;
  level?: string;
  position?: string;
  location_type: 'rack' | 'floor' | 'pallet' | 'bin' | 'dock';
  max_weight_kg?: number;
  max_volume_m3?: number;
  is_pickable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  zone?: WarehouseZone;
}

export interface WMSProduct {
  id: string;
  tenant_id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  unit_of_measure: string;
  weight_kg?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  storage_requirements?: 'normal' | 'cold' | 'frozen' | 'hazmat';
  shelf_life_days?: number;
  is_serialized: boolean;
  is_batch_tracked: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  location_id?: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  batch_number?: string;
  lot_number?: string;
  serial_number?: string;
  expiry_date?: string;
  received_date?: string;
  unit_cost?: number;
  last_counted_at?: string;
  created_at: string;
  updated_at: string;
  product?: WMSProduct;
  warehouse?: Warehouse;
  location?: StorageLocation;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  inventory_id?: string;
  product_id: string;
  warehouse_id: string;
  from_location_id?: string;
  to_location_id?: string;
  transaction_type: 'receive' | 'ship' | 'transfer' | 'adjust' | 'count' | 'pick' | 'putaway';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  batch_number?: string;
  lot_number?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  product?: WMSProduct;
}

export interface InboundOrder {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  order_number: string;
  supplier_name?: string;
  supplier_reference?: string;
  expected_date?: string;
  received_date?: string;
  status: 'pending' | 'partial' | 'received' | 'cancelled';
  notes?: string;
  trip_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  lines?: InboundOrderLine[];
}

export interface InboundOrderLine {
  id: string;
  inbound_order_id: string;
  product_id: string;
  expected_quantity: number;
  received_quantity: number;
  put_away_quantity: number;
  target_location_id?: string;
  batch_number?: string;
  lot_number?: string;
  expiry_date?: string;
  unit_cost?: number;
  notes?: string;
  created_at: string;
  product?: WMSProduct;
  target_location?: StorageLocation;
}

export interface OutboundOrder {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  order_number: string;
  customer_id?: string;
  customer_reference?: string;
  priority: number;
  required_date?: string;
  shipped_date?: string;
  status: 'pending' | 'allocated' | 'picking' | 'packed' | 'shipped' | 'cancelled';
  picking_strategy: 'fifo' | 'lifo' | 'fefo' | 'batch' | 'wave';
  wave_id?: string;
  notes?: string;
  trip_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  lines?: OutboundOrderLine[];
  customer?: { company_name: string };
}

export interface OutboundOrderLine {
  id: string;
  outbound_order_id: string;
  product_id: string;
  requested_quantity: number;
  allocated_quantity: number;
  picked_quantity: number;
  packed_quantity: number;
  shipped_quantity: number;
  from_location_id?: string;
  batch_number?: string;
  lot_number?: string;
  notes?: string;
  created_at: string;
  product?: WMSProduct;
  from_location?: StorageLocation;
}

export interface PickWave {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  wave_number: string;
  status: 'open' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  cut_off_time?: string;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  total_orders: number;
  total_lines: number;
  total_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
}

export interface PickTask {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  wave_id?: string;
  outbound_order_id?: string;
  outbound_line_id?: string;
  product_id: string;
  from_location_id: string;
  inventory_id?: string;
  quantity: number;
  picked_quantity: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'short' | 'cancelled';
  batch_number?: string;
  lot_number?: string;
  priority: number;
  sequence_number?: number;
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  product?: WMSProduct;
  from_location?: StorageLocation;
  wave?: PickWave;
}

export interface WarehouseTransfer {
  id: string;
  tenant_id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: 'draft' | 'pending' | 'in_transit' | 'received' | 'cancelled';
  shipped_date?: string;
  received_date?: string;
  trip_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  lines?: WarehouseTransferLine[];
}

export interface WarehouseTransferLine {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  shipped_quantity: number;
  received_quantity: number;
  batch_number?: string;
  lot_number?: string;
  notes?: string;
  created_at: string;
  product?: WMSProduct;
}

export interface CycleCount {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  count_number: string;
  count_type: 'full' | 'zone' | 'abc' | 'random';
  zone_id?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  zone?: WarehouseZone;
  lines?: CycleCountLine[];
}

export interface CycleCountLine {
  id: string;
  cycle_count_id: string;
  location_id: string;
  product_id: string;
  inventory_id?: string;
  expected_quantity?: number;
  counted_quantity?: number;
  variance?: number;
  status: 'pending' | 'counted' | 'verified' | 'adjusted';
  counted_by?: string;
  counted_at?: string;
  notes?: string;
  created_at: string;
  location?: StorageLocation;
  product?: WMSProduct;
}

// Stats & Dashboard
export interface WMSDashboardStats {
  totalWarehouses: number;
  totalProducts: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  expiringProducts: number;
  pendingInbound: number;
  pendingOutbound: number;
  pickingInProgress: number;
  pendingTransfers: number;
}

export type InboundStatus = 'pending' | 'partial' | 'received' | 'cancelled';
export type OutboundStatus = 'pending' | 'allocated' | 'picking' | 'packed' | 'shipped' | 'cancelled';
export type PickingStrategy = 'fifo' | 'lifo' | 'fefo' | 'batch' | 'wave';
export type TransactionType = 'receive' | 'ship' | 'transfer' | 'adjust' | 'count' | 'pick' | 'putaway';
