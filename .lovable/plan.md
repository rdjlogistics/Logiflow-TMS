

# Plan: Verkoopfactuur PDF Generatie — Edge Function

## Probleem
De frontend roept `generate-invoice-pdf` aan op meerdere plekken (InvoiceDetail, Invoices, Portals), maar de edge function bestaat niet. Downloads falen altijd.

## Oplossing
Maak een nieuwe edge function `generate-invoice-pdf` die de verkoopfactuur als HTML-based PDF genereert, gemodelleerd naar de bestaande `generate-purchase-invoice-pdf`.

## Technisch

**Nieuw bestand:** `supabase/functions/generate-invoice-pdf/index.ts`

De function:
1. Authenticatie via Authorization header
2. Haalt `invoices` op met `customers(*)` join
3. Haalt `invoice_lines` op voor de factuur
4. Haalt `companies` info (tenant) op via `company_id`
5. Genereert professionele HTML met dezelfde styling als purchase variant:
   - Header met factuurnummer + bedrijfsnaam
   - Van/Aan partijen (bedrijf → klant) met BTW/KvK
   - Metadata: factuurdatum, vervaldatum, betalingstermijn
   - Tabel met invoice_lines (omschrijving, aantal, eenheidsprijs, bedrag)
   - Totalen: subtotaal, BTW%, totaal
   - Voetnoot + betalingsgegevens (IBAN)
   - Footer met bedrijfsgegevens
6. Retourneert `{ pdf: base64Html, html: true }` — zelfde formaat als purchase variant

De bestaande frontend code (InvoiceDetail, Invoices, Portals) hoeft **niet** te worden aangepast — die roepen al `generate-invoice-pdf` aan met het juiste response-formaat.

| Stap | Wat |
|---|---|
| 1 | Maak `supabase/functions/generate-invoice-pdf/index.ts` |
| 2 | Deploy edge function |

Geen database- of frontend-wijzigingen nodig.

