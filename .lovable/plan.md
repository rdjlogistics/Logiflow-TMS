

# Dagelijkse Batch-Processen — Analyse & Automatisering

## Analyse

Na grondige inspectie van de volledige codebase zijn dit de batch-processen die dagelijks moeten draaien, maar **momenteel GEEN automatische scheduling hebben** (geen pg_cron jobs gevonden):

| Batch-proces | Edge Function | Status |
|---|---|---|
| Overdue facturen checken | `check-overdue-invoices` | Bestaat, maar draait NOOIT automatisch |
| Email wachtrij verwerken | `process-email-queue` | Bestaat, maar draait NOOIT automatisch |
| Dieselprijs update | `diesel-price-update` | Bestaat, maar draait NOOIT automatisch |
| Proactieve alerts | `proactive-alerts` | Alleen on-demand vanuit UI |

De batch-facturatie (verkoop + inkoop) is wizard-based en hoeft niet automatisch — dat is correct.

## Plan

### Stap 1: pg_cron + pg_net extensies activeren
Migratie aanmaken die `pg_cron` en `pg_net` inschakelt.

### Stap 2: Cron jobs instellen via SQL insert
Drie automatische jobs registreren:

1. **Email queue** — elke 2 minuten `process-email-queue` aanroepen
2. **Overdue invoices check** — dagelijks om 07:00 UTC `check-overdue-invoices`
3. **Diesel price update** — dagelijks om 06:00 UTC `diesel-price-update`

### Stap 3: Batch Operations Dashboard widget
Een "Dagelijkse Batches" statusoverzicht toevoegen aan het Command Center dashboard dat toont:
- Laatste run-tijd per batch
- Status (OK / Fout / Nooit gedraaid)
- Handmatige "Nu uitvoeren" knop per batch

### Stap 4: Proactive Alerts auto-refresh
De proactive alerts hook aanpassen om bij app-start en elke 5 minuten automatisch te refreshen, in plaats van alleen on-demand.

## Bestanden

| Bestand | Actie |
|---|---|
| Migratie SQL | Nieuw: pg_cron + pg_net extensies |
| SQL insert | Nieuw: 3 cron job registraties |
| `src/components/dashboard/widgets/BatchStatusWidget.tsx` | Nieuw: batch status widget |
| `src/components/dashboard/widgets/WidgetRegistry.ts` | Widget registratie toevoegen |
| `src/hooks/useProactiveAlerts.ts` | Auto-refresh interval toevoegen |

## Risico
Laag — alle edge functions bestaan al en werken. We voegen alleen scheduling en monitoring toe.

