

# Fix: "Bekijk" knop bij kritieke meldingen navigeert naar onderhoud tab

## Probleem

De "Bekijk" knop in de kritieke meldingen banner (line 87) doet `setActiveTab('overview')` — als je al op overview zit, gebeurt er niets. De kritieke meldingen gaan over onderhoud/APK, dus de knop moet naar de **maintenance** tab navigeren.

## Fix

**Bestand:** `src/pages/FleetManagement.tsx` line 87

Wijzig:
```tsx
onClick={() => setActiveTab('overview')}
```
Naar:
```tsx
onClick={() => setActiveTab('maintenance')}
```

Eén regel, klaar.

