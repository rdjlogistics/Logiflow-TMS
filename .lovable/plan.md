

# Bulk Acties op Trips Pagina

## Overzicht

Voeg multi-select functionaliteit toe aan de trips pagina (desktop en mobiel) met een bulk action bar voor status wijzigen en chauffeur toewijzen.

## Stappen

### Stap 1: State & selectie-logica in Trips.tsx

- Nieuwe state: `selectedIds: Set<string>`, `bulkActionOpen: string | null`
- "Select all" checkbox in table header, individuele checkboxes per rij
- Op mobiel: long-press of checkbox-icon om selectiemodus te activeren

### Stap 2: Bulk Action Bar component

Nieuw component `src/components/trips/BulkActionBar.tsx`:
- Sticky bar onderaan het scherm, verschijnt wanneer ≥1 trip geselecteerd is
- Toont: aantal geselecteerd, "Status wijzigen" dropdown, "Chauffeur toewijzen" dropdown, "Deselecteer alles" knop
- Status dropdown: alle TripStatus opties
- Chauffeur dropdown: haalt actieve chauffeurs op uit `drivers` tabel
- Bevestigingsknop voert batch update uit via `supabase.from('trips').update(...).in('id', [...selectedIds])`

### Stap 3: Desktop tabel aanpassen

- Extra `<TableHead>` met select-all checkbox als eerste kolom
- Extra `<TableCell>` met individuele checkbox per rij
- Checkbox styling met Checkbox component uit shadcn/ui

### Stap 4: Mobiel aanpassen

- Checkbox overlay linksboven op elke kaart wanneer selectiemodus actief is
- Selectiemodus activeren via een "Selecteer" knop in de header naast de refresh/CSV knoppen

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Nieuw** | `src/components/trips/BulkActionBar.tsx` |
| **Edit** | `src/pages/Trips.tsx` — selectie state, checkboxes, BulkActionBar integratie |

## Resultaat

- Gebruikers kunnen meerdere ritten selecteren via checkboxes (desktop) of selectiemodus (mobiel)
- Bulk status wijzigen naar elke status in één klik
- Bulk chauffeur toewijzen uit lijst actieve chauffeurs
- Floating action bar toont geselecteerd aantal en beschikbare acties

