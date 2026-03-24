

# Plan: Batch Invoices — Deploy & Sync

## Probleem

Beide edge functions (`create-batch-invoices` en `create-batch-purchase-invoices`) hebben **0 logs** — ze zijn nooit gedeployed. De code is compleet en correct (schema-match geverifieerd), maar de wizards falen altijd omdat de functions niet bereikbaar zijn.

## Analyse

Na grondige review:
- **Sales edge function** (`create-batch-invoices`): Code is 100% correct. BTW-logica, invoice_lines, trip linking, rollback — alles klopt met het DB schema.
- **Purchase edge function** (`create-batch-purchase-invoices`): Code is compleet met invoice lines, rollback, en trip linking.
- **DB functions** `get_next_invoice_number` en `get_next_purchase_invoice_number` bestaan.
- **Frontend wizards**: Beide zijn volledig en correct. Sales wizard heeft `company_id` + `tenant_id` filters. Purchase wizard heeft `company_id` + `tenant_id` filters.
- **Schema match**: Alle insert-kolommen matchen exact met `invoices`, `invoice_lines`, `purchase_invoices`, `purchase_invoice_lines`.

Er zijn **geen codewijzigingen nodig**. Alleen deployment.

## Actie

| Stap | Wat |
|---|---|
| 1 | Deploy `create-batch-invoices` edge function |
| 2 | Deploy `create-batch-purchase-invoices` edge function |

Geen bestandswijzigingen. Alleen deploy-actie.

