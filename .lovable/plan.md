

# Volledige App Audit — Bevindingen & Fixes

## Methode

Alle edge functions, hooks, en frontend invocaties zijn doorgelopen op ontbrekende functies, crash-risico's en niet-werkende knoppen.

---

## Kritiek: Ontbrekende Edge Function

### Bug 1: `proactive-alerts` edge function bestaat niet
**Bestanden**: `src/hooks/useProactiveAlerts.ts` → gebruikt door `SmartAIDashboard.tsx` en `ProactiveAlertsWidget.tsx`
**Probleem**: De hook roept `supabase.functions.invoke('proactive-alerts')` aan, maar er is geen `supabase/functions/proactive-alerts/` directory. Dit crasht silently bij het laden van het Smart AI Dashboard en de Proactieve Alerts widget — `data.alerts` wordt `undefined` waarna de `.filter()` op regel 77 crasht.
**Fix**: Maak een `proactive-alerts` edge function die op basis van real-time trips/invoices/drivers data proactieve waarschuwingen genereert (vertraagde ritten, verlopen documenten, overdue facturen).

---

## Eerder Gefixte Items (Verificatie ✅)

- ✅ `voice-assistant` edge function: aangemaakt en werkend
- ✅ `smart-ai`: bestaat en werkt voor chat + suggestions
- ✅ `intelligent-dispatch`: bestaat en werkt
- ✅ `execute-workflow`: send_email, log_event, customer enrichment — allemaal correct
- ✅ `DataQuality.tsx`: dynamisch count i.p.v. hardcoded "3"
- ✅ `MomentsEngine.tsx`: toont werkelijk aantal moments
- ✅ `B2CSecuritySheet.tsx`: 2FA disabled met "Binnenkort" badge
- ✅ `RouteOptimization.tsx`: knoppen met "(binnenkort)" label
- ✅ Demo data verwijderd uit 12 bestanden
- ✅ Alle overige aangeroepen edge functions bestaan in `supabase/functions/`

---

## Middelmatig: Voice Assistant audio format issue

### Bug 2: Voice Assistant stuurt WebM maar claimt WAV
**Bestand**: `src/components/intelligence/VoiceAssistant.tsx` regel 160 + `supabase/functions/voice-assistant/index.ts` regel 49
**Probleem**: De browser `MediaRecorder` neemt op als `audio/webm`. De edge function stuurt het naar Gemini met `format: "wav"`. Dit mismatch kan leiden tot transcriptiefouten.
**Fix**: Wijzig het format in de edge function naar `"webm"` of gebruik de correcte mime type.

---

## Plan van Aanpak

| # | Fix | Bestand | Ernst |
|---|-----|---------|-------|
| 1 | Maak `proactive-alerts` edge function | Nieuw: `supabase/functions/proactive-alerts/index.ts` | Kritiek |
| 2 | Fix audio format mismatch (webm, niet wav) | `supabase/functions/voice-assistant/index.ts` | Middel |

### Details Bug 1: `proactive-alerts` Edge Function

De functie analyseert real-time bedrijfsdata en genereert waarschuwingen:
- **Vertraagde ritten**: Ritten met status "onderweg" waar `pickup_time_from` > 30 min geleden
- **Verlopen documenten**: Drivers/vehicles met documenten die binnen 14 dagen verlopen
- **Overdue facturen**: Onbetaalde facturen ouder dan 14 dagen
- **Capaciteitswaarschuwingen**: Te weinig beschikbare chauffeurs vs geplande ritten

De functie retourneert `{ alerts: ProactiveAlert[] }` conform de bestaande interface in `useProactiveAlerts.ts`.

---

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Nieuw** | `supabase/functions/proactive-alerts/index.ts` |
| **Edit** | `supabase/functions/voice-assistant/index.ts` |

