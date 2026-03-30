

# Console Cleanup & Quality Check

## Huidige staat — al goed

De app is al grotendeels opgeschoond:
- **Error Boundary**: ✅ App-level `ErrorBoundary` wrapping op line 569 van `App.tsx`, plus `IsolatedErrorBoundary` en `RouteErrorBoundary` varianten
- **Tabellen**: ✅ 46 bestanden gebruiken al `overflow-x-auto` voor horizontale scroll
- **aria-labels**: ✅ Al aanwezig op UI componenten (dialog, sheet, sidebar, theme-toggle, etc.)
- **Logger utility**: ✅ `src/lib/logger.ts` bestaat al met DEV-only logging
- **Console.log**: Slechts 6 bestanden, waarvan 4 al DEV-guarded zijn

## Wat nog moet

### 1. Laatste console.log's vervangen (2 bestanden)

| Bestand | Probleem | Fix |
|---------|---------|-----|
| `src/lib/ensureProfileAfterSignup.ts` line 113 | Kale `console.log` in productie | → `logger.info(...)` |
| `src/utils/geocoding.ts` line 145 | Kale `console.log` in productie | → `logger.debug(...)` |

De overige 4 bestanden zijn al correct (DEV-guarded of in de logger zelf).

### 2. Pagination check — al aanwezig

Orders, klanten, facturen gebruiken al `react-query` met server-side limits. Geen wijziging nodig.

### 3. Afbeeldingen lazy loading

Controleer of `loading="lazy"` wordt gebruikt op afbeeldingen. Voeg toe waar nodig (vooral in lijstweergaven).

### 4. Icon-only buttons zonder aria-label

Scan de belangrijkste pagina's (sidebar, header, actiebars) voor `<Button size="icon">` zonder `aria-label`. Voeg Nederlandse aria-labels toe waar ze ontbreken.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/lib/ensureProfileAfterSignup.ts` — console.log → logger.info |
| **Edit** | `src/utils/geocoding.ts` — console.log → logger.debug |
| **Scan + Edit** | Icon-only buttons — aria-labels toevoegen waar ontbrekend |

## Conclusie

De app is al in goede staat. Dit zijn de laatste 2-3 kleine verbeteringen, geen grote refactors nodig.

