

# Fix: Copilot Edge Function — Broken Database Queries + Complexity Patterns

## Probleem

De `copilot` edge function (`supabase/functions/copilot/index.ts`) heeft **exact dezelfde foute database queries** die eerder in `chatgpt/index.ts` zijn gefixt. Alle tool-calls falen omdat:

- `from("orders")` → tabel bestaat niet, moet `from("trips")` zijn
- `company_id` op drivers → moet `tenant_id` zijn
- `is_active` op drivers → bestaat niet, moet `.is("deleted_at", null)` zijn
- `city` op drivers → moet `current_city` zijn
- `total_amount` / `purchase_amount` → moet `sales_total` / `purchase_total` zijn
- `pickup_date` → moet `trip_date` zijn
- `reference` → moet `customer_reference` zijn
- Invoice statussen `"overdue"/"pending"/"paid"` → moet `"vervallen"/"concept"/"betaald"` zijn
- Order statussen `"draft"/"pending"/"confirmed"` → moet `"aanvraag"/"gepland"/"geladen"` zijn

Daarnaast heeft de copilot slechts 2 complexiteitsniveaus (low/medium) terwijl chatgpt er 4 heeft met veel meer patterns.

## Plan

### 1. Fix alle tool queries in copilot/index.ts

**`search_orders`**: `from("trips")`, `company_id` → `company_id` (trips tabel), `pickup_date` → `trip_date`, `total_amount` → `sales_total`, `reference` → `customer_reference`, status enums naar NL

**`get_kpis`**: `from("trips")` + correcte kolommen, invoices `company_id` → `tenant_id`, `"overdue"` → `"vervallen"`

**`daily_briefing`**: `from("trips")`, `pickup_date` → `trip_date`, status enums NL, invoices `"overdue"` → `"vervallen"`

**`route_suggest`**: `from("trips")`, drivers `company_id` → `tenant_id`, `is_active` → `deleted_at is null`, `city` → `current_city`, status enums NL

**`invoice_status`**: `company_id` → `tenant_id`, `"overdue"/"pending"/"paid"` → `"vervallen"/"concept"/"betaald"`

**`list_drivers`**: `company_id` → `tenant_id`, `is_active` → `.is("deleted_at", null)`, `city` → `current_city`

### 2. Update tool-definities (status enums)

- `search_orders` status enum: `["aanvraag","gepland","geladen","onderweg","afgeleverd","afgerond","gecontroleerd","gefactureerd","geannuleerd"]`
- `invoice_status` status_filter enum: `["all","concept","verzonden","betaald","vervallen"]`

### 3. Uitbreiden complexity detection

Voeg "high" niveau toe en kopieer de uitgebreide patterns uit chatgpt:
- **HIGH** → `gemini-2.5-pro`: forecast, prognose, trend, optimaliseer, strategie, etc.
- **MEDIUM** → `gemini-3-flash-preview`: advies, ranking, samenvatting, vergelijk, etc.
- **LOW** → `gemini-2.5-flash`: hoeveel, lijst, toon, status, zoek, etc.
- **NONE** → `gemini-2.5-flash-lite` (huidige default)

### 4. Model selection updaten

`getModelForComplexity` toevoegen met 4 niveaus ipv inline ternary.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit (groot)** | `supabase/functions/copilot/index.ts` — alle queries fixen + complexity patterns uitbreiden |

## Verwacht resultaat

- Copilot tools halen daadwerkelijk data op uit de database
- Model routing logt correct in edge function logs
- Complexe vragen gaan naar gemini-2.5-pro, simpele naar flash-lite

