export interface PrijsInput {
  afstand_km: number;
  gewicht_kg: number;
  type_lading?: string;
  urgentie: 'normaal' | 'spoed' | 'flex';
  datum: Date;
}

export interface PrijsOutput {
  aanbevolen_prijs: number;
  minimum_prijs: number;
  maximum_prijs: number;
  marge_pct: number;
  onderbouwing: string[];
}

const NL_MARKT_BENCHMARKS = {
  gemiddeld_per_km: 1.85,
  diesel_toeslag_q1_2026: 0.12,
  index_label: '+2.3% Q1 2026',
};

export function berekenAanbevolenPrijs(input: PrijsInput): PrijsOutput {
  const BASIS_PER_KM = 1.85;
  const BASIS_INSTAP = 45;

  const gewicht_factor = input.gewicht_kg > 1000 ? 1.3 : input.gewicht_kg > 500 ? 1.15 : 1.0;
  const urgentie_factor = input.urgentie === 'spoed' ? 1.45 : input.urgentie === 'flex' ? 0.85 : 1.0;
  const dag = input.datum.getDay();
  const tijd_factor = (dag === 0 || dag === 6) ? 1.25 : 1.0;

  const basis = (BASIS_INSTAP + (input.afstand_km * BASIS_PER_KM)) * gewicht_factor;
  const aanbevolen = basis * urgentie_factor * tijd_factor;

  const onderbouwing: string[] = [
    `Basisprijs: €${BASIS_INSTAP} instap + €${BASIS_PER_KM}/km`,
  ];
  if (gewicht_factor > 1) onderbouwing.push(`Gewichtstoeslag: +${Math.round((gewicht_factor - 1) * 100)}%`);
  if (urgentie_factor > 1) onderbouwing.push(`Spoedtoeslag: +${Math.round((urgentie_factor - 1) * 100)}%`);
  if (urgentie_factor < 1) onderbouwing.push(`Flex korting: -${Math.round((1 - urgentie_factor) * 100)}%`);
  if (tijd_factor > 1) onderbouwing.push('Weekendtoeslag: +25%');

  return {
    aanbevolen_prijs: Math.round(aanbevolen * 100) / 100,
    minimum_prijs: Math.round(aanbevolen * 0.85 * 100) / 100,
    maximum_prijs: Math.round(aanbevolen * 1.25 * 100) / 100,
    marge_pct: 32,
    onderbouwing,
  };
}

export { NL_MARKT_BENCHMARKS };
