

# Launch Perfectionering — 6 Nieuwe Pagina's + Fixes

## Probleem
De 6 recent gebouwde pagina's (Creditnota's, Boekhouding, Smart OCR, E-commerce, Multi-vestiging, API Toegang) hebben **3 kritieke bugs** die ze onbruikbaar maken:

1. **Geen DashboardLayout wrapper** — alle 6 pagina's renderen zonder sidebar, header en navigatie (kale content)
2. **CreditNotes filter broken** — zoekfilter verwijst naar `cn.customers?.company_name` maar de query haalt geen klantdata op (select `*` zonder join)
3. **CreditNotes customer_id waarde bug** — `customer_id` wordt als lege string `""` opgeslagen wanneer "Geen" factuur geselecteerd (Select met `value=""` geeft lege string ipv null)

## Fixes (7 bestanden)

### Fix 1 — DashboardLayout toevoegen aan alle 6 pagina's
Elk bestand wrappen met `DashboardLayout`:

**`src/pages/finance/CreditNotes.tsx`**
- Import `DashboardLayout`
- Wrap return in `<DashboardLayout title="Creditnota's" description="...">`
- Fix filter: verwijder `cn.customers?.company_name` referentie (data niet beschikbaar)
- Fix `invoiceId` lege string → null mapping in insert

**`src/pages/integrations/AccountingIntegration.tsx`**
- Wrap in `<DashboardLayout title="Boekhouding Koppeling">`

**`src/pages/ai/SmartOCR.tsx`**
- Wrap in `<DashboardLayout title="Smart OCR">`

**`src/pages/integrations/EcommerceHub.tsx`**
- Wrap in `<DashboardLayout title="E-commerce Hub">`

**`src/pages/admin/MultiLocation.tsx`**
- Wrap in `<DashboardLayout title="Multi-vestiging">`

**`src/pages/admin/APIAccess.tsx`**
- Wrap in `<DashboardLayout title="API Toegang">`

### Fix 2 — CreditNotes data-integriteit
- Verwijder `cn.customers?.company_name` uit het zoekfilter (query haalt geen join op)
- Of: voeg een lookup map toe die `customer_id` → `company_name` mapt via de reeds geladen `customers` array
- Fix `invoiceId || null` — Select met `value=""` geeft lege string, expliciete `invoiceId === "" ? null : invoiceId` check

## Geen wijzigingen aan
- Routing (App.tsx) — correct
- Sidebar links (AppSidebar.tsx) — correct
- Database tabellen — correct
- Bestaande 28 werkende features — niet aanraken
- Edge functions — correct

## Resultaat
- Alle 36 Scale-functies renderen correct met sidebar en navigatie
- CreditNotes CRUD werkt end-to-end zonder data-fouten
- 0 TypeScript errors

