

# Fix: Datum- en Tijdvalidaties Door de Hele App

## Wat wordt gedaan

### 1. Validatie-functies toevoegen aan `date-utils.ts`
**File:** `src/lib/date-utils.ts`

Nieuwe exports:
- `isValidDeliveryDate(date)` — `date >= vandaag (middernacht)`
- `isValidDateRange(start, end)` — `end >= start`
- `getToday()` — vandaag als `Date` met tijd op 00:00
- `getTodayISO()` — vandaag als `YYYY-MM-DD` string (voor `<input type="date" min=...>`)
- `getMinInvoiceDate()` — 7 dagen geleden als `YYYY-MM-DD`

`formatShortDate` en `formatDateTime` gebruiken al `nl-NL` locale met 4-cijferig jaar — deze zijn correct.

### 2. Order formulier — DestinationCard.tsx
**File:** `src/components/orders/DestinationCard.tsx`

- Calendar component: voeg `disabled={(date) => date < getToday()}` toe voor de pickup/delivery date picker (line 495)

### 3. Order formulier — OrderDetailsPanel.tsx
**File:** `src/components/orders/OrderDetailsPanel.tsx`

- Calendar voor order_date: voeg `disabled={(date) => date < getToday()}` toe (line 210)

### 4. B2C Booking Wizard
**File:** `src/components/portal/b2c/B2CBookingWizard.tsx`

- `pickupDate` wordt als string gezet (`todayStr`). Voeg `min={getTodayISO()}` toe aan de date input als die bestaat, of voeg een date picker toe met `disabled` voor verleden datums.
- Momenteel geen expliciet date input veld zichtbaar in de wizard stappen — de datum wordt automatisch op vandaag gezet. Geen wijziging nodig.

### 5. Facturatie — ManualInvoiceForm.tsx
**File:** `src/components/invoices/ManualInvoiceForm.tsx`

- Factuurdatum `<Input type="date">` (line 262): voeg `min={getMinInvoiceDate()}` toe
- Vervaldatum `<Input type="date">` (line 270): voeg `min={formData.invoice_date}` toe (vervaldatum >= factuurdatum)

### 6. Facturatie — BatchInvoiceWizard.tsx
**File:** `src/components/invoices/BatchInvoiceWizard.tsx`

- Factuurdatum input (line 570): voeg `min={getMinInvoiceDate()}` toe

### 7. GiftCenter datum picker
**File:** `src/pages/crm/GiftCenter.tsx`

- Al correct: `disabled={(date) => date < new Date()}` (line 486). Geen wijziging nodig.

## Technische Details

Alle `<Input type="date">` velden gebruiken het native browser date format dat al `YYYY-MM-DD` is (ISO). De weergave in de UI hangt af van de browser locale. De Calendar component (Shadcn) toont standaard 4-cijferige jaren.

De `min` attribuut op `<Input type="date">` voorkomt selectie van verleden datums op browser-niveau. De `disabled` callback op de Calendar component doet hetzelfde voor de Shadcn date picker.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/lib/date-utils.ts` — Nieuwe validatie functies |
| **Edit** | `src/components/orders/DestinationCard.tsx` — min date op Calendar |
| **Edit** | `src/components/orders/OrderDetailsPanel.tsx` — min date op Calendar |
| **Edit** | `src/components/invoices/ManualInvoiceForm.tsx` — min/max op date inputs |
| **Edit** | `src/components/invoices/BatchInvoiceWizard.tsx` — min op factuurdatum |

