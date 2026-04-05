

# Lanceerklaar maken — Ontbrekende items & fixes

## Analyse

Na grondige inspectie van de codebase is het platform functioneel sterk. De build compileert foutloos (0 TypeScript errors), alle pagina's zijn aanwezig, legal pages bestaan, robots.txt en sitemap zijn geconfigureerd. Er zijn echter enkele concrete items die ontbreken voor een professionele lancering:

## Wat ontbreekt

### 1. Favicon & PWA-iconen ontbreken
`index.html` verwijst naar `/favicon.ico`, `/apple-touch-icon.png` en `/pwa-512x512.png` — maar geen van deze bestanden bestaat in de `public/` map. Browsers tonen een generiek tabblad-icoon en PWA-installatie werkt niet.

**Fix:** Genereer een professioneel LogiFlow favicon (SVG → ICO + PNG varianten) en plaats in `public/`.

### 2. PWA manifest ontbreekt
Er is geen `manifest.json` / `manifest.webmanifest` in de app. Zonder manifest werkt "Installeer als app" niet op mobiel ondanks dat `apple-mobile-web-app-capable` al is ingesteld.

**Fix:** Maak `public/manifest.webmanifest` aan met correcte app-naam, kleuren, icons en display-mode. Voeg `<link rel="manifest">` toe aan `index.html`.

### 3. OG-image URL verwijst naar niet-bestaand domein
`og:image` en `twitter:image` verwijzen naar `https://logiflowtms.eu/pwa-512x512.png` — dit domein is niet live. Social sharing toont geen preview-afbeelding.

**Fix:** Verander naar `https://rdjlogistics.lovable.app/og-image.png` (het daadwerkelijke gepubliceerde domein) en maak een OG-image aan.

### 4. Canonical URL wijst naar verkeerd domein
`<link rel="canonical">` wijst naar `logiflowtms.eu` terwijl de app live staat op `rdjlogistics.lovable.app`.

**Fix:** Update canonical, og:url en sitemap URLs naar het juiste domein.

### 5. Carrier portal URL is hardcoded
`CarrierPortalAccessTab.tsx` bevat hardcoded `https://rdjlogistics.lovable.app/carrier` — dit zou dynamisch moeten zijn via `window.location.origin`.

**Fix:** Vervang hardcoded URL door `${window.location.origin}/carrier`.

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---|---|
| `public/favicon.svg` | Nieuw: SVG favicon met LogiFlow branding |
| `public/favicon.ico` | Nieuw: ICO versie |
| `public/apple-touch-icon.png` | Nieuw: 180x180 touch icon |
| `public/pwa-192x192.png` | Nieuw: PWA icon |
| `public/pwa-512x512.png` | Nieuw: PWA icon |
| `public/og-image.png` | Nieuw: Social sharing preview |
| `public/manifest.webmanifest` | Nieuw: PWA manifest |
| `index.html` | Manifest link + fix canonical/OG URLs |
| `public/robots.txt` | Fix sitemap URL |
| `public/sitemap.xml` | Fix alle URLs naar juiste domein |
| `src/hooks/usePageTitle.ts` | Fix BASE_URL |
| `src/components/carriers/CarrierPortalAccessTab.tsx` | Dynamische URL |

## Risico
Laag — geen database of logica wijzigingen. Puur meta/assets/branding fixes voor professionele lancering.

