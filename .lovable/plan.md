

# Plan: Fix ai_usage_daily_rollup Cron Job

## Probleem

De `ai_usage_daily_rollup` tabel bevat 0 rijen, terwijl er 14 `ai_credit_transactions` bestaan (18-23 maart). Er is geen cron job en geen database functie om de rollup te vullen.

## Oplossing

### 1. Database migratie: rollup functie aanmaken

Nieuwe `public.refresh_ai_usage_daily_rollup()` functie die:
- Alle transacties van gisteren aggregeert per tenant
- `INSERT ... ON CONFLICT (tenant_id, date) DO UPDATE` zodat het idempotent is
- Velden: `total_credits` (SUM), `total_tokens` (SUM), `total_requests` (COUNT), `unique_users` (COUNT DISTINCT), `cost_estimate_eur` (credits * 0.01 schatting)
- Eerst een unique constraint op `(tenant_id, date)` toevoegen als die ontbreekt

### 2. Cron job registreren

Via insert tool een `cron.schedule` aanmaken die dagelijks om 00:05 de functie aanroept:
```sql
SELECT cron.schedule('refresh-ai-usage-rollup', '5 0 * * *', 'SELECT public.refresh_ai_usage_daily_rollup()');
```

### 3. Backfill bestaande data

Eenmalige query via insert tool om de 14 bestaande transacties (18-23 maart) in de rollup te aggregeren zodat de widget direct data toont.

## Bestanden / Acties

| Actie | Wat |
|---|---|
| DB migratie | Unique constraint + `refresh_ai_usage_daily_rollup()` functie |
| Insert (data) | Cron job registreren + backfill bestaande transacties |

Geen frontend wijzigingen nodig — de widget leest al uit `ai_usage_daily_rollup`.

