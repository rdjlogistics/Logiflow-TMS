

# Audit & Fix: Non-functionele knoppen in de app

## Gevonden problemen

Na een grondige audit van alle pagina's zijn deze knoppen/features gevonden die **niet echt werken** — ze tonen alleen een toast of gebruiken mock data:

| # | Pagina | Probleem | Ernst |
|---|--------|----------|-------|
| 1 | **DossierVault** (CRM) | Upload knop toont alleen toast "geüpload ✓" maar slaat bestand NIET op in storage/database | Hoog |
| 2 | **B2C Portal** | Notificatie-teller hardcoded op `2`, klik toont alleen toast | Midden |
| 3 | **B2B Portal** | Notificatie-klik toont onnodige toast vóór navigatie naar cases | Laag |
| 4 | **FuelIndexUpdateDialog** (Tariefbeheer) | `onUpdate` callback wordt niet meegegeven — brandstofindex wordt nooit opgeslagen | Hoog |
| 5 | **EDI Integratie** | Retry knop is nep — `setTimeout` simuleert succes | Midden |
| 6 | **Telematics Integratie** | Connecties worden alleen in lokale state opgeslagen, niet in database | Midden |
| 7 | **SystemHealth** | Webhook "Retry Now" knop toont alleen toast | Laag |

## Fixes

### 1. DossierVault — Echte upload naar Storage
**Bestand: `src/pages/crm/DossierVault.tsx`**
- Upload bestand naar Supabase Storage bucket `dossier-documents`
- Insert record in `dossier_documents` tabel met `file_url`, `account_id`, `doc_type`, `tenant_id`
- Verwijder `// For demo purposes` comment

**Database: Storage bucket aanmaken**
- Maak `dossier-documents` storage bucket aan (private)
- RLS policy: alleen eigen tenant kan lezen/schrijven

### 2. B2C Portal — Echte notificatie-telling
**Bestand: `src/pages/portal/B2CPortal.tsx`**
- Vervang `useState(2)` door echte telling op basis van recente shipment status updates
- Notificatie-klik navigeert naar zendingenoverzicht i.p.v. toast

### 3. B2B Portal — Verwijder onnodige toast
**Bestand: `src/pages/portal/B2BPortal.tsx`**
- Verwijder `toast.info()` call, behoud alleen `navigate("/portal/b2b/cases")`

### 4. FuelIndexUpdateDialog — Brandstofindex opslaan
**Bestand: `src/pages/RateManagement.tsx`**
- Voeg `onUpdate` callback toe die de nieuwe index opslaat in `surcharge_rules` of `tenant_settings`
- De dialog component zelf is al correct gebouwd, alleen de aanroep mist de callback

### 5. EDI Integratie — Echte retry via database
**Bestand: `src/pages/integrations/EDIIntegration.tsx`**
- De EDI pagina werkt al met een `edi_messages` tabel
- Retry: update message status in database naar `pending`, dan herverwerk
- Vervang `setTimeout` mock door echte database update

### 6. Telematics — Connecties opslaan in database
**Bestand: `src/pages/integrations/TelematicsIntegration.tsx`**
- Sla provider-connecties op in een `telematics_connections` tabel (of hergebruik bestaande integratie-tabel)
- Laad connecties bij pagina-load

**Database migratie**: `telematics_connections` tabel aanmaken

### 7. SystemHealth — Webhook retry verbeteren
**Bestand: `src/pages/enterprise/SystemHealth.tsx`**
- Dit is een monitoring pagina met hardcoded demo data — geen echte webhook tabel
- Fix: verander toast naar een duidelijke melding dat de functie vereist dat de integratie eerst actief geconfigureerd is, of verberg de retry knop als er geen echte webhook data is

## Niet geraakt
- Alle export/download/print functies — deze werken al correct
- Alle clipboard copy functies — werken al
- Alle edge function aanroepen — werken al
- Desktop layouts — geen wijzigingen

## Volgorde
1. Database migratie (storage bucket + telematics tabel)
2. DossierVault echte upload (hoogste prioriteit)
3. FuelIndexUpdateDialog callback
4. B2C/B2B Portal notificaties
5. EDI retry
6. Telematics persistentie
7. SystemHealth toast verbetering

