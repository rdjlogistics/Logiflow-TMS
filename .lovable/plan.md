

# Audit: Mobiele UX & Bulk Action Bars — Fix Plan

## Probleem Analyse

Na grondige inspectie van de codebase zijn er **3 categorieën kritieke mobiele UX-bugs** gevonden:

### 1. Bulk Action Bars vallen buiten beeld op mobiel (6 bestanden)
Alle bulk action bars gebruiken `max-w-fit` waardoor de breedte onbeperkt groeit en op kleine schermen (375px) buiten het viewport valt. Knoppen zijn dan onbereikbaar.

**Getroffen bestanden:**
- `src/components/orders/EnhancedBulkActionsBar.tsx` — meeste knoppen, ergste overflow
- `src/components/fleet/FleetBulkActions.tsx`
- `src/components/drivers/DriverBulkActions.tsx`
- `src/components/admin/document-verification/BulkActions.tsx`
- `src/components/trips/BulkActionBar.tsx` — Select dropdowns te breed op mobiel
- `src/components/invoices/InvoiceBulkActionsBar.tsx`
- `src/components/purchase-invoices/PurchaseInvoiceBulkActions.tsx`

### 2. QuickDriverAssign ref warning (console error)
`QuickDriverAssign` is een function component dat als child van `Dialog` een ref ontvangt maar geen `forwardRef` gebruikt. Veroorzaakt React warning in console.

### 3. `size="icon-sm"` bestaat niet op Button component
5 bestanden gebruiken `size="icon-sm"` maar dit is geen geregistreerde variant in de Button component, wat onvoorspelbaar gedrag geeft.

---

## Uitvoeringsplan

### Batch 1: Bulk Action Bars mobiel-proof maken (7 bestanden)

**Aanpak per bestand — zelfde patroon overal:**

1. Vervang `max-w-fit` door `max-w-[calc(100vw-1.5rem)]` zodat de bar nooit breder is dan het scherm
2. Voeg `overflow-x-auto scrollbar-none` toe aan de inner container zodat je horizontaal kunt scrollen als nodig
3. Maak de inner container `flex-nowrap` met `min-w-0` op children zodat items krimpen
4. Op mobiel (<640px): verberg tekst-labels, toon alleen iconen (al deels gedaan met `hidden md:inline`)
5. Trip BulkActionBar: maak Select triggers smaller op mobiel (`w-[130px] sm:w-[160px]`)

### Batch 2: Component fixes (2 bestanden)

1. **QuickDriverAssign.tsx**: Wrap component in `React.forwardRef` zodat Dialog geen ref-warning geeft
2. **Button component check**: Voeg `icon-sm` als geldige size variant toe OF vervang alle 5 usages door `size="icon"` met `h-7 w-7` class

### Batch 3: Trips BulkActionBar responsive fix

De trips bar heeft twee vaste-breedte Select dropdowns (`w-[160px]` + `w-[180px]` = 340px) plus tekst en knop. Op 375px scherm past dit niet.

**Fix:** Stack de selects verticaal op mobiel met `flex-col sm:flex-row` of maak ze smaller (`w-full sm:w-[160px]`)

---

## Technische Details

```text
Bestanden te wijzigen:     9
Patroon:                   Uniform responsive bulk bar
Mobile breakpoint:         < 640px (sm:)
Scroll fallback:           overflow-x-auto scrollbar-none
Touch:                     touch-manipulation op alle knoppen
```

**Verwacht resultaat:** Alle bulk action bars zijn 100% bruikbaar op elk schermformaat, geen content valt buiten beeld, alle knoppen bereikbaar.

