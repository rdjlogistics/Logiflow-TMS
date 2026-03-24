export interface CarrierTarief {
  id: string;
  naam: string;
  tarief_per_km?: number;
  tarief_per_uur?: number;
  tarief_vast?: number;
  rating?: number;
  beschikbaar?: boolean;
}

export interface OrderInfo {
  afstand_km: number;
  geschatte_uren?: number;
}

export interface CarrierQuote {
  carrier_id: string;
  carrier_naam: string;
  prijs: number;
  berekenings_methode: string;
  rating?: number;
}

export function berekenCarrierTarief(carrier: CarrierTarief, order: OrderInfo): CarrierQuote | null {
  let prijs: number | null = null;
  let methode = '';

  if (carrier.tarief_vast) {
    prijs = carrier.tarief_vast;
    methode = 'Vast tarief';
  } else if (carrier.tarief_per_km && order.afstand_km) {
    prijs = order.afstand_km * carrier.tarief_per_km;
    methode = `${order.afstand_km} km × €${carrier.tarief_per_km}/km`;
  } else if (carrier.tarief_per_uur && order.geschatte_uren) {
    prijs = order.geschatte_uren * carrier.tarief_per_uur;
    methode = `${order.geschatte_uren} uur × €${carrier.tarief_per_uur}/uur`;
  }

  if (!prijs) return null;

  return {
    carrier_id: carrier.id,
    carrier_naam: carrier.naam,
    prijs: Math.round(prijs * 100) / 100,
    berekenings_methode: methode,
    rating: carrier.rating,
  };
}

export function vergelijkCarriers(carriers: CarrierTarief[], order: OrderInfo): CarrierQuote[] {
  return carriers
    .filter(c => c.beschikbaar !== false)
    .map(c => berekenCarrierTarief(c, order))
    .filter((q): q is CarrierQuote => q !== null)
    .sort((a, b) => a.prijs - b.prijs);
}
