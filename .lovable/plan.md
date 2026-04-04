

# Overzicht: Wat is er deze week bereikt + openstaande batches + go-live checklist

## Openstaande / onvoltooide batches

| Batch | Status | Toelichting |
|---|---|---|
| **Batch 3: framer-motion reduceren** | **~70% done** | 13 componenten geconverteerd (5 high-traffic + 8 dashboard widgets). Nog ~250 bestanden importeren framer-motion. Niet blokkerend voor launch — puur performance-optimalisatie. |
| **Dynamic Mapbox imports** | **100% done** | Alle 11 bestanden geconverteerd op 20 maart. |
| **PWA precache fix** | **100% done** | Van 11.8 MB naar ~1.5 MB. |
| **Dead code cleanup** | **100% done** | 57+ bestanden verwijderd, 7 npm packages verwijderd, Three.js verwijderd. |

Conclusie: **Alleen Batch 3 (framer-motion)** is niet volledig afgerond, maar dat is een iteratieve optimalisatie, geen blocker.

---

## Wat is er deze week bereikt

### Performance & Stabiliteit
- PWA precache: 11.8 MB naar ~1.5 MB (87% reductie)
- Three.js + html2canvas verwijderd (~1.1 MB bespaard)
- 57+ dode bestanden opgeruimd
- Dynamic Mapbox imports in alle 11 bestanden
- framer-motion vervangen in 13 high-traffic componenten
- Bundle code-splitting voor jsPDF, mapbox, Three.js
- Dashboard skeleton loading (geen glitchy dubbele render meer)
- Database timeout diagnose + hardening

### Bugfixes
- Weer/verkeer Command Center: API parameter `wind_speed_10` naar `wind_speed_10m`
- Vlootbeheer sidebar collapse: pagina in DashboardLayout gewrapped (structurele fix)
- Onboarding redirect glitch: localStorage fallback + foutbestendig
- Factuur PDF crash: Unicode `→` vervangen
- Driver deletion: foreign key constraint fix
- Portal account creation: edge function fix
- Case-sensitive email domain validatie
- Toast error patterns opgelost (3 bugs)
- Claims & POD pagina: database JOINs gefixed

### Features & UI
- iOS 27 mobile bottom nav: alle 3 navbars (admin, chauffeur, klantportaal) uniform
- Claims & POD pagina redesign met interactieve filters
- AI Assistant upgrade: 10 nieuwe tools, reasoning detectie, pro-actieve analyse
- Workflow automation engine
- Instellingen verplaatst naar sidebar footer

---

## Wat moet nog geregeld worden voor go-live

### Kritiek (moet voor launch)
1. **Database capaciteit** — Deze week waren er timeouts onder belasting. Test met meerdere gelijktijdige gebruikers of de huidige infra het aankan.
2. **Edge function stabiliteit** — `process-email-queue` boot/shutdown cycled elke 5 seconden (zichtbaar in logs). Onderzoek of dit normaal is of een infinite loop.
3. **Email delivery** — Verifieer dat Resend correct werkt voor factuur-emails, order confirmaties en portal uitnodigingen op productie.
4. **Mapbox token** — Kaarten laden via edge function `get-mapbox-token`. Als de DB traag is, falen alle kaarten. Overweeg een hardcoded fallback of langere cache.
5. **Authenticatie flow end-to-end** — Test nieuw account aanmaken, email verificatie, inloggen, onboarding wizard, dashboard laden.
6. **Factuur PDF generatie** — Unicode fix is doorgevoerd maar test met echte factuurdata (meerdere ritten, speciale tekens).

### Belangrijk (kort na launch)
7. **framer-motion Batch 3 afronden** — Nog ~250 bestanden. Iteratief oppakken voor verdere performance.
8. **FuelStations pagina** — Staat nog buiten DashboardLayout (zelfde probleem als Vlootbeheer had). Follow-up fix.
9. **Mobile responsive audit** — iOS 27 nav is gedaan, maar de rest van de pagina's op mobiel testen.
10. **Error monitoring** — Geen Sentry of vergelijkbaar. Overweeg error tracking voor productie.

### Nice-to-have (na launch)
11. Verdere framer-motion cleanup
12. Lighthouse score optimalisatie
13. Offline-first PWA improvements

---

## Technische details

De `process-email-queue` edge function logt elke ~5 seconden een boot/shutdown cycle zonder zichtbare payload-verwerking. Dit duidt mogelijk op een cron-trigger met een te korte interval of een function die direct afsluit zonder werk. Dit moet onderzocht worden voor go-live om onnodige kosten en instabiliteit te voorkomen.

