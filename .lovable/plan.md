

# Non-Functional Buttons Audit — Bevindingen & Plan

## Gevonden problemen

Na een grondige scan van de hele codebase heb ik **6 concrete gevallen** gevonden waar knoppen alleen een toast-melding tonen zonder daadwerkelijke actie:

### 1. RoutePlanning — AddStopDialog `onAddStop` (toast-only)
**Bestand**: `src/pages/RoutePlanning.tsx` regel 846
De "Stop toevoegen" dialog toont alleen een toast maar voegt de stop niet toe aan de routelijst. In `RouteOptimization.tsx` werkt dezelfde dialog wél correct via `handleAddStop`.

**Fix**: De `onAddStop` callback moet de stop daadwerkelijk toevoegen aan de geselecteerde trips of de routeweergave. Een nieuw trip-record aanmaken in de database met de stopgegevens.

### 2. MigrationHub — `onEdit` (toast-only)
**Bestand**: `src/pages/migration/MigrationHub.tsx` regel 541
"Project bewerken" toont alleen een toast `"Editor voor X wordt geopend"` maar opent niets.

**Fix**: Navigeren naar de project-detail/edit pagina of een edit-dialog openen met de projectgegevens.

### 3. MigrationHub — `onDelete` (toast-only)
**Bestand**: `src/pages/migration/MigrationHub.tsx` regel 543
"Project archiveren" toont alleen een toast maar archiveert het project niet. De `onArchive` callback ernaast werkt wél (roept `updateProject.mutate` aan).

**Fix**: Dezelfde `updateProject.mutate` aanroepen met een archived/deleted status, met een bevestigingsdialog.

### 4. FreightSettlements — `onApprove` (toast-only)
**Bestand**: `src/pages/enterprise/FreightSettlements.tsx` regel 180
Settlement goedkeuren toont alleen een toast. Het `SettlementApprovalDialog` component heeft intern een `handleApprove` die `onApprove` aanroept, maar de parent doet niets met de data.

**Fix**: De status van de onderliggende `purchase_invoices` bijwerken naar "approved" in de database en de query invalideren.

### 5. ExceptionsInbox — `onPing` (toast-only)
**Bestand**: `src/pages/enterprise/ExceptionsInbox.tsx` regel 114
"Ping chauffeur" toont alleen een toast. Het `ExceptionActionDialog` roept `onPing` aan met exception + bericht, maar de parent verwerkt het niet.

**Fix**: Een notificatie-record aanmaken in de database (of een push-notificatie triggeren via een edge function) voor de betreffende chauffeur.

### 6. AlertsEscalations — `onSave` (toast-only)
**Bestand**: `src/pages/enterprise/AlertsEscalations.tsx` regel 146
Alert regel opslaan toont alleen een toast. Het `AlertRuleDialog` component verzamelt alle velden en roept `onSave` aan, maar de parent slaat niets op.

**Fix**: De alert_rule record inserten/updaten in de `alert_rules` tabel en de query invalideren.

---

## Wijzigingen per bestand

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `src/pages/RoutePlanning.tsx` | AddStopDialog: toast-only | Stop als nieuw trip-record aanmaken in DB |
| 2 | `src/pages/migration/MigrationHub.tsx` | onEdit: toast-only | Project edit-dialog openen met velden |
| 3 | `src/pages/migration/MigrationHub.tsx` | onDelete: toast-only | `updateProject.mutate` met archived status + confirm |
| 4 | `src/pages/enterprise/FreightSettlements.tsx` | onApprove: toast-only | Purchase invoices status updaten naar approved |
| 5 | `src/pages/enterprise/ExceptionsInbox.tsx` | onPing: toast-only | Notificatie-record aanmaken voor chauffeur |
| 6 | `src/pages/enterprise/AlertsEscalations.tsx` | onSave: toast-only | Alert rule upserten in `alert_rules` tabel |

Totaal: 5 bestanden, geen database migraties nodig (tabellen bestaan al). Geen breaking changes.

