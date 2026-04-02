
# Fix: Inkoopfactuur aanmaken faalt — `line_type` constraint violation

## Probleem

De edge function `create-batch-purchase-invoices` zet `line_type: "transport"` bij het aanmaken van factuurregels, maar de database constraint op `purchase_invoice_lines` staat alleen deze waarden toe:
- `trip`
- `accessorial`
- `fuel_surcharge`
- `other`

Dit veroorzaakt een database error: `new row for relation "purchase_invoice_lines" violates check constraint "purchase_invoice_lines_line_type_check"`.

De factuur-header wordt wel aangemaakt, maar de regels falen — waarna de edge function de factuur weer verwijdert (rollback) en een error teruggeeft.

## Fix

**1 bestand**: `supabase/functions/create-batch-purchase-invoices/index.ts`

Wijzig regel waar `line_type: "transport"` staat naar `line_type: "trip"` (regel ~175).

Na de fix wordt de edge function opnieuw gedeployed.

## Impact
- Geen database migratie nodig
- Geen frontend wijzigingen
- Backwards compatible
- Na deployment werkt het aanmaken van inkoopfacturen direct end-to-end
