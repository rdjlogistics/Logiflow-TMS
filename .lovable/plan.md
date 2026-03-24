

# Plan: Reduce Unused CSS — 44 KiB Besparing

## Probleem
Lighthouse rapporteert dat 94.5% van `index.css` (44 KiB van 47 KiB) ongebruikt is op de initiële pagina (Auth). De oorzaak: het 2.746-regelige `src/index.css` bevat alles in één bestand — 5 thema-presets (~1.200 regels), Mapbox-styling (~250 regels), brandstofmarker-CSS (~200 regels), en tientallen animatie/shimmer utilities die alleen op specifieke pagina's nodig zijn.

## Oplossing: CSS Code-Splitting

Verplaats niet-kritieke CSS naar aparte bestanden die alleen geladen worden wanneer nodig.

### Stap 1: Thema-presets extraheren (~1.200 regels → aparte bestanden)
Verplaats elke themapreset naar een eigen bestand:
- `src/styles/theme-vision-pro.css` (regels 1846–2132)
- `src/styles/theme-horizon.css` (regels 2134–2392) 
- `src/styles/theme-carbon.css` (regels 2394–2605)
- `src/styles/theme-aurora.css` (regels 2607–2746)

### Stap 2: Dynamisch laden van thema-CSS
In `ThemeProvider.tsx`: gebruik `import()` om het thema-CSS-bestand alleen te laden wanneer een niet-standaard thema actief is. De standaard Imperial-thema variabelen blijven in `index.css`.

### Stap 3: Map-gerelateerde CSS extraheren (~450 regels)
Verplaats Mapbox controls, fuel-price markers, fuel-dot markers en user-marker styling naar `src/styles/map-styles.css`. Importeer dit alleen in de map-componenten die het gebruiken.

### Stap 4: Opruimen `index.css`
Na extractie blijft `index.css` over met:
- CSS variabelen (Imperial + light mode): ~240 regels
- Base styles: ~50 regels
- Component classes (glass-card, premium-card, etc.): ~400 regels  
- Utility classes: ~350 regels
- Keyframes + animaties: ~100 regels
- iOS/mobile optimalisatie: ~100 regels

**Totaal na split**: ~1.240 regels i.p.v. 2.746 — meer dan 50% reductie.

## Bestanden

| Actie | Bestand |
|---|---|
| Nieuw | `src/styles/theme-vision-pro.css` |
| Nieuw | `src/styles/theme-horizon.css` |
| Nieuw | `src/styles/theme-carbon.css` |
| Nieuw | `src/styles/theme-aurora.css` |
| Nieuw | `src/styles/map-styles.css` |
| Wijzig | `src/index.css` — verwijder geëxtraheerde secties |
| Wijzig | `src/components/ThemeProvider.tsx` — dynamisch CSS laden per thema |
| Wijzig | Map-componenten — importeer `map-styles.css` daar |

## Impact
- **~44 KiB besparing** op initiële CSS-lading (Lighthouse "Reduce unused CSS" opgelost)
- Geen visuele wijzigingen — thema's laden zodra ze nodig zijn
- Snellere First Contentful Paint en Largest Contentful Paint

