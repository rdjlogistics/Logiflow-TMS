# Workflows that update the books + consistent trial length

## Goal
When an order is created or its status changes, the workflow system should do real accounting work, not just send signals. The onboarding steps should also say 14 days of free trial everywhere.

## What gets built

### 1. New workflow actions
- **Create draft invoice:** when an order reaches "afgeleverd" (delivered) or "afgerond" (completed), a draft sales invoice is made for that order's customer. It uses the order's agreed price and 21% VAT, and is linked to the order. If the order already has an invoice, nothing new is made.
- **Record expected revenue:** when a new order is created, a "planned revenue" entry is added to the finance overview, so the cashflow shows it.
- **Mark ready for invoicing:** when an order reaches "gecontroleerd" (checked), it is marked "gefactureerd" (invoiced) once its draft invoice exists.

### 2. Two ready-made automations for your company
- "Nieuwe order → verwachte omzet boeken"
- "Order afgeleverd → conceptfactuur maken"

Both are on by default and can be switched off or changed on the automations page.

### 3. Safety
- Automations only ever touch your own company's data.
- A failed automation never blocks saving an order. The error is logged and visible in the run history.
- Draft invoices are never sent automatically. You review them first.

### 4. Trial length
The onboarding steps and the "trial ended" message say 14 days instead of 30, matching the package list.

## How I'll check it
Using your account, I'll create a test order, which should add a planned-revenue entry. Then I'll set it to "afgeleverd", which should create a draft invoice, and set it again to confirm no second invoice appears. Afterwards I'll remove the test data.

## Technical details
- `execute-workflow`: add `create_draft_invoice`, `record_planned_revenue` and `mark_invoiced` actions. They run with the service role, scope everything by `tenant_id`, and check for an existing invoice per `trip_id` before creating one.
- Seed two `workflow_automations` and their `workflow_actions` for tenant a1b2c3d4 (data insert), with `trigger_config` filtering on `new_status`.
- Check the `invoices`, `invoice_lines` and `finance_transactions` columns before writing.
- Text changes in `TMSPlanSelector.tsx`, `SubscriptionGate.tsx` and any other onboarding trial mentions.
- Add roadmap entries for both tasks.

## Open question
Should a draft invoice be made when an order is "afgeleverd" (delivered) or only once it's "gecontroleerd" (checked)? The plan uses "afgeleverd". Tell me if you want "gecontroleerd" instead.
