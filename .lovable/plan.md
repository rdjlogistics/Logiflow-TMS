

# Fix: Witte auth-pagina → login werkt weer

## Probleem
De `/auth` pagina is wit omdat:
1. **AuthLoader** (regel 277) gebruikt `bg-background` — in light-theme wordt dit wit/lichtgrijs
2. **Auth-routes zitten binnen `LazyCopilotProvider`** (regel 322-323) — als die Suspense `fallback={null}` hangt, rendert er niets

## Oplossing (1 bestand: `src/App.tsx`)

### Stap 1 — AuthLoader donker maken
Regel 277: vervang `bg-background` door `bg-[#0F172A]` en pas tekstkleuren aan naar hardcoded lichte kleuren, zodat het altijd matcht met de boot-splash ongeacht het thema.

### Stap 2 — Auth-routes buiten CopilotProvider Suspense
Verplaats de `BrowserRouter` + auth-routes (`/auth`, `/login`, `/demo`) naar **boven** de `LazyCopilotProvider` Suspense-boundary. De CopilotProvider wraps dan alleen de beschermde routes. Hierdoor kan de loginpagina altijd renderen, zelfs als Copilot niet laadt.

Concreet:
- `BrowserRouter` verplaatsen naar net na `TooltipProvider`
- Auth-routes direct in een eigen `Routes` blok, buiten `LazyCopilotProvider`
- Beschermde routes blijven binnen `LazyCopilotProvider`

### Geen wijzigingen aan
- Auth.tsx, useAuth.tsx, main.tsx, backend, edge functions

## Resultaat
- Loginpagina laadt altijd met donkere achtergrond — geen witte flits
- CopilotProvider-problemen blokkeren login niet meer
- Naadloze overgang: boot-splash → AuthLoader → loginformulier

