

# App-brede Verbeteringen — Performance, UX, Functionaliteit & UI

## Overzicht

Een breed pakket verbeteringen gegroepeerd in 4 categorieën. Elk onderdeel is onafhankelijk en levert direct merkbare waarde.

---

## 1. Performance

### 1a. Fix React ref warnings (Auth + LegalConsentBanner)
De console toont `Function components cannot be given refs` warnings voor `Auth` en `LegalConsentBanner`. Beide worden via `lazyWithRetry` geladen maar missen `forwardRef` wrapping.

- **Auth.tsx**: Wrap de default export met `React.forwardRef`
- **LegalConsentBanner.tsx**: Wrap `Dialog` usage correct (of suppress ref passing)

### 1b. Sidebar icon imports optimaliseren
`AppSidebar.tsx` importeert 60+ icons individueel uit lucide-react. Hoewel tree-shaking dit normaal afhandelt, is de import-lijst onnodig lang.

- Groepeer imports en verwijder ongebruikte icons (er zijn er ~10 geïmporteerd maar nergens gebruikt in het bestand)

### 1c. OrderOverview.tsx splitsen
Dit bestand is 1596 regels lang — de grootste pagina. Dit vertraagt HMR en is moeilijk te onderhouden.

- Extract mobiele kaartweergave naar `OrderMobileCard.tsx`
- Extract tabelrij naar `OrderTableRow.tsx`
- Extract filter-bar naar `OrderFilters.tsx`

---

## 2. UX / Navigatie

### 2a. MobileBottomNav uitbreiden met Ritten tab
De huidige mobiele nav heeft Home, Orders, Nieuw, Meldingen, Instellingen. "Ritten" (de dagelijkse kern-workflow) ontbreekt.

- Vervang "Meldingen" door "Ritten" (pad: `/trips`)
- Verplaats meldingen naar de header NotificationBell (die al bestaat)

### 2b. Breadcrumbs op dieper gelegen pagina's
Pagina's als `/invoices/123`, `/carriers/detail/xyz` hebben geen breadcrumb-navigatie. Gebruikers moeten via sidebar terugnavigeren.

- Voeg een lichtgewicht `Breadcrumb` component toe
- Toon op detail-pagina's: `Home > Facturen > FA-2026-001`

### 2c. Keyboard shortcut hints in sidebar
De app heeft al een command palette (⌘K), maar sidebar items tonen geen shortcut hints.

- Voeg tooltips toe met shortcuts voor de 5 meest gebruikte items (bijv. `G dan O` voor Orders, `G dan R` voor Ritten)

---

## 3. Functionaliteit

### 3a. Globale zoekbalk in de header
De header heeft alleen een Copilot knop. Een snelle zoekbalk die orders, klanten en ritten doorzoekt ontbreekt.

- Voeg een compact zoekveld toe in de header (desktop) dat opent als de command palette maar met data-resultaten
- Zoek over orders (order_number), klanten (company_name), en ritten (pickup/delivery city)
- Toon max 5 resultaten per categorie met directe navigatie

### 3b. Recent bezochte pagina's
Geen "recents" functionaliteit — gebruikers moeten steeds opnieuw navigeren.

- Track de laatste 5 bezochte routes in localStorage
- Toon als "Recent" sectie bovenaan de sidebar (collapsed by default)

### 3c. Dashboard auto-refresh indicator
Het dashboard toont "Live" badge maar ververst niet automatisch.

- Voeg een 60-seconden auto-refresh toe aan `useDashboardData` met een subtiele refresh-indicator
- Toon "Bijgewerkt 30s geleden" tekst

---

## 4. UI / Design

### 4a. Consistente lege-staat illustraties
Diverse pagina's tonen geen feedback bij lege data (geen ritten, geen facturen). Sommige gebruiken `EmptyState`, andere tonen gewoon een lege tabel.

- Audit alle overzichtspagina's en voeg `EmptyState` component toe waar deze ontbreekt
- Gebruik consistente iconen en CTA-tekst per pagina

### 4b. Skeleton loading states voor alle tabs
Dashboard heeft skeletons, maar Trips, Orders en andere pagina's tonen alleen een `Loader2` spinner.

- Voeg tabel-specifieke skeleton loaders toe aan Trips en OrderOverview
- Toon skeleton rijen i.p.v. een centered spinner

### 4c. Mobiele kaarten: swipe-hints
De app heeft `SwipeableCard` maar nieuwe gebruikers weten niet dat ze kunnen swipen.

- Voeg een eenmalige "swipe hint" animatie toe (subtiele horizontale beweging) bij eerste gebruik
- Bewaar in localStorage of de hint al getoond is

---

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/pages/Auth.tsx` — forwardRef fix |
| **Edit** | `src/components/legal/LegalConsentBanner.tsx` — ref warning fix |
| **Edit** | `src/components/layout/AppSidebar.tsx` — unused imports + recent pages + shortcut hints |
| **Edit** | `src/components/layout/MobileBottomNav.tsx` — Ritten tab toevoegen |
| **Edit** | `src/components/layout/DashboardLayout.tsx` — zoekbalk in header + breadcrumbs |
| **Nieuw** | `src/components/common/Breadcrumbs.tsx` |
| **Nieuw** | `src/components/common/GlobalSearch.tsx` |
| **Nieuw** | `src/hooks/useRecentPages.ts` |
| **Edit** | `src/hooks/useDashboardData.ts` — auto-refresh met interval |
| **Edit** | `src/pages/Trips.tsx` — skeleton loading states |
| **Edit** | `src/pages/OrderOverview.tsx` — skeleton loading + component extractie |
| **Nieuw** | `src/components/orders/OrderMobileCard.tsx` |
| **Nieuw** | `src/components/orders/OrderTableRow.tsx` |
| **Nieuw** | `src/components/orders/OrderFilters.tsx` |

## Aanpak

Gezien de omvang pakken we dit in 3 batches aan:
1. **Batch 1**: Performance fixes (ref warnings, sidebar cleanup) + MobileBottomNav Ritten tab
2. **Batch 2**: Globale zoekbalk + Breadcrumbs + Recent pages + Dashboard auto-refresh
3. **Batch 3**: Skeleton states + OrderOverview splitsen + Swipe hints + Empty states

