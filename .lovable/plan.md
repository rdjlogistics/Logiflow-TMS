

# Performance Hardening — Ronde 5 (Eerlijk Advies)

## Status na 4 rondes

Je app heeft nu een solide basis: 16 database indexes, server-side search op trips/customers/drivers, limits op alle grote queries, background polling gestopt, realtime debounce, en lazy loading op 100+ pagina's. **De code-kant is grotendeels geoptimaliseerd.**

Er zijn nog 71 bestanden met `select('*')` — maar het merendeel zijn single-row fetches (settings, 1 record ophalen per ID) waar de overhead verwaarloosbaar is. De resterende impactvolle issues:

## Wat nog overblijft

### 1. HOOG: EmailDashboard `.limit(5000)` + auto-refresh elke 10s
`src/pages/EmailDashboard.tsx` haalt tot 5000 e-maillogs op en refresht elke 10 seconden als auto-refresh aan staat. Bij actief gebruik is dit de zwaarste single query in de app.

**Fix**: Limit naar 500, auto-refresh interval van 10s naar 30s.

### 2. MIDDEL: DriverProfielTab `.limit(1000)` op locaties
`src/components/driver/tabs/DriverProfielTab.tsx` haalt 1000 locatiepunten op per chauffeur. Voor een kaartvisualisatie zijn 100 punten ruim voldoende.

**Fix**: Limit van 1000 → 100. Trips limit van 500 → 50.

### 3. MIDDEL: Remaining `select('*')` op high-traffic paden
De overige 71 bestanden met `select('*')` zijn bijna allemaal single-row of settings-queries. Deze hoeven niet geoptimaliseerd te worden — de overhead is minimaal.

### 4. Eerlijk advies over wat code NIET kan oplossen

Na 5 rondes optimalisatie zijn de code-bottlenecks grotendeels opgelost. Als de app nog steeds traag aanvoelt, zijn er twee realistische oorzaken:

**A. Database instance te klein** — Bij 50+ gelijktijdige gebruikers wordt de database-server zelf de bottleneck, ongeacht hoe efficiënt de queries zijn. Ga naar **Backend → Geavanceerde instellingen → Instance upgraden**.

**B. Netwerk/CDN latency** — De app wordt geserveerd vanaf één locatie. Voor gebruikers ver van de server voelt alles 100-300ms trager. Dit is inherent aan de architectuur en niet op te lossen met code.

---

## Concrete wijzigingen

| # | Fix | Bestand | Impact |
|---|-----|---------|--------|
| 1 | Email logs limit 5000→500, refresh 10s→30s | `src/pages/EmailDashboard.tsx` | Hoog |
| 2 | Driver locaties limit 1000→100, trips 500→50 | `src/components/driver/tabs/DriverProfielTab.tsx` | Middel |

Totaal: 2 bestanden. Dit is de laatste ronde met meaningvolle code-optimalisaties — daarna is instance sizing de volgende stap.

