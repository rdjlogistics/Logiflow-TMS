

# Performance Fix — App te langzaam & apparaten worden heet

## Diagnose

Na analyse van de production build zijn er **3 kritieke problemen** gevonden:

```text
PROBLEEM                          IMPACT
─────────────────────────────────────────────────
PWA precacht ALLE 382 bestanden   11.8 MB download bij eerste bezoek
                                  → telefoon/laptop wordt heet
                                  → app lijkt "vast te hangen"

framer-motion in 278 bestanden    Animatie-library overal geïmporteerd
                                  → elke pagina laadt extra JS
                                  → continue GPU-belasting (heet)

Ongebruikte zware dependencies    three.js (3D), html2canvas, jspdf
                                  → 1.5 MB+ aan chunks die zelden nodig zijn
```

**Root cause van de hitte**: De service worker download op de achtergrond **11.8 MB** aan JavaScript zodra iemand de app opent. Dit vreet CPU, netwerk en batterij.

---

## Plan: 3 Batches

### Batch 1: PWA precache beperken (grootste impact)

**Bestand**: `vite.config.ts` — PWA workbox configuratie

Nu: `globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]` — pakt ALLES (382 bestanden, 11.8 MB)

Fix: Alleen kritieke assets precachen:
- `index.html`, main CSS, `vendor-react`, `vendor-query`, `vendor-ui`, `App` chunk
- Alle andere chunks worden **on-demand** geladen (runtime caching met NetworkFirst)
- Geschatte precache: ~1.5 MB i.p.v. 11.8 MB (**87% reductie**)

Toevoegen aan runtimeCaching:
```text
- Pattern: /assets/*.js → NetworkFirst, cache 7 dagen
  (lazy chunks laden on-demand, worden gecacht na eerste gebruik)
```

### Batch 2: Zware ongebruikte dependencies verwijderen

**Analyse**:
- `html2canvas` — **0 imports** in de codebase maar zit in de bundle (195 KB)
- `three` / `@react-three/fiber` / `@react-three/drei` — slechts 3 bestanden (B2B booking 3D scene), maar **898 KB** in B2BBook chunk. Dit is al lazy-loaded dus lage prioriteit, maar de dependencies kunnen verwijderd worden als de 3D feature niet gebruikt wordt.

**Actie**: `html2canvas` verwijderen uit `package.json` (scheelt 195 KB). Three.js: vraag aan gebruiker of de 3D cargo visualisatie nodig is.

### Batch 3: framer-motion reduceren

**278 bestanden** importeren framer-motion. Veel daarvan gebruiken alleen simpele fade/slide animaties die met CSS `@keyframes` of Tailwind `animate-*` classes kunnen.

**Strategie** (gefaseerd, niet alles in 1x):
- Identificeer top-20 meest geladen componenten die framer-motion gebruiken
- Vervang `motion.div` + simpele `animate={{ opacity: 1 }}` door Tailwind `animate-in fade-in`
- Houd framer-motion alleen waar echt nodig (drag-and-drop, complexe gestures, layout animations)
- Dit vermindert de bundle per pagina en reduceert GPU-werk

---

## Upscale strategie buiten Lovable

Voor wanneer jullie willen opschalen:

1. **Nu (gratis)**: Bovenstaande fixes doen — app wordt 5-10x sneller zonder kosten
2. **Korte termijn**: Code exporteren via GitHub-integratie van Lovable, deployen op Vercel/Netlify (gratis tier). Database blijft op Lovable Cloud.
3. **Lange termijn**: Als het team groeit, de geëxporteerde code in een eigen development-omgeving (VS Code) verder ontwikkelen. Lovable Cloud (database) blijft werken. Alleen betalen voor database-gebruik, niet voor credits.

De GitHub-export is de sleutel — jullie code is van jullie, geen lock-in.

---

## Verwacht resultaat Batch 1-3

| Metric | Nu | Na fix |
|--------|-----|--------|
| Eerste bezoek download | 11.8 MB | ~1.5 MB |
| Precache entries | 382 | ~15 |
| Apparaat hitte | Hoog | Minimaal |
| Ongebruikte JS verwijderd | 0 | ~1 MB |

**Batch 1 alleen** lost 80% van het probleem op. Dat is waar ik mee zou beginnen.

