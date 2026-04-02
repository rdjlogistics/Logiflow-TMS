

# Kritische Audit: Non-functionele modules waterdicht maken

## Gevonden problemen

Na een grondige audit van alle pagina's zijn er **5 modules** gevonden die database-tabellen hebben maar puur op lokale state draaien — data gaat verloren bij pagina-refresh:

| # | Pagina | Probleem | DB tabel beschikbaar | Ernst |
|---|--------|----------|---------------------|-------|
| 1 | **Tender Templates** | CRUD alleen in `useState` met hardcoded data | `tender_templates` ✅ | Hoog |
| 2 | **Customs/NCTS** | Aangiftes alleen in lokale state, submit is nep `setTimeout` | `customs_declarations` ✅ | Hoog |
| 3 | **Notification Channels** | Kanalen en templates starten leeg (`useState([])`), worden niet geladen uit DB | `notification_channels` + `notification_logs` ✅ | Hoog |
| 4 | **AI Recommendations** | "Actie uitvoeren", "Taak aanmaken", "Automation maken" — alles `setTimeout` + toast | Geen echte actie | Midden |
| 5 | **What-If Simulation** | Simulatie is puur cosmetisch — lokale state met fake progress | Geen DB tabel | Laag |

## Fixes (3 kritische, 2 verbeteringen)

### 1. Tender Templates — Volledig naar database
**Bestand: `src/pages/tendering/TenderTemplates.tsx`**
- Vervang `useState(initialTemplates)` door `useQuery` die `tender_templates` ophaalt
- CRUD operaties via `supabase.from('tender_templates').insert/update/delete`
- Voeg `company_id` toe bij insert (via `useCompany`)
- Verwijder hardcoded `initialTemplates` array

### 2. Customs/NCTS — Aangiftes opslaan in database
**Bestand: `src/pages/integrations/CustomsNCTS.tsx`**
- Vervang `useState(mockDeclarations)` door `useQuery` op `customs_declarations`
- `handleCreateDeclaration`: insert naar DB met `tenant_id`, `declaration_type`, `goods_description`, etc.
- `handleSubmitDeclaration`: update status in DB naar `submitted` + genereer MRN
- Laad bestaande aangiftes bij pagina-load

### 3. Notification Channels — Laden uit database
**Bestand: `src/pages/notifications/NotificationChannels.tsx`**
- Voeg `useQuery` toe die `notification_channels` + `notification_logs` ophaalt bij mount
- Map DB rows naar de bestaande `NotificationChannel[]` en `NotificationLog[]` interfaces
- `toggleChannel`: update `is_active` in DB (i.p.v. alleen lokale state)
- Bestaande `handleSaveTemplate` en `handleSaveChannel` upserts zijn al correct — alleen het laden ontbreekt

### 4. AI Recommendations — Acties koppelen aan workflows
**Bestand: `src/pages/enterprise/AIRecommendations.tsx`**
- `executeAction`: navigeer naar relevante pagina op basis van actie-type (bijv. route-planning, tariefbeheer)
- `createTask`: insert in een bestaande tabel of navigeer naar workflow-pagina
- `createAutomation`: navigeer naar `/admin/workflows` met pre-filled data
- Verwijder alle nep `setTimeout` patronen

### 5. DataQuality scan — Verwijder setTimeout
**Bestand: `src/pages/enterprise/DataQuality.tsx`**
- De `handleScan` functie wropt `refetch()` in een `setTimeout` — verwijder de timeout en await `refetch()` direct

## Niet geraakt
- FuelIndexUpdateDialog — al gefixt in vorige ronde ✅
- DossierVault upload — al gefixt ✅
- B2C/B2B Portal notificaties — al gefixt ✅
- EDI retry — al gefixt ✅
- Telematics persistentie — al gefixt ✅
- What-If Simulation — blijft client-side (is een planning tool, geen operationeel systeem)

## Volgorde
1. Tender Templates → DB (hoogste impact, tabel bestaat al)
2. Customs/NCTS → DB (tabel bestaat al)
3. Notification Channels → laden uit DB
4. AI Recommendations → echte navigatie-acties
5. DataQuality → verwijder setTimeout

