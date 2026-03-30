

# Fix: Edge Functions — Ontbrekende Functies & Deployment

## Kernprobleem

Het project heeft **8 edge functions in de codebase** maar de frontend roept **40+ unieke edge functions** aan. De ontbrekende ~32 functies retourneren automatisch 404/500, waardoor Mollie betalingen, portaal accounts, email verzending, en vele andere features falen.

### Bestaande functies (8)
`chatgpt`, `copilot`, `create-batch-invoices`, `create-batch-purchase-invoices`, `ensure-user-company`, `generate-invoice-pdf`, `generate-purchase-invoice-pdf`, `get-mapbox-token`

### Ontbrekende functies die door de frontend worden aangeroepen (~32)
| Categorie | Functie | Aangeroepen door |
|-----------|---------|------------------|
| **Betalingen** | `mollie-create-payment` | MolliePaymentButton |
| **Betalingen** | `create-subscription-checkout` | useSubscriptionInvoices |
| **Portals** | `create-driver-portal-account` | CreateDriverPortalDialog |
| **Portals** | `create-customer-portal-account` | CreateCustomerPortalDialog, CustomerSelfService |
| **Portals** | `create-carrier-user` | CarrierPortalAccessTab |
| **Team** | `create-staff-account` | UserRolesTab |
| **Team** | `remove-staff-account` | UserRolesTab |
| **Email** | `send-invoice-email` | InvoiceEmailComposer, EmailDomainTab |
| **Email** | `send-invoice-reminder` | SendReminderDialog, InvoiceBulkActionsBar |
| **Email** | `send-purchase-invoice-email` | PurchaseInvoiceEmailComposer |
| **Email** | `send-order-confirmation` | OrderCompactRow, OrderForm, EnhancedBulkActionsBar |
| **Email** | `send-delivery-confirmation` | useDriverTrips, useStopEvents, EnhancedBulkActionsBar |
| **Email** | `send-document-email` | SendTransportOrderDialog |
| **Email** | `send-carrier-credentials` | CarrierPortalAccessTab |
| **Email** | `send-submission-confirmation` | usePortalShipments |
| **Email** | `send-audit-alert-email` | useAuditRealtimeAlerts |
| **Email** | `manage-email-domain` | EmailDomainTab, CustomerSelfService |
| **Email** | `auto-send-vrachtbrief` | useDriverTrips, useStopEvents, OrderCompleteDialog |
| **Documents** | `generate-document-pdf` | SendTransportOrderDialog, ClaimsInbox, useDocumentTemplates, EnhancedBulkActionsBar |
| **AI/Dispatch** | `ai-dispatch-engine` | useAIAutoDispatch, DispatchConversationsPanel |
| **AI/Pricing** | `calculate-price` | useSmartPricing |
| **AI/RFQ** | `rfq-parser` | RFQInbox |
| **Migration** | `migration-api-sync` | ApiConnectorPanel |
| **Migration** | `migration-field-mapper` | FieldMappingWizard, BulkImportDialog |
| **GPS/Tracking** | `live-eta` | useLiveETA |
| **Push** | `send-push-notification` | OrderForm |
| **Push** | `get-vapid-key` | usePushNotifications |
| **Push** | `notify-new-submission` | usePortalShipments |
| **Finance** | `bank-reconcile` | useBankReconciliation |
| **Finance** | `exact-oauth-start` | AccountingIntegrations |
| **Finance** | `exact-sync-invoices` | ExactOnlineSyncButton |
| **Security** | `webauthn-auth` | useWebAuthn |
| **Logging** | `log-client-error` | errorReporter |
| **Health** | `health-check` | useQATests |
| **Admin** | `test-tenant-isolation` | TenantIsolationTest |

## Wat NIET klopt

1. **`config.toml` is leeg** — bevat alleen `project_id`, geen `[functions.*]` blokken met `verify_jwt = false`
2. **32+ functies bestaan niet** — elke aanroep faalt met 404 of boot error
3. **Geen edge function logs** — zelfs de 8 bestaande functies tonen geen logs, wat duidt op deployment issues

## Plan van Aanpak

### Fase 1: Config & Deployment fixen (prioriteit)
1. **Update `supabase/config.toml`** — Voeg `verify_jwt = false` toe voor alle 8 bestaande functies
2. **Deploy alle 8 bestaande functies** via `deploy_edge_functions`
3. **Verifieer deployment** via edge function logs

### Fase 2: Kritieke ontbrekende functies aanmaken (top 10)
Maak de meest impactvolle functies aan die de kernfunctionaliteit blokkeren:

1. **`mollie-create-payment`** — iDEAL betaallinks voor facturen
2. **`create-driver-portal-account`** — Chauffeur portaal accounts
3. **`create-customer-portal-account`** — Klant portaal accounts  
4. **`create-staff-account`** — Team uitnodigen
5. **`remove-staff-account`** — Team verwijderen
6. **`send-invoice-email`** — Factuur emailen
7. **`send-invoice-reminder`** — Herinneringen sturen
8. **`generate-document-pdf`** — Transport documenten genereren
9. **`health-check`** — Systeem health monitoring
10. **`get-vapid-key`** — Push notifications key

### Fase 3: Secundaire functies aanmaken
De overige ~22 functies (AI dispatch, RFQ parser, live-ETA, etc.) worden als volgende batch aangemaakt.

### Fase 4: Frontend error handling verbeteren
- Voeg retry logica toe aan kritieke `functions.invoke` calls
- Betere foutmeldingen bij 404/500 responses
- Console logging van response bodies

## Technische Details per Kritieke Functie

Elke functie volgt hetzelfde patroon:
- CORS headers (al correct in bestaande functies)
- OPTIONS preflight handler
- JWT validatie in code (niet via config)
- Service role client voor admin operaties
- Tenant isolatie via `user_companies`
- Logging met `console.log`/`console.error`

### Secrets beschikbaar
`MOLLIE_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `MAPBOX_PUBLIC_TOKEN`, `OPENAI_API_KEY`, `MESSAGEBIRD_API_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` — allemaal geconfigureerd.

## Bestanden

| Actie | Aantal |
|-------|--------|
| **Edit** | `supabase/config.toml` |
| **Deploy** | 8 bestaande functies |
| **Nieuw** | ~10 kritieke edge functions (Fase 2) |
| **Nieuw** | ~22 secundaire edge functions (Fase 3) |
| **Edit** | Frontend error handling in ~10 bestanden |

## Omvang
Dit is een groot project (~40 nieuwe bestanden). Ik stel voor om het in batches te doen: eerst Fase 1+2 (config fix + 10 kritieke functies), dan Fase 3+4 in een vervolgstap.

