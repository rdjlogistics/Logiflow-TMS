

# Fix: /planning 404, 404 Contactinfo, Abonnement Laad-bug

## 3 Fixes

### 1. /planning redirect → /planning/program
**File:** `src/App.tsx`

Voeg toe na line 373 (vóór de bestaande `/planning/program` route):
```tsx
<Route path="/planning" element={<Navigate to="/planning/program" replace />} />
```
Import `Navigate` van `react-router-dom` (waarschijnlijk al geïmporteerd).

### 2. 404 pagina — verwijder placeholder telefoon
**File:** `src/pages/NotFound.tsx`

De 404 pagina heeft al `support@rdjlogistics.nl` als contactinfo en **geen** telefoonnummer. Geen wijziging nodig.

**File:** `src/pages/AdminSettings.tsx` (line 721) — het placeholder telefoonnummer `+31 20 123 4567` is een input placeholder in het instellingenformulier, niet op de 404 pagina. Dit is correct gedrag (placeholder hint).

### 3. Abonnement tab — loading spinner i.p.v. `null`
**File:** `src/components/settings/SubscriptionTab.tsx`

Line 185: wijzig `if (loading) return null;` naar een loading spinner:
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/App.tsx` — redirect `/planning` → `/planning/program` |
| **Edit** | `src/components/settings/SubscriptionTab.tsx` — loading spinner |

