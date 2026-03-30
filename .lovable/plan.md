

# Fix: Klantenlijst Duplicaat Detectie, Test-data Markering & Incomplete Badge

## Huidige Staat

- **Verwijder-functionaliteit**: Bestaat al (soft delete + prullenbak + permanent delete + bulk delete)
- **Order-check bij verwijdering**: Ontbreekt — er wordt niet gecheckt of orders aan de klant zijn gekoppeld
- **Duplicaat detectie**: Ontbreekt — geen check bij aanmaken
- **Test-data markering**: Ontbreekt
- **Incomplete badge**: Ontbreekt
- **Empty fields**: Consistent "—" wordt al gebruikt in desktop table (line 893-896), maar mobiel toont soms niets

## Fixes

### 1. Duplicaat Detectie bij Aanmaken
**File:** `src/pages/Customers.tsx` — `handleSubmit`

Vóór het inserten, query `customers` op `company_name` (case-insensitive, `ilike`) en op `email`. Als match gevonden → `window.confirm("Er bestaat al een klant met de naam X. Wil je doorgaan?")`. Bij "Nee" → stop.

### 2. Order-check bij Verwijdering
**File:** `src/pages/Customers.tsx` — `handleDelete`

Voordat soft-delete uitgevoerd wordt, query `trips` (of `route_stops`) op `customer_id` om te tellen hoeveel orders gekoppeld zijn. Als > 0, pas de bevestigingstekst aan: "Deze klant heeft X orders. De klant wordt gearchiveerd (data blijft behouden)."

### 3. Test-data Markering + Filter
**File:** `src/pages/Customers.tsx`

- Helper functie: `isTestCustomer(c)` → `true` als `company_name` "test" bevat (case-insensitive) OF email domein `@ghevd8.nl`
- Badge: rode "Test" badge naast bedrijfsnaam
- Filter toggle: `hideTestData` state, default `false`. Checkbox "Verberg test-data" boven de lijst
- `filteredCustomers` filter uitbreiden met `hideTestData` logica

### 4. Incomplete Data Badge
**File:** `src/pages/Customers.tsx`

- Helper: `isIncomplete(c)` → `true` als `!email && !contact_name && !address`
- Badge: oranje "Incompleet" badge naast bedrijfsnaam in zowel mobile als desktop view

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/pages/Customers.tsx` — Duplicaat check, order-check, test badge, incomplete badge, filter |

