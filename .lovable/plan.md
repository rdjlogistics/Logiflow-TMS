

# Polish: Onboarding Checklist Widget op Dashboard

## Huidige situatie

Er is al een `DashboardEmptyState` component (line 591-604 in Dashboard.tsx), maar die checkt alleen orders/rates/bank — niet de kern-stappen (bedrijfsgegevens, voertuigen, chauffeurs, klanten). De widget verdwijnt ook niet permanent.

## Plan

### 1. Nieuw component: `OnboardingChecklist.tsx`

**File:** `src/components/dashboard/OnboardingChecklist.tsx`

Een card widget bovenaan het dashboard met:
- Welkomsttekst "Welkom bij LogiFlow!"
- 5 stappen met live data-checks via Supabase queries:
  - ✅ Account aangemaakt (altijd true)
  - Bedrijfsgegevens invullen → `/settings/company` (check: `companies.name` niet leeg/default)
  - Eerste voertuig → `/fleet` (check: `vehicles.count > 0`)
  - Eerste chauffeur → `/drivers` (check: `drivers.count > 0`)
  - Eerste klant → `/customers` (check: `customers.count > 0`)
  - Eerste order → `/orders/edit` (check: `trips.count > 0`)
- Voortgangsbalk (bestaande `Progress` component)
- Minimaliseer-knop (state in localStorage)
- Bij 6/6 voltooid: confetti-achtige "Gefeliciteerd!" melding, dan auto-hide na 5s en `onboarding_completed_at` updaten in `tenant_settings`

### 2. Hook: `useOnboardingChecklist.ts`

**File:** `src/hooks/useOnboardingChecklist.ts`

- Fetcht counts voor vehicles, drivers, customers, trips + company name
- Returns `{ steps, completedCount, totalCount, allComplete, dismiss, isDismissed }`
- Skip als `tenant_settings.onboarding_completed_at` al gezet is

### 3. Dashboard integratie

**File:** `src/pages/Dashboard.tsx`

- Vervang de huidige `DashboardEmptyState` (line 591-604) door `OnboardingChecklist`
- Toon direct na de header/stats, vóór de widget grid
- Alleen tonen als `!allComplete && !isDismissed`

### 4. Bestaande DashboardEmptyState

Wordt niet verwijderd maar niet meer gebruikt in Dashboard.tsx (de OnboardingChecklist vervangt het).

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Create** | `src/hooks/useOnboardingChecklist.ts` — data checks hook |
| **Create** | `src/components/dashboard/OnboardingChecklist.tsx` — checklist widget |
| **Edit** | `src/pages/Dashboard.tsx` — vervang DashboardEmptyState door OnboardingChecklist |

