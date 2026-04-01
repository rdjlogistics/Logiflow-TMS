

# Audit Resultaat — 1 Kritiek Issue Gevonden

## Methode

Alle 66 edge functions vergeleken met alle frontend `invoke()` aanroepen. Alle "binnenkort" labels gecontroleerd. Alle disabled knoppen gecontroleerd. Alle eerder gefixte items geverifieerd.

---

## Status Verificatie ✅

Alles uit alle vorige audits is correct geïmplementeerd:
- ✅ Alle 66 edge functions bestaan en worden correct aangeroepen
- ✅ Geen ontbrekende edge functions meer
- ✅ Alle "binnenkort" labels zijn alleen bij legitieme contexten (verlopen documenten, sessie-warnings)
- ✅ Alle knoppen in de app hebben werkende onClick handlers
- ✅ `freight-matching`, `send-push-notification-to-planners`, `proactive-alerts` — allemaal aanwezig
- ✅ Voice assistant audio format — correct
- ✅ Demo data verwijderd
- ✅ Route Optimization opslaan + chauffeur toewijzen — werkend
- ✅ B2C 2FA, geo-polygon editor — werkend

---

## Kritiek: `proactive-alerts` edge function gebruikt verkeerde database waarden

**Bestand**: `supabase/functions/proactive-alerts/index.ts`

De functie zal **nooit resultaten opleveren** door 3 fouten:

### Fout 1: Verkeerde trip statussen (regel 48)
De functie zoekt `.eq("status", "in_transit")` en `.in("status", ["pending", "confirmed"])`, maar de `trips` tabel gebruikt Nederlandse statussen: `onderweg`, `gepland`, `aanvraag`, `geladen`, etc.

### Fout 2: Verkeerde kolomnaam `reference` (regel 46)
De trips tabel heeft geen `reference` kolom. De juiste kolom is `order_number`.

### Fout 3: `driver_documents` heeft geen `company_id` kolom (regel 113)
De `driver_documents` tabel heeft alleen `user_id`, geen `company_id`. De query `.eq("company_id", tenantId)` zal altijd een leeg resultaat geven. Fix: join via `profiles` tabel om documenten per tenant te filteren.

### Fout 4: `pickup_time_from` als timestamp behandeld (regel 49)
`pickup_time_from` is een time string (bijv. "09:00"), geen datetime. Voor vertragingsdetectie moet je `trip_date` combineren met `pickup_time_from`.

---

## Plan van Aanpak

| # | Fix | Bestand |
|---|-----|---------|
| 1 | Fix alle 4 fouten in proactive-alerts | `supabase/functions/proactive-alerts/index.ts` |

### Specifieke wijzigingen:

1. **Trip statussen**: `in_transit` → `onderweg`; `pending`/`confirmed` → `gepland`/`aanvraag`
2. **Kolomnaam**: `reference` → `order_number`
3. **Driver documents**: Verwijder `.eq("company_id", tenantId)`, gebruik een subquery via `profiles` tabel om `user_id`'s van de tenant op te halen
4. **Vertragingsdetectie**: Combineer `trip_date` met `pickup_time_from` voor correcte tijdsberekening; fallback naar `trip_date` als er geen `pickup_time_from` is

