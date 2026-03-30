

# Bevestigingsdialoog voor Factuuraanmaak

## Wat
Voeg een extra bevestigingsdialoog toe op het moment dat de gebruiker op "Facturen aanmaken" klikt — zowel bij **verkoop** (BatchInvoiceWizard) als **inkoop** (BatchPurchaseInvoiceWizard). De dialoog toont een samenvatting (aantal facturen, totaalbedrag) en vereist expliciete bevestiging.

## Aanpak
Gebruik de bestaande `ConfirmDialog` component (`src/components/ui/ConfirmDialog.tsx`) die al variant-support en loading state heeft.

### 1. `src/components/invoices/BatchInvoiceWizard.tsx`
- Voeg `showConfirm` state toe
- Wijzig `handleSubmit` (regel 392): in plaats van direct `batchInvoiceMutation.mutate()`, zet `showConfirm = true`
- Render `ConfirmDialog` met:
  - Titel: "Facturen definitief aanmaken?"
  - Beschrijving: dynamisch met aantal facturen en totaalbedrag
  - Variant: `warning`
  - `isLoading` gekoppeld aan `batchInvoiceMutation.isPending`
  - `onConfirm`: roept `batchInvoiceMutation.mutate()` aan

### 2. `src/components/purchase-invoices/BatchPurchaseInvoiceWizard.tsx`
- Zelfde patroon: `showConfirm` state
- De `onNext` op regel 288 opent de dialoog i.p.v. direct `createInvoicesMutation.mutate()`
- `ConfirmDialog` met variant `warning` en loading state

### Geen andere bestanden wijzigen
De `ConfirmDialog` component bestaat al en hoeft niet aangepast te worden.

