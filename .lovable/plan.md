

# Fix: POD (Proof of Delivery) Data & Functies

## Root Causes

1. **Chauffeur leeg**: `useStopProofs` queries `profiles` by `user_id`, maar `driver_id` in `stop_proofs` referenceert `drivers.id` (niet `auth.users.id`). Moet `drivers` table queryen op `id` i.p.v. `profiles` op `user_id`.

2. **Status vs inhoud mismatch**: De status-logica is correct (gebaseerd op `!!row.signature_url`), maar `signature_url` bevat een storage *path* die niet gevonden kan worden via `getCachedSignedUrl`. Het detail modal toont "Geen handtekening" omdat de signed URL `null` teruggeeft. De status badge zou alleen "Getekend" moeten tonen als de signed URL daadwerkelijk opgelost kan worden — maar dat is een async operatie. Pragmatische fix: de detail modal moet niet `getCachedSignedUrl` gebruiken met een incorrect bucket; verifieer dat `pod-files` bucket correct is.

3. **Timestamps gelijk**: `arrivalTime` en `departureTime` worden allebei door de chauffeur ingevuld in het checkout formulier. Als de chauffeur ze hetzelfde invult, zijn ze gelijk. De UI moet "-" tonen als ze identiek zijn i.p.v. 0 min wachttijd.

4. **`generate-pod-pdf` ontbreekt**: De edge function bestaat niet, waardoor de PDF download knop faalt.

5. **Verstuur knop**: Dialog werkt al (`SendPodEmailDialog`) maar stuurt een vrachtbrief i.p.v. POD PDF. Moet ook customer email auto-invullen.

## Fixes

### 1. Fix chauffeur koppeling — `src/hooks/useStopProofs.ts`
Vervang de `profiles` query door een `drivers` query:
```typescript
// OUD:
supabase.from('profiles').select('user_id, full_name').in('user_id', driverIds)
// NIEUW:
supabase.from('drivers').select('id, name').in('id', driverIds)
```
En map `driver_name: driver?.name || null` (i.p.v. `profile?.full_name`).

### 2. Fix timestamps UI — `src/pages/operations/DigitalPOD.tsx`
In `TimeCard` en de times section: als `arrival_time === departure_time`, toon departure als "-" en wachttijd als "-".

### 3. Auto-fill customer email in Verstuur dialog
In `DigitalPOD.tsx` waar `SendPodEmailDialog` wordt aangeroepen, haal het customer email op via de trip → customer relatie. Voeg `customer_email` toe aan `StopProofRecord` en vul het via de trip join in `useStopProofs`.

### 4. Maak `generate-pod-pdf` edge function
Nieuwe edge function `supabase/functions/generate-pod-pdf/index.ts` die:
- Stop proof data ophaalt uit de database
- Trip, stop, driver, customer data joinet
- Signature en photo signed URLs genereert
- Een PDF genereert met jsPDF-achtige HTML-to-PDF of een eenvoudige HTML-based PDF
- Base64 PDF teruggeeft

### 5. Fix `SendPodEmailDialog` — POD context
Voeg optie toe om POD PDF te versturen (naast vrachtbrief/transportopdracht). Wanneer geopend vanuit POD detail, default naar POD type.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/hooks/useStopProofs.ts` — drivers query i.p.v. profiles, customer_email toevoegen |
| **Edit** | `src/pages/operations/DigitalPOD.tsx` — timestamp display fix, customer email doorgeven |
| **Edit** | `src/components/operations/SendPodEmailDialog.tsx` — POD document type toevoegen |
| **Nieuw** | `supabase/functions/generate-pod-pdf/index.ts` — PDF generatie |

