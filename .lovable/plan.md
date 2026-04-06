
Doel: geen dubbel werk, maar de bestaande Scale-suite launch-ready maken door alleen de echte gaten te sluiten en de reeds gebouwde features end-to-end te harden.

Wat ik al heb bevestigd
- De suite is breed aanwezig in code: routes in `src/App.tsx`, navigatie in `AppSidebar`, uniforme shell via `DashboardLayout`, mobiele navigatie via `MobileBottomNav`.
- Meerdere launch-features zijn al echt gekoppeld aan database of backend-functies: o.a. `credit_notes`, `api_keys`, `company_locations`, `accounting_integrations`, `ecommerce_connections`, `smart-document-ocr`, POD/CMR documentgeneratie.
- Ik ga dus niet opnieuw Orders, POD, tracking, portals, WMS of andere stabiele modules herbouwen tenzij de audit daar een concreet defect vindt.

Kritieke gaten uit de code-inspectie
1. `supabase/functions/exact-oauth-start/index.ts`
- De OAuth callback bevat nog een token-exchange placeholder.
- Gevolg: Boekhouding Koppeling is UI-matig aanwezig, maar niet volledig end-to-end voor launch.

2. `supabase/functions/ecommerce-sync/index.ts`
- De sync zet nu “success” zonder echte provider-import.
- Gevolg: E-commerce Hub is momenteel vooral connectiebeheer, geen betrouwbare order-importflow.

3. `src/pages/admin/APIAccess.tsx`
- API key beheer is aanwezig, maar dit moet nog hard gekoppeld worden aan echte, tenant-veilige API-endpoints en usage logging als dat nog ontbreekt.
- Anders is “API Toegang” alleen beheer-UI.

4. `src/pages/finance/CreditNotes.tsx`
- De nullable factuurkeuze gebruikt een lege `SelectItem value=""`, wat een bekende breekplek is.
- Deze flow moet ook inhoudelijk worden gehard op validatie, joins en datumafhandeling.

5. `src/pages/admin/MultiLocation.tsx`
- CRUD voor vestigingen bestaat, maar multi-vestiging moet gecontroleerd worden op echte doorwerking in transportlogica: orders, ritten, planning, finance, WMS en filters.
- Anders is het alleen een losse adminlijst.

Uitvoeringsplan
Fase 1 — Auditmatrix zonder dubbel werk
- Per Scale-feature vastleggen: route, data-bron, mutatie, externe afhankelijkheid, launch-status.
- Alles wat al echt werkt blijft ongemoeid.
- Alleen features met “UI aanwezig maar businessflow incompleet” gaan door naar fix-fase.

Fase 2 — Launch blockers fixen
- Boekhouding Koppeling:
  - Exact OAuth volledig afmaken: callback, tokenopslag/verversing, foutstatus, reconnect-flow, sync-status terug naar UI/System Health.
  - Secrets controleren; zonder `EXACT_CLIENT_ID` en `EXACT_CLIENT_SECRET` kan deze feature niet echt worden afgetest.
- E-commerce:
  - De huidige connectieflow omzetten naar echte import/sync voor de bestaande launch-route, in plaats van alleen status-updates.
  - Sync-resultaten, fouten en herstartacties zichtbaar maken in de UI.
- API Toegang:
  - Verifiëren of er al echte API-routes zijn die `api_keys` gebruiken.
  - Als dat ontbreekt: minimale productiewaardige tenant-API toevoegen voor kernobjecten (orders/invoices/status), inclusief hashing-validatie, `last_used_at`, auditability en revoke/deactivate gedrag.
- Creditnota’s:
  - Lege select-waarde fixen.
  - Veilige nullable `invoice_id` afhandeling.
  - Klant/factuur-lookup en datumweergave harden.
  - Eventueel lijstquery verbeteren zodat er minder losse lookups nodig zijn.
- Multi-vestiging:
  - Controleren waar locatie nog niet doorwerkt.
  - Alleen de missende koppelingen toevoegen die voor launch nodig zijn: default vestiging, filtering, en toewijzing in operationele records.

Fase 3 — Elite polish op bestaande features
- Knoppenaudit:
  - Alle primaire businessknoppen nalopen op echte actie: navigatie, mutatie, download, sync, retry of documentgeneratie.
  - Toast-only herstelknoppen verwijderen of omzetten naar echte backend-acties.
- Responsive audit:
  - Kritieke schermen nalopen op 390px, tablet en desktop.
  - Fixes op overflow, tabel-scroll, dialog/sheet-hoogtes, sticky headers, bottom-nav overlap, safe-area padding en touch targets.
- Performance/hardening:
  - Overbodige `select("*")` terugbrengen op zware lijstpagina’s.
  - Query’s strakker maken voor counts/lists/detail.
  - Edge cases afvangen voor lege staten, null-datums, foutstatussen en tenant-scoping.

Fase 4 — End-to-end validatie
- Per domein een echte launch-check:
  - Orderbeheer / POD / CMR / tracking
  - Finance / debiteuren / inkoop / creditnota’s / cashflow / bank
  - Planning / AI dispatch / route-optimalisatie
  - Portals / push / chat / netwerk
  - WMS / e-commerce / API / boekhouding / white-label
- Voor elke feature minimaal:
  - route opent
  - data laadt
  - primaire CTA werkt
  - foutpad is netjes
  - mobiel en desktop renderen correct

Technische aanpak
- Bestaande architectuur hergebruiken:
  - `DashboardLayout`
  - React Query patterns
  - bestaande tabellen (`credit_notes`, `api_keys`, `company_locations`, `accounting_integrations`, `ecommerce_connections`)
  - bestaande backend-functies (`smart-document-ocr`, `generate-pod-pdf`, `generate-document-pdf`, `exact-oauth-start`, `ecommerce-sync`)
- Geen edits aan auto-generated backend client/types.
- Als schema-uitbreidingen nodig zijn, alleen via migraties.
- Tenant/RLS-consistentie bewaken: `company_id` vs `tenant_id` niet laten ontsporen.
- Admin/features die backend-secrets nodig hebben pas echt end-to-end afvinken als die secrets aanwezig zijn.

Wat ik expliciet niet opnieuw ga bouwen
- Geen herbouw van reeds stabiele order-, tracking-, portal-, WMS- of layoutmodules zonder concreet defect.
- Geen brede provider-uitbreiding “voor alles en iedereen” als de huidige launchflow al bestaat; eerst de bestaande flow productierijp maken.
- Geen cosmetische redesigns zonder functionele of launch-impact.

Launch-eindresultaat
- Een opgeschoonde auditmatrix per Scale-feature: “werkt”, “gedeeltelijk”, of “gefixt”.
- Alleen echte launch-gaten aangepakt.
- Alle kritieke flows functioneel, tenant-veilig, mobiel/desktop strak en zonder bekende placeholder-logica.
- Heldere resterende blockers alleen waar externe secrets of provider-keuzes dat echt vereisen.
