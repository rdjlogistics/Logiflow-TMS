

# Fix: Bulk Action Bars overal in de app goed in beeld brengen

## Probleem

Alle 7 bulk action bars in de app gebruiken `fixed bottom-6 left-1/2 -translate-x-1/2` zonder rekening te houden met:
1. **Mobiele bottom navigatie** — De `MobileBottomNav` is ~60px hoog. Bulk bars op `bottom-6` (24px) zitten er **achter/onder**
2. **Horizontale overflow** — `PurchaseInvoiceBulkActions` heeft zelfs `min-w-[600px]` op een 390px scherm
3. **Knoppen buiten beeld** — Op smalle schermen vallen actieknoppen rechts uit het scherm

## Getroffen bestanden (7 stuks)

| # | Component | Probleem |
|---|-----------|----------|
| 1 | `src/components/purchase-invoices/PurchaseInvoiceBulkActions.tsx` | `min-w-[600px]`, horizontale rij met 5 knoppen, geen mobile layout |
| 2 | `src/components/invoices/InvoiceBulkActionsBar.tsx` | Horizontale rij, geen max-width, overlapt met bottom nav |
| 3 | `src/components/fleet/FleetBulkActions.tsx` | `bottom-6`, overlapt met bottom nav |
| 4 | `src/components/drivers/DriverBulkActions.tsx` | `bottom-6`, overlapt met bottom nav |
| 5 | `src/components/admin/document-verification/BulkActions.tsx` | `bottom-6`, overlapt met bottom nav |
| 6 | `src/components/trips/BulkActionBar.tsx` | `bottom-4`, `w-[95vw]` — beter maar nog steeds overlap |
| 7 | `src/components/orders/EnhancedBulkActionsBar.tsx` | Desktop: `bottom-6` overlapt; mobile wrapper in OrderOverview helpt deels |

## Fix per component

### Alle 7 bars krijgen dezelfde aanpassingen:

**1. Bottom positie verhoogd op mobile** — Van `bottom-6` naar `bottom-20` op mobile (boven de 60px bottom nav), desktop blijft `bottom-6`:
```
className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50"
```

**2. Maximale breedte + padding** — Voorkomen dat de bar breder is dan het scherm:
```
className="... w-[calc(100vw-1.5rem)] max-w-2xl"
```

**3. PurchaseInvoiceBulkActions — Responsive layout**
- Verwijder `min-w-[600px]`
- Mobile: verticale/wrap layout met compacte knoppen (alleen iconen)
- Desktop: huidige horizontale layout behouden
- Actieknoppen wrappen in een `flex-wrap` container

**4. InvoiceBulkActionsBar — Responsive layout**
- Knoppen tonen alleen iconen op mobile, labels op desktop
- `flex-wrap` toevoegen

**5. Compact bars (Fleet, Driver, DocVerification)**
- Alleen `bottom-20 md:bottom-6` + `w-[calc(100vw-1.5rem)] max-w-fit` toevoegen
- Deze bars zijn al compact genoeg

**6. Trips BulkActionBar**
- Van `bottom-4` naar `bottom-20 md:bottom-4`
- Selectboxen krijgen kleinere width op mobile

**7. EnhancedBulkActionsBar (Orders)**
- Desktop: `bottom-20 md:bottom-6`
- De mobile wrapper in `OrderOverview.tsx` (regel 1081) wordt aangepast naar `bottom-20` in plaats van `bottom-0`

## Resultaat
- Bulk action bars zijn altijd zichtbaar boven de bottom navigatie op telefoon
- Geen horizontale overflow meer
- Alle knoppen zijn bereikbaar op elk device
- Desktop layout blijft ongewijzigd

