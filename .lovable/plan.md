

# Kritische Audit: TenderDashboard waterdicht maken

## Gevonden probleem

Na grondige audit van alle pagina's is er **1 kritieke module** die nog volledig op lokale state draait terwijl de database-tabellen al bestaan:

| Module | Probleem | DB tabellen beschikbaar | Ernst |
|--------|----------|------------------------|-------|
| **TenderDashboard** | CRUD volledig in `useState([])` — data verdwijnt bij pagina-refresh, `avgSavings` hardcoded op "12%" | `tenders` + `tender_invites` ✅ | **Hoog** |

### Wat al waterdicht IS (geen actie nodig)
- Tender Templates → DB ✅
- Customs/NCTS → DB ✅
- Notification Channels → DB ✅
- AI Recommendations → echte navigatie ✅
- DataQuality → setTimeout verwijderd ✅
- DossierVault → echte upload ✅
- EDI → echte retry ✅
- Telematics → DB persistentie ✅
- FuelIndex → echte update ✅
- What-If Simulation → echte data ✅
- AccountingIntegrations → credential check ✅
- Messenger → race condition gefixt ✅
- B2C Portal → navigatie i.p.v. toast ✅
- CarrierScorecards → `useCarrierScorecards` hook (DB-backed) ✅
- TenderHistory → al met `tender_invites` query ✅

## Fix

### Bestand: `src/pages/tendering/TenderDashboard.tsx`

**Vervang volledige lokale state door database-operaties:**

1. **Laden**: `useQuery` op `tenders` tabel met `company_id` filter + count van `tender_invites` per tender
2. **Aanmaken** (`handleCreateTender`): `supabase.from('tenders').insert()` met `company_id`, `title`, `deadline`, `expected_price_min/max`, `status: 'open'`
3. **Accepteren** (`handleAcceptBid`): `supabase.from('tenders').update({ status: 'accepted' })` 
4. **Annuleren** (`handleCancelTender`): `supabase.from('tenders').update({ status: 'cancelled' })`
5. **Stats berekening**: `avgSavings` berekend uit echte data (verschil `expected_price_max` vs laagste `offered_price` uit `tender_invites`)
6. **`bestOffer`**: Join met `tender_invites` om werkelijke laagste bod op te halen

### Imports toe te voegen
- `useQuery`, `useMutation`, `useQueryClient` van `@tanstack/react-query`
- `supabase` van `@/integrations/supabase/client`
- `useCompany` van `@/hooks/useCompany`

### Niet geraakt
- Dialog UI, filters, Sheet detail-view — blijven identiek
- `TenderHistory`, `TenderTemplates`, `CarrierScorecards` — al DB-backed
- Desktop layout — geen wijzigingen

## Resultaat
- Charter aanvragen persistent in database
- Echte statistieken op basis van DB data
- `bestOffer` komt uit werkelijke biedingen van carriers
- Data overleeft pagina-refresh

