

# Fix: Factuurnummering & Demo Facturen Opruimen

## Root Cause

The database has invoices from **3 different numbering systems**:
- Old: `202600001`–`202600005` (no separator)
- Migrated: `INV-2026-0082`–`INV-2026-0097`
- Current RPC: `2026-F-00001`, `2026-F-00002` (correct format)
- Broken: `2026-F-89251`, `2026-F-68069`, etc. (random 5-digit numbers from the old `generate_invoice_number` function which parsed mixed formats incorrectly)

The `get_next_invoice_number` RPC is now correct (sequential counter in `invoice_settings`), but `invoice_settings.next_invoice_number` = 3, so only 00001 and 00002 have been generated correctly.

Additionally, `EnhancedBulkActionsBar.tsx` still falls back to the broken `generate_invoice_number` function.

## Fixes

### 1. Reset invoice counter
Data update via insert tool: set `next_invoice_number` to 3 (current value is already correct — 00001 and 00002 exist). No change needed here.

### 2. Remove fallback to broken `generate_invoice_number`
**File:** `src/components/orders/EnhancedBulkActionsBar.tsx`

Replace the fallback pattern:
```typescript
// Before:
const { data: invoiceNumber } = companyId 
  ? await supabase.rpc('get_next_invoice_number', { p_company_id: companyId })
  : await supabase.rpc('generate_invoice_number');

// After: always use get_next_invoice_number, fail if no companyId
if (!companyId) throw new Error('Geen bedrijf gevonden');
const { data: invoiceNumber } = await supabase.rpc('get_next_invoice_number', { p_company_id: companyId });
```

### 3. Add "Demo facturen opruimen" feature
**File:** `src/pages/Invoices.tsx`

Add a cleanup button + dialog that:
- Queries invoices where: status IN ('concept', 'vervallen') AND sent_at IS NULL AND invoice_date < 30 days ago
- Shows a list with checkboxes for user selection
- On confirm: deletes selected invoice_lines + invoices (concept only) or archives (vervallen → 'geannuleerd')
- Uses `DeleteConfirmDialog` pattern with custom content

### 4. Invoice date validation
**File:** `src/components/invoices/ManualInvoiceForm.tsx` and `supabase/functions/create-batch-invoices/index.ts`

- Frontend: warn if invoice_date > 7 days in the past
- Validate total_amount > 0 and customer selected (likely already done, will verify)

## Files

| Action | File |
|--------|------|
| **Edit** | `src/components/orders/EnhancedBulkActionsBar.tsx` — Remove `generate_invoice_number` fallback |
| **Edit** | `src/pages/Invoices.tsx` — Add demo cleanup button + dialog |
| **Edit** | `src/components/invoices/ManualInvoiceForm.tsx` — Date validation |

