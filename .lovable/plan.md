

# Elite Class Boot Splash — geen dubbele loginpagina meer

## Probleem
De statische `boot-fallback` in `index.html` lijkt op een loginformulier (invoervelden-skeleton + knop-skeleton). Terwijl React laadt, zien gebruikers dit als een "eerste loginpagina", gevolgd door de echte Auth.tsx — vandaar de "dubbele login" illusie.

## Aanpak

### 1. `index.html` — Boot-fallback vervangen door Elite branded splash
Verwijder de huidige form-skeleton en vervang door een minimale, premium laad-splash:
- Gecentreerd LogiFlow logo-icoon (truck SVG) in een glassmorphism container
- Subtiele CSS-only spin-ring animatie (geen JS nodig)
- Tekst: "LogiFlow TMS" + "Bezig met laden…"
- Geen fake invoervelden, geen fake knoppen — puur een branded loader
- Zelfde donkere achtergrond als de app (`#0F172A`)
- Het timeout-foutscherm (12s) blijft behouden

### 2. `src/App.tsx` — AuthLoader visueel afstemmen op splash
De `AuthLoader` component (regel 276-282) updaten zodat deze visueel identiek is aan de boot-splash:
- Zelfde truck-icoon + spin-ring als in index.html
- Zelfde "LogiFlow TMS" branding
- Hierdoor voelt de overgang van HTML-fallback → React-loader → Auth.tsx als één vloeiende flow

### 3. Geen wijzigingen aan
- Auth.tsx (loginlogica)
- useAuth.tsx (sessie-management)
- main.tsx (boot-sequentie werkt correct — verwijdert fallback bij React mount)
- Routing of backend

## Bestanden
- `index.html` (boot-fallback sectie)
- `src/App.tsx` (AuthLoader component, ~8 regels)

## Resultaat
- Gebruiker ziet één branded laad-splash → direct de echte loginpagina
- Geen "dubbele login" meer
- Elite Class uitstraling vanaf het eerste frame

