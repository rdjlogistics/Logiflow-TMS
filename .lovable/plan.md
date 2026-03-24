

# Plan: Onafgemaakte Batches Vandaag — Fixes & Perfectie

## Analyse: Wat is er vandaag gedaan en wat mist er nog?

### Batch 1: AI Upgrade (chatgpt + copilot) ✅ COMPLEET
- Reasoning, 6 nieuwe tools, multi-step loop, expert prompt — alles correct geïmplementeerd
- Geen problemen gevonden

### Batch 2: Claims & POD iOS 26 Redesign ⚠️ PROBLEMEN GEVONDEN

**5 bugs/onvolledigheden:**

1. **Dubbele Settlement optie**: Line 53-55 heeft twee keer "Charter" als label — `carrier` → "Charter" en `charter` → "Charter". Dit is verwarrend. Fix: `carrier` → "Vervoerder", `customer` → "Klant", `charter` → "Charter"

2. **Claims missen order data**: De `usePODClaims` hook fetcht claims met `select("*")` maar de ClaimCard verwacht `claim.order_number` en `claim.customer`. Deze velden zitten NIET in de `claim_cases` tabel — ze moeten via een JOIN op `orders` en `customers` komen. **Hierdoor tonen alle claims "—" als ordernummer en "Onbekend" als klant.**

3. **POD mist order data**: Zelfde probleem — `PODCard` verwacht `pod.order_number` en `pod.customer` maar de POD query fetcht alleen `select("*")` zonder JOIN.

4. **Ongebruikte imports**: `Card`, `CardContent`, `Euro` worden geïmporteerd maar niet gebruikt — cleanup nodig.

5. **Geen loading state**: De pagina toont geen spinner/skeleton terwijl data laadt (`isLoading` wordt niet gebruikt in de component).

## Concrete Fixes

### 1. Fix `usePODClaims.ts` — JOINs toevoegen
- Claims query: `select("*, orders(order_number, customers(company_name))")` zodat `claim.order?.order_number` en `claim.order?.customers?.company_name` beschikbaar zijn
- PODs query: `select("*, orders:order_id(order_number, customers(company_name))")` zodat `pod.order?.order_number` beschikbaar is

### 2. Fix `ClaimsInbox.tsx` — Data mapping + bugs
- ClaimCard: map `claim.order?.order_number` i.p.v. `claim.order_number`, en `claim.order?.customers?.company_name` i.p.v. `claim.customer`
- PODCard: zelfde mapping voor order_number en customer
- Settlement: fix dubbele "Charter" labels
- Voeg loading state toe (skeleton/spinner)
- Verwijder ongebruikte imports
- Voeg `age_days` berekening toe (nu undefined, wordt niet berekend)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/hooks/usePODClaims.ts` | JOIN queries voor order_number + customer name bij claims en PODs |
| `src/pages/claims/ClaimsInbox.tsx` | Fix data mapping, settlement labels, loading state, unused imports, age_days calc |

