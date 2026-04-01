

# iOS 27 Elite Class — Orders Pagina Mobile Redesign

## Probleem
De Orders pagina ziet er "bulky" uit op mobiel: de tabs (Orders/Aanvragen) zijn zwart-op-grijs, de stat cards zijn te zwaar, en het geheel mist de luchtige, cleane iOS-esthetiek.

## Aanpak

### 1. Tabs redesign — Segmented Control stijl
**Bestand**: `src/pages/OrderOverview.tsx` (regels 841-855)

De huidige `TabsList` met `bg-muted/60` wordt vervangen door een iOS-style segmented control:
- Transparante achtergrond met subtiele `border border-white/[0.08]`
- Actieve tab: `bg-white/[0.08] backdrop-blur-xl` met zachte glow
- Grotere touch targets (h-11), afgeronde `rounded-2xl`
- Geen zwart-op-grijs contrast meer — alles subtiel glassmorphism

### 2. Header compacter op mobiel
**Bestand**: `src/pages/OrderOverview.tsx` (regels 828-948)

- Icon + titel op één lijn, kleiner (text-xl i.p.v. text-2xl op mobiel)
- Tabs verplaatst naar eigen rij direct onder de titel
- ThemeToggle en MoreVertical menu op dezelfde rij als tabs
- Minder verticale ruimte tussen elementen (`gap-3` → `gap-2`)

### 3. QuickStatsHeader — Lichter glassmorphism
**Bestand**: `src/components/orders/QuickStatsHeader.tsx`

- Cards: `bg-card/90` → `bg-white/[0.04] backdrop-blur-xl border-white/[0.06]`
- Subtielere gradiënt overlays
- Waarden: iets kleiner op mobiel (`text-lg` i.p.v. `text-xl`)
- Status distribution bar: dunner (h-1.5), meer afgerond
- Verwijder `shadow-xl` — gebruik alleen subtiele border glow

### 4. Search bar — iOS-native feel
**Bestand**: `src/pages/OrderOverview.tsx` (regels 1052-1061)

- Volledig afgerond (`rounded-2xl`)
- `bg-white/[0.04]` met `backdrop-blur-xl`
- Placeholder tekst lichter
- Filter knop als pill naast de search bar

### 5. Spacing & rhythm
**Bestand**: `src/pages/OrderOverview.tsx`

- `space-y-6` → `space-y-4` op mobiel
- Card list padding: `p-3` → `p-2`
- Pagination bar: compacter met glassmorphism achtergrond

## Bestanden

| # | Wijziging | Bestand |
|---|-----------|---------|
| 1 | iOS segmented control tabs | `src/pages/OrderOverview.tsx` |
| 2 | Compactere mobile header | `src/pages/OrderOverview.tsx` |
| 3 | Glassmorphism stat cards | `src/components/orders/QuickStatsHeader.tsx` |
| 4 | iOS search bar styling | `src/pages/OrderOverview.tsx` |

