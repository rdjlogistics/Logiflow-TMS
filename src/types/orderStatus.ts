// Order Status System - Strict Event-Driven with Fixed Transitions

export type OrderStatus = 
  | 'offerte'         // Quote - price proposal, not yet confirmed
  | 'aanvraag'        // Customer request - awaiting admin approval
  | 'draft'           // Initial state - order created but not dispatched
  | 'gepland'         // Planned - driver/carrier assigned
  | 'geladen'         // Loaded - goods picked up, ready for transport
  | 'onderweg'        // En route - triggered when stop 1 marked completed
  | 'afgeleverd'      // Delivered - triggered when final stop marked completed
  | 'afgerond'        // Checked out - delivery confirmed, awaiting admin verification
  | 'gecontroleerd'   // Verified - triggered when admin checklist completed
  | 'gefactureerd'    // Invoiced - triggered when invoice created AND sent
  | 'geannuleerd';    // Cancelled

export interface StatusConfig {
  key: OrderStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: 'alert' | 'clock' | 'truck' | 'check' | 'verified' | 'invoice' | 'cancel';
  canTransitionTo: OrderStatus[];
  requiredTrigger?: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  offerte: {
    key: 'offerte',
    label: 'Offerte',
    color: 'text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-500',
    icon: 'invoice',
    canTransitionTo: ['draft', 'gepland', 'geannuleerd'],
  },
  aanvraag: {
    key: 'aanvraag',
    label: 'Aanvraag',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-500',
    icon: 'clock',
    canTransitionTo: ['gepland', 'geannuleerd'],
  },
  draft: {
    key: 'draft',
    label: 'Concept',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-muted',
    icon: 'clock',
    canTransitionTo: ['gepland', 'geannuleerd'],
  },
  gepland: {
    key: 'gepland',
    label: 'Gepland',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-500',
    icon: 'clock',
    canTransitionTo: ['geladen', 'onderweg', 'geannuleerd'],
  },
  geladen: {
    key: 'geladen',
    label: 'Geladen',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-200 dark:bg-orange-900/40',
    borderColor: 'border-orange-600',
    icon: 'truck',
    canTransitionTo: ['onderweg', 'geannuleerd'],
  },
  onderweg: {
    key: 'onderweg',
    label: 'Onderweg',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-600',
    icon: 'truck',
    canTransitionTo: ['afgeleverd', 'geannuleerd'],
    requiredTrigger: 'stop_1_completed',
  },
  afgeleverd: {
    key: 'afgeleverd',
    label: 'Afgeleverd',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-500',
    icon: 'check',
    canTransitionTo: ['afgerond', 'gecontroleerd', 'geannuleerd'],
    requiredTrigger: 'final_stop_completed',
  },
  afgerond: {
    key: 'afgerond',
    label: 'Afgemeld',
    color: 'text-blue-900 dark:text-blue-300',
    bgColor: 'bg-blue-200 dark:bg-blue-900/40',
    borderColor: 'border-blue-700',
    icon: 'check',
    canTransitionTo: ['gecontroleerd', 'geannuleerd'],
    requiredTrigger: 'checkout_completed',
  },
  gecontroleerd: {
    key: 'gecontroleerd',
    label: 'Gecontroleerd',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-600',
    icon: 'verified',
    canTransitionTo: ['gefactureerd'],
    requiredTrigger: 'admin_checklist_completed',
  },
  gefactureerd: {
    key: 'gefactureerd',
    label: 'Gefactureerd',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    borderColor: 'border-gray-400',
    icon: 'invoice',
    canTransitionTo: [],
    requiredTrigger: 'invoice_sent',
  },
  geannuleerd: {
    key: 'geannuleerd',
    label: 'Geannuleerd',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/50',
    icon: 'cancel',
    canTransitionTo: [],
  },
};

// Helper to check if driver is assigned (for "Chauffeur nodig" status)
export const needsDriver = (trip: { driver_id?: string | null; carrier_id?: string | null }) => {
  return !trip.driver_id && !trip.carrier_id;
};

// Get effective display status (considers "Chauffeur nodig" as special case)
export const getEffectiveStatus = (
  status: string,
  trip: { driver_id?: string | null; carrier_id?: string | null }
): { status: OrderStatus; needsDriver: boolean } => {
  const normalizedStatus = status as OrderStatus;
  const driverNeeded = needsDriver(trip);
  
  return {
    status: normalizedStatus,
    needsDriver: driverNeeded && ['draft', 'gepland'].includes(normalizedStatus),
  };
};

// Validate if a status transition is allowed
export const canTransitionTo = (
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  isAdminOverride: boolean = false
): boolean => {
  if (isAdminOverride) return true;
  const config = ORDER_STATUS_CONFIG[currentStatus];
  return config.canTransitionTo.includes(targetStatus);
};
