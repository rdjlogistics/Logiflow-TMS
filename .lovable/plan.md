
Probleem dat ik echt in de code zie

- De sidebar-logica zelf ziet nu juist relatief stabiel uit:
  - `SidebarProvider` bewaart open/collapsed state persistent
  - `AppSidebar` sluit niet automatisch bij interne navigatie
  - de actieve route-detectie voor `/fleet` is correct
- De echte afwijking zit in `src/pages/FleetManagement.tsx`: deze pagina gebruikt géén `DashboardLayout`.
- Routes als `/co2` en `/rates` gebruiken wel de gedeelde app-shell met sidebar/header.
- Daardoor lijkt het alsof “Vlootbeheer” het menu dichtklapt, maar feitelijk navigeer je naar een standalone pagina zonder de standaard shell.

Uitvoeringsplan

1. Herstel `/fleet` naar de standaard app-shell
- Pas `src/pages/FleetManagement.tsx` aan zodat deze net als andere hoofdmodules binnen `DashboardLayout` rendert.
- Gebruik daar de bestaande titel/omschrijving van Vlootbeheer.
- Verwijder de standalone full-screen wrapper (`min-h-screen`, eigen outer container) zodat de pagina netjes in de centrale layout leeft.

2. Houd de fix bewust klein en veilig
- Niet opnieuw sleutelen aan `src/components/ui/sidebar.tsx` of toggle-state zonder harde noodzaak.
- Niet opnieuw werken met “workarounds” rond mobile close/open, omdat dat het echte probleem niet oplost.
- De structurele fix is: `/fleet` moet dezelfde layout-architectuur volgen als de rest.

3. Regressie-audit op deze flow
- Desktop, sidebar open: klik “Vlootbeheer” → sidebar blijft zichtbaar.
- Desktop, sidebar collapsed: klik truck-icoon → `/fleet` opent binnen dezelfde shell.
- Direct refreshen op `/fleet` → shell blijft aanwezig.
- Legacy route `/vehicles` → redirect naar `/fleet` blijft correct werken.
- Controle dat de actieve menu-highlight op “Vlootbeheer” blijft staan.

4. Extra controle op verwante routes
- `CO2Reporting` en `RateManagement` volgen al het juiste patroon; die gebruik ik als referentie.
- `FuelStations` is nu fullscreen opgebouwd; die laat ik alleen zo staan als dat bewust bedoeld is. Als die óók in de dashboard-shell moet, dan plannen we dat als aparte, gerichte follow-up.

Waarom dit de blijvende fix is

- Dit pakt de root cause aan, niet het symptoom.
- Zolang `/fleet` buiten `DashboardLayout` staat, zal dit soort “sidebar sluit” gedrag blijven terugkomen.
- Door de route weer onder dezelfde shell te brengen als de rest van het platform, wordt het gedrag consistent bij klik, refresh en toekomstige updates.

Technische details

- Hoofdbestand: `src/pages/FleetManagement.tsx`
- Referentiepatronen: `src/pages/CO2Reporting.tsx`, `src/pages/RateManagement.tsx`
- Verwachte impact: laag risico, geen backendwijzigingen, geen databasewijzigingen, hoge betrouwbaarheid
