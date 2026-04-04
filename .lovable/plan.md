

# Status Overzicht — Wat is bereikt + wat staat nog open

## Openstaande batches

| Batch | Status | Details |
|---|---|---|
| **Batch 3: framer-motion reduceren** | **~70%** | 13 componenten + 3 mobile navs geconverteerd. Nog ~260 bestanden importeren framer-motion. Niet blokkerend voor launch. |
| **Alle andere batches** | **100%** | PWA precache, dynamic Mapbox, dead code cleanup, Three.js removal — allemaal volledig afgerond. |

## Wat is bereikt deze week (1-4 april)

### Performance
- PWA precache: 11.8 MB → ~1.5 MB (87% reductie)
- Three.js + html2canvas + 3 npm packages verwijderd (~1.1 MB bespaard)
- 57+ dode bestanden opgeruimd
- Dashboard skeleton loading (geen glitchy dubbele render)
- Email queue cron: 5s → 30s (6x minder edge function calls)

### Bugfixes
- Weer API: `wind_speed_10` → `wind_speed_10m` (Command Center weer + verkeer werkt nu)
- Vlootbeheer sidebar collapse: structureel gefixt (DashboardLayout wrapper)
- Factuur PDF Unicode crash gefixt

### UI/UX
- 3 mobile bottom navs unified naar iOS 27 frosted glass stijl
- framer-motion verwijderd uit 8 dashboard widgets + 3 navbars

## Wat moet nog voor go-live

### Kritiek (blokkerend)
1. **Authenticatie flow testen** — Nieuw account → email verificatie → inloggen → onboarding → dashboard. Dit moet end-to-end werken.
2. **Email delivery verificatie** — Stuur testfactuur, check of Resend correct aflevert op productie.
3. **Database stabiliteit** — Er waren timeouts eerder deze week. Test met meerdere gelijktijdige gebruikers.
4. **Factuur PDF met echte data** — Unicode fix is door, maar test met echte facturen (speciale tekens, meerdere ritten).

### Belangrijk (kort na launch)
5. **framer-motion Batch 3 afronden** — Nog ~260 bestanden. Iteratief, niet urgent.
6. **Error monitoring** — Geen Sentry of vergelijkbaar. Productie-fouten zijn nu onzichtbaar.
7. **Mobile responsive audit** — Navbars zijn gedaan, maar pagina-inhoud op mobiel moet nog getest.

### Nice-to-have
8. Lighthouse score optimalisatie
9. Offline-first PWA verbeteringen

## Aanbeveling

De kritieke items (1-4) zijn **handmatige tests** die jullie zelf moeten uitvoeren. Ik kan helpen met het opzetten van test-scenarios of het fixen van wat er uit die tests komt. Items 5-7 kan ik direct oppakken als jullie dat willen.

