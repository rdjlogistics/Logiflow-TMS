

# Fix: Dynamic Pricing werkt niet

## Probleem

Na het bekijken van de edge function `calculate-price` en de database-schema is er **1 probleem** gevonden:

De edge function probeert bij het opslaan van de berekening kolommen in te voegen die **niet bestaan** in de `price_calculations` tabel:
- `vehicle_type` — bestaat niet
- `surge_multiplier` — bestaat niet

Dit zit weliswaar in een try-catch, maar de hoofdflow kan ook falen als de gebruiker geen `company_id` heeft in het `profiles` tabel (de functie retourneert dan een 400 error: "Geen bedrijf gekoppeld").

Daarnaast ontbreekt `valid_until` en `currency` in de response van de edge function, terwijl de `useSmartPricing` hook die verwacht (maar `useDynamicPricing` niet — dat is de hook die de Dynamic Pricing pagina gebruikt, dus die klopt).

## Fix

### Bestand 1: `supabase/functions/calculate-price/index.ts`

1. **Fix insert columns** — Verwijder `vehicle_type` en `surge_multiplier` uit de insert naar `price_calculations` (deze kolommen bestaan niet in de tabel)
2. **Fallback voor company_id** — Check ook `user_companies` tabel als `profiles.company_id` null is (consistent met hoe `useDynamicPricing` hooks werken)
3. **Voeg `currency` en `valid_until` toe aan response** — Zodat de `useSmartPricing` hook ook correct werkt

Totaal: 1 edge function. Geen frontend wijzigingen. Na deployment werkt Dynamic Pricing end-to-end.

