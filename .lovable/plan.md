

# pg_cron + pg_net activeren en 3 cron jobs registreren

## Stap 1: Extensies activeren via migratie
SQL migratie aanmaken:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

## Stap 2: Cron jobs registreren via SQL insert (niet migratie)
Drie jobs via `cron.schedule()` + `net.http_post()`:

1. **Email queue** — elke 2 minuten
2. **Overdue invoices** — dagelijks 07:00 UTC  
3. **Diesel price update** — dagelijks 06:00 UTC

Alle drie roepen de bestaande edge functions aan via `net.http_post()` met de project URL (`https://spycblsfcktsnepsdssv.supabase.co/functions/v1/{function}`) en de anon key als Bearer token.

## Technische details
- Extensie-activering gaat via de migratie-tool (schema change)
- Cron job registratie gaat via de SQL insert tool (bevat project-specifieke URLs/keys, mag niet in migraties)
- Als de migratie opnieuw timeout geeft, proberen we de extensies via de insert tool als fallback

## Risico
De vorige poging faalde door database timeouts. Dit is een infra-issue, niet een SQL-issue. De SQL zelf is correct.

