

# Fix: Onboarding redirect glitch bij bestaande accounts

## Root Cause

De `useOnboardingRequired` hook heeft **3 faalscenario's** die bestaande gebruikers naar `/onboarding` sturen:

1. **DB onder druk** → `waitForCompanyLink` pollt 5 seconden en faalt → `needsOnboarding = true`
2. **Stale query refetch** → `staleTime: 30s` betekent dat elke 30s bij window-focus de query opnieuw draait. Bij DB-latentie faalt de poll → redirect
3. **Geen geheugen** → de hook weet niet dat onboarding al eerder succesvol was gecheckt. Elke refetch kan een ander resultaat geven

`DashboardLayout.tsx` regel 89: `if (!onboardingLoading && needsOnboarding)` → **redirect naar /onboarding**

## Oplossing (2 bestanden)

### 1. `src/hooks/useOnboardingRequired.ts` — bulletproof maken

- **localStorage cache**: bij eerste succesvolle check dat onboarding NIET nodig is → sla `onboarding-done-{userId}` op in localStorage
- **Fallback bij fout**: als de query faalt (DB timeout, netwerk), check localStorage. Als daar staat dat onboarding al gedaan is → return `false` (geen redirect)
- **staleTime verhogen**: van 30s naar 5 minuten. Onboarding-status verandert bijna nooit
- **`waitForCompanyLink` timeout verdubbelen**: van 5s naar 10s voor trage DB
- **Bij error niet redirecten**: als de query een error gooit → return `false` (fail-safe), niet `true`

### 2. `src/components/layout/DashboardLayout.tsx` — extra guard

- Voeg een extra check toe: als `onboardingLoading` is `false` EN de query heeft een error → NIET redirecten
- Alleen redirecten als de query succesvol data heeft opgehaald EN `needsOnboarding === true`

## Kernlogica (nieuw)

```text
queryFn:
  1. Check localStorage → "onboarding-done-{userId}" = "true"?
     → JA: return false (skip DB check)
  2. Poll user_companies (max 10s)
     → geen result: return true
  3. Check tenant_settings.onboarding_completed_at
     → completed: localStorage.set("onboarding-done-{userId}", "true"), return false
     → niet completed: return true
     
Error handling:
  → Query faalt: check localStorage fallback → als "done" → false
  → Query faalt + geen localStorage → return false (NOOIT redirecten bij fouten)
```

## Verwacht resultaat
- Bestaande accounts worden **nooit meer** naar onboarding gestuurd na een transient DB-fout
- Nieuwe accounts worden nog steeds correct naar onboarding gestuurd
- Na `signOut` wordt de localStorage-cache gewist zodat een ander account correct gecheckt wordt

