import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BookingFormData, BookingStop, CargoItem, VehicleRequirements, VEHICLE_CAPACITIES } from './types';

const DRAFT_KEY = 'b2b-booking-draft';

const loadDraft = (): BookingFormData | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BookingFormData;
    // Regenerate IDs to avoid conflicts
    if (data.stops) {
      data.stops = data.stops.map((s: any) => ({
        ...s,
        id: crypto.randomUUID(),
        loadItems: (s.loadItems || []).map((i: any) => ({ ...i, id: crypto.randomUUID() })),
        unloadItems: (s.unloadItems || []).map((i: any) => ({ ...i, id: crypto.randomUUID() })),
      }));
    }
    return data;
  } catch {
    return null;
  }
};

const generateId = () => crypto.randomUUID();

const createEmptyStop = (type: 'pickup' | 'delivery' | 'hub', date: string): BookingStop => ({
  id: generateId(),
  type,
  company: '',
  contact: '',
  phone: '',
  postcode: '',
  houseNumber: '',
  street: '',
  city: '',
  country: 'NL',
  notes: '',
  reference: '',
  timeWindowFrom: '08:00',
  timeWindowTo: '17:00',
  date,
  loadItems: [],
  unloadItems: [],
  isExpanded: true,
});

const createEmptyCargoItem = (): CargoItem => ({
  id: generateId(),
  description: '',
  quantity: 1,
  weight: 0,
  length: 0,
  width: 0,
  height: 0,
  stackable: true,
  fragile: false,
  reference: '',
});

const initialVehicleRequirements: VehicleRequirements = {
  type: 'any',
  minCapacityM3: 0,
  minPayloadKg: 0,
  tailLift: false,
  sideLoader: false,
  temperatureControlled: false,
  adr: false,
};

export const useBookingForm = () => {
  const today = new Date().toISOString().split('T')[0];
  
  const draft = loadDraft();
  const [hasDraft] = useState(() => draft !== null);

  const [formData, setFormData] = useState<BookingFormData>(() => draft ?? {
    stops: [
      createEmptyStop('pickup', today),
      createEmptyStop('delivery', today),
    ],
    vehicleRequirements: initialVehicleRequirements,
    serviceLevel: 'standard',
    priority: 'normal',
    requiresSignature: true,
    requiresPhoto: false,
    insurance: false,
    trackingNotifications: true,
    customerReference: '',
    costCenter: '',
    projectCode: '',
    poNumber: '',
    saveAsTemplate: false,
    templateName: '',
    generalNotes: '',
    internalNotes: '',
  });

  // Debounced auto-save to localStorage
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      } catch { /* quota exceeded or private browsing */ }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [formData]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  // Stop management
  const addStop = useCallback((type: 'pickup' | 'delivery' | 'hub' = 'delivery') => {
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, createEmptyStop(type, today)],
    }));
  }, [today]);

  const removeStop = useCallback((stopId: string) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter(s => s.id !== stopId),
    }));
  }, []);

  const updateStop = useCallback((stopId: string, updates: Partial<BookingStop>) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.map(s => s.id === stopId ? { ...s, ...updates } : s),
    }));
  }, []);

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newStops = [...prev.stops];
      const [removed] = newStops.splice(fromIndex, 1);
      newStops.splice(toIndex, 0, removed);
      return { ...prev, stops: newStops };
    });
  }, []);

  // Cargo management
  const addCargoItem = useCallback((stopId: string) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.map(s => 
        s.id === stopId 
          ? { ...s, loadItems: [...s.loadItems, createEmptyCargoItem()] }
          : s
      ),
    }));
  }, []);

  const updateCargoItem = useCallback((stopId: string, itemId: string, updates: Partial<CargoItem>) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.map(s => 
        s.id === stopId 
          ? { 
              ...s, 
              loadItems: s.loadItems.map(item => 
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : s
      ),
    }));
  }, []);

  const removeCargoItem = useCallback((stopId: string, itemId: string) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.map(s => 
        s.id === stopId 
          ? { ...s, loadItems: s.loadItems.filter(item => item.id !== itemId) }
          : s
      ),
    }));
  }, []);

  // Vehicle requirements
  const updateVehicleRequirements = useCallback((updates: Partial<VehicleRequirements>) => {
    setFormData(prev => ({
      ...prev,
      vehicleRequirements: { ...prev.vehicleRequirements, ...updates },
    }));
  }, []);

  // General updates
  const updateFormData = useCallback((updates: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Selected vehicle state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const selectVehicle = useCallback((vehicleId: string | null) => {
    setSelectedVehicleId(vehicleId);
  }, []);

  // Calculations
  const cargoStats = useMemo(() => {
    const allItems = formData.stops.flatMap(s => s.loadItems);
    const totalWeight = allItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalVolume = allItems.reduce((sum, item) => {
      const volumeM3 = (item.length * item.width * item.height) / 1000000; // cm³ to m³
      return sum + (volumeM3 * item.quantity);
    }, 0);
    const totalLoadingMeters = allItems.reduce((sum, item) => {
      // Standard TMS formula: floor area / trailer width (2.40m)
      const ldm = (item.length * item.width) / (240 * 100); // cm to ldm
      return sum + (ldm * item.quantity);
    }, 0);
    const totalItems = allItems.reduce((sum, item) => sum + item.quantity, 0);
    const hasFragile = allItems.some(item => item.fragile);
    const hasHazmat = allItems.some(item => item.hazmat);
    const requiresTemp = allItems.some(item => item.temperature && item.temperature !== 'ambient');

    return { totalWeight, totalVolume, totalLoadingMeters, totalItems, hasFragile, hasHazmat, requiresTemp };
  }, [formData.stops]);

  const recommendedVehicle = useMemo(() => {
    const { totalVolume, totalWeight, totalLoadingMeters } = cargoStats;
    
    // Find smallest vehicle that fits on all dimensions
    const suitable = VEHICLE_CAPACITIES.find(v => 
      v.maxVolumeM3 >= totalVolume && 
      v.maxPayloadKg >= totalWeight &&
      v.loadingMeters >= totalLoadingMeters
    );
    
    return suitable || VEHICLE_CAPACITIES[VEHICLE_CAPACITIES.length - 1];
  }, [cargoStats]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return VEHICLE_CAPACITIES.find(v => v.id === selectedVehicleId) || null;
  }, [selectedVehicleId]);

  // Use selected or recommended for capacity calculations
  const activeVehicle = selectedVehicle || recommendedVehicle;

  const capacityUsage = useMemo((): { volumePercent: number; weightPercent: number; ldmPercent: number; isOverCapacity: boolean; limitingFactor: 'volume' | 'weight' | 'ldm' } => {
    const vehicle = activeVehicle;
    const volumePercent = (cargoStats.totalVolume / vehicle.maxVolumeM3) * 100;
    const weightPercent = (cargoStats.totalWeight / vehicle.maxPayloadKg) * 100;
    const ldmPercent = vehicle.loadingMeters > 0 ? (cargoStats.totalLoadingMeters / vehicle.loadingMeters) * 100 : 0;
    
    const maxPercent = Math.max(volumePercent, weightPercent, ldmPercent);
    
    return {
      volumePercent,
      weightPercent,
      ldmPercent,
      isOverCapacity: maxPercent > 100,
      limitingFactor: volumePercent >= weightPercent && volumePercent >= ldmPercent ? 'volume' : weightPercent >= ldmPercent ? 'weight' : 'ldm',
    };
  }, [cargoStats, activeVehicle]);

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check stops
    if (formData.stops.length < 2) {
      errors.push('Minimaal 2 stops vereist');
    }

    const pickups = formData.stops.filter(s => s.type === 'pickup');
    const deliveries = formData.stops.filter(s => s.type === 'delivery');

    if (pickups.length === 0) {
      errors.push('Minimaal 1 ophaaladres vereist');
    }
    if (deliveries.length === 0) {
      errors.push('Minimaal 1 afleveradres vereist');
    }

    // Check addresses
    formData.stops.forEach((stop, index) => {
      if (!stop.postcode || !stop.city) {
        errors.push(`Stop ${index + 1}: Adres incompleet`);
      }
    });

    // Check cargo
    if (cargoStats.totalItems === 0) {
      warnings.push('Geen lading opgegeven');
    }

    // Check capacity
    if (capacityUsage.isOverCapacity) {
      errors.push('Lading overschrijdt voertuigcapaciteit');
    }

    // Physical fit check: item length vs vehicle length
    if (activeVehicle) {
      formData.stops.forEach(stop => {
        stop.loadItems.forEach((item, i) => {
          if (item.length > 0 && item.length > activeVehicle.lengthCm) {
            warnings.push(`Item "${item.description || `#${i + 1}`}": ${(item.length / 100).toFixed(1)}m past niet in voertuig (max ${(activeVehicle.lengthCm / 100).toFixed(1)}m)`);
          }
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [formData.stops, cargoStats, capacityUsage, activeVehicle]);

  return {
    formData,
    setFormData,
    hasDraft,
    clearDraft,
    // Stop management
    addStop,
    removeStop,
    updateStop,
    reorderStops,
    // Cargo management
    addCargoItem,
    updateCargoItem,
    removeCargoItem,
    // Vehicle
    updateVehicleRequirements,
    recommendedVehicle,
    selectedVehicle,
    activeVehicle,
    selectVehicle,
    // General
    updateFormData,
    // Stats
    cargoStats,
    capacityUsage,
    validation,
  };
};
