

# Fix: Adres-data Kwaliteit Verbeteren

## 4 Verbeteringen

### 1. Postcode-stad mismatch waarschuwing — DutchAddressInput + DestinationCard

**DutchAddressInput.tsx**: Na postcode lookup, vergelijk `result.city` met huidige `city` waarde. Als ze verschillen → toon gele waarschuwing onder het stad-veld. Nieuwe state: `cityMismatch: string | null`. Altijd autofill (overschrijf straat+stad), maar als de gebruiker daarna de stad handmatig wijzigt naar iets anders → toon waarschuwing.

**DestinationCard.tsx** (line 150-177): Zelfde logica. Na lookup, sla `apiCity` op in state. Bij `handleChange('city', ...)` vergelijk met `apiCity`. Toon gele waarschuwing: `"De postcode hoort bij {apiCity}, niet {ingevulde stad}"`.

### 2. Altijd overschrijven bij nieuwe postcode

**DutchAddressInput.tsx** (line 57-63): Huidige code checkt `!street` en `!city` — dus als er al een stad/straat staat, wordt die NIET overschreven bij een nieuwe postcode. Fix: verwijder de `!street` en `!city` conditie, altijd overschrijven bij lookup.

**DestinationCard.tsx** (line 167-169): Overschrijft al altijd straat+stad. Geen wijziging nodig.

### 3. Herkomst = bestemming check — OrderForm.tsx

**OrderForm.tsx** (rond line 658): Voor het opslaan, vergelijk pickup en delivery stad+straat. Als beide gelijk → `window.confirm("Ophaal- en afleverlocatie lijken hetzelfde. Klopt dit?")`. Als gebruiker annuleert → niet opslaan.

### 4. capitalizeCity verbeteren — date-utils.ts

De huidige `capitalizeCity` (line 204-209) handelt `'s-Hertogenbosch` niet correct af (maakt er `'S-Hertogenbosch` van). Fix: na de regex, corrigeer patronen die beginnen met `'s-` of `'t-` terug naar lowercase.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/lib/date-utils.ts` — `capitalizeCity` fix voor 's-Hertogenbosch etc. |
| **Edit** | `src/components/address/DutchAddressInput.tsx` — mismatch warning + altijd overschrijven |
| **Edit** | `src/components/orders/DestinationCard.tsx` — mismatch warning state |
| **Edit** | `src/pages/OrderForm.tsx` — herkomst=bestemming check |
| **Edit** | `src/components/portal/b2b/AddressBookDialog.tsx` — capitalizeCity bij opslaan |

