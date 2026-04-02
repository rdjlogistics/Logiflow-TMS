

# Non-Functional Buttons & Edge Function Mismatches — Ronde 6

## Gevonden problemen

Na een grondige scan van alle edge function invocaties en hun corresponderende server-side code, zijn er **4 kritieke parameter-mismatches** gevonden die direct resulteren in errors of mislukte acties:

### 1. `send-order-confirmation` — Parameter mismatch (KRITIEK)
**Edge function** (`supabase/functions/send-order-confirmation/index.ts` regel 16) verwacht:
```
{ orderId, to, subject, body }
```
**Alle 4 callers** sturen:
```
{ tripId, customerEmail, customerName, orderNumber, pickupAddress, ... }
```
Resultaat: `orderId` = `undefined` → 400 error "orderId en to verplicht". Geen enkele orderbevestiging wordt ooit verstuurd.

Callers: `OrderCompactRow.tsx`, `OrderMobileCard.tsx`, `EnhancedBulkActionsBar.tsx`, `OrderForm.tsx`

**Fix**: Edge function aanpassen om `tripId` en `customerEmail` te accepteren + een volledige HTML e-mail te genereren met de meegegeven adresgegevens.

### 2. `send-push-notification` — Parameter mismatch
**Edge function** (regel 13) leest `{ title, body: notifBody, userId, data }`.
**Alle 5 callers** sturen `driver_id` in plaats van `userId`.
Resultaat: `userId` = `undefined` → notificatie gelogd naar "user undefined", geen echte actie.

Callers: `QuickDriverAssign.tsx`, `DriverAssignment.tsx`, `OrderForm.tsx`, `DriverDocumentVerificationCard.tsx`, `DocumentVerification.tsx`

**Fix**: Edge function aanpassen: `const userId = body.userId || body.driver_id;` + in-app notification inserten.

### 3. `send-document-email` — Ontbrekende `subject` parameter
**Edge function** (regel 16) vereist `{ to, subject }` en geeft 400 als `subject` ontbreekt.
**Alle 3 callers** sturen `{ to, documentUrl, documentType, orderNumber }` maar **geen `subject`**.
Resultaat: 400 error "to en subject verplicht". Geen enkel document-email wordt verstuurd.

Callers: `SendPodEmailDialog.tsx`, `SendTransportOrderDialog.tsx`, `EnhancedBulkActionsBar.tsx`

**Fix**: Edge function aanpassen om `subject` te genereren uit `documentType` + `orderNumber` als die niet is meegegeven. Ook `documentUrl`, `attachmentUrls` en `message` verwerken in de e-mail body.

### 4. `generate-pod-pdf` — Response mismatch
**Edge function** retourneert `{ html, fileName, success }`.
**Frontend** (`DigitalPOD.tsx` regel 80) verwacht `data.pdf` (base64).
Resultaat: "Geen PDF data ontvangen" error bij POD download.

**Fix**: Frontend aanpassen om ook `data.html` te accepteren als fallback (consistent met `handleDownloadVrachtbrief` patroon dat al op regel 139 staat).

---

## Wijzigingen per bestand

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `supabase/functions/send-order-confirmation/index.ts` | Verwacht `orderId`+`to`, ontvangt `tripId`+`customerEmail` + extra velden | Accepteer beide + genereer HTML e-mail |
| 2 | `supabase/functions/send-push-notification/index.ts` | Verwacht `userId`, ontvangt `driver_id` | Accepteer beide + in-app notification insert |
| 3 | `supabase/functions/send-document-email/index.ts` | Vereist `subject`, callers sturen het niet | Auto-genereer subject uit `documentType`+`orderNumber`, verwerk `documentUrl`/`attachmentUrls` |
| 4 | `src/pages/operations/DigitalPOD.tsx` | Verwacht `data.pdf`, functie retourneert `data.html` | HTML fallback toevoegen (zelfde patroon als `handleDownloadVrachtbrief`) |

Totaal: 3 edge functions + 1 frontend file. Alle fixes zijn backwards compatible. Na deployment werken orderbevestigingen, document-emails, push notificaties en POD downloads end-to-end.

