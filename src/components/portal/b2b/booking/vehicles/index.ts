import type { VehicleModelProps, DoorState } from './shared';

export type { DoorState, VehicleModelProps };
export { TurntablePlatform } from './shared';

// Vehicle type → component resolver
export function getVehicleComponent(vehicleType: string): string {
  if (['caddy', 'vito'].includes(vehicleType)) return 'caddy';
  if (vehicleType === 'sprinter') return 'sprinter';
  if (vehicleType.startsWith('meubelbak')) return 'bakwagen';
  // Batch 2
  if (['c-bakwagen', 'be-combi'].includes(vehicleType)) return 'daf';
  if (vehicleType.startsWith('vrachtwagen')) return 'truck';
  if (vehicleType.includes('trailer') || vehicleType.includes('oplegger')) return 'trailer';
  if (vehicleType === 'koeloplegger') return 'trailer';
  if (vehicleType === 'containerchassis') return 'trailer';
  return 'sprinter'; // default
}

// Vehicle brand labels
export function getVehicleBrand(vehicleType: string): { brand: string; model: string } {
  switch (getVehicleComponent(vehicleType)) {
    case 'caddy': return { brand: vehicleType === 'vito' ? 'Mercedes-Benz' : 'Volkswagen', model: vehicleType === 'vito' ? 'Vito' : 'Caddy 2025' };
    case 'sprinter': return { brand: 'Mercedes-Benz', model: 'Sprinter' };
    case 'bakwagen': return { brand: 'Mercedes-Benz', model: 'Sprinter Bakwagen' };
    case 'daf': return { brand: 'DAF', model: 'C-Bakwagen' };
    case 'truck': return { brand: 'MAN / DAF', model: 'Vrachtwagen' };
    case 'trailer': return { brand: 'Diverse', model: 'Trekker + Oplegger' };
    default: return { brand: '', model: '' };
  }
}

export { VehicleCaddy } from './VehicleCaddy';
export { VehicleSprinter } from './VehicleSprinter';
export { VehicleBakwagen } from './VehicleBakwagen';
export { VehicleDAF } from './VehicleDAF';
export { VehicleTruck } from './VehicleTruck';
export { VehicleTrailer } from './VehicleTrailer';
