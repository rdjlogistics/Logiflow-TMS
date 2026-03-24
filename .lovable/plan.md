

# Plan: Sidebar Herstructurering — Vloot & Planning Splitsen

## Analyse van het probleem

De huidige "Vloot & Planning" sectie combineert twee fundamenteel verschillende domeinen:

**Vloot-gerelateerd** (activa-beheer):
- Vlootbeheer → `/fleet` (bevat al tabs voor voertuigen, brandstof, onderhoud)
- Onderhoud → `/maintenance/predictive` (apart menu-item, maar vlootbeheer heeft al een onderhoud-tab)
- CO₂ Rapportage → `/co2`
- Tankstations → `/fuel-stations`

**Planning-gerelateerd** (personeelsplanning):
- Programma → `/planning/program`
- Aanmeldingen → `/planning/applications`
- Beschikbaarheid → `/planning/availability`
- Roosters → `/enterprise/rosters`

### Dubbele items gevonden:
1. **Onderhoud** — bestaat als apart menu-item `/maintenance/predictive` EN als tab in Vlootbeheer `/fleet` → verwijderen uit sidebar
2. **Tankstations** — `/fuel-stations` is een losse pagina, maar Vlootbeheer heeft al een "Brandstof" tab → verwijderen uit sidebar, of integreren als sub-tab
3. **Roosters** vs **Programma** — Roosters navigeert nu naar Planning/Programma (nep-knop was al gefixed), dus redundant

## Nieuwe structuur

Twee aparte, compacte secties:

```text
┌─────────────────────────┐
│ Vloot                   │
│  🚛 Vlootbeheer         │  → /fleet (voertuigen + brandstof + onderhoud tabs)
│  🌿 CO₂ Rapportage      │  → /co2
│  ⛽ Tankstations         │  → /fuel-stations
│                         │
│ Planning                │
│  📅 Programma           │  → /planning/program
│  ✋ Aanmeldingen         │  → /planning/applications
│  ✅ Beschikbaarheid      │  → /planning/availability
└─────────────────────────┘
```

### Verwijderd:
- **Onderhoud** — zit al in Vlootbeheer als tab, dubbel menu-item is verwarrend
- **Roosters** — navigeert al naar Programma, is redundant

### Waarom deze split logisch is:
- **Vloot** = "Wat heb ik?" — voertuigen, hun staat, kosten, uitstoot
- **Planning** = "Wie werkt wanneer?" — diensten, beschikbaarheid, aanmeldingen
- Een transportondernemer denkt in deze twee domeinen: materieel vs personeel

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Split `vlootPlanningItems` in `vlootItems` (3 items) en `planningItems` (3 items). Verwijder Onderhoud en Roosters. Update `allSections` array met 2 nieuwe secties. |

