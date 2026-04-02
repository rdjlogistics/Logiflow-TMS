

# Non-Functional Buttons Audit — Ronde 4

## Eerder gefixt (Ronde 1, 2 & 3)
18 knoppen zijn al functioneel gemaakt.

## Nieuwe bevindingen

Na grondige scan op `// Simulate`, `await new Promise(setTimeout)`, toast-only handlers, en mock-data patronen zijn er **3 concrete gevallen** gevonden die nog nep-logica of ontbrekende DB-operaties hebben:

### 1. Webhooks — `handleCreate` (toast-only, geen DB)
**Bestand**: `src/pages/enterprise/Webhooks.tsx`
De "Webhook toevoegen" knop toont alleen een toast maar slaat de webhook URL niet op. Bij page refresh is alles weg.

**Fix**: De webhook URL en geselecteerde events opslaan in de `notification_channels` tabel (type = 'webhook') via een Supabase insert.

### 2. DisputeDetailDialog — Fake 1000ms delay
**Bestand**: `src/components/enterprise/DisputeDetailDialog.tsx` regel 39
`handleSendResponse` heeft nog `await new Promise(resolve => setTimeout(resolve, 1000))` als fake delay. De parent (`Disputes.tsx`) doet nu wél echte DB-operaties via `onRespond`, maar de dialog simuleert een wachttijd.

**Fix**: Fake delay verwijderen, `try/finally` toevoegen rond de `onRespond` call.

### 3. SettlementApprovalDialog — Fake 500ms delay bij PDF download
**Bestand**: `src/components/enterprise/SettlementApprovalDialog.tsx` regel 55
`handleDownload` heeft `await new Promise(resolve => setTimeout(resolve, 500))` als fake delay. De PDF-generatie erna is wél echt (maakt een blob + download), maar de delay is onnodig.

**Fix**: Fake delay verwijderen.

### Uitgesloten (geen fix nodig)
- **EDIIntegration / CustomsNCTS**: Mock data als demo-weergave — deze pagina's zijn read-only overzichten zonder DB-tabellen. Aparte feature om deze te koppelen.
- **useFuelStations**: Simulated prijsupdates zijn een bewust demo-feature (met "Demo-weergave actief" badge).
- **WhatIfSimulation**: Per definitie een client-side simulatietool.
- **SalesPipeline `window.location.href`**: Navigeert naar `/customers` — is functioneel, geen toast-only.

---

## Wijzigingen per bestand

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `src/pages/enterprise/Webhooks.tsx` | Toast-only, geen DB | Webhook opslaan in `notification_channels` |
| 2 | `src/components/enterprise/DisputeDetailDialog.tsx` | Fake 1000ms delay | Delay verwijderen, try/finally |
| 3 | `src/components/enterprise/SettlementApprovalDialog.tsx` | Fake 500ms delay | Delay verwijderen |

Totaal: 3 bestanden, geen migraties nodig, geen breaking changes. Dit is waarschijnlijk de laatste ronde met meaningvolle vondsten.

