

# Plan: Claims & POD Pagina — iOS 26 Redesign

## Probleem
1. De 6 stat cards bovenaan zijn niet klikbaar — ze doen niets bij aanraken
2. Het design is ouderwets: gewone `Card` componenten, geen moderne iOS-stijl
3. Op mobiel is de tabel onbruikbaar (horizontaal scrollen, kleine targets)

## Oplossing

Volledige redesign van `src/pages/claims/ClaimsInbox.tsx` met iOS 26 / Elite Class esthetiek en klikbare stat cards die filteren.

### 1. Klikbare Stat Cards als Filters
Elke stat card wordt een klikbare filter-knop:
- **Open** → filtert claims op `status: "open"`
- **In behandeling** → `status: "in_review"`
- **Wacht op info** → `status: "awaiting_info"`
- **Afgehandeld** → `status: "approved"` + `"settled"` + `"rejected"`
- **Geclaimd (€)** → toont alle claims gesorteerd op bedrag
- **Goedgekeurd (€)** → filtert op `status: "approved"`

Actieve card krijgt een visuele highlight (ring, scale, achtergrondkleur).

### 2. iOS 26 Design Upgrade
- Glassmorphism cards met `backdrop-blur-xl`, subtiele borders
- Grotere touch targets (min 48px), afgeronde hoeken (2xl/3xl)
- Framer Motion `whileTap={{ scale: 0.97 }}` op alle interactieve elementen
- Spring-physics animaties bij tab-wisselingen en card-selectie
- Clean typografie: grotere stat-nummers, subtielere labels
- Stat cards in een compactere 3x2 grid op mobiel (i.p.v. 2x3 met grote gaps)

### 3. Mobiele Kaartweergave
Op mobiel: vervang de `<Table>` door kaart-items voor zowel Claims als POD:
- Swipeable kaarten met status-badge, klant, bedrag
- Tap om claim detail te openen (Sheet i.p.v. Dialog op mobiel)
- Zoekbalk met glassmorphism styling

### 4. Business Logica Behouden
Alle bestaande functionaliteit blijft:
- Claim detail dialog met goedkeuren/afwijzen/doorsturen
- POD bekijken/downloaden
- Settlement sectie
- Status updates naar database
- Filter op status + zoeken

## Bestand dat wijzigt

| Bestand | Wijziging |
|---|---|
| `src/pages/claims/ClaimsInbox.tsx` | Volledige UI redesign: klikbare stat cards, iOS 26 glassmorphism, mobiele kaartweergave, Framer Motion animaties. Alle business logica ongewijzigd. |

