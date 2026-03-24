import caddyImg from './caddy.png';
import vitoImg from './vito.png';
import sprinterImg from './sprinter.png';
import bakwagenImg from './bakwagen.png';
import dafTruckImg from './daf-truck.png';
import vrachtwagenImg from './vrachtwagen.png';
import trailerImg from './trailer.png';
import koelopleggerImg from './koeloplegger.png';
import containerchassisImg from './containerchassis.png';

export const VEHICLE_IMAGES: Record<string, string> = {
  caddy: caddyImg,
  vito: vitoImg,
  sprinter: sprinterImg,
  'meubelbak-zonder': bakwagenImg,
  'meubelbak-klep': bakwagenImg,
  'c-bakwagen': dafTruckImg,
  'be-combi': dafTruckImg,
  'vrachtwagen-7t': vrachtwagenImg,
  'vrachtwagen-12t': vrachtwagenImg,
  'vrachtwagen-18t': vrachtwagenImg,
  'standaard-trailer': trailerImg,
  'mega-trailer': trailerImg,
  'koeloplegger': koelopleggerImg,
  'containerchassis': containerchassisImg,
};

export const CATEGORY_IMAGES: Record<string, string> = {
  bestelbus: sprinterImg,
  bakwagen: bakwagenImg,
  vrachtwagen: vrachtwagenImg,
  trekker: trailerImg,
};

export function getVehicleImage(vehicleType: string): string | undefined {
  return VEHICLE_IMAGES[vehicleType];
}

export function getCategoryImage(categoryId: string): string | undefined {
  return CATEGORY_IMAGES[categoryId];
}
