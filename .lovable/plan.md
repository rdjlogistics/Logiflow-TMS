

# Fix: Order Formulier — Datum, Prijzen & Stadsnaam

## Probleem 1 — Datum "25-03-20"

De `<input type="date">` HTML element gebruikt het browser-native format. Dit wordt bepaald door de browser locale en geeft in sommige browsers/OS-combinaties een 2-cijferig jaar. Dit is niet iets wat we via CSS of HTML attributen kunnen sturen.

**Fix:** Vervang de native `<input type="date">` door een Popover + Calendar (Shadcn datepicker pattern) met een expliciete `format(date, 'dd-MM-yyyy')` weergave. Dit garandeert altijd een 4-cijferig jaar.

**Bestanden:**
- `src/components/orders/OrderDetailsPanel.tsx` — regel 192-197: vervang `<Input type="date">` door Popover+Calendar
- `src/components/orders/DestinationCard.tsx` — regel 473-477: zelfde fix voor pickup_date veld

## Probleem 2 — Prijzen altijd €0

De prices zijn €0 omdat `product_lines` standaard allemaal `is_active: false` starten (PricingPanel regel 122). Gebruikers moeten handmatig elke tariefregel activeren, maar doen dat niet.

**Fix:**
- In `PricingPanel.tsx` (regel 116-128): wanneer product_lines voor het eerst worden geladen en er is precies 1 product, activeer dat product automatisch (`is_active: true`)
- Voeg validatie toe in `OrderForm.tsx` (rond regel 592): check of `salesSubtotal > 0` voordat de order wordt opgeslagen. Toon foutmelding: "Voer een verkoopprijs in of activeer minimaal één tariefregel"
- Voeg een optionele checkbox "Geen kosten (€0)" toe die de validatie overslaat

## Probleem 3 — Stadsnaam lowercase

De postcode-lookup API retourneert soms lowercase stadsnamen. 

**Fix:**
- Maak een `capitalizeCity(name: string)` utility in een bestaand utils bestand
- Pas toe in `DestinationCard.tsx` handlePostcodeLookup (regel 163) en handleChange voor 'city' veld
- Pas toe in `OrderForm.tsx` bij het bouwen van `orderData` (regel 654, 657)
- Database migratie: `UPDATE route_stops SET city = INITCAP(city)` en `UPDATE trips SET pickup_city = INITCAP(pickup_city), delivery_city = INITCAP(delivery_city)`

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/orders/OrderDetailsPanel.tsx` — Popover datepicker |
| **Edit** | `src/components/orders/DestinationCard.tsx` — Popover datepicker + capitalizeCity |
| **Edit** | `src/components/orders/PricingPanel.tsx` — Auto-activate eerste product |
| **Edit** | `src/pages/OrderForm.tsx` — Prijs validatie + capitalizeCity bij save |
| **Edit** | `src/lib/date-utils.ts` — capitalizeCity utility |
| **Migratie** | INITCAP op bestaande stadsnamen |

