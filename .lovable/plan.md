
Doel
- Niet opnieuw tellen op routes of edge functions. 123 routes betekent niet 123 werkende acties; veel routes zijn pure UI en meerdere knoppen delen 1 backendfunctie.
- Ik ga de launch-audit daarom baseren op klikpaden: knop -> handler -> backend/query -> data/storage -> zichtbaar resultaat.

Wat ik al heb bevestigd
- De auth/bootstraplaag hoeft niet opnieuw gebouwd te worden: `useAuth`, `authReady`, `ProtectedRoute` en `useUserRole` zijn al grotendeels goed opgezet.
- De echte problemen zitten nu in contractmismatches, test/mock UI in productie, misleidende knoppen en een paar security-gaten.

Bevestigde launch-blockers
1. Documentknoppen zijn inconsistent en daardoor stuk:
   - `generate-document-pdf` is nog placeholder en geeft alleen inline HTML terug, terwijl schermen vaak `url`, `publicUrl` of `pdf` verwachten.
   - `generate-pod-pdf` geeft `html` terug, terwijl `DigitalPOD` `data.pdf` verwacht en `SendPodEmailDialog` juist `data.url`.
   - `ClaimsInbox` gebruikt voor POD de verkeerde generator/input.
   - `useDocumentTemplates` stuurt `html` naar `generate-document-pdf`, maar die functie verwerkt dat nu niet.
2. AI Dispatch is niet echt end-to-end:
   - productie-UI bevat nog simulate/mock response velden;
   - batch-bevestiging zet nu alleen status op `gepland` en wijst geen chauffeur toe.
3. Chauffeur-notificaties zijn onbetrouwbaar:
   - `send-push-notification` gebruikt `driver_id` alsof het `user_id` is; daardoor kunnen toewijzingen “gelukt” lijken zonder echte ontvanger.
4. Accounting export is misleidend:
   - `ExactOnlineSyncButton` doet alsof hij een factuur exporteert, maar `exact-sync-invoices` doet nu alleen een readiness check.
   - `AccountingIntegration` toont nog mailto-knoppen voor providers die niet echt live zijn.
5. Security-gaten:
   - `generate-pod-pdf` valideert nu geen gebruiker en gebruikt direct service-role data.
   - `user_roles` heeft een brede SELECT-policy (`USING (true)`), wat niet launch-safe is.

Uitvoeringsplan

Fase 1 — Echte launch-audit op klikniveau
- Focus op drukste flows: `/orders/edit`, order bulk actions, chauffeur toewijzen, POD/documenten, AI Dispatch, bankreconciliatie, accounting.
- Per knop vastleggen: verwacht gedrag, huidige handler, backendcontract, echte uitkomst.
- Resultaat: auditmatrix “werkt / deels / gefixt / geblokkeerd door secret”.

Fase 2 — Document-pipeline normaliseren
Bestanden:
- `supabase/functions/generate-document-pdf/index.ts`
- `supabase/functions/generate-pod-pdf/index.ts`
- `src/components/orders/OrderDocumentDialog.tsx`
- `src/components/orders/SendTransportOrderDialog.tsx`
- `src/components/orders/EnhancedBulkActionsBar.tsx`
- `src/components/operations/SendPodEmailDialog.tsx`
- `src/pages/operations/DigitalPOD.tsx`
- `src/pages/claims/ClaimsInbox.tsx`
- `src/hooks/useDocumentTemplates.ts`

Aanpak:
- één responscontract afdwingen: altijd consistente velden zoals `success`, `fileName`, en een bruikbare output (`url` en/of `html` en/of `pdf`);
- aliasen ondersteunen (`transportopdracht`/`transport_order`, `orderId`/`tripId`/`entityId`);
- POD correct afhandelen via `stop_proof_id`;
- alle callers op hetzelfde contract laten werken voor preview, download en e-mail;
- geen onnodige nieuwe documentstack bouwen: eerst de bestaande pipeline betrouwbaar en storage-backed maken.

Fase 3 — AI Dispatch echt maken
Bestanden:
- `src/components/dispatch/AIAutoDispatchPanel.tsx`
- `src/components/dispatch/DispatchConversationsPanel.tsx`
- `src/hooks/useAIAutoDispatch.ts`
- `supabase/functions/ai-dispatch-engine/index.ts`

Aanpak:
- mock/simulate velden uit productie verwijderen of alleen achter admin/dev debug-gate zetten;
- batch-flow repareren zodat “bevestig alle” ook echt `driver_id` toewijst;
- initiate/confirm/cancel flows op hetzelfde statusmodel laten landen;
- als de backend `whatsappMessage`/`driverPhone` teruggeeft, de UI daar óf echt iets mee laten doen óf die schijnactie verwijderen.

Fase 4 — Chauffeurmeldingen en toewijzingen repareren
Bestanden:
- `supabase/functions/send-push-notification/index.ts`
- `src/components/dashboard/QuickDriverAssign.tsx`
- `src/pages/DriverAssignment.tsx`
- `src/pages/OrderForm.tsx`

Aanpak:
- in backend `driver_id -> drivers.user_id` resolven vóór notificatie;
- alleen same-tenant, geautoriseerde aanroepen toestaan;
- frontend response contract gelijk trekken met wat de functie echt teruggeeft;
- succesmeldingen alleen tonen als toewijzing + notificatiepad echt klopt.

Fase 5 — Finance-integraties eerlijk en werkend maken
Bestanden:
- `supabase/functions/exact-sync-invoices/index.ts`
- `src/components/invoices/ExactOnlineSyncButton.tsx`
- `src/pages/integrations/AccountingIntegration.tsx`
- `src/hooks/useBankReconciliation.ts`

Aanpak:
- Exact-knop factuurgericht maken: echte exportflow of, als koppeling/keys ontbreken, een harde en eerlijke blocked state;
- unsupported providers niet meer als klikbare “bijna-live” feature tonen;
- bank-reconcile response laten aansluiten op de hook/toasts (`matched`, `needs_review`, `unmatched`) zodat UI en backend dezelfde waarheid tonen.

Fase 6 — Security hardening zonder dubbel werk
- `generate-pod-pdf` dezelfde auth + tenant-checks geven als de andere backendfuncties;
- `user_roles` policy aanscherpen naar self/admin-only in plaats van open read;
- bestaande `authReady`-architectuur laten staan; alleen ontbrekende gating repareren waar deze flows het echt nodig hebben.

Wat ik bewust niet opnieuw ga bouwen
- geen herbouw van routes/sidebar/auth;
- geen redesigns;
- geen vervanging van goed werkende order/factuur CRUD;
- geen brede rewrite van integraties als een duidelijke honest-disable state voldoende is voor launch.

Launch-eindresultaat
- Knoppen doen echt iets of zijn eerlijk uitgeschakeld; geen schijn-succes meer.
- Documenten, dispatch, chauffeurtoewijzing en accounting zijn contract-consistent end-to-end.
- Test/mock UI verdwijnt uit productie.
- Overblijvende blockers zijn alleen externe secrets/provider-toegang, niet kapotte code of misleidende knoppen.
