// Types for the advanced B2B multi-stop booking system

export interface BookingStop {
  id: string;
  type: 'pickup' | 'delivery' | 'hub';
  company: string;
  contact: string;
  phone: string;
  postcode: string;
  houseNumber: string;
  street: string;
  city: string;
  country: string;
  notes: string;
  reference: string;
  timeWindowFrom: string;
  timeWindowTo: string;
  date: string;
  // Cargo at this stop
  loadItems: CargoItem[];
  unloadItems: string[]; // IDs of items to unload
  // Status
  isExpanded: boolean;
}

export interface CargoItem {
  id: string;
  description: string;
  quantity: number;
  weight: number; // kg
  length: number; // cm
  width: number; // cm
  height: number; // cm
  stackable: boolean;
  fragile: boolean;
  temperature?: 'ambient' | 'chilled' | 'frozen';
  reference: string;
  value?: number;
  hazmat?: boolean;
  hazmatClass?: string;
}

export interface VehicleRequirements {
  type: string;
  minCapacityM3: number;
  minPayloadKg: number;
  tailLift: boolean;
  sideLoader: boolean;
  temperatureControlled: boolean;
  adr: boolean;
}

export interface BookingFormData {
  // Stops
  stops: BookingStop[];
  
  // Vehicle
  vehicleRequirements: VehicleRequirements;
  
  // Service
  serviceLevel: 'economy' | 'standard' | 'express' | 'dedicated';
  priority: 'normal' | 'high' | 'urgent';
  
  // Options
  requiresSignature: boolean;
  requiresPhoto: boolean;
  insurance: boolean;
  insuranceValue?: number;
  trackingNotifications: boolean;
  
  // References
  customerReference: string;
  costCenter: string;
  projectCode: string;
  poNumber: string;
  
  // Template
  saveAsTemplate: boolean;
  templateName: string;
  
  // Notes
  generalNotes: string;
  internalNotes: string;
}

export type VehicleCategory = 'bestelbus' | 'bakwagen' | 'vrachtwagen' | 'trekker';

export interface VehicleCapacity {
  id: string;
  type: string;
  category: VehicleCategory;
  label: string;
  description: string;
  maxVolumeM3: number;
  maxPayloadKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  loadingMeters: number;
  palletCapacity: number;
  hasTailLift: boolean;
  tailLiftCapacityKg: number;
  icon: string;
}

export const VEHICLE_CATEGORIES: { id: VehicleCategory; label: string; icon: string }[] = [
  { id: 'bestelbus', label: 'Bestelbus', icon: '🚐' },
  { id: 'bakwagen', label: 'Bakwagen', icon: '🚛' },
  { id: 'vrachtwagen', label: 'Vrachtwagen', icon: '🚚' },
  { id: 'trekker', label: 'Trekker + Oplegger', icon: '🚛' },
];

export const VEHICLE_CAPACITIES: VehicleCapacity[] = [
  // === BESTELBUS ===
  {
    id: 'caddy', type: 'caddy', category: 'bestelbus',
    label: 'Caddy', description: 'Klein bestelbus, ideaal voor pakketwerk',
    maxVolumeM3: 3.2, maxPayloadKg: 600,
    lengthCm: 180, widthCm: 120, heightCm: 130,
    loadingMeters: 1.8, palletCapacity: 1,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🚐',
  },
  {
    id: 'vito', type: 'vito', category: 'bestelbus',
    label: 'Vito', description: 'Middelgroot busje, veelzijdig inzetbaar',
    maxVolumeM3: 6.6, maxPayloadKg: 900,
    lengthCm: 270, widthCm: 170, heightCm: 140,
    loadingMeters: 2.7, palletCapacity: 2,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🚐',
  },
  {
    id: 'sprinter', type: 'sprinter', category: 'bestelbus',
    label: 'Sprinter', description: 'Grote bestelbus, geschikt voor palletwerk',
    maxVolumeM3: 14, maxPayloadKg: 1200,
    lengthCm: 420, widthCm: 180, heightCm: 190,
    loadingMeters: 4.2, palletCapacity: 4,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🚐',
  },
  // === BAKWAGEN ===
  {
    id: 'meubelbak-zonder', type: 'meubelbak-zonder', category: 'bakwagen',
    label: 'Meubelbakwagen', description: 'Zonder laadklep, 30m³ laadruimte',
    maxVolumeM3: 30, maxPayloadKg: 1500,
    lengthCm: 520, widthCm: 220, heightCm: 240,
    loadingMeters: 5.2, palletCapacity: 7,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🚛',
  },
  {
    id: 'meubelbak-klep', type: 'meubelbak-klep', category: 'bakwagen',
    label: 'Meubelbakwagen + Klep', description: 'Met laadklep 750 kg, 30m³',
    maxVolumeM3: 30, maxPayloadKg: 1400,
    lengthCm: 520, widthCm: 220, heightCm: 240,
    loadingMeters: 5.2, palletCapacity: 7,
    hasTailLift: true, tailLiftCapacityKg: 750,
    icon: '🚛',
  },
  {
    id: 'c-bakwagen', type: 'c-bakwagen', category: 'bakwagen',
    label: 'C-Bakwagen', description: 'Groot rijbewijs C, 45m³ laadruimte',
    maxVolumeM3: 45, maxPayloadKg: 5500,
    lengthCm: 720, widthCm: 240, heightCm: 250,
    loadingMeters: 7.2, palletCapacity: 10,
    hasTailLift: true, tailLiftCapacityKg: 1500,
    icon: '🚛',
  },
  {
    id: 'be-combi', type: 'be-combi', category: 'bakwagen',
    label: 'BE-Combi Bakwagen', description: 'Bus + aanhanger, 55m³ totaal',
    maxVolumeM3: 55, maxPayloadKg: 3500,
    lengthCm: 900, widthCm: 240, heightCm: 250,
    loadingMeters: 9.0, palletCapacity: 14,
    hasTailLift: true, tailLiftCapacityKg: 1000,
    icon: '🚛',
  },
  // === VRACHTWAGEN ===
  {
    id: 'vrachtwagen-7t', type: 'vrachtwagen-7t', category: 'vrachtwagen',
    label: 'Vrachtwagen 7.5t', description: 'Compact, met laadklep, stadsvriendelijk',
    maxVolumeM3: 30, maxPayloadKg: 3000,
    lengthCm: 600, widthCm: 240, heightCm: 220,
    loadingMeters: 6.0, palletCapacity: 8,
    hasTailLift: true, tailLiftCapacityKg: 1000,
    icon: '🚚',
  },
  {
    id: 'vrachtwagen-12t', type: 'vrachtwagen-12t', category: 'vrachtwagen',
    label: 'Vrachtwagen 12t', description: 'Middenzwaar, laadklep 1500 kg',
    maxVolumeM3: 45, maxPayloadKg: 6000,
    lengthCm: 750, widthCm: 240, heightCm: 250,
    loadingMeters: 7.5, palletCapacity: 12,
    hasTailLift: true, tailLiftCapacityKg: 1500,
    icon: '🚚',
  },
  {
    id: 'vrachtwagen-18t', type: 'vrachtwagen-18t', category: 'vrachtwagen',
    label: 'Vrachtwagen 18t', description: 'Zwaar transport, laadklep 2000 kg',
    maxVolumeM3: 55, maxPayloadKg: 10000,
    lengthCm: 850, widthCm: 240, heightCm: 260,
    loadingMeters: 8.5, palletCapacity: 14,
    hasTailLift: true, tailLiftCapacityKg: 2000,
    icon: '🚚',
  },
  // === TREKKER + OPLEGGER ===
  {
    id: 'standaard-trailer', type: 'standaard-trailer', category: 'trekker',
    label: 'Standaard Trailer', description: '33 europallets, 13.6 ldm',
    maxVolumeM3: 90, maxPayloadKg: 24000,
    lengthCm: 1360, widthCm: 245, heightCm: 270,
    loadingMeters: 13.6, palletCapacity: 33,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🚛',
  },
  {
    id: 'mega-trailer', type: 'mega-trailer', category: 'trekker',
    label: 'Mega Trailer', description: 'Extra hoogte (3m), 100m³ laadruimte',
    maxVolumeM3: 100, maxPayloadKg: 24000,
    lengthCm: 1360, widthCm: 245, heightCm: 300,
    loadingMeters: 13.6, palletCapacity: 33,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🚛',
  },
  {
    id: 'koeloplegger', type: 'koeloplegger', category: 'trekker',
    label: 'Koeloplegger', description: 'Temperatuurgecontroleerd, -25°C tot +25°C',
    maxVolumeM3: 85, maxPayloadKg: 22000,
    lengthCm: 1360, widthCm: 245, heightCm: 260,
    loadingMeters: 13.6, palletCapacity: 33,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '🧊',
  },
  {
    id: 'containerchassis', type: 'containerchassis', category: 'trekker',
    label: 'Containerchassis', description: '20ft / 40ft container vervoer',
    maxVolumeM3: 67, maxPayloadKg: 26000,
    lengthCm: 1200, widthCm: 235, heightCm: 239,
    loadingMeters: 12.0, palletCapacity: 24,
    hasTailLift: false, tailLiftCapacityKg: 0,
    icon: '📦',
  },
];

export const SERVICE_LEVELS = [
  { id: 'economy', label: 'Economy', description: '2-3 werkdagen', priceMultiplier: 0.8 },
  { id: 'standard', label: 'Standaard', description: 'Volgende werkdag', priceMultiplier: 1.0 },
  { id: 'express', label: 'Express', description: 'Zelfde dag', priceMultiplier: 1.5 },
  { id: 'dedicated', label: 'Dedicated', description: 'Direct / exclusief', priceMultiplier: 2.0 },
] as const;

export const PRIORITY_OPTIONS = [
  { id: 'normal', label: 'Normaal', color: 'text-muted-foreground' },
  { id: 'high', label: 'Hoog', color: 'text-amber-500' },
  { id: 'urgent', label: 'Urgent', color: 'text-destructive' },
] as const;

export const TEMPERATURE_OPTIONS = [
  { id: 'ambient', label: 'Ambient', icon: '🌡️' },
  { id: 'chilled', label: 'Gekoeld (2-8°C)', icon: '❄️' },
  { id: 'frozen', label: 'Diepvries (-18°C)', icon: '🧊' },
] as const;
