// Trip/order business logic utilities for LogiFlow TMS

export type TripStatus =
  | 'aanvraag' | 'gepland' | 'onderweg' | 'afgerond'
  | 'geannuleerd' | 'offerte' | 'draft' | 'geladen'
  | 'afgeleverd' | 'gecontroleerd' | 'gefactureerd';

// --- Status flow ---

const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  aanvraag:     ['gepland', 'offerte', 'geannuleerd'],
  offerte:      ['aanvraag', 'gepland', 'geannuleerd'],
  draft:        ['gepland', 'geannuleerd'],
  gepland:      ['onderweg', 'geladen', 'geannuleerd'],
  geladen:      ['onderweg'],
  onderweg:     ['afgeleverd', 'afgerond'],
  afgeleverd:   ['afgerond', 'gecontroleerd'],
  afgerond:     ['gecontroleerd', 'gefactureerd'],
  gecontroleerd:['gefactureerd'],
  gefactureerd: [],
  geannuleerd:  [],
};

export function mogelijkeTripTransities(huidig: TripStatus): TripStatus[] {
  return TRIP_TRANSITIONS[huidig] ?? [];
}

export function kanTripTransitie(huidig: string, nieuw: string): boolean {
  return (TRIP_TRANSITIONS[huidig as TripStatus] ?? []).includes(nieuw as TripStatus);
}

/** Is the trip in an active/in-progress state? */
export function isTripActief(status: string): boolean {
  return ['gepland', 'geladen', 'onderweg', 'afgeleverd'].includes(status);
}

/** Is the trip completed (cannot be changed)? */
export function isTripAfgesloten(status: string): boolean {
  return ['gefactureerd', 'geannuleerd'].includes(status);
}

/** Is the trip billable (afgerond or gecontroleerd)? */
export function isTripFactureerbaar(status: string): boolean {
  return ['afgerond', 'gecontroleerd'].includes(status);
}

// --- Margin calculation ---

export function berekenMarge(salesTotal: number, purchaseTotal: number): {
  grossProfit: number;
  marginPct: number;
} {
  const grossProfit = Math.round((salesTotal - purchaseTotal) * 100) / 100;
  const marginPct = salesTotal > 0
    ? Math.round((grossProfit / salesTotal) * 10000) / 100
    : 0;
  return { grossProfit, marginPct };
}

/** Color class for margin display */
export function margeKleur(marginPct: number): 'text-green-600' | 'text-amber-600' | 'text-red-600' {
  if (marginPct >= 20) return 'text-green-600';
  if (marginPct >= 5) return 'text-amber-600';
  return 'text-red-600';
}

// --- Distance / pricing helpers ---

/** Estimate price from distance × rate */
export function berekenPrijsKm(distanceKm: number, ratePerKm: number, minimumBedrag = 0): number {
  const calc = Math.round(distanceKm * ratePerKm * 100) / 100;
  return Math.max(minimumBedrag, calc);
}

/** Round trip kilometers */
export function roundTripKm(km: number): number {
  return Math.ceil(km / 5) * 5;
}

// --- ETA helpers ---

/** Estimated arrival given departure + drive hours */
export function berekenETA(departure: Date, driveHours: number, waitMinutes = 0): Date {
  const totalMs = (driveHours * 60 + waitMinutes) * 60 * 1000;
  return new Date(departure.getTime() + totalMs);
}

// --- Order number generation (client-side fallback) ---

/** Generate a local order number for optimistic UI (server should generate the real one) */
export function generateLocalOrderNumber(prefix = 'ORD'): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${yy}${mm}-${rand}`;
}

// --- Cargo helpers ---

export interface CargoLine {
  quantity: number;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export function berekenTotaalGewicht(lines: CargoLine[]): number {
  return Math.round(lines.reduce((s, l) => s + l.quantity * l.weightKg, 0) * 10) / 10;
}

export function berekenTotaalVolume(lines: CargoLine[]): number {
  return Math.round(
    lines.reduce((s, l) => {
      if (!l.lengthCm || !l.widthCm || !l.heightCm) return s;
      const vol = (l.lengthCm * l.widthCm * l.heightCm) / 1_000_000; // cm³ → m³
      return s + l.quantity * vol;
    }, 0) * 1000
  ) / 1000;
}

// --- Waiting time ---

/** Calculate billable waiting minutes after a free window */
export function billableWaitMinutes(totalWaitMinutes: number, freeMinutes = 30): number {
  return Math.max(0, totalWaitMinutes - freeMinutes);
}

/** Cost for waiting time at a given hourly rate */
export function wachttijdKosten(waitMinutes: number, hourlyRate: number, freeMinutes = 30): number {
  const billable = billableWaitMinutes(waitMinutes, freeMinutes);
  return Math.round((billable / 60) * hourlyRate * 100) / 100;
}
