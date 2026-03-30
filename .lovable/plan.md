

# Verificatie: Company-koppeling Fix — Resultaat

## Bevinding: Alles is correct geïmplementeerd

Na doorzoeken van de volledige codebase (150+ `.eq('company_id')` matches in 16 bestanden, 300+ `tenant_id` matches in 27 bestanden, 95 `get_user_company_cached` aanroepen in 17 bestanden) is de conclusie:

**Er zijn geen hardcoded placeholders, geen localStorage fallbacks, en geen onbeveiligde company_id bronnen.**

## Hoe company_id wordt opgehaald (2 correcte patronen)

| Patroon | Gebruikt door | Veilig? |
|---------|--------------|---------|
| `useCompany()` → `company.id` | 22 pagina's (Drivers, Customers, Carriers, Settings, etc.) | Ja — haalt uit `user_companies` tabel |
| `supabase.rpc('get_user_company_cached')` | 17 enterprise pagina's (SLA, Disputes, LiveBoard, etc.) | Ja — server-side RPC |

## Per pagina check

| Pagina | Methode | Loading guard | Status |
|--------|---------|---------------|--------|
| Dashboard | `useCompany()` | `enabled: !!company?.id` | OK |
| /drivers | `useCompany()` → `.eq('tenant_id', company.id)` | `enabled: !!company?.id` | OK |
| /customers | `useCompany()` → `.eq('tenant_id', company.id)` | `if (!company?.id) return` | OK |
| /trips | Service layer, RLS filtert | RLS | OK |
| /invoices | Service layer, RLS filtert | RLS | OK |
| /fleet | `useCompany()` | `enabled: !!company?.id` | OK |
| /settings | `useTenantSettings()` → RLS filtert | `.maybeSingle()` | OK |
| /carriers | `useCompany()` → `.eq('company_id', company.id)` | `enabled: !!company?.id` | OK |
| Enterprise pages (17x) | `get_user_company_cached` RPC | `if (!companyId) return []` | OK |

## Twee kleine verbeteringen mogelijk

### 1. `useTenantSettings` — voeg company_id aan queryKey toe
Nu is de queryKey `['tenant-settings']` zonder company context. Als een user wisselt van company (via `switchCompany`), kan gecachte data van de vorige company getoond worden.

**Fix**: Gebruik `useCompany()` en voeg `company.id` toe aan de queryKey.

### 2. Services zonder company filter (drivers, customers, invoices)
De services `fetchDrivers()`, `fetchCustomers()`, `fetchInvoices()` vertrouwen 100% op RLS voor tenant-isolatie. Dit werkt correct, maar als RLS ooit misconfigured raakt, lekt data. 

**Fix**: Voeg een optionele `companyId` parameter toe aan de fetch-functies en gebruik `.eq('tenant_id', companyId)` als defense-in-depth. De hooks die deze services aanroepen (`useDriversData`, `useCustomersData`, `useInvoicesData`) krijgen company_id van `useCompany()`.

### Bestanden te wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useTenantSettings.ts` | Voeg `useCompany()` toe, filter op `company_id`, update queryKey |
| `src/services/drivers.ts` | Voeg optionele `companyId` param toe aan `fetchDrivers` |
| `src/services/customers.ts` | Voeg optionele `companyId` param toe aan `fetchCustomers` |
| `src/services/invoices.ts` | Voeg optionele `companyId` param toe aan `fetchInvoices` |
| `src/hooks/useDriversData.ts` | Geef `companyId` door aan `fetchDrivers` |
| `src/hooks/useCustomersData.ts` | Geef `companyId` door aan `fetchCustomers` |
| `src/hooks/useInvoicesData.ts` | Geef `companyId` door aan `fetchInvoices` |

### Geen database migraties nodig

