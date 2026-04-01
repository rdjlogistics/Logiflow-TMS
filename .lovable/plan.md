

# Volledige App Audit — Bevindingen & Verbeteringen

## Methode

Alle edge functions, database triggers, frontend pagina's, chauffeursportaal en knoppen zijn grondig doorgelopen. Hieronder alle gevonden issues.

---

## Kritiek: Ontbrekende Edge Function

### Bug 1: `voice-assistant` edge function bestaat niet
**Bestand**: `src/components/intelligence/VoiceAssistant.tsx` regel 170
**Probleem**: De VoiceAssistant component roept `supabase.functions.invoke('voice-assistant')` aan, maar de edge function `supabase/functions/voice-assistant/` bestaat niet. Klikken op de "Spraak" knop in de Intelligence Hub of Smart AI Dashboard crasht met een functie-error.
**Fix**: Maak een `voice-assistant` edge function aan die audio transcribeert via een AI model, OF vervang de hele spraakfunctionaliteit door een duidelijke "binnenkort beschikbaar" melding en disable de knop.

---

## Eerder Gefixte Items (Verificatie ✅)

De volgende zaken uit de vorige audit zijn correct geïmplementeerd:
- ✅ `execute-workflow`: send_email via Resend (niet meer verkeerde RPC)
- ✅ `execute-workflow`: delay_minutes wordt geskipt (geen crash meer)
- ✅ `execute-workflow`: log_event case aanwezig
- ✅ `execute-workflow`: customer data enrichment werkt
- ✅ `check-overdue-invoices`: threshold-specifieke deduplicatie werkt
- ✅ `create-batch-purchase-invoices`: dynamische BTW-logica aanwezig
- ✅ Demo data verwijderd uit 12 bestanden (lege arrays)

---

## Middelmatige Issues

### Issue 2: DataQuality scan simuleert resultaten
**Bestand**: `src/pages/enterprise/DataQuality.tsx` regel 33-43
**Probleem**: De "Scan starten" knop gebruikt `setTimeout(2000)` en toont altijd "3 potentiële duplicaten gevonden" ongeacht het werkelijke resultaat. Na de demo-data cleanup toont dit nu misleidende aantallen.
**Fix**: Na de timeout, gebruik `duplicates?.length || 0` in plaats van hardcoded `3`.

### Issue 3: MomentsEngine scan is volledig nep
**Bestand**: `src/pages/crm/MomentsEngine.tsx` regels 72-81
**Probleem**: De "Events scannen" knop doet alleen een `setTimeout(1500)` en toont een succesmelding zonder daadwerkelijk iets te scannen.
**Fix**: Toon een duidelijke "Scan wordt binnenkort beschikbaar" melding, of verbind met echte data.

### Issue 4: B2C 2FA toggle doet niets
**Bestand**: `src/components/portal/b2c/B2CSecuritySheet.tsx` regels 70-74
**Probleem**: De 2FA Switch toont een toast maar wisselt niet — verwarrend voor gebruikers.
**Fix**: Disable de Switch visueel en toon "(binnenkort)" label, zodat gebruikers niet verwachten dat het werkt.

---

## Kleine Verbeteringen

### Verbetering 5: RouteOptimization knoppen zijn disabled zonder uitleg
**Bestand**: `src/pages/RouteOptimization.tsx` regels 1442-1536
**Probleem**: "Route opslaan" en "Chauffeur toewijzen" knoppen zijn `disabled={true}` met alleen een title tooltip die mobiel niet zichtbaar is.
**Fix**: Voeg een klein `(binnenkort)` label toe aan de knoptekst.

### Verbetering 6: EditZoneDialog geo-polygon placeholder
**Bestand**: `src/components/pricing/EditZoneDialog.tsx` regel 294
**Probleem**: Toont "Geo-polygon editor komt binnenkort beschikbaar" in een kale div.
**Status**: Acceptabel — geen crash, duidelijke communicatie.

---

## Plan van Aanpak

| # | Fix | Bestand | Ernst |
|---|-----|---------|-------|
| 1 | Maak `voice-assistant` edge function OF disable de knop | Nieuw: `supabase/functions/voice-assistant/index.ts` OF edit `VoiceAssistant.tsx` | Kritiek |
| 2 | Fix hardcoded "3" in scan resultaat | `src/pages/enterprise/DataQuality.tsx` | Middel |
| 3 | Fix nep-scan in MomentsEngine | `src/pages/crm/MomentsEngine.tsx` | Middel |
| 4 | Disable 2FA switch visueel | `src/components/portal/b2c/B2CSecuritySheet.tsx` | Klein |
| 5 | Disabled knoppen label verbeteren | `src/pages/RouteOptimization.tsx` | Klein |

## Aanpak

Gezien de impact pakken we dit in volgorde van ernst:
1. **voice-assistant**: Maak een werkende edge function die via Lovable AI (Gemini) audio transcribeert en vragen beantwoordt
2. **DataQuality + MomentsEngine**: Fix misleidende scan-knoppen
3. **UI polish**: Disabled states verduidelijken

