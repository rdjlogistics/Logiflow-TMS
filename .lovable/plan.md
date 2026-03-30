

# Fase 3 + 4: Ontbrekende Edge Functions & Frontend Error Handling

## Fase 3: 6 Ontbrekende Edge Functions

Na analyse van alle `functions.invoke()` calls (83 bestanden) vs. bestaande functies (43 in `supabase/functions/`) zijn er nog **6 functies** die de frontend aanroept maar niet bestaan:

| Functie | Aangeroepen door | Doel |
|---------|-----------------|------|
| `smart-ai` | VoiceAssistant, useContextualSuggestions | AI chat/suggesties via Lovable AI |
| `intelligent-dispatch` | useIntelligentDispatch | AI-gebaseerde chauffeur-toewijzing |
| `ai-route-optimizer` | useAIRouteOptimizer, CreateCompositeRouteDialog | Route optimalisatie via AI |
| `assign-driver-role` | StepAccount (driver onboarding) | Chauffeur rol toewijzen na signup |
| `send-transactional-email` | src/lib/email.ts | Queue-based email verzending |
| `dispatch-notify` | src/lib/email.ts | Push notificatie naar chauffeur bij dispatch |

### Implementatie per functie

**`smart-ai`** — Gebruikt Lovable AI (geen API key nodig). Accepteert `action` (chat/get-suggestions), `message`, `context`. Stuurt prompt naar AI model, retourneert `reply` of `suggestions[]`.

**`intelligent-dispatch`** — Ontvangt order + chauffeurlijst, gebruikt AI om beste match te scoren op afstand, beschikbaarheid, skills, en workload.

**`ai-route-optimizer`** — Ontvangt stops met coördinaten, berekent optimale volgorde via nearest-neighbor + 2-opt heuristiek, optioneel verrijkt met Mapbox Directions API.

**`assign-driver-role`** — Service role client, voegt `chauffeur` rol toe aan `user_roles`, koppelt user aan company via `user_companies`.

**`send-transactional-email`** — Accepteert template naam + data, rendert email, enqueued naar pgmq voor retry-safe delivery via Resend.

**`dispatch-notify`** — Wrapper rond `send-push-notification` specifiek voor dispatch-context.

## Fase 4: Frontend Error Handling

Verbeter de error handling bij `functions.invoke()` calls in de **10 meest kritieke bestanden**:

| Bestand | Verbetering |
|---------|-------------|
| `src/lib/email.ts` | Al goede error handling ✓ |
| `src/components/settings/UserRolesTab.tsx` | Specifiekere foutmeldingen bij staff invite |
| `src/components/invoices/SendReminderDialog.tsx` | Retry-knop bij netwerk fouten |
| `src/components/orders/SendTransportOrderDialog.tsx` | Specifieke foutmelding bij PDF/email falen |
| `src/components/orders/EnhancedBulkActionsBar.tsx` | Teller van gefaalde items + retry optie |
| `src/hooks/useIntelligentDispatch.ts` | Al goede error handling ✓ |
| `src/components/drivers/CreateDriverPortalDialog.tsx` | Betere foutmelding bij account aanmaken |
| `src/pages/InvoiceDetail.tsx` | Retry bij PDF generatie falen |
| `src/components/operations/SendPodEmailDialog.tsx` | Specifieke foutmelding bij POD verzenden |
| `src/hooks/useDynamicPricing.ts` | Fallback bij AI pricing falen |

### Patroon voor verbeterde error handling

Maak een helper `invokeWithRetry` in `src/lib/edgeFunctionHelper.ts`:
- Wraps `supabase.functions.invoke()`
- Retries 1x bij netwerk errors
- Logt response body bij non-2xx
- Retourneert gestructureerde error met specifieke Nederlandse foutmelding

## Bestanden

| Actie | Bestand |
|-------|--------|
| **Nieuw** | `supabase/functions/smart-ai/index.ts` |
| **Nieuw** | `supabase/functions/intelligent-dispatch/index.ts` |
| **Nieuw** | `supabase/functions/ai-route-optimizer/index.ts` |
| **Nieuw** | `supabase/functions/assign-driver-role/index.ts` |
| **Nieuw** | `supabase/functions/send-transactional-email/index.ts` |
| **Nieuw** | `supabase/functions/dispatch-notify/index.ts` |
| **Nieuw** | `src/lib/edgeFunctionHelper.ts` |
| **Edit** | `supabase/config.toml` (6 nieuwe function blocks) |
| **Edit** | ~8 frontend bestanden (error handling verbetering) |
| **Deploy** | Alle 6 nieuwe functies |

