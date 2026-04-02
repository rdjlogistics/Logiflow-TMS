

# Code-optimalisatie: Invoice limit verlagen in useDashboardData.ts

Verander de invoice query limit van 1000 naar 200 in `src/hooks/useDashboardData.ts`.

## Wijziging

**Bestand: `src/hooks/useDashboardData.ts`**
- Zoek de invoices query met `.limit(1000)` en wijzig naar `.limit(200)`

