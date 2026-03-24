// Toll Service - Foundation Module
// Full European coverage for TMS integration

export * from './types';
export * from './providers/BaseTollProvider';
export * from './providers/GermanyTollProvider';
export * from './providers/FranceTollProvider';
export * from './providers/AustriaTollProvider';
export * from './providers/SwitzerlandTollProvider';
export * from './providers/ItalyTollProvider';
export * from './providers/NetherlandsTollProvider';
export * from './providers/BelgiumTollProvider';
export * from './providers/SpainTollProvider';
export * from './providers/PolandTollProvider';
export * from './providers/CzechTollProvider';
export * from './providers/HungaryTollProvider';
export * from './providers/SloveniaTollProvider';
export * from './providers/CroatiaTollProvider';
export * from './providers/PortugalTollProvider';
export * from './providers/SlovakiaTollProvider';
export * from './providers/RomaniaTollProvider';
export * from './providers/BulgariaTollProvider';
export * from './providers/GreeceTollProvider';
export * from './providers/DenmarkTollProvider';
export * from './providers/SwedenTollProvider';
export * from './providers/NorwayTollProvider';
export * from './providers/UKTollProvider';
export * from './providers/IrelandTollProvider';
export * from './providers/LuxembourgTollProvider';

import { ITollProvider, TollCountryInfo } from './types';
import { GermanyTollProvider } from './providers/GermanyTollProvider';
import { FranceTollProvider } from './providers/FranceTollProvider';
import { AustriaTollProvider } from './providers/AustriaTollProvider';
import { SwitzerlandTollProvider } from './providers/SwitzerlandTollProvider';
import { ItalyTollProvider } from './providers/ItalyTollProvider';
import { NetherlandsTollProvider } from './providers/NetherlandsTollProvider';
import { BelgiumTollProvider } from './providers/BelgiumTollProvider';
import { SpainTollProvider } from './providers/SpainTollProvider';
import { PolandTollProvider } from './providers/PolandTollProvider';
import { CzechTollProvider } from './providers/CzechTollProvider';
import { HungaryTollProvider } from './providers/HungaryTollProvider';
import { SloveniaTollProvider } from './providers/SloveniaTollProvider';
import { CroatiaTollProvider } from './providers/CroatiaTollProvider';
import { PortugalTollProvider } from './providers/PortugalTollProvider';
import { SlovakiaTollProvider } from './providers/SlovakiaTollProvider';
import { RomaniaTollProvider } from './providers/RomaniaTollProvider';
import { BulgariaTollProvider } from './providers/BulgariaTollProvider';
import { GreeceTollProvider } from './providers/GreeceTollProvider';
import { DenmarkTollProvider } from './providers/DenmarkTollProvider';
import { SwedenTollProvider } from './providers/SwedenTollProvider';
import { NorwayTollProvider } from './providers/NorwayTollProvider';
import { UKTollProvider } from './providers/UKTollProvider';
import { IrelandTollProvider } from './providers/IrelandTollProvider';
import { LuxembourgTollProvider } from './providers/LuxembourgTollProvider';

// Provider registry - All European countries
const providerRegistry: Record<string, () => ITollProvider> = {
  DE: () => new GermanyTollProvider(),
  FR: () => new FranceTollProvider(),
  AT: () => new AustriaTollProvider(),
  CH: () => new SwitzerlandTollProvider(),
  IT: () => new ItalyTollProvider(),
  NL: () => new NetherlandsTollProvider(),
  BE: () => new BelgiumTollProvider(),
  ES: () => new SpainTollProvider(),
  PL: () => new PolandTollProvider(),
  CZ: () => new CzechTollProvider(),
  HU: () => new HungaryTollProvider(),
  SI: () => new SloveniaTollProvider(),
  HR: () => new CroatiaTollProvider(),
  PT: () => new PortugalTollProvider(),
  SK: () => new SlovakiaTollProvider(),
  RO: () => new RomaniaTollProvider(),
  BG: () => new BulgariaTollProvider(),
  GR: () => new GreeceTollProvider(),
  DK: () => new DenmarkTollProvider(),
  SE: () => new SwedenTollProvider(),
  NO: () => new NorwayTollProvider(),
  GB: () => new UKTollProvider(),
  IE: () => new IrelandTollProvider(),
  LU: () => new LuxembourgTollProvider(),
};

/**
 * Get a toll provider for a specific country
 */
export function getTollProvider(countryCode: string): ITollProvider | null {
  const factory = providerRegistry[countryCode.toUpperCase()];
  return factory ? factory() : null;
}

/**
 * Get all available country codes
 */
export function getAvailableCountries(): string[] {
  return Object.keys(providerRegistry);
}

/**
 * Get toll info for all countries
 */
export async function getAllTollInfo(): Promise<TollCountryInfo[]> {
  const providers = Object.values(providerRegistry).map(factory => factory());
  return Promise.all(providers.map(p => p.getCountryInfo()));
}

/**
 * Get combined GeoJSON for all countries
 */
export async function getAllTollGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const providers = Object.values(providerRegistry).map(factory => factory());
  const geoJSONs = await Promise.all(providers.map(p => p.getGeoJSON()));
  
  return {
    type: 'FeatureCollection',
    features: geoJSONs.flatMap(g => g.features),
  };
}
