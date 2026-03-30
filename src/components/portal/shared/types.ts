// Shared types for both B2B and B2C portals

export interface Shipment {
  id: string;
  referenceNumber: string;
  status: ShipmentStatus;
  fromCity: string;
  toCity: string;
  fromAddress?: string;
  toAddress?: string;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  trackingCode?: string;
  carrier?: string;
  parcels: number;
  weight?: number;
  price?: number;
  tripId?: string;
  customer?: {
    id: string;
    name: string;
  };
  events?: ShipmentEvent[];
}

export type ShipmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'pickup_scheduled'
  | 'picked_up' 
  | 'in_transit' 
  | 'out_for_delivery'
  | 'delivered' 
  | 'failed'
  | 'cancelled';

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  location?: string;
}

export interface Address {
  id?: string;
  label?: string;
  companyName?: string;
  contactName?: string;
  street: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface BookingData {
  pickup: Address;
  delivery: Address;
  parcels: number;
  weight?: number;
  volume?: number;
  description?: string;
  serviceLevel: 'standard' | 'express' | 'economy';
  pickupDate?: string;
  pickupTimeWindow?: string;
  deliveryTimeWindow?: string;
  requiresSignature?: boolean;
  insurance?: boolean;
  specialInstructions?: string;
  reference?: string;
  costCenter?: string;
}

export interface Case {
  id: string;
  shipmentId: string;
  type: 'damage' | 'delay' | 'lost' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  description: string;
  createdAt: string;
  updatedAt: string;
  resolution?: string;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  amountPaid?: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  shipmentIds: string[];
}

export interface Label {
  id: string;
  shipmentId: string;
  carrier: string;
  trackingCode: string;
  labelUrl: string;
  format: 'pdf' | 'zpl';
  createdAt: string;
}

// Status display configuration
export const statusConfig: Record<ShipmentStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'In afwachting', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  confirmed: { label: 'Bevestigd', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  pickup_scheduled: { label: 'Ophalen gepland', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  picked_up: { label: 'Opgehaald', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  in_transit: { label: 'Onderweg', color: 'text-primary', bgColor: 'bg-primary/20' },
  out_for_delivery: { label: 'Bezorging', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  delivered: { label: 'Afgeleverd', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  failed: { label: 'Mislukt', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  cancelled: { label: 'Geannuleerd', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};
