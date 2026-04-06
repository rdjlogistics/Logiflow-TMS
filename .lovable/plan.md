

# Email-to-Order Pipeline — Nauwkeurig Plan

## Wat er al bestaat (geen dubbel werk)

| Bestaand onderdeel | Hergebruik |
|---|---|
| `rfq-parser` edge function | Regex-extractie van routes, data, gewicht, referentie |
| `smart-document-ocr` edge function | AI OCR voor afbeeldingen en documenten |
| `inbound_emails` tabel | E-mails worden hier al opgeslagen |
| `process-email-queue` | E-mail verzending via pgmq queue |
| `ai-dispatch-engine` | Chauffeur-toewijzing (wordt aangeroepen NA jouw bevestiging) |
| `send-transactional-email` / Resend | Bevestigingsmail terug naar klant |

## Architectuur

```text
┌────────────────┐
│ inbound_emails │  (bestaand — trigger op INSERT)
└───────┬────────┘
        │ pg_net → Edge Function
        ▼
┌──────────────────────┐
│ process-inbound-order│  (NIEUW — orchestrator)
│                      │
│  1. Classificeer     │◄── Lovable AI (gemini-2.5-flash)
│  2. Extraheer        │◄── Hergebruikt rfq-parser logica
│  3. Bijlagen?        │◄── Hergebruikt smart-document-ocr
│  4. Order aanmaken   │──► trips tabel
│  5. Bevestigingsmail │──► process-email-queue
│  6. Notificatie      │──► notifications tabel
└──────────────────────┘
        │
        ▼
┌──────────────────┐
│ email_order_intake│  (NIEUW — audit log)
└──────────────────┘
```

## Stap 1: Database — `email_order_intake` tabel

Nieuwe tabel voor volledige audit trail:

- `id` (uuid, PK)
- `inbound_email_id` (FK → inbound_emails)
- `company_id` (FK → companies)
- `status` (text: received, parsed, order_created, confirmed, dispatched, failed, ignored)
- `ai_confidence` (float)
- `ai_extracted_data` (JSONB — alle geëxtraheerde velden)
- `created_trip_id` (FK → trips, nullable)
- `assigned_driver_id` (FK → drivers, nullable)
- `error_message` (text, nullable)
- `auto_reply_sent` (boolean, default false)
- `confirmed_by` (uuid, nullable — wie heeft bevestigd)
- `confirmed_at` (timestamptz, nullable)
- `processed_at` (timestamptz)
- `created_at` (timestamptz)

Plus kolom `processing_status` op `inbound_emails` (default 'unprocessed') voor idempotency.

RLS: Alleen authenticated users binnen eigen tenant kunnen lezen.

## Stap 2: Edge Function — `process-inbound-order`

Eén nieuwe orchestrator die bestaande logica hergebruikt:

1. **Classificatie** — AI (gemini-2.5-flash) met prompt: "Is dit een transportopdracht?" → ja/nee + confidence
2. **Tekst-extractie** — Hergebruikt de `extractRFQFields()` logica uit `rfq-parser` (gekopieerd als shared utility, geen dubbele edge function call)
3. **Bijlagen scannen** — Loopt door `attachments` array, roept intern `smart-document-ocr` aan voor PDFs/afbeeldingen, merged resultaten
4. **AI verrijking** — Stuurt gecombineerde tekst + bijlage-data naar AI voor gestructureerde output via tool calling (pickup/delivery adressen, datum, gewicht, goederen, referentie)
5. **Confidence routing**:
   - ≥ 80%: Order aanmaken in `trips` (status `aanvraag`), notificatie sturen aan planners
   - 50-80%: Concept-order aanmaken, review-vlag zetten
   - < 50%: Markeren als `ignored`, geen order
6. **Bevestigingsmail** — Altijd versturen naar afzender met ordernummer via bestaande email queue
7. **Notificatie** — Record in `notifications` tabel zodat planner het ziet in Action Queue

## Stap 3: Database Trigger

PostgreSQL trigger op `inbound_emails` INSERT → `pg_net.http_post` naar `process-inbound-order`. Idempotency via `processing_status` kolom (alleen verwerken als `unprocessed`).

## Stap 4: Frontend — AI Intake Tab in Email Inbox

Nieuwe tab "AI Intake" in bestaande `/email` pagina:

- Overzicht van alle verwerkte e-mails met status, confidence-score, gekoppelde order
- Review-kaarten voor medium-confidence orders: geëxtraheerde data weergeven, "Goedkeuren" / "Afwijzen" knoppen
- "Bevestig & Dispatch" knop die `ai-dispatch-engine` aanroept voor chauffeur-toewijzing
- Statistieken: automatisch verwerkt, gemiddelde confidence, handmatige reviews

## Stap 5: OCR pagina integratie

De `/ai/ocr` pagina krijgt een "Email Import" sectie: recente intake-items tonen in dezelfde elite-class interface.

## Betrouwbaarheid

- **Idempotency**: `processing_status` voorkomt dubbele verwerking
- **Retry**: Bij AI timeout → status `failed` + error_message, handmatige retry via UI
- **Fallback**: Als AI faalt → e-mail gemarkeerd voor handmatige review
- **Audit**: Elke stap gelogd in `email_order_intake`
- **Geen dubbele calls**: rfq-parser logica wordt als shared code hergebruikt, niet als aparte edge function call

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/migrations/xxx.sql` | Nieuwe tabel + trigger + kolom |
| `supabase/functions/process-inbound-order/index.ts` | Nieuwe orchestrator |
| `supabase/functions/_shared/rfq-extract.ts` | Gedeelde extractie-logica uit rfq-parser |
| `src/pages/EmailInbox.tsx` | AI Intake tab toevoegen |
| `src/hooks/useEmailOrderIntake.ts` | Nieuw hook voor intake data |
| `src/pages/ai/SmartOCR.tsx` | Email import sectie |

