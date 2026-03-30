

# Fix: Ontbrekende Edge Functions & Redirect URL

## Status: Wat WERKT al correct

Na testen van alle 49 bestaande edge functions:
- **CORS headers**: correct op alle functies (inclusief extended Supabase client headers)
- **OPTIONS handlers**: aanwezig op alle functies
- **`Deno.env.get()`**: gebruikt voor alle secrets (MOLLIE_API_KEY, RESEND_API_KEY, etc.)
- **try/catch met JSON error responses**: aanwezig op alle functies
- **Health check**: retourneert 200, alle services healthy (mollie, resend, mapbox, openai, vapid)
- **Auth validatie**: correcte `getClaims()` pattern op alle authenticated functies

## Wat GEFIXED moet worden

### 1. Redirect URL in `create-subscription-checkout` (1 regel)
Huidige: `https://rdjlogistics.nl/settings?payment=success`
Moet zijn: `https://rdjlogistics.nl/settings/subscription?payment=success`

### 2. Zes ontbrekende Edge Functions
De frontend roept deze functies aan maar ze bestaan niet (retourneren 404):

| Functie | Aangeroepen door | Doel |
|---------|-----------------|------|
| `smart-document-ocr` | SmartDocumentOCR.tsx | AI OCR van documenten |
| `analyze-driver-document` | useDriverDocumentUpload.ts, DocumentVerification.tsx | AI verificatie rijbewijzen/documenten |
| `portal-ai` | usePortalAI.ts | AI chat voor klant/chauffeur portals |
| `ecommerce-sync` | useEcommerceIntegrations.ts | Sync met webshops |
| `convert-ecommerce-order` | useEcommerceIntegrations.ts | Webshop order → TMS rit |
| `process-email-queue` | config.toml verwijzing maar geen code | Email queue verwerking |

### 3. Config.toml — 5 ontbrekende function blocks
De nieuwe functies moeten ook in `config.toml` met `verify_jwt = false`.

## Aanpak per functie

### `smart-document-ocr`
- Accepteert `fileBase64`, `fileName`, `mimeType`
- Gebruikt Lovable AI Gateway (Gemini) voor document parsing
- Retourneert `{ success: true, extractedData: {...}, documentType, confidence }`

### `analyze-driver-document`
- Accepteert `documentId`, `imageUrl`, `documentType`
- Gebruikt Lovable AI Gateway voor document verificatie (geldigheid, vervaldatum)
- Update `driver_documents` tabel met analyse resultaat

### `portal-ai`
- AI chatbot voor portals
- Accepteert `conversationId`, `portalType`, `message`, etc.
- Gebruikt Lovable AI Gateway
- Retourneert `{ assistantMessage, actionDraft }`

### `ecommerce-sync` & `convert-ecommerce-order`
- Placeholder functies (e-commerce integratie is nog niet live)
- Retourneren `{ success: true, message: "..." }` met beschrijvende melding

### `process-email-queue`
- Verwerkt email queue uit database
- Haalt pending emails op en verstuurt via Resend

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `supabase/functions/create-subscription-checkout/index.ts` (redirect URL) |
| **Nieuw** | `supabase/functions/smart-document-ocr/index.ts` |
| **Nieuw** | `supabase/functions/analyze-driver-document/index.ts` |
| **Nieuw** | `supabase/functions/portal-ai/index.ts` |
| **Nieuw** | `supabase/functions/ecommerce-sync/index.ts` |
| **Nieuw** | `supabase/functions/convert-ecommerce-order/index.ts` |
| **Nieuw** | `supabase/functions/process-email-queue/index.ts` |
| **Edit** | `supabase/config.toml` (5 nieuwe function blocks) |

