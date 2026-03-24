

# Plan: E-mail Verzendstap in Batch Facturatie Wizard

## Wat
Na het aanmaken van batch facturen (huidige stap 4 — succes) wordt een nieuwe stap toegevoegd waarmee de gebruiker alle aangemaakte facturen direct per e-mail kan versturen naar de bijbehorende klanten.

## Huidige flow
Stap 1 (Filters) → Stap 2 (Preview) → Stap 3 (Bevestigen) → Stap 4 (Succes)

## Nieuwe flow
Stap 1 (Filters) → Stap 2 (Preview) → Stap 3 (Bevestigen) → **Stap 4 (Verzenden)** → Stap 5 (Succes)

## Technisch

### Bestand: `src/components/invoices/BatchInvoiceWizard.tsx`

1. **Stap 4 — E-mail verzendscherm** (nieuw, tussen huidige stap 3 en succes):
   - Na succesvolle aanmaak (`onSuccess`) ga naar stap 4 i.p.v. stap 5
   - Toon lijst van aangemaakte facturen met checkbox (standaard aan)
   - Per factuur: factuurnummer, klantnaam, bedrag, e-mailadres (opgehaald uit `customers.email`)
   - "Alles selecteren / Niets selecteren" toggle
   - **Verzend geselecteerde facturen** knop — roept `send-invoice-email` aan per factuur via een loop
   - **Overslaan** knop — gaat direct naar stap 5 (succes) zonder te mailen
   - Voortgangsindicator (X van Y verzonden) met live status per factuur (✓ verzonden, ✗ mislukt, ⏳ bezig)

2. **Data ophalen** — Na invoice creation, fetch customer e-mailadressen:
   - Query `invoices` joined met `customers(email, company_name)` voor de aangemaakte invoice IDs
   - Facturen zonder klant e-mail worden gemarkeerd als "geen e-mail beschikbaar"

3. **Verzendlogica**:
   - Sequentieel per factuur `supabase.functions.invoke("send-invoice-email", { body: { invoice_id, recipient_emails, include_pdf: true } })`
   - Standaard subject/body template: "Factuur {nummer} - {bedrijfsnaam}"
   - Bij fout: markeer als mislukt, ga door met volgende factuur
   - Na afloop: toon samenvatting (X verzonden, Y mislukt) en ga naar stap 5

4. **Steps array updaten**: Voeg "Verzenden" stap toe met `Mail` icon

### Geen backend wijzigingen
De bestaande `send-invoice-email` edge function wordt hergebruikt. Geen nieuwe edge functions of database migraties nodig.

