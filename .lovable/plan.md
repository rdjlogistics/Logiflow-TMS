

# Fix: Overdue facturen batch-update

## Probleem
9 facturen met status 'verzonden' hebben een `due_date` die al maanden verstreken is (jan-feb 2026, het is nu april 2026). De cron job `check-overdue-invoices` triggert alleen workflow-acties maar **update de status niet** naar 'vervallen'. Dit is een gap in de edge function.

## Wat is schoon (geen actie nodig)
- Email queue: leeg, 0 items
- Workflow runs: 0 incomplete
- Factureerbare ritten (15): wachten terecht op handmatige batch-wizard — geen automatische actie
- Inkoopfactureerbare ritten (2): idem

## Oplossing (1 bestand)

### `supabase/functions/check-overdue-invoices/index.ts`
Voeg een automatische status-update toe: facturen die 7+ dagen voorbij due_date zijn EN status 'verzonden' of 'concept' hebben → status wordt 'vervallen'.

Concreet:
- Na het ophalen van overdue facturen, batch-update alle facturen met `due_date < today - 7 dagen` naar status `'vervallen'`
- Log het aantal bijgewerkte facturen
- De workflow-trigger logica (herinneringen) blijft intact

### Resultaat na uitvoering
- 9 facturen automatisch gemarkeerd als 'vervallen'
- Dashboard KPI's tonen correcte aantallen
- Toekomstige cron-runs houden dit automatisch bij

### Geen wijzigingen aan
- Handmatige batch-facturatie flows
- Email queue processing
- Andere edge functions
- Frontend code

