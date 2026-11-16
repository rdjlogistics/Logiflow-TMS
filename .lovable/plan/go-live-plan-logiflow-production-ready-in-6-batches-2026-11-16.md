# Go-live plan: LogiFlow production-ready in 6 batches

Each batch ends with a real test using your account. Batches 1 and 2 are required before going live. Batches 3 to 6 make things safer and better.

## Done today
- App connects to the right server (old server addresses removed)
- Package list in the wizard restored (Solo €29, Starter €79, Growth €159, Scale €299, plus the AI add-ons)
- Automatic accounting: expected revenue and a draft invoice per order, invoice finalised on delivery, bank payment matched to the invoice and marked paid
- Finance section on each order (invoice, IBAN, bank matching)
- New "Boekhouding" (accounting) page
- 14-day trial starts automatically, with its end date shown

## Batch 1 — Security (required)
- Close off the 65 database functions that anyone can run right now. Limit them to signed-in users, or to the system only.
- Turn on leaked-password protection, so known stolen passwords are refused at signup
- Run a new security scan and fix everything it finds
- Test: try to read another company's data → must be refused

## Batch 2 — Core flows end to end (required)
- New customer: sign up → wizard → choose a package → trial with an end date
- Order: create → schedule → driver → delivery with POD → invoice → payment
- Fix the 400 errors on the dashboard counters for drivers and trips
- Repair errors shown in the browser (including a component that can't receive a reference)
- Customer portal and driver portal: sign in and test the basic actions
- Test: complete every flow once with a real account, with no errors in the log

## Batch 3 — Payments and email
- Mollie: switch on payment for a package after the trial ends, and check the webhook
- Invoice emails and reminders: sender address on your own domain (rdjlogistics.nl), so emails don't land in spam
- Test: a test payment in Mollie test mode, and a test invoice email to your own address

## Batch 4 — Accounting polish
- Manual "match payment" right on the order (now it links to the bank page)
- Expenses: fuel, tolls and purchase invoices booked automatically per order
- Monthly overview and VAT summary per quarter, exportable for the accountant
- Your own IBAN and company details checked on every invoice

## Batch 5 — Speed and stability
- Speed up slow lists (orders, invoices) with pages of 50 at a time
- Error log for live users, so problems become visible before customers report them
- Check backups and the Cloud size

## Batch 6 — Design refresh
- One clean, modern style across all screens, using your Elite Class look (pure black, fine lines)
- Start with the screens you use most: dashboard, order screen, planning, invoices
- Mobile check for the driver app

## How we work
I do one batch per round and show you the test result. You say "volgende batch" (next batch), and I continue.

## Technical details
- Batch 1: `REVOKE EXECUTE ... FROM anon` on SECURITY DEFINER functions that aren't needed publicly. Keep the tracking-token and portal functions that anon does need. Turn on HIBP via configure_auth.
- Batch 2: HEAD `drivers`/`trips` count queries return 400 (column filter `deleted_at` on drivers, or a missing grant). The forwardRef warning is in TMSPlanSelector/OnboardingWizard.
- Batch 3: check the Mollie edge functions and RESEND_FROM_EMAIL. Email domain via the email setup.
- Batch 4: extend `sync_trip_accounting` to purchase costs (`purchase_total`) as a cost booking.
- Batch 5: `.range()` pagination, plus the `client_error_logs` table, which already exists.
