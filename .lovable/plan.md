# Orders that drive the books: automations + finance view per order

## Goal
Every order visibly affects the accounting. New orders and status changes trigger real bookings. Each order shows its invoice, the bank account (IBAN) and whether payment has been matched in the bank.

## 1. Automations (run on their own)
- **New order:** books "expected revenue" in the finance overview, so the cashflow shows it.
- **Order delivered ("afgeleverd"):** creates a draft sales invoice for the customer, using the agreed price and 21% VAT, linked to the order. An order never gets a second invoice.
- **Order checked ("gecontroleerd"):** once the invoice exists, the order is set to "gefactureerd" (invoiced).
- **Bank payment comes in:** bank matching links the payment to the invoice, using the invoice number and amount. The invoice becomes "betaald" (paid), or "deels betaald" (partly paid) for a partial amount.
- Ready-made and switched on for your company. You can switch them off or change them on the automations page.
- Draft invoices are never sent automatically. A failed automation never blocks saving an order; the error appears in the run history.

## 2. "Financieel" section on each order
- **Invoice:** number, date, amount, status and a button to open it. If there's no invoice yet, a "Conceptfactuur maken" button.
- **Bank account:** the customer's IBAN (where you collect from) and your own company IBAN shown on the invoice.
- **Bank matching:** "Wacht op betaling", "Gematcht" (with date, amount, payer IBAN and match certainty) or "Deels betaald", plus a button to match a payment by hand.
- A small status label (Gefactureerd / Betaald / Open) in the order list.

## 3. Trial length
The onboarding steps and the "trial ended" message say 14 days, matching the package list.

## How I'll check it
Using your account, I'll make a test order, which should add expected revenue. Then I'll set it to delivered, which should create a draft invoice, and set it to delivered again to confirm no second invoice. Then I'll add a test bank payment, which should be matched and mark the invoice paid. Last, I'll check that the order screen shows all of this, then remove the test data.

## Technical details
- `execute-workflow`: new actions `record_planned_revenue`, `create_draft_invoice` (check for an existing `invoice_lines.trip_id`) and `mark_invoiced`. Service-role client, everything scoped by `tenant_id`.
- Seed `workflow_automations` and `workflow_actions` for the tenant (data inserts) with status filters in `trigger_config`.
- Bank: reuse `bank-reconcile`. Auto-match on insert of `bank_transactions` via a trigger, keeping `matched_invoice_id`, `match_confidence` and `invoices.amount_paid`/`status` in sync.
- New `OrderFinancePanel` in `OrderDetailView`, plus a hook `useOrderFinance(tripId)` that reads `invoice_lines` → `invoices` → `bank_transactions` and the customer and company IBAN. Signed-in tenant only (existing RLS).
- Text fixes for the trial in `TMSPlanSelector.tsx` and `SubscriptionGate.tsx`.
- Roadmap entries for all three parts.
