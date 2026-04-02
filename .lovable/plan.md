

# Systeem-brede Edge Function Fix — `getClaims()` bestaat niet (44 functies)

## Kernprobleem

**44 van de 67 edge functions** gebruiken `supabase.auth.getClaims()` — een methode die **niet bestaat** in de Supabase JS client. Dit veroorzaakt een runtime crash bij élke aanroep, wat resulteert in de "Edge Function error" die je overal ziet.

Slechts 8 functies gebruiken het werkende `auth.getUser()` patroon (zoals `send-purchase-invoice-email`, `create-batch-invoices`, `generate-invoice-pdf`, etc.).

## Waarom dit alles breekt

Elke functie die `getClaims()` aanroept crasht onmiddellijk met een TypeError. Dit betekent dat knoppen voor o.a.:
- Order bevestigingen versturen
- Documenten e-mailen
- Vrachtbrieven versturen
- AI functies (copilot, route optimizer, dispatch engine)
- Staff/driver/carrier accounts aanmaken
- Push notificaties
- SMS versturen
- Invoice reminders
- RFQ parsing
- Alle portaal AI functies

...allemaal een edge function error geven.

## Fix

Elke functie krijgt dezelfde bewezen auth-fix:

**Pattern 1** (compact, `cd.claims.sub` referenties):
```
// OUD (crasht):
const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
const { data: cd, error: ce } = await supabase.auth.getClaims(token);
if (ce || !cd?.claims) return ... "Unauthorized"
// later: cd.claims.sub

// NIEUW (werkt):
const anonClient = createClient(url, anonKey);
const { data: { user }, error: ue } = await anonClient.auth.getUser(token);
if (ue || !user) return ... "Unauthorized"
const cd = { claims: { sub: user.id } };
// rest van de code blijft identiek
```

Door `cd.claims.sub` te mappen naar `user.id` hoeft de rest van elke functie niet te veranderen.

**Pattern 2** (verbose, `claimsData.claims.sub` referenties):
Zelfde aanpak, maar `const claimsData = { claims: { sub: user.id } };`

## Alle 44 getroffen functies

| # | Functie | Pattern |
|---|---------|---------|
| 1 | `ai-dispatch-engine` | cd.claims |
| 2 | `ai-route-optimizer` | cd.claims |
| 3 | `analyze-driver-document` | cd.claims |
| 4 | `auto-send-vrachtbrief` | cd.claims |
| 5 | `bank-reconcile` | cd.claims |
| 6 | `calculate-price` | cd/claimsData |
| 7 | `chatgpt` | claims.claims |
| 8 | `check-overdue-invoices` | cd.claims |
| 9 | `convert-ecommerce-order` | cd.claims |
| 10 | `copilot` | claimsData.claims |
| 11 | `create-carrier-user` | cd.claims |
| 12 | `create-customer-portal-account` | claimsData.claims |
| 13 | `create-driver-portal-account` | claimsData.claims |
| 14 | `create-staff-account` | claimsData.claims |
| 15 | `create-subscription-checkout` | cd.claims |
| 16 | `dispatch-notify` | cd.claims |
| 17 | `ecommerce-sync` | cd.claims |
| 18 | `exact-oauth-start` | cd.claims |
| 19 | `exact-sync-invoices` | cd.claims |
| 20 | `execute-workflow` | cd.claims |
| 21 | `freight-matching` | cd.claims |
| 22 | `generate-document-pdf` | claimsData.claims |
| 23 | `generate-pod-pdf` | cd.claims |
| 24 | `intelligent-dispatch` | cd.claims |
| 25 | `live-eta` | cd.claims |
| 26 | `manage-email-domain` | cd.claims |
| 27 | `migration-api-sync` | cd.claims |
| 28 | `migration-field-mapper` | cd.claims |
| 29 | `mollie-create-payment` | cd.claims |
| 30 | `notify-new-submission` | cd.claims |
| 31 | `portal-ai` | cd.claims |
| 32 | `rfq-parser` | cd.claims |
| 33 | `remove-staff-account` | cd.claims |
| 34 | `send-audit-alert-email` | cd.claims |
| 35 | `send-carrier-credentials` | cd.claims |
| 36 | `send-customer-notification` | cd.claims |
| 37 | `send-delivery-confirmation` | cd.claims |
| 38 | `send-document-email` | cd.claims |
| 39 | `send-invoice-email` | cd.claims |
| 40 | `send-invoice-reminder` | claimsData.claims |
| 41 | `send-order-confirmation` | cd.claims |
| 42 | `send-order-rejection` | cd.claims |
| 43 | `send-push-notification` | cd.claims |
| 44 | `send-push-notification-to-planners` | cd.claims |
| — | `send-sms` | cd.claims |
| — | `smart-ai` | cd.claims |
| — | `smart-document-ocr` | cd.claims |
| — | `test-tenant-isolation` | cd.claims |
| — | `voice-assistant` | cd.claims |

## Aanpak

Alle 44+ functies worden in batches gefixt en herdeployed. Elke functie krijgt dezelfde minimale wijziging: `getClaims()` → `getUser()` + claims-mapping. De rest van de functie-logica blijft 100% identiek.

## Impact
- Geen database migraties
- Geen frontend wijzigingen
- Alle fixes zijn backwards compatible
- Na deployment werken alle knoppen die nu een edge function error geven

