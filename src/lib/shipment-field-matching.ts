// Shipment-specific field matching with Dutch/English aliases

export interface TargetField {
  key: string;
  label: string;
  required: boolean;
}

export const SHIPMENT_TARGET_FIELDS: TargetField[] = [
  { key: 'pickupAddress', label: 'Ophaaladres', required: true },
  { key: 'pickupPostalCode', label: 'Ophaal postcode', required: true },
  { key: 'pickupCity', label: 'Ophaal stad', required: true },
  { key: 'pickupHouseNumber', label: 'Ophaal huisnummer', required: false },
  { key: 'pickupCompany', label: 'Ophaal bedrijf', required: false },
  { key: 'pickupDate', label: 'Ophaal datum', required: true },
  { key: 'deliveryAddress', label: 'Afleveradres', required: true },
  { key: 'deliveryPostalCode', label: 'Aflever postcode', required: true },
  { key: 'deliveryCity', label: 'Aflever stad', required: true },
  { key: 'deliveryHouseNumber', label: 'Aflever huisnummer', required: false },
  { key: 'deliveryCompany', label: 'Aflever bedrijf', required: false },
  { key: 'deliveryDate', label: 'Aflever datum', required: false },
  { key: 'quantity', label: 'Aantal', required: false },
  { key: 'weightKg', label: 'Gewicht (kg)', required: false },
  { key: 'description', label: 'Beschrijving', required: false },
  { key: 'reference', label: 'Referentie', required: false },
];

const ALIAS_MAP: Record<string, string[]> = {
  pickupAddress: ['ophaaladres', 'ophaal_adres', 'pickup_address', 'pickup address', 'ophaal straat', 'vertrekadres', 'vertrek adres', 'from address', 'van adres', 'straat ophaal'],
  pickupPostalCode: ['ophaal postcode', 'ophaal_postcode', 'pickup_postal_code', 'pickup postcode', 'pickup postal code', 'postcode ophaal', 'from postal code', 'van postcode'],
  pickupCity: ['ophaal stad', 'ophaal_stad', 'pickup_city', 'pickup city', 'vertrekplaats', 'from city', 'van stad', 'stad ophaal', 'ophaalplaats'],
  pickupHouseNumber: ['ophaal huisnummer', 'ophaal_huisnummer', 'pickup_house_number', 'pickup house number', 'huisnr ophaal', 'nr ophaal'],
  pickupCompany: ['ophaal bedrijf', 'ophaal_bedrijf', 'pickup_company', 'pickup company', 'afzender', 'sender', 'from company', 'van bedrijf'],
  pickupDate: ['ophaal datum', 'ophaal_datum', 'pickup_date', 'pickup date', 'ophaaldatum', 'vertrekdatum', 'from date'],
  deliveryAddress: ['afleveradres', 'aflever_adres', 'delivery_address', 'delivery address', 'aflever straat', 'bestemmingsadres', 'bestemming adres', 'to address', 'naar adres'],
  deliveryPostalCode: ['aflever postcode', 'aflever_postcode', 'delivery_postal_code', 'delivery postcode', 'delivery postal code', 'postcode aflever', 'to postal code', 'naar postcode', 'bestemming postcode'],
  deliveryCity: ['aflever stad', 'aflever_stad', 'delivery_city', 'delivery city', 'bestemmingsplaats', 'to city', 'naar stad', 'afleverplaats'],
  deliveryHouseNumber: ['aflever huisnummer', 'aflever_huisnummer', 'delivery_house_number', 'delivery house number', 'huisnr aflever', 'nr aflever'],
  deliveryCompany: ['aflever bedrijf', 'aflever_bedrijf', 'delivery_company', 'delivery company', 'ontvanger', 'receiver', 'to company', 'naar bedrijf'],
  deliveryDate: ['aflever datum', 'aflever_datum', 'delivery_date', 'delivery date', 'afleverdatum', 'bezorgdatum', 'to date'],
  quantity: ['aantal', 'colli', 'stuks', 'pakketten', 'quantity', 'qty', 'pieces', 'packages', 'pallets'],
  weightKg: ['gewicht', 'weight_kg', 'weight', 'kg', 'kilogram', 'gewicht kg', 'gewicht_kg', 'massa'],
  description: ['beschrijving', 'description', 'omschrijving', 'inhoud', 'goederen', 'goods', 'product'],
  reference: ['referentie', 'reference', 'ref', 'kenmerk', 'ordernummer', 'order number', 'referentienummer', 'reference_number'],
};

export interface FieldMapping {
  sourceHeader: string;
  targetKey: string | null;
  confidence: number;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  
  // Levenshtein-based similarity for short strings
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = i === 0
        ? j
        : Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
    }
  }
  
  return 1 - matrix[a.length][b.length] / maxLen;
}

export function matchHeaders(sourceHeaders: string[]): FieldMapping[] {
  return sourceHeaders.map(header => {
    const norm = normalize(header);
    let bestKey: string | null = null;
    let bestConfidence = 0;

    for (const [key, aliases] of Object.entries(ALIAS_MAP)) {
      // Exact match on alias
      for (const alias of aliases) {
        const normAlias = normalize(alias);
        if (norm === normAlias) {
          bestKey = key;
          bestConfidence = 1;
          break;
        }
        const sim = similarity(norm, normAlias);
        if (sim > bestConfidence) {
          bestConfidence = sim;
          bestKey = key;
        }
      }
      if (bestConfidence === 1) break;
    }

    return {
      sourceHeader: header,
      targetKey: bestConfidence >= 0.5 ? bestKey : null,
      confidence: bestConfidence >= 0.5 ? bestConfidence : 0,
    };
  });
}

export function parseCSVHeaders(content: string): string[] {
  const firstLine = content.split('\n')[0];
  if (!firstLine) return [];
  return firstLine.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
}
