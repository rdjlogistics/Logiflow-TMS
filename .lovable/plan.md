

# Chauffeurs Portalen — Grondige Audit & Fix Plan

## Gevonden problemen

Na het doorlichten van alle chauffeurs- en carrier-portaal code en bijbehorende edge functions, zijn er **5 kritieke bugs** gevonden die edge function errors veroorzaken, plus **1 parameter-mismatch** die zorgt dat e-mails nooit aankomen.

### 1. `auto-send-vrachtbrief` — Parameter mismatch (KRITIEK)
**Alle 7 callers** sturen `{ tripId }`, maar de edge function destructureert `{ orderId }`. Resultaat: `orderId` is altijd `undefined` → 400 error "orderId verplicht".

- `StopCheckoutFlow.tsx` → `{ body: { tripId } }`
- `useDriverTrips.ts` → `{ body: { tripId } }`
- `useOfflineSync.ts` → `{ body: { tripId: checkout.tripId } }`
- `QuickEditPopover.tsx` → `{ body: { tripId } }`
- `useStopEvents.ts` → `{ body: { tripId } }`
- `OrderCompleteDialog.tsx` → `{ body: { tripId: orderId } }`
- `EnhancedBulkActionsBar.tsx` → `{ body: { tripId: id } }`

**Fix**: Edge function aanpassen: `const orderId = body.tripId || body.orderId;` (backwards compatible)

### 2. `generate-document-pdf` — Parameter mismatch (KRITIEK)
`DocumentsSheet.tsx` stuurt `{ orderId: tripId, documentType }`, maar de edge function verwacht `{ entityId, documentType }`. Resultaat: `entityId` is `undefined` → 400 error.

**Fix**: Edge function aanpassen: `const entityId = body.entityId || body.orderId;`

### 3. `send-customer-notification` — Parameter mismatch (EMAILS KOMEN NIET AAN)
`customerNotifications.ts` stuurt:
```
{ customer_id, title, body, notification_type, data: { trip_id, status } }
```
Maar de edge function destructureert:
```
{ customer_id, trip_id, notification_type, message, subject }
```
Problemen:
- `trip_id` zit genest in `data` maar wordt top-level verwacht
- Het bericht wordt als `body` gestuurd maar de functie leest `message`
- `title` wordt gestuurd maar de functie leest `subject`

**Fix**: Edge function aanpassen om alle varianten te accepteren

### 4. `send-push-notification-to-planners` — Doet geen echte push
De functie logt alleen `console.log("Would send...")` maar stuurt geen echte push notificatie. Het maakt wél in-app notifications aan, dus die werken. De push zelf is een no-op.

**Fix**: Dit is acceptabel als tussenoplossing — de in-app notificaties werken. De push-crypto vereist een web-push library. Markeren als known limitation, geen breaking fix nodig.

### 5. `send-delivery-confirmation` — `getClaims` compatibiliteit
Gebruikt `supabase.auth.getClaims()` wat alleen werkt met `@supabase/supabase-js` v2.69+. De import is `@supabase/supabase-js@2` (floating) wat zou moeten resolven naar een recente versie, maar dit is fragiel.

**Fix**: Als dit al werkt hoeft het niet aangepast. Maar de functie moet ook `tripId` correct ontvangen — dit werkt al correct want de functie leest `body.tripId || body.orderId`.

---

## Wijzigingen per bestand

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `supabase/functions/auto-send-vrachtbrief/index.ts` | Verwacht `orderId`, ontvangt `tripId` | Accepteer beide: `body.tripId \|\| body.orderId` |
| 2 | `supabase/functions/generate-document-pdf/index.ts` | Verwacht `entityId`, ontvangt `orderId` | Accepteer beide: `body.entityId \|\| body.orderId` |
| 3 | `supabase/functions/send-customer-notification/index.ts` | Verwacht `trip_id` en `message` top-level, ontvangt genest in `data` en als `body` | Beide varianten accepteren |
| 4 | `src/lib/customerNotifications.ts` | Stuurt verkeerde property names | Parameters corrigeren naar wat de functie verwacht |

Totaal: 3 edge functions + 1 client file. Na wijzigingen moeten de 3 edge functions herdeployed worden.

Geen database migraties nodig. Geen breaking changes — alle fixes zijn backwards compatible.

