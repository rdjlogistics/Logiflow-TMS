

# Verificatie Resultaten — Datum- en Adresvalidaties

## 1. DATUMS ✅ CORRECT

| Check | Status | Detail |
|-------|--------|--------|
| Date picker blokkeert verleden | ✅ | `DestinationCard.tsx` line 519: `disabled={(date) => { const today = new Date(); today.setHours(0,0,0,0); return date < today; }}` |
| Order date picker blokkeert verleden | ✅ | `OrderDetailsPanel.tsx` line 216: zelfde `disabled` logica |
| 4-cijferig jaar | ✅ | Calendar component toont standaard 4-cijferig jaar. Format: `dd-MM-yyyy` (line 508) |
| Factuurdatum min 7 dagen | ✅ | `ManualInvoiceForm.tsx` line 266: `min` berekend als 7 dagen geleden |
| Vervaldatum >= factuurdatum | ✅ | `ManualInvoiceForm.tsx` line 275: `min={formData.invoice_date}` |
| `getToday()` utility | ✅ | `date-utils.ts` line 167-171 |
| `getTodayISO()` utility | ✅ | `date-utils.ts` line 174-176 |
| `getMinInvoiceDate()` utility | ✅ | `date-utils.ts` line 179-183 |
| `isValidDeliveryDate()` utility | ✅ | `date-utils.ts` line 186-191 |
| `isValidDateRange()` utility | ✅ | `date-utils.ts` line 194-201 |

## 2. ADRESSEN ✅ CORRECT

| Check | Status | Detail |
|-------|--------|--------|
| Postcode-stad mismatch waarschuwing (DestinationCard) | ✅ | Line 123-124: `apiCity` + `cityMismatch` state. Line 149-154: vergelijking bij city change. Line 461-465: gele waarschuwing tekst |
| Postcode-stad mismatch waarschuwing (DutchAddressInput) | ✅ | Eerder geïmplementeerd met `apiCity` en `cityMismatch` state |
| capitalizeCity Dutch prefixes | ✅ | Line 210-211: `'s-` en `'t-` correcties voor Hertogenbosch etc. |
| Altijd overschrijven bij lookup | ✅ | Line 177-180: geen `!street`/`!city` conditie meer, altijd update |
| Herkomst = bestemming check | ✅ | `OrderForm.tsx` line 618-627: `window.confirm` bij zelfde stad + straat |
| AddressBookDialog capitalizeCity | ✅ | Eerder toegevoegd met import van `capitalizeCity` |
| `pointer-events-auto` op Calendar | ✅ | Line 522: `className="p-3 pointer-events-auto"` |

## Conclusie

**Alle datum- en adresvalidaties zijn correct geïmplementeerd.** Geen problemen gevonden. Geen code wijzigingen nodig.

- Date pickers: 3/3 locaties blokkeren verleden datums
- Jaar format: 4-cijferig overal (dd-MM-yyyy)
- Factuurdatums: correct begrensd (min 7 dagen, vervaldatum >= factuurdatum)
- Postcode-stad: mismatch waarschuwing in beide componenten
- capitalizeCity: handelt Dutch prefixes correct af
- Origin=destination: window.confirm waarschuwing actief

