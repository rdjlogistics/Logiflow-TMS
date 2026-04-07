# Memory: features/planning/ai-dispatch-logic-nl
Updated: 2026-04-07

De auto-dispatch is **altijd aan** en werkt 100% automatisch zonder review stap:

1. **Database trigger** (`trg_auto_dispatch_new_trip`): Bij elke INSERT op `trips` waar `driver_id IS NULL` wordt de `ai-dispatch-engine` edge function automatisch aangeroepen via `net.http_post` met service_role key.

2. **Edge function** (`ai-dispatch-engine`): Het `auto_assign` action-pad haalt de trip op, scoort alle actieve chauffeurs (rating, locatie-match, werkdruk), en wijst de top-chauffeur **direct** toe (`driver_id` + `status = 'gepland'`). Geen conversatie, geen review, geen bevestiging.

3. **Scoring**: `scoreDriver()` beoordeelt op rating (25pt), stad-match (20pt), voertuigtype (10pt) en actieve-ritten penalty (-10pt/rit, max -30pt).

4. **Logging**: Elke automatische toewijzing wordt gelogd in `auto_dispatch_logs` met score, reasoning en kandidaten-lijst.

5. **UI**: `AIAutoDispatchPanel` batch-knop wijst direct toe zonder preview. `DispatchAutomationConfig` defaults: `is_active=true`, `min_confidence=0`, `double_check=false`.

6. **Fallback**: Als er geen actieve chauffeurs zijn, wordt er niet toegewezen en gelogd.
