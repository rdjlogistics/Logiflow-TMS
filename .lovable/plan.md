

# Non-Functional Buttons Audit — Ronde 2

## Eerder al gefixt (Ronde 1)
De vorige ronde zijn deze 6 al opgelost: RoutePlanning AddStop, MigrationHub Edit/Delete, FreightSettlements Approve, ExceptionsInbox Ping, AlertsEscalations Save.

## Nieuwe bevindingen

Na een grondige scan op `// Simulate`, `await new Promise(resolve => setTimeout(...))` en toast-only handlers zijn er **7 nieuwe gevallen** gevonden:

### 1. HoldsInbox — Escalatie-knop (fake simulate)
**Bestand**: `src/pages/enterprise/HoldsInbox.tsx` regel 454
De "Escaleren" knop simuleert een delay en toont een toast, maar doet niets in de database. De hold wordt niet ge-update met een hogere prioriteit of escalatiestatus.

**Fix**: `useResolveHold` is al beschikbaar. De hold updaten met `severity` = escalatePriority en een `resolution_note` met de escalatiereden, of een apart `escalate` veld toevoegen.

### 2. AutopilotHealth — Retry knoppen (fake simulate)
**Bestand**: `src/pages/enterprise/AutopilotHealth.tsx` regels 44-56
Beide retry-handlers (`handleRetryAll` en `handleRetryItem`) simuleren een delay en tonen een toast. `handleResolveItem` voegt alleen toe aan lokale state maar persisteert niets.

**Fix**: De `integration_failures` tabel bijwerken: status naar "retried" of "resolved". Na de update de query invalideren.

### 3. AuditQueue — Resolve handler (lokale state only)
**Bestand**: `src/pages/enterprise/AuditQueue.tsx` regel 95
`handleResolve` voegt het ID alleen toe aan lokale `resolvedIds` maar persisteert de resolutie niet. Bij een page refresh zijn alle "opgeloste" items terug.

**Fix**: De onderliggende trip of anomaly bijwerken in de database (bijv. een `audit_resolved` veld of een aparte `audit_resolutions` insert).

### 4. Disputes — `onRespond` ontbreekt
**Bestand**: `src/pages/enterprise/Disputes.tsx` regel 179
De `DisputeDetailDialog` ontvangt geen `onRespond` callback. De "Reactie verzenden" knop in de dialog voert de fake delay uit en roept `onRespond?.()` aan — maar die is undefined.

**Fix**: Een `onRespond` callback toevoegen die een notificatie-record aanmaakt of de dispute notes bijwerkt.

### 5. SendOrderDialog — Fake simulate
**Bestand**: `src/components/network/SendOrderDialog.tsx` regel 75
"Opdracht versturen" simuleert een delay en toont een toast, maar stuurt de order niet daadwerkelijk door.

**Fix**: Een `network_orders` of `notifications` record aanmaken in de database met de ordergegevens en het doelbedrijf.

### 6. FuelCards — Import en Sync (fake simulate)
**Bestand**: `src/pages/finance/FuelCards.tsx` regels 100-128
Zowel `handleFileImport` als `handleSync` simuleren verwerking met delays en tonen toasts, maar doen niets met de data.

**Fix**: `handleFileImport` — het bestand parsen en brandstoftransacties inserten. `handleSync` — de `fuel_card_connections` tabel updaten met `last_sync`.

### 7. NotificationChannels — Template/Channel opslaan (lokale state only)
**Bestand**: `src/pages/notifications/NotificationChannels.tsx` regels 147-194
`handleSaveTemplate` en `handleSaveChannel` updaten alleen lokale React state met een fake delay. Bij page refresh zijn alle wijzigingen weg.

**Fix**: De `notification_templates` en `notification_channels` tabellen updaten/inserten via Supabase.

---

## Wijzigingen per bestand

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `src/pages/enterprise/HoldsInbox.tsx` | Escalatie: fake simulate | Hold updaten met hogere severity via DB |
| 2 | `src/pages/enterprise/AutopilotHealth.tsx` | Retry/Resolve: fake simulate | `integration_failures` status updaten |
| 3 | `src/pages/enterprise/AuditQueue.tsx` | Resolve: lokale state only | Resolutie persisteren in DB |
| 4 | `src/pages/enterprise/Disputes.tsx` | onRespond ontbreekt | Callback toevoegen met notificatie insert |
| 5 | `src/components/network/SendOrderDialog.tsx` | Verzenden: fake simulate | Notificatie/order record aanmaken |
| 6 | `src/pages/finance/FuelCards.tsx` | Import/Sync: fake simulate | Transacties inserten, connection updaten |
| 7 | `src/pages/notifications/NotificationChannels.tsx` | Save: lokale state only | Templates/channels naar DB schrijven |

Totaal: 7 bestanden. Mogelijk 1 migratie nodig als `notification_templates`/`notification_channels` tabellen nog niet bestaan.

