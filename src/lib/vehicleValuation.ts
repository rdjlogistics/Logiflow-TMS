/**
 * Vehicle Valuation & TCO Algorithm
 * 
 * Lineaire afschrijving over 8 jaar (NL bedrijfsvoertuigen standaard)
 * met kilometerscorrectie en Total Cost of Ownership berekening.
 */

// === Constants ===
export const DEPRECIATION_YEARS = 8;
export const RESIDUAL_VALUE_PCT = 0.10; // 10% restwaarde floor
export const BENCHMARK_KM_PER_YEAR = 30_000;
export const KM_CORRECTION_FACTOR = 0.15; // max ±15% impact

export interface DepreciationResult {
  currentValue: number;
  residualPct: number;
  depreciationTotal: number;
  depreciationPerMonth: number;
  kmCorrection: number;
  vehicleAge: number;
}

export interface TCOBreakdown {
  depreciationPerMonth: number;
  maintenancePerMonth: number;
  insurancePerMonth: number; // placeholder — could be filled from insurance data
  fuelPerMonth: number; // placeholder
  totalPerMonth: number;
  totalPerKm: number | null; // null if no mileage
}

/**
 * Calculate current trade-in value using linear depreciation + km correction.
 */
export function calculateDepreciation(
  purchasePrice: number,
  yearOfManufacture: number,
  mileageKm: number | null,
): DepreciationResult {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - yearOfManufacture);

  // Linear depreciation: 90% over DEPRECIATION_YEARS, floor at RESIDUAL_VALUE_PCT
  const rawPct = 1 - (age / DEPRECIATION_YEARS) * (1 - RESIDUAL_VALUE_PCT);
  const residualPct = Math.max(RESIDUAL_VALUE_PCT, Math.min(1, rawPct));

  // Km correction
  let kmCorrection = 1;
  if (mileageKm != null && age > 0) {
    const expectedKm = age * BENCHMARK_KM_PER_YEAR;
    const kmRatio = mileageKm / expectedKm;
    // If driven more than expected → value drops; less → value rises
    kmCorrection = Math.max(0.85, Math.min(1.15, 1 - (kmRatio - 1) * KM_CORRECTION_FACTOR));
  }

  const currentValue = Math.round(purchasePrice * residualPct * kmCorrection);
  const depreciationTotal = purchasePrice - currentValue;
  const monthsOwned = Math.max(1, age * 12);
  const depreciationPerMonth = Math.round(depreciationTotal / monthsOwned);

  return {
    currentValue,
    residualPct: residualPct * kmCorrection,
    depreciationTotal,
    depreciationPerMonth,
    kmCorrection,
    vehicleAge: age,
  };
}

/**
 * Calculate Total Cost of Ownership per month.
 */
export function calculateTCO(
  purchasePrice: number,
  yearOfManufacture: number,
  mileageKm: number | null,
  totalMaintenanceCost: number,
  vehicleOwnedMonths?: number,
): TCOBreakdown {
  const depreciation = calculateDepreciation(purchasePrice, yearOfManufacture, mileageKm);
  const months = vehicleOwnedMonths || Math.max(1, depreciation.vehicleAge * 12);

  const maintenancePerMonth = Math.round(totalMaintenanceCost / months);
  const insurancePerMonth = 0; // Could be calculated from insurance data
  const fuelPerMonth = 0; // Could be calculated from fuel records

  const totalPerMonth = depreciation.depreciationPerMonth + maintenancePerMonth + insurancePerMonth + fuelPerMonth;
  const totalPerKm = mileageKm && mileageKm > 0
    ? (totalPerMonth * months) / mileageKm
    : null;

  return {
    depreciationPerMonth: depreciation.depreciationPerMonth,
    maintenancePerMonth,
    insurancePerMonth,
    fuelPerMonth,
    totalPerMonth,
    totalPerKm,
  };
}

/**
 * Format euro value.
 */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
