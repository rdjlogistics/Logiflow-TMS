/**
 * nl-validators.ts — Nederlandse veldvalidatie voor LogiFlow TMS
 *
 * Bevat validators voor:
 * - IBAN (via ibantools)
 * - Nederlandse postcode (1234 AB formaat)
 * - KvK-nummer (8 cijfers)
 * - BTW-nummer (NL123456789B01 formaat)
 * - Kenteken (RDW auto-fill via API)
 */
import { isValidIBAN } from "ibantools";

// ─── IBAN ───────────────────────────────────────────────────────────────────

/**
 * Valideert een IBAN nummer.
 * Geeft een foutmelding terug als ongeldig, anders undefined.
 */
export function validateIBAN(value: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (!isValidIBAN(cleaned)) {
    return "Ongeldig IBAN nummer";
  }
  return undefined;
}

/**
 * Formatteer een IBAN met spaties elke 4 tekens (bijv. NL91 ABNA 0417 1643 00).
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

// ─── POSTCODE ────────────────────────────────────────────────────────────────

/**
 * Valideert een Nederlandse postcode (bijv. 1234 AB of 1234AB).
 */
export function validateNLPostcode(value: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (!/^\d{4}[A-Z]{2}$/.test(cleaned)) {
    return "Ongeldige postcode (bijv. 1234 AB)";
  }
  return undefined;
}

/**
 * Formatteer postcode naar standaard formaat "1234 AB".
 */
export function formatPostcode(value: string): string {
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (cleaned.length >= 6) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}`;
  }
  return cleaned;
}

// ─── KvK ────────────────────────────────────────────────────────────────────

/**
 * Valideert een KvK-nummer (8 cijfers).
 */
export function validateKvK(value: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{8}$/.test(cleaned)) {
    return "KvK-nummer moet 8 cijfers zijn";
  }
  return undefined;
}

// ─── BTW NUMMER ──────────────────────────────────────────────────────────────

/**
 * Valideert een Nederlands BTW-nummer (NL123456789B01 formaat).
 * Accepteert ook varianten met punten of spaties.
 */
export function validateBTWNummer(value: string): string | undefined {
  if (!value) return undefined;
  // Strip niet-alfanumerieke tekens
  const cleaned = value.replace(/[\s.]/g, "").toUpperCase();
  // NL + 9 cijfers + B + 2 cijfers
  if (!/^NL\d{9}B\d{2}$/.test(cleaned)) {
    return "Ongeldig BTW-nummer (bijv. NL123456789B01)";
  }
  return undefined;
}

// ─── KENTEKEN ────────────────────────────────────────────────────────────────

export interface RDWVoertuigData {
  kenteken: string;
  merk: string;
  handelsbenaming: string;
  brandstof: string;
  voertuigsoort: string;
  eerste_toelating: string;
  massa_rijklaar: string;
}

/**
 * Haal voertuiggegevens op via de RDW open data API op basis van kenteken.
 * Vult automatisch merk, type en brandstof in.
 *
 * @param kenteken - Nederlands kenteken (bijv. "AB-123-C" of "AB123C")
 * @returns Voertuigdata of null bij niet gevonden/fout
 */
export async function lookupKenteken(kenteken: string): Promise<RDWVoertuigData | null> {
  // Normalize: verwijder koppeltekens en spaties, uppercase
  const normalized = kenteken.replace(/[-\s]/g, "").toUpperCase();

  if (!normalized || normalized.length < 4) {
    return null;
  }

  try {
    const url = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${encodeURIComponent(normalized)}&$limit=1`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn("[nl-validators] RDW API fout:", response.status);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const voertuig = data[0];

    return {
      kenteken: voertuig.kenteken ?? normalized,
      merk: voertuig.merk ?? "",
      handelsbenaming: voertuig.handelsbenaming ?? "",
      brandstof: voertuig.brandstof_omschrijving ?? "",
      voertuigsoort: voertuig.voertuigsoort ?? "",
      eerste_toelating: voertuig.datum_eerste_toelating ?? "",
      massa_rijklaar: voertuig.massa_rijklaar ?? "",
    };
  } catch (error) {
    console.error("[nl-validators] RDW lookup fout:", error);
    return null;
  }
}

/**
 * Valideer kenteken formaat (NL kenteken patroon check).
 */
export function validateKenteken(value: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[-\s]/g, "").toUpperCase();
  // Accepteer 4-8 alfanumerieke tekens (dekt alle Nederlandse formaten)
  if (!/^[A-Z0-9]{4,8}$/.test(cleaned)) {
    return "Ongeldig kenteken formaat";
  }
  return undefined;
}

// ─── TELEFOON ────────────────────────────────────────────────────────────────

/**
 * Valideert een Nederlands telefoonnummer (mobiel of vast).
 */
export function validateNLTelefoon(value: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[\s\-().]/g, "");
  // NL mobiel: 06xxxxxxxx, NL vast: 0xx-xxxxxxx
  if (!/^(\+31|0031|0)[1-9]\d{7,8}$/.test(cleaned)) {
    return "Ongeldig telefoonnummer (bijv. 0612345678 of +31612345678)";
  }
  return undefined;
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────

/**
 * Valideert een emailadres.
 */
export function validateEmail(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Ongeldig emailadres";
  }
  return undefined;
}
