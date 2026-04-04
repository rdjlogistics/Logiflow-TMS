

# Lighthouse Optimalisatie: van 68 naar 80+ Performance

## Huidige scores (productie)
- Performance: **68** | Accessibility: **94** | Best Practices: **100** | SEO: **100**

## Plan

### 1. Recharts afsplitsen als apart chunk
Recharts (~180KB) wordt nu meegebundeld in de hoofdchunk. Door een `vendor-charts` chunk toe te voegen in `vite.config.ts` wordt dit alleen geladen wanneer een chart-widget daadwerkelijk in beeld komt (via bestaande lazy-loading).

**Bestand:** `vite.config.ts` — toevoegen na framer-motion chunk:
```typescript
if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
  return "vendor-charts";
}
```

### 2. Font-loading optimaliseren
De huidige font-preload laadt 3 font-families tegelijk (Inter, Plus Jakarta Sans, Manrope). Alleen Inter is kritiek — de rest kan async laden na eerste paint.

**Bestand:** `index.html` — split de font-link in twee: Inter als preload, de rest als async stylesheet.

### 3. LCP verbeteren met fetchpriority
De boot-fallback div blokkeert LCP niet, maar er is geen `fetchpriority="high"` op het main script.

**Bestand:** `index.html` — toevoegen `fetchpriority="high"` aan het module script tag.

### 4. Accessibility: heading hierarchy & contrast
- Controleer dat alle pagina's een `<h1>` hebben (sommige hebben mogelijk alleen `<h1>` via DashboardLayout title prop — dit is al correct).
- Voeg `aria-label` toe aan de mobile bottom nav als die ontbreekt.

### 5. robots.txt en sitemap toevoegen
Er is geen `robots.txt` of `sitemap.xml` in de public folder. Hoewel SEO al 100 scoort, is dit best practice.

**Bestanden:** `public/robots.txt` en `public/sitemap.xml` aanmaken.

### 6. Unused CSS/JS reduceren
- PWA workbox precache patterns kloppen al (minimaal).
- De `vendor-motion` chunk (~45KB) laadt altijd mee omdat `AnimatePresence` in App.tsx level wordt gebruikt. Dit is acceptabel maar kan in de toekomst verder geoptimaliseerd worden.

## Impact verwachting
| Optimalisatie | Geschatte impact |
|---|---|
| Recharts chunk split | -150KB initial JS → +5-8 perf punten |
| Font split | -50ms LCP → +2-3 perf punten |
| fetchpriority | -20ms LCP → +1 punt |
| robots.txt | Best practice (SEO al 100) |

**Totaal verwacht: Performance 78-82**

## Bestanden die wijzigen
1. `vite.config.ts` — recharts chunk
2. `index.html` — font split + fetchpriority
3. `public/robots.txt` — nieuw
4. `public/sitemap.xml` — nieuw
5. Eventueel `src/components/layout/MobileBottomNav.tsx` — aria-label check

