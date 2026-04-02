

# Kritische Audit: Resterende waterdichte fixes

## Analyse

Na grondige audit van alle pagina's in `src/pages/` zijn de volgende resterende problemen gevonden:

| # | Module | Probleem | Ernst |
|---|--------|----------|-------|
| 1 | **What-If Simulation** | 100% nep — `setTimeout` loop simuleert progressie, resultaten zijn hardcoded formules op slider-waarden, geen echte data | Midden |
| 2 | **AccountingIntegrations** | `syncNow` gebruikt `setTimeout(2000)` om sync_status naar 'success' te zetten — geen echte sync | Midden |
| 3 | **Messenger** | Heeft een 5-seconden fallback `setTimeout` die `loading` op false zet zelfs als fetch nog loopt — race condition | Laag |
| 4 | **B2C Portal** | `handleNotificationsClick` toont nog steeds `toast.info` in plaats van navigatie | Laag |

## Wat al waterdicht IS (geen actie nodig)
- Tender Templates → DB ✅
- Customs/NCTS → DB ✅  
- Notification Channels → DB laden ✅
- AI Recommendations → echte navigatie ✅
- DataQuality → setTimeout verwijderd ✅
- DossierVault → echte upload ✅
- EDI → echte retry ✅
- Telematics → DB persistentie ✅
- FuelIndex → echte update ✅
- Alle edge function aanroepen → werken correct ✅
- Alle CRUD operaties → DB-backed ✅

## Fixes

### 1. What-If Simulation — Echte data-driven berekeningen
**Bestand: `src/pages/ai/WhatIfSimulation.tsx`**
- Vervang `setTimeout` progressie-loop door directe berekening
- Haal echte data op: aantal ritten, gemiddelde omzet, vlootgrootte, bezettingsgraad uit `trips` en `vehicles` tabellen
- Bereken impact op basis van echte getallen × slider-percentages
- Resultaat: "Als je vloot +20% groeit → je kunt X extra ritten/maand aan, verwachte omzetimpact: €Y"

### 2. AccountingIntegrations — Sync feedback verbeteren  
**Bestand: `src/pages/admin/AccountingIntegrations.tsx`**
- Vervang `setTimeout(2000)` door een polling-mechanisme dat de echte `sync_status` checkt na de update
- Of: verwijder de fake success en laat de gebruiker refreshen (eerlijker)
- De sync zelf kan pas echt werken als Exact Online secrets geconfigureerd zijn — toon dit duidelijk

### 3. Messenger — Race condition fixen
**Bestand: `src/pages/Messenger.tsx`**  
- Verwijder de 5-seconden `setTimeout` fallback — de `fetchTrips` functie zet loading al correct op false
- Het timeout is overbodig en kan loading-state problemen veroorzaken

### 4. B2C Portal — Notificaties navigatie
**Bestand: `src/pages/portal/B2CPortal.tsx`**
- Vervang `toast.info("Notificaties")` door navigatie naar zendingenoverzicht

## Niet geraakt
- What-If Simulation is een planning/analyse tool — lokale berekeningen zijn acceptabel, maar moeten op echte data gebaseerd zijn
- Messenger `setTimeout` is een minor issue maar kan bugs veroorzaken
- Desktop layouts — geen wijzigingen

## Volgorde
1. What-If Simulation → echte data + directe berekening
2. AccountingIntegrations → verwijder fake sync success
3. Messenger → verwijder race condition
4. B2C Portal → notificatie navigatie

