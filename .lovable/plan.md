

# Fix: AI Assistent kan geen data ophalen — verkeerde tabelnamen en kolommen

## Root Cause

De `chatgpt` edge function bevat **134+ queries naar een tabel genaamd `orders` die niet bestaat**. De echte tabel heet `trips`. Daarnaast worden verkeerde kolomnamen en status-waarden gebruikt door de hele functie heen.

Dit is waarom elke tool-aanroep (search_orders, list_drivers, get_kpis, etc.) een database-fout retourneert en de AI meldt "technische storing bij het ophalen".

## Concrete mapping-fouten

| Wat de code nu doet | Wat het moet zijn |
|---|---|
| `from("orders")` | `from("trips")` |
| `.eq("company_id", tenantId)` op drivers | `.eq("tenant_id", tenantId)` |
| `.eq("is_active", true)` op drivers | `.is("deleted_at", null)` (geen `is_active` kolom) |
| `drivers.city` | `drivers.current_city` |
| `vehicles.plate_number` | `vehicles.license_plate` |
| `vehicles.type`, `vehicles.make`, `vehicles.year` | `vehicles.vehicle_type`, `vehicles.brand`, `vehicles.year_of_manufacture` |
| `orders.total_amount` | `trips.sales_total` |
| `orders.purchase_amount` | `trips.purchase_total` |
| `orders.pickup_date` | `trips.trip_date` |
| `orders.delivery_date` | `trips.estimated_arrival` |
| `orders.reference` | `trips.customer_reference` |
| Status: `draft, pending, confirmed, in_transit, delivered, cancelled` | Status: `aanvraag, gepland, geladen, onderweg, afgeleverd, afgerond, gecontroleerd, gefactureerd, geannuleerd, offerte, draft` |
| `from("order_stops")` | `from("route_stops")` |
| `from("order_events")` | `from("order_events")` (checken of deze tabel bestaat) |
| `invoices.company_id` | `invoices.tenant_id` |
| `invoices.status = "pending"/"overdue"/"paid"` | `invoices.status = "concept"/"verzonden"/"betaald"/"vervallen"` |
| `customers.company_id` | `customers.tenant_id` |
| `finance_transactions.company_id` | `finance_transactions.company_id` (bevestigen) |

## Wat er moet gebeuren

### 1. Volledige herschrijving van `executeTool()` in `chatgpt/index.ts`

Elke tool-case moet worden herschreven met de correcte tabel- en kolomnamen:

**search_orders**: `from("trips")` met `.eq("company_id", tenantId)`, select `sales_total` ipv `total_amount`, `trip_date` ipv `pickup_date`, `customer_reference` ipv `reference`

**list_drivers**: `from("drivers")` met `.eq("tenant_id", tenantId)` en `.is("deleted_at", null)` ipv `.eq("is_active", true)`, `current_city` ipv `city`

**get_kpis**: Alle `from("orders")` → `from("trips")`, `total_amount` → `sales_total`, `purchase_amount` → `purchase_total`. Invoices: `company_id` → `tenant_id`, statussen naar NL.

**explain_order**: `from("orders")` → `from("trips")`, `order_stops` → `route_stops`, `order_events` checken

**assign_driver_to_order, update_order_status, create_invoice_for_order, bulk_update_orders, create_claim_case**: Allemaal `from("orders")` → `from("trips")`, kolommen mappen

**fleet_overview**: `vehicles.plate_number` → `license_plate`, `make` → `brand`, `year` → `year_of_manufacture`

**route_suggest, daily_briefing, generate_report, margin_analysis, cashflow_forecast, customer_analysis, driver_performance, invoice_status, compare_periods, generate_chart, smart_planning, anomaly_detect**: Allemaal dezelfde mapping

### 2. Status enum mapping

Tool-definities bovenaan moeten ook de Nederlandse statussen gebruiken:

```
"aanvraag" | "gepland" | "geladen" | "onderweg" | "afgeleverd" | "afgerond" | "gecontroleerd" | "gefactureerd" | "geannuleerd" | "offerte" | "draft"
```

ipv

```
"draft" | "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled"
```

### 3. Invoice status mapping

`"concept" | "verzonden" | "betaald" | "vervallen" | "gedeeltelijk_betaald"` ipv `"pending" | "overdue" | "paid" | "draft"`

## Omvang

Dit is een grote wijziging in één bestand: `supabase/functions/chatgpt/index.ts`. Ongeveer 30+ queries moeten worden herschreven. De tool-definities (TMS_TOOLS array bovenaan) moeten ook de correcte status-enums bevatten.

## Bestanden

| Actie | Bestand |
|---|---|
| **Edit (groot)** | `supabase/functions/chatgpt/index.ts` — alle 30+ queries herschrijven naar correcte tabellen/kolommen/statussen |

## Verwacht resultaat

Na deze fix:
- AI kan orders ophalen, chauffeurs tonen, KPIs berekenen
- Alle tool-calls werken tegen de echte database
- Credits worden alleen afgeschreven bij succesvolle data-ophalingen
- De modellen (Gemini 2.5 Pro, Gemini 3 Flash, etc.) werken al correct — het probleem zat puur in de database queries

