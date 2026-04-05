

# Grondige Code Audit — Stale References & Nieuwe Routes

## Gevonden Problemen (4 bestanden)

### 1. CommandPalette — 3 dode routes
**Bestand:** `src/components/command-palette/CommandPalette.tsx`
- Regel 81: `/trips` navigatie → wijzigen naar `/orders`
- Regel 87: `/payments` navigatie → wijzigen naar `/finance/cashflow` met label "Cashflow"
- Regel 96: `/trips` in actie "Nieuwe Rit" → wijzigen naar `/orders`
- Toevoegen: Diesel Staffels (`/finance/diesel`) en Offertes (`/sales/quotes`) als navigatie-items

### 2. Breadcrumbs — dode + ontbrekende labels
**Bestand:** `src/components/navigation/Breadcrumbs.tsx`
- Verwijder: `'payments': 'Betalingen'` (regel 20)
- Verwijder: `'trips': 'Ritten'` (regel 16) — redirect naar orders
- Toevoegen: `'diesel': 'Diesel Staffels'`, `'quotes': 'Offertes'`, `'sales': 'Sales'`, `'cashflow': 'Cashflow'`

### 3. useRecentPages — dode + ontbrekende routes
**Bestand:** `src/hooks/useRecentPages.ts`
- Verwijder: `'/payments': 'Betalingen'` (regel 21)
- Toevoegen: `'/finance/diesel': 'Diesel Staffels'`, `'/sales/quotes': 'Offertes'`, `'/finance/cashflow': 'Cashflow'`

### 4. PageHeader — dode label
**Bestand:** `src/components/common/PageHeader.tsx`
- Verwijder: `'payments': 'Betalingen'` (regel 30)
- Toevoegen: `'diesel': 'Diesel Staffels'`, `'quotes': 'Offertes'`, `'cashflow': 'Cashflow'`, `'sales': 'Sales'`

## Niet-kritiek (bewust behouden)

- **Dashboard links naar `/trips?filter=...`** — Deze werken correct via de redirect (`/trips` → `/orders`). Query params gaan mee. Geen actie nodig.
- **`useTripsData.ts`**, services, en componenten die `trips` DB-tabel gebruiken — Dit zijn database queries, niet routes. De tabel heet nog steeds `trips`. Correct.
- **Mollie edge functions** — Gebruiken `api.mollie.com/v2/payments` (externe API). Geen relatie met onze `/payments` route.

## Technische Details

```text
Bestanden:    4
Type:         Label cleanup + nieuwe route registratie
Risico:       Minimaal
Impact:       Command Palette, breadcrumbs en recent pages tonen correcte info
```

