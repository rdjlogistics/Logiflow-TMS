

# Automatische Factuur-Herinnering Workflows

## Overzicht

Voeg een nieuw trigger type `invoice_overdue` toe aan het workflow systeem, plus een dagelijkse cron job die vervallen facturen detecteert en de juiste workflows triggert. Gebruikers krijgen een "Templates" tab op de workflow pagina waar ze met één klik de 3 standaard herinnerings-workflows kunnen installeren.

## Architectuur

```text
[pg_cron: dagelijks 08:00]
       │
       ▼
[check-overdue-invoices edge function]
       │ query invoices WHERE due_date < NOW() - interval X days
       │ AND status NOT IN ('betaald')
       │
       ▼  voor elke vervallen factuur:
[execute-workflow edge function]
       │ trigger_type = 'invoice_overdue'
       │ trigger_data = { days_overdue, invoice_id, customer.email, ... }
       │
       ▼  matched workflows voeren acties uit
[send_email / send_sms / create_task / etc.]
```

## Stappen

### Stap 1: Trigger type toevoegen

**`src/hooks/useWorkflowAutomation.ts`** — Voeg `invoice_overdue` toe aan de `WorkflowTrigger` type union en aan `WORKFLOW_TRIGGERS` array:
- Label: "Factuur vervallen"
- Icon: "AlertTriangle"
- Config fields: `days_overdue` (number) — drempel in dagen (7, 14, 30)

### Stap 2: Edge Function `check-overdue-invoices`

**Nieuw: `supabase/functions/check-overdue-invoices/index.ts`**

Dagelijkse cron-functie die:
1. Alle openstaande facturen ophaalt met `due_date < NOW()` en status niet `betaald`
2. Per factuur het aantal dagen overdue berekent
3. Per factuur `execute-workflow` aanroept met `trigger_type: 'invoice_overdue'` en `trigger_data: { days_overdue, invoice_id, invoice_number, customer: { email, name, phone }, total_amount, amount_paid }`
4. Deduplicatie: bijhoudt welke factuur+dagen-combinatie al getriggerd is (via `workflow_runs.trigger_event`) om dubbele herinneringen te voorkomen

### Stap 3: Cron job aanmaken

SQL insert (niet migratie) om een dagelijkse cron job aan te maken die `check-overdue-invoices` elke dag om 08:00 aanroept via `pg_net.http_post()`.

### Stap 4: Templates tab op workflow pagina

**`src/pages/admin/WorkflowAutomation.tsx`** — Voeg een "Templates" tab toe met 3 standaard workflow templates:

| Template | Trigger config | Actie |
|----------|---------------|-------|
| Herinnering (7 dagen) | `invoice_overdue`, `days_overdue: 7` | Email: vriendelijke herinnering |
| Aanmaning (14 dagen) | `invoice_overdue`, `days_overdue: 14` | Email: formele aanmaning |
| Laatste aanmaning (30 dagen) | `invoice_overdue`, `days_overdue: 30` | Email: laatste waarschuwing + taak aanmaken |

Elke template heeft een "Installeren" knop die `createWorkflow` aanroept met vooraf ingevulde naam, trigger, en acties. Templates die al geïnstalleerd zijn tonen een "Geïnstalleerd" badge.

### Stap 5: Execute-workflow aanpassing

**`supabase/functions/execute-workflow/index.ts`** — Voeg matching logica toe voor `invoice_overdue`:
- Check of `trigger_data.days_overdue >= config.days_overdue` zodat een "7 dagen" workflow ook triggert bij 8, 9, etc. dagen overdue
- Maar alleen als `days_overdue < next_threshold` (voorkomt dubbele herinneringen)

### Stap 6: Config.toml registratie

Registreer `check-overdue-invoices` in `supabase/config.toml`.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/hooks/useWorkflowAutomation.ts` — nieuw trigger type + templates export |
| **Edit** | `src/pages/admin/WorkflowAutomation.tsx` — Templates tab |
| **Nieuw** | `supabase/functions/check-overdue-invoices/index.ts` |
| **Edit** | `supabase/functions/execute-workflow/index.ts` — invoice_overdue matching |
| **Edit** | `supabase/config.toml` — functie registratie |
| **Insert** | Cron job via SQL insert |

## Resultaat

- Dagelijkse automatische controle op vervallen facturen
- 3 standaard herinnerings-templates installeerbaar met één klik
- Deduplicatie voorkomt dubbele herinneringen per factuur
- Volledig geïntegreerd in bestaand workflow systeem met run history

