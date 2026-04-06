

# Simulatie Transportopdracht E-mail door Pipeline

## Wat gaan we doen

1. **Simulatie-email invoegen** — Een realistische Nederlandse transportopdracht e-mail direct in de `inbound_emails` tabel inserten met `processing_status = 'unprocessed'` en het bestaande `company_id`.

2. **Edge function aanroepen** — De `process-inbound-order` edge function handmatig invoken met het `inbound_email_id` zodat de volledige pipeline draait: AI classificatie → extractie → order aanmaken → intake record → notificatie.

3. **Resultaat verifiëren** — Query op `email_order_intake` en `trips` om te bevestigen dat de order is aangemaakt met correcte data.

## De simulatie-email

Een realistische transportopdracht met alle velden die de AI kan herkennen:

- **Afzender**: jan.devries@klantbedrijf.nl
- **Onderwerp**: "Transportopdracht 08 april — Rotterdam naar Eindhoven"  
- **Body**: Ophaaladres, afleveradres, datum, gewicht (2400 kg), goederen (pallets electronica), referentie, voertuigtype, contactgegevens

## Technische stappen

| Stap | Actie |
|------|-------|
| 1 | `INSERT INTO inbound_emails` met simulatie-data |
| 2 | `supabase.functions.invoke("process-inbound-order")` via curl met service key |
| 3 | `SELECT` uit `email_order_intake` en `trips` om resultaat te tonen |
| 4 | Gebruiker kan het resultaat zien in de AI Intake tab op `/email` |

Geen bestanden worden gewijzigd — dit is puur een data-simulatie via bestaande infrastructure.

