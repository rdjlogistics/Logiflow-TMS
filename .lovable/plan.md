

# Auto-Dispatch Altijd Aan — Zonder Review Stap

## Huidige Situatie

Nu werkt dispatch in 3 handmatige stappen:
1. Gebruiker selecteert een rit in de UI
2. AI analyseert chauffeurs en toont kandidaten
3. Gebruiker klikt "Toewijzen" of "Bevestig Alle"

Er is al een database trigger (`trg_workflow_trip_events`) die bij elke nieuwe trip `execute-workflow` aanroept met `trigger_type = 'order_created'` — maar die roept **niet** de dispatch engine aan.

## Wat er moet gebeuren

### Stap 1: Database trigger voor automatische dispatch

Maak een nieuwe trigger functie `trigger_auto_dispatch_on_new_trip()` die bij elke INSERT op `trips` (waar `driver_id IS NULL`) de `ai-dispatch-engine` edge function aanroept met `action: "auto_assign"`.

```sql
CREATE OR REPLACE FUNCTION public.trigger_auto_dispatch_on_new_trip()
RETURNS trigger AS $$
BEGIN
  IF NEW.driver_id IS NULL AND NEW.company_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://spycblsfcktsnepsdssv.supabase.co/functions/v1/ai-dispatch-engine',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_KEY"}'::jsonb,
      body := jsonb_build_object(
        'action', 'auto_assign',
        'tripId', NEW.id,
        'tenantId', NEW.company_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Stap 2: Nieuwe `auto_assign` action in `ai-dispatch-engine`

Voeg een nieuw action-pad toe dat:
1. Trip ophaalt
2. Drivers scoort (bestaande `scoreDriver` functie)
3. De top-chauffeur **direct toewijst** (`trips.driver_id = top.id, status = 'gepland'`) — geen conversatie, geen review
4. Logt in `auto_dispatch_logs`

Dit pad accepteert service-role auth (voor de trigger) naast user JWT.

### Stap 3: Config defaults aanpassen

In `DispatchAutomationConfig.tsx`:
- `is_active` default → `true`
- `min_confidence_auto_assign` default → `0` (altijd toewijzen)
- `double_check_enabled` default → `false`

### Stap 4: UI vereenvoudigen

In `AIAutoDispatchPanel.tsx`:
- Verwijder de handmatige "Bevestig" stap uit batch assign — direct toewijzen
- Toon een "Auto-dispatch is actief" status banner
- Batch-knop wijst direct toe zonder preview/bevestiging

### Stap 5: Memory bijwerken

Update `.lovable/memory/features/planning/ai-dispatch-logic-nl.md` met de nieuwe always-on logica.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/ai-dispatch-engine/index.ts` | Nieuw `auto_assign` action pad met service-role auth |
| Database migratie | Nieuwe trigger `trg_auto_dispatch_new_trip` |
| `src/components/dispatch/DispatchAutomationConfig.tsx` | Defaults naar always-on |
| `src/components/dispatch/AIAutoDispatchPanel.tsx` | Direct toewijzen zonder bevestiging |
| `.lovable/memory/` | Update dispatch memory |

## Resultaat

Elke nieuwe order/trip zonder chauffeur wordt **automatisch** door AI gescored en de beste chauffeur wordt **direct** toegewezen. Geen klikken, geen review, geen wachten.

