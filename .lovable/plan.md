

# Fix: Company-koppeling bij Nieuwe Accounts

## Kernprobleem

De `ensure-user-company` edge function **bestaat niet** maar wordt aangeroepen door `useAuth` bij elke login. De database trigger `handle_new_user()` maakt alleen een profiel + admin rol aan, maar **geen company en geen `user_companies` link**. Hierdoor:

1. Na signup heeft de user geen company → `useCompany()` retourneert `null`
2. Alle 63+ componenten die `company.id` gebruiken crashen of tonen niets
3. De 17 pagina's die `get_user_company_cached` RPC aanroepen falen ook
4. De onboarding wizard probeert een bestaande company te updaten die niet bestaat

## Oplossing: 3 Stappen

### Stap 1: Maak de `ensure-user-company` Edge Function

**Nieuw bestand**: `supabase/functions/ensure-user-company/index.ts`

Logica:
- Haal user ID uit JWT
- Check of er al een `user_companies` record bestaat → zo ja, return early
- Maak een nieuwe company aan in `companies` (naam: email-domain of "Mijn Bedrijf")
- Link user aan company via `user_companies` (is_primary: true)
- Maak een `tenant_settings` record aan (onboarding_completed_at: null) zodat de onboarding wizard getriggerd wordt
- Return `{ company_id: "..." }`

### Stap 2: Fix `ensureProfileAfterSignup` — ook company aanmaken

**Edit**: `src/lib/ensureProfileAfterSignup.ts`

Na het aanmaken van profiel + rol, **ook** een company + `user_companies` link aanmaken als die nog niet bestaat. Dit is de synchrone fallback voor als de edge function faalt of te laat is.

Logica:
- Check `user_companies` voor de user
- Als er geen record is:
  - Insert in `companies` (name: email domain afgeleid, of fullName + "'s Bedrijf")
  - Insert in `user_companies` (user_id, company_id, is_primary: true)
  - Insert in `tenant_settings` (company_id, onboarding_completed_at: null)

### Stap 3: Harden `useCompany` en downstream

**Edit**: `src/hooks/useCompany.ts`
- Als `fetchUserCompanyData` geen resultaten vindt en user wel authenticated is, retry 3x met 1s interval (zelfde polling patroon als `useOnboardingRequired`)
- Dit vangt de race condition op tussen signup en company-aanmaak

**Geen andere bestanden wijzigen** — de 63 componenten die `useCompany()` gebruiken en de 17 pagina's met `get_user_company_cached` werken automatisch zodra de company correct wordt aangemaakt.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Nieuw** | `supabase/functions/ensure-user-company/index.ts` |
| **Edit** | `src/lib/ensureProfileAfterSignup.ts` |
| **Edit** | `src/hooks/useCompany.ts` |
| **Deploy** | Edge function `ensure-user-company` |

## Geen Database Migraties Nodig

De tabellen `companies`, `user_companies`, en `tenant_settings` bestaan al. Alleen de edge function en client-side code ontbreken.

## Resultaat

- Nieuwe accounts krijgen direct een company + koppeling
- Bestaande accounts die al een company hebben: geen impact (early return)
- Race condition afgedekt door zowel edge function als client-side fallback
- Alle 63+ componenten en 17 enterprise pagina's werken direct

