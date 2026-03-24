

# Productie-Audit: TMS Commercieel Gereed Maken

## Samenvatting
Na grondige analyse van de volledige codebase (233+ bestanden met toast-calls, 55+ pagina's, edge functions, error handling) zijn er **6 categorieën** problemen gevonden die opgelost moeten worden voordat het product commercieel verkoopbaar is.

---

## CATEGORIE 1: Nep-knoppen die niets doen (KRITIEK)

Knoppen die een toast tonen in plaats van de actie uit te voeren — dit maakt het product onbetrouwbaar.

| Locatie | Knop | Probleem |
|---|---|---|
| `RouteOptimization.tsx:1507` | "Route Opslaan" | Toont alleen toast, slaat niets op in database |
| `RouteOptimization.tsx:1599` | "Chauffeur toewijzen" | Toont alleen toast, geen toewijslogica |
| `enterprise/Rosters.tsx:87` | "Dienst Toevoegen" | Toont toast "Ga naar Planning → Programma" |
| `enterprise/Constraints.tsx:53` | "Nieuwe Regel" | Toont toast "Ga naar Planning → Beschikbaarheid" |

**Fix**: Implementeer de daadwerkelijke functionaliteit of verwijder de knoppen. Nep-knoppen zijn een commerciële dealbreaker.

---

## CATEGORIE 2: Demo/Test Artefacten (KRITIEK voor verkoop)

Restanten van development die een onprofessionele indruk maken.

| Locatie | Probleem |
|---|---|
| `B2CBookingWizard.tsx:39` | Hardcoded `DEMO_CUSTOMER_ID = "00000000-..."` — boekingen gaan naar een niet-bestaande klant |
| `portal/B2CAccount.tsx:44` | Logout navigeert naar `/demo` i.p.v. `/auth` |
| `customer-portal/PortalLayout.tsx:73` | Logout navigeert naar `/demo` |
| `customer-portal/ImperialLayout.tsx:59` | Logout navigeert naar `/demo` |
| `DriverAvailableShifts.tsx:333` | Inlog-knop wijst naar `/demo` |
| `enterprise/SystemHealth.tsx:40-55` | Hardcoded `demoJobs` en `demoIncidents` getoond als er geen echte data is |
| `enterprise/PolicyCenter.tsx:81-88` | Hardcoded `demoDelegations` als fallback |
| `Auth.tsx:27` | `DEMO_ACCOUNTS` array (leeg maar structuur aanwezig, incl. demo login flow op regel 195-230) |
| `crm/RFQInbox.tsx:260` | Toast meldt "RFQ geparsed (demo)" |

**Fix**: Vervang alle `/demo` navigaties door `/auth`. Verwijder hardcoded demo data. Gebruik lege states ("Nog geen data") in plaats van nep-data.

---

## CATEGORIE 3: Stille Error Swallowing (KRITIEK voor betrouwbaarheid)

55 gevallen van lege `catch {}` blokken die fouten volledig negeren. De ergste:

| Locatie | Impact |
|---|---|
| `AIAutoDispatchPanel.tsx:178` | Chauffeur-toewijzing faalt zonder melding — trip lijkt toegewezen maar is het niet |
| `OrderMobileCard.tsx:273,439` | Order event logging faalt stil — audittrail incompleet |
| `NotificationCenter.tsx:48,75` | Notificaties laden faalt zonder feedback |

**Fix**: Voeg minimaal logging toe aan alle lege catch-blokken. Voor gebruikersacties: toon error toast.

---

## CATEGORIE 4: `as any` Type-Bypasses (KWALITEIT)

722 gevallen van `as any` in pagina-bestanden. De risicovolle:

| Locatie | Risico |
|---|---|
| `Carriers.tsx:316` | `{ deleted_at: ... } as any` — eerder bewezen bug (kolom bestond niet) |
| `Drivers.tsx:185,210,248,291` | 5x `as any` voor driver_documents en availability — kan runtime crashes veroorzaken |
| `InvoiceDetail.tsx:258,565-568` | Customer en period casting — kan undefined properties tonen |
| `GPSTracking.tsx:456` | Locations `as any` voor geofence alerts |

**Fix**: Voeg juiste TypeScript interfaces toe in plaats van `as any`. Dit voorkomt runtime crashes.

---

## CATEGORIE 5: Console.log in Productie (PROFESSIONEEL)

151 `console.log` statements in productie-code. De meest problematische:

| Locatie | Probleem |
|---|---|
| `Auth.tsx:201,208,264,271` | Logt login-pogingen incl. e-mailadres — privacy-risico (AVG) |
| `useDriverPortalData.ts:197,202` | `markAlertRead` en `dismissAlert` zijn stub-functies die alleen loggen |

**Fix**: Verwijder alle `console.log` statements uit productie-code. Gebruik de bestaande `logger.ts` die alleen in DEV mode logt. Auth-gerelateerde logs zijn een AVG-risico.

---

## CATEGORIE 6: PDF Fallback naar window.print() (UX)

Wanneer de PDF edge function faalt, wordt `window.print()` aangeroepen (Invoices.tsx:265, InvoiceDetail.tsx:234). Dit opent een browser print-dialog voor de **gehele pagina** — inclusief sidebar, navigatie, etc. Totaal onbruikbaar als factuur-PDF.

**Fix**: Toon een duidelijke error toast met retry-knop in plaats van `window.print()`. Of: bouw een print-specifieke CSS layout als echte fallback.

---

## Implementatie-Volgorde (Prioriteit)

### Batch 1: Commerciële Dealbreakers (MUST)
1. **Demo-artefacten verwijderen** — Alle `/demo` → `/auth`, DEMO_CUSTOMER_ID verwijderen, demo-data fallbacks vervangen door lege states
2. **Nep-knoppen fixen of verwijderen** — RouteOptimization "Opslaan" + "Chauffeur toewijzen", Rosters, Constraints

### Batch 2: Betrouwbaarheid (MUST)
3. **Lege catch-blokken fixen** — Minimaal de 3 kritieke (AIAutoDispatch, OrderMobileCard, NotificationCenter)
4. **PDF fallback verbeteren** — window.print() vervangen door error toast + retry

### Batch 3: Kwaliteit & Compliance (SHOULD)
5. **Console.log opruimen** — Auth.tsx privacy-logs verwijderen, stub-functies in useDriverPortalData implementeren
6. **Type-safety verbeteren** — Top 10 risicovolle `as any` casts vervangen door echte types

### Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/pages/RouteOptimization.tsx` | Opslaan-knop fixen of disablen |
| `src/pages/enterprise/Rosters.tsx` | Nep-knop verwijderen |
| `src/pages/enterprise/Constraints.tsx` | Nep-knop verwijderen |
| `src/components/portal/b2c/B2CBookingWizard.tsx` | DEMO_CUSTOMER_ID verwijderen |
| `src/pages/portal/B2CAccount.tsx` | `/demo` → `/auth` |
| `src/components/customer-portal/PortalLayout.tsx` | `/demo` → `/auth` |
| `src/components/customer-portal/ImperialLayout.tsx` | `/demo` → `/auth` |
| `src/pages/DriverAvailableShifts.tsx` | `/demo` → `/auth` |
| `src/pages/enterprise/SystemHealth.tsx` | Demo data verwijderen |
| `src/pages/enterprise/PolicyCenter.tsx` | Demo data verwijderen |
| `src/pages/crm/RFQInbox.tsx` | "(demo)" uit toast |
| `src/pages/Auth.tsx` | Demo login flow + console.logs verwijderen |
| `src/components/dispatch/AIAutoDispatchPanel.tsx` | Lege catch fixen |
| `src/components/orders/OrderMobileCard.tsx` | Lege catches fixen |
| `src/pages/Invoices.tsx` | window.print() fallback vervangen |
| `src/pages/InvoiceDetail.tsx` | window.print() fallback vervangen |
| `src/hooks/useDriverPortalData.ts` | Stub-functies implementeren |

