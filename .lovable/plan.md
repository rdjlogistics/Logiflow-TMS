

# Non-Functional Buttons Audit — Ronde 3

## Eerder gefixt (Ronde 1 & 2)
13 knoppen zijn al functioneel gemaakt in de vorige rondes.

## Nieuwe bevindingen

Na een grondige scan op `// Simulate`, `await new Promise(setTimeout)`, en toast-only handlers zijn er **5 nieuwe gevallen** gevonden die nog nep-logica bevatten:

### 1. ExceptionActionDialog — Fake delay voor `onPing` en `onResolve`
**Bestand**: `src/components/enterprise/ExceptionActionDialog.tsx` regels 44 en 61
Beide handlers gebruiken `await new Promise(resolve => setTimeout(resolve, 800))` als fake delay voordat ze de callback aanroepen. De parent (`ExceptionsInbox`) doet nu wél echte DB-operaties, maar de dialog zelf simuleert nog een wachttijd.

**Fix**: De fake delays verwijderen. De `setIsSubmitting` koppelen aan de daadwerkelijke callback-uitvoering.

### 2. AlertRuleDialog — Fake delay voor `onSave`
**Bestand**: `src/components/enterprise/AlertRuleDialog.tsx` regel 42
Dezelfde situatie: `await new Promise(resolve => setTimeout(resolve, 800))` als fake delay. De parent doet nu echte DB-operaties, maar de dialog simuleert.

**Fix**: Fake delay verwijderen.

### 3. AuditReviewDialog — Fake delay voor `onResolve`
**Bestand**: `src/components/enterprise/AuditReviewDialog.tsx` regel 35
`await new Promise(resolve => setTimeout(resolve, 1000))` als fake delay. De parent (`AuditQueue`) persisteert nu naar de DB, maar de dialog simuleert nog.

**Fix**: Fake delay verwijderen.

### 4. MomentsEngine — `handleScanEvents` fake delay
**Bestand**: `src/pages/crm/MomentsEngine.tsx` regel 77
De "Events scannen" knop toont een toast, wacht 1 seconde (fake), en toont dan een tweede toast. Er wordt geen echte data-operatie uitgevoerd — niet eens een `refetch()`.

**Fix**: De fake delay vervangen door een echte `refetch()` aanroep om momenten opnieuw uit de database op te halen.

### 5. AddPaymentMethodDialog — Fake simulate
**Bestand**: `src/components/portal/b2c/AddPaymentMethodDialog.tsx` regel 163
De `handleSubmit` simuleert een API call met `await new Promise(resolve => setTimeout(resolve, 1500))`. De betaalmethode wordt alleen lokaal aangemaakt met `crypto.randomUUID()` en nooit naar de database gestuurd.

**Fix**: Dit is een B2C portal feature. Aangezien er geen `payment_methods` tabel bestaat, is de beste fix om de fake delay te verwijderen en het lokale-state patroon te behouden (de parent `onAdd` callback regelt de opslag). De delay van 1500ms is onnodig.

### Uitgesloten (geen fix nodig)
- **DownloadDataDialog**: Progress is cosmetisch maar de `onDownload` callback doet écht werk (genereert blob + download)
- **BulkBookingImport**: Progress is cosmetisch maar `onImport` doet écht werk
- **AccountingIntegrations**: Gebruikt een fake 2s delay maar doet daarna wél een echte DB update — acceptabel patroon
- **WhatIfSimulation**: Is per definitie een simulatie-tool — het berekent scenario's client-side, dat is de bedoeling
- **DataQuality**: De `setTimeout` wraps een echte `refetch()` — alleen de delay is onnodig maar de operatie is echt
- **useAuth/useCompany/errorRecovery**: Retry delays zijn legitieme backoff-patronen

---

## Wijzigingen per bestand

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `src/components/enterprise/ExceptionActionDialog.tsx` | 2× fake delay 800ms | Delays verwijderen |
| 2 | `src/components/enterprise/AlertRuleDialog.tsx` | Fake delay 800ms | Delay verwijderen |
| 3 | `src/components/enterprise/AuditReviewDialog.tsx` | Fake delay 1000ms | Delay verwijderen |
| 4 | `src/pages/crm/MomentsEngine.tsx` | Fake scan, geen refetch | Fake delay → echte `refetch()` |
| 5 | `src/components/portal/b2c/AddPaymentMethodDialog.tsx` | Fake 1500ms delay | Delay verwijderen |

Totaal: 5 bestanden, geen database migraties, geen breaking changes. Kleine maar belangrijke cleanup.

