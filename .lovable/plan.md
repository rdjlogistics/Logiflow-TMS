

# Launch Audit — Missende Features & Fixes

## Bevindingen uit de code-inspectie

### 0 TypeScript errors — de codebase compileert schoon

### Kritieke missende navigatie (niet bereikbaar via sidebar)
Van de 36 Scale-features zijn deze **4 niet in de sidebar** terwijl ze wel routes/pagina's hebben:

1. **Bank Reconciliatie** — pagina bestaat (`/finance/bank`, 446 regels, met hooks), maar geen sidebar-link
2. **Marge Analyse** — **geen pagina, geen route** — alleen fragmenten in KPI/OrderOverview
3. **Kosten** — pagina bestaat (`/finance/costs`-achtig, met supabase hooks), maar geen sidebar-link en geen route in App.tsx
4. **White Label** — branding-settings zitten verspreid in AdminSettings en Auth, maar geen dedicated feature-pagina of sidebar-link

### Stub-pagina's (leeg, geen DashboardLayout)
- `Collections.tsx` — 14 regels placeholder, geen sidebar-link (niet launch-kritiek)
- `CreditDashboard.tsx` — 14 regels placeholder, geen sidebar-link (niet launch-kritiek)

### WhatsApp Chat
- Geen sidebar-link naar WhatsApp/Messenger specifiek als "WhatsApp Chat" — Messenger bestaat wel op `/messenger`

### Push Notificaties
- Edge function en subscription-logica bestaan, maar geen beheerpagina in sidebar

## Uitvoeringsplan

### Fase 1 — Sidebar navigatie completeren
**Bestand:** `src/components/layout/AppSidebar.tsx`

Toevoegen aan `financieelItems`:
- "Bank Reconciliatie" → `/finance/bank`
- "Marge Analyse" → `/finance/margin` (nieuw)
- "Kosten" → `/finance/costs` (route toevoegen)

### Fase 2 — Route registratie
**Bestand:** `src/App.tsx`

- Route `/finance/costs` toevoegen → `Costs` component (bestaat al)
- Route `/finance/margin` toevoegen → nieuw `MarginAnalysis` component

### Fase 3 — Marge Analyse pagina bouwen
**Nieuw bestand:** `src/pages/finance/MarginAnalysis.tsx`

Transportlogistiek marge-analyse dashboard:
- Omzet vs. kosten per order/klant/periode
- Marge% berekening uit bestaande `trips` (revenue/cost velden) en `invoices`
- Gebruik bestaande data — geen nieuwe tabellen nodig
- DashboardLayout wrapper

### Fase 4 — Kosten route fixen
**Bestand:** `src/App.tsx`

- De `Costs` pagina bestaat al (190 regels, met supabase hooks via `useFinanceTransactions`)
- Alleen route-registratie + sidebar-link ontbreekt

### Fase 5 — White Label als admin-feature zichtbaar maken
White Label branding zit al in `AdminSettings` en de `company_branding` tabel. Alleen een duidelijke sidebar-link toevoegen naar `/admin/settings` met label "White Label / Branding" in de beheer-sectie.

## Wat NIET verandert
- Alle 122 bestaande routes — ongemoeid
- Bestaande edge functions — ongemoeid
- Database schema — geen migraties nodig
- Collections/CreditDashboard stubs — niet in sidebar, niet launch-kritiek

## Resultaat
- Alle 36 Scale-features bereikbaar via sidebar
- Marge Analyse als nieuw dashboard met live data uit trips/invoices
- Bank Reconciliatie en Kosten nu ontdekbaar
- White Label branding herkenbaar in navigatie

