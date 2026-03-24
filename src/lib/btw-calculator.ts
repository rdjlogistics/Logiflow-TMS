/**
 * Nederlandse BTW-berekeningsmodule voor transport
 * 
 * Implementeert de wettelijke BTW-regels voor:
 * - Binnenlands vervoer (21%)
 * - Personenvervoer (9%)
 * - Intracommunautaire diensten (0% verlegd)
 * - Export buiten EU (0% vrijgesteld)
 */

// EU-27 lidstaten + EER (ISO 3166-1 alpha-2)
const EU_LANDEN: readonly string[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

// Volledige landnamen → ISO mapping (NL + EN)
const LAND_NAAM_NAAR_ISO: Record<string, string> = {
  'nederland': 'NL', 'the netherlands': 'NL', 'netherlands': 'NL', 'holland': 'NL',
  'belgie': 'BE', 'België': 'BE', 'belgium': 'BE',
  'duitsland': 'DE', 'germany': 'DE', 'deutschland': 'DE',
  'frankrijk': 'FR', 'france': 'FR',
  'spanje': 'ES', 'spain': 'ES', 'españa': 'ES',
  'italië': 'IT', 'italie': 'IT', 'italy': 'IT', 'italia': 'IT',
  'oostenrijk': 'AT', 'austria': 'AT', 'österreich': 'AT',
  'portugal': 'PT',
  'polen': 'PL', 'poland': 'PL', 'polska': 'PL',
  'tsjechië': 'CZ', 'tsjechie': 'CZ', 'czech republic': 'CZ', 'czechia': 'CZ',
  'slowakije': 'SK', 'slovakia': 'SK',
  'slovenië': 'SI', 'slovenie': 'SI', 'slovenia': 'SI',
  'hongarije': 'HU', 'hungary': 'HU',
  'roemenië': 'RO', 'roemenie': 'RO', 'romania': 'RO',
  'bulgarije': 'BG', 'bulgaria': 'BG',
  'kroatië': 'HR', 'kroatie': 'HR', 'croatia': 'HR',
  'griekenland': 'GR', 'greece': 'GR',
  'ierland': 'IE', 'ireland': 'IE',
  'denemarken': 'DK', 'denmark': 'DK', 'danmark': 'DK',
  'zweden': 'SE', 'sweden': 'SE', 'sverige': 'SE',
  'finland': 'FI',
  'estland': 'EE', 'estonia': 'EE',
  'letland': 'LV', 'latvia': 'LV',
  'litouwen': 'LT', 'lithuania': 'LT',
  'luxemburg': 'LU', 'luxembourg': 'LU',
  'malta': 'MT',
  'cyprus': 'CY',
  // Niet-EU
  'verenigd koninkrijk': 'GB', 'united kingdom': 'GB', 'uk': 'GB', 'groot-brittannië': 'GB',
  'noorwegen': 'NO', 'norway': 'NO', 'norge': 'NO',
  'zwitserland': 'CH', 'switzerland': 'CH', 'schweiz': 'CH',
  'turkije': 'TR', 'turkey': 'TR', 'türkiye': 'TR',
  'marokko': 'MA', 'morocco': 'MA',
};

export type BtwType = 'normaal' | 'verlegd' | 'vrijgesteld';
export type DienstType = 'goederenvervoer' | 'personenvervoer';

export interface BtwInput {
  /** ISO-code of landnaam van de afzender (leverancier) */
  afzenderLand: string | null | undefined;
  /** ISO-code of landnaam van de ontvanger (klant) */
  ontvangerLand: string | null | undefined;
  /** BTW-nummer van de ontvanger (klant), null = B2C */
  ontvangerBTWnummer: string | null | undefined;
  /** Type vervoersdienst */
  dienstType?: DienstType;
}

export interface BtwResultaat {
  /** BTW-tarief in procenten: 0, 9 of 21 */
  tarief: 0 | 9 | 21;
  /** Type BTW-toepassing */
  type: BtwType;
  /** Wettelijk verplichte vermelding op de factuur */
  factuurVermelding: string;
}

/**
 * Normaliseert een landnaam of ISO-code naar een 2-letter ISO-code.
 * Geeft 'NL' terug als het land niet herkend wordt of leeg is.
 */
export function normaliseerLand(land: string | null | undefined): string {
  if (!land || land.trim() === '') return 'NL';
  
  const cleaned = land.trim();
  
  // Al een 2-letter code?
  if (cleaned.length === 2) {
    return cleaned.toUpperCase();
  }
  
  // Zoek in de naam-mapping
  const lower = cleaned.toLowerCase();
  if (LAND_NAAM_NAAR_ISO[lower]) {
    return LAND_NAAM_NAAR_ISO[lower];
  }
  
  // Partial match (bijv. "Nederland" match op "nederland")
  for (const [naam, iso] of Object.entries(LAND_NAAM_NAAR_ISO)) {
    if (lower.includes(naam) || naam.includes(lower)) {
      return iso;
    }
  }
  
  // Onbekend land → behandel als niet-EU
  return cleaned.toUpperCase().substring(0, 2);
}

/**
 * Controleert of een land een EU-lidstaat is.
 */
export function isEuLand(landCode: string): boolean {
  return EU_LANDEN.includes(landCode.toUpperCase());
}

/**
 * Valideert of een BTW-nummer het juiste formaat heeft.
 * Basis-validatie: begint met 2 letters + minimaal 8 tekens.
 */
export function isGeldigBTWnummer(btwNummer: string | null | undefined): boolean {
  if (!btwNummer) return false;
  const cleaned = btwNummer.replace(/[\s.-]/g, '');
  // Minimum: 2 letters + 8 cijfers/letters = 10 tekens
  return /^[A-Z]{2}[A-Z0-9]{8,}$/i.test(cleaned);
}

/**
 * Berekent het juiste BTW-tarief, type en factuurvermelding
 * op basis van de Nederlandse fiscale regels voor transport.
 * 
 * Regels:
 * 1. Personenvervoer → altijd 9% (verlaagd tarief)
 * 2. NL → NL → 21% normaal
 * 3. NL → EU-land + geldig BTW-nummer → 0% verlegd (ICL)
 * 4. NL → EU-land zonder BTW-nummer → 21% normaal (B2C)
 * 5. NL → buiten EU → 0% vrijgesteld (export)
 */
export function berekenBTW(input: BtwInput): BtwResultaat {
  const { ontvangerBTWnummer, dienstType = 'goederenvervoer' } = input;
  
  // Regel 1: Personenvervoer → altijd 9%
  if (dienstType === 'personenvervoer') {
    return {
      tarief: 9,
      type: 'normaal',
      factuurVermelding: 'BTW 9% - verlaagd tarief personenvervoer',
    };
  }
  
  const afzender = normaliseerLand(input.afzenderLand);
  const ontvanger = normaliseerLand(input.ontvangerLand);
  
  // Regel 2: Binnenlands (NL → NL)
  if (afzender === 'NL' && ontvanger === 'NL') {
    return {
      tarief: 21,
      type: 'normaal',
      factuurVermelding: '',
    };
  }
  
  // Regel 3 & 4: NL → EU
  if (afzender === 'NL' && isEuLand(ontvanger) && ontvanger !== 'NL') {
    if (isGeldigBTWnummer(ontvangerBTWnummer)) {
      return {
        tarief: 0,
        type: 'verlegd',
        factuurVermelding: 'BTW verlegd - Intracommunautaire dienst art. 44 BTW-richtlijn 2006/112/EG',
      };
    }
    // B2C binnen EU → normaal NL-tarief
    return {
      tarief: 21,
      type: 'normaal',
      factuurVermelding: '',
    };
  }
  
  // Regel 5: Export buiten EU
  if (afzender === 'NL' && !isEuLand(ontvanger)) {
    return {
      tarief: 0,
      type: 'vrijgesteld',
      factuurVermelding: 'Vrijgesteld van BTW - dienst buiten de EU',
    };
  }
  
  // Fallback: niet-NL afzender → 0% (reverse charge scenario)
  if (afzender !== 'NL') {
    return {
      tarief: 0,
      type: 'verlegd',
      factuurVermelding: 'BTW verlegd',
    };
  }
  
  // Default: 21%
  return {
    tarief: 21,
    type: 'normaal',
    factuurVermelding: '',
  };
}

/**
 * Deno-compatible versie van berekenBTW voor Edge Functions.
 * Identieke logica, exporteerbaar als plain object.
 */
export const BTW_REGELS = {
  EU_LANDEN,
  LAND_NAAM_NAAR_ISO,
  normaliseerLand,
  isEuLand,
  isGeldigBTWnummer,
  berekenBTW,
} as const;
