

# Fix: Inkoopfactuur BTW wordt niet berekend

## Probleem

Er zijn **2 bugs** die samen het probleem veroorzaken:

### 1. PDF toont "BTW 21%" maar bedrag is €0,00
In `generate-purchase-invoice-pdf/index.ts` regel 222:
```javascript
BTW ${invoice.vat_percentage || 21}%
```
Omdat `vat_percentage` de waarde `0` heeft (falsy in JavaScript), valt `0 || 21` terug naar `21`. Dus het label zegt "BTW 21%" terwijl het bedrag €0,00 is — verwarrend en incorrect.

### 2. BTW-berekening markeert EU-carriers met BTW-nummer als "verlegd" (0%)
In `create-batch-purchase-invoices/index.ts` regel 44-52, de `berekenBTW()` functie:
- Carrier "Euro Transport GmbH" is uit Duitsland (EU) met geldig BTW-nummer → tarief wordt 0% (verlegd)
- Dit is fiscaal correct voor **verkoopfacturen** (je levert diensten aan een EU-bedrijf)
- Maar voor **inkoopfacturen** (je ontvangt diensten) moet de BTW wél op de factuur staan — de ontvanger (NL bedrijf) moet 21% BTW afdragen via verlegde BTW

**De huidige logica is verkeerd voor inkoopfacturen**: bij verlegde BTW moet het bedrag wél berekend en getoond worden op de factuur, zodat de boekhouding klopt.

## Fix

### Bestand 1: `supabase/functions/create-batch-purchase-invoices/index.ts`
- Bij `berekenBTW` resultaat `type === 'verlegd'`: BTW tarief op 21% houden (niet 0%), maar de `factuurVermelding` over verlegde BTW behouden
- De factuur toont dan correct: Subtotaal + BTW 21% = Totaal
- Voeg `vat_type` en `vat_note` velden toe aan de invoice record

### Bestand 2: `supabase/functions/generate-purchase-invoice-pdf/index.ts`
- Fix `|| 21` → `?? 21` zodat 0% correct wordt getoond als dat de intentie is
- Toon de BTW-vermelding (verlegd/vrijgesteld) wanneer aanwezig in `invoice.vat_note` of `invoice.footnote`

Totaal: 2 edge functions. Geen database migratie nodig (vat_type en vat_note kolommen bestaan al op purchase_invoices).

