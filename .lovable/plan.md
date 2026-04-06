

# Fix: "Welkom" bericht alleen voor nieuwe accounts

## Probleem
Het "Welkom bij je Command Center" blok verschijnt bij bestaande accounts omdat het **alleen kijkt naar data-aantallen** (`< 5 trips` en `€0 revenue`), niet naar of het account nieuw is. Een 3 maanden oud account met weinig activiteit ziet dus steeds de welkomstbanner.

Er zijn twee losse componenten die dit veroorzaken:

1. **`DashboardEmptyState`** — toont setup-stappen op basis van `hasEnoughData` (puur data-count)
2. **`OnboardingChecklist`** — checkt `tenant_settings.onboarding_completed_at`, maar oude accounts hebben dit veld als `null` omdat ze vóór het onboarding-systeem zijn aangemaakt

## Oplossing

### 1. DashboardEmptyState koppelen aan onboarding-status
**Bestand:** `src/pages/Dashboard.tsx`

- Importeer `useOnboardingChecklist`
- Toon `DashboardEmptyState` alleen als `show === true` (= onboarding nog niet afgerond) EN `!hasEnoughData`
- Bestaande accounts waar `onboarding_completed_at` al is gezet zien het nooit meer

### 2. Migratie: bestaande accounts markeren als onboarding-voltooid
**Database migratie:**

```sql
UPDATE tenant_settings 
SET onboarding_completed_at = created_at 
WHERE onboarding_completed_at IS NULL 
  AND created_at < NOW() - INTERVAL '7 days';
```

Dit markeert alle accounts ouder dan 7 dagen als "onboarding voltooid", zodat alleen echte nieuwe registraties de welkomstflow zien.

### 3. Fallback in useOnboardingChecklist
**Bestand:** `src/hooks/useOnboardingChecklist.ts`

- Als er geen `tenant_settings` rij bestaat voor een company, behandel dit als "al voltooid" (bestaand account zonder settings-rij)
- Nu returnt het `null` → `show` wordt `false` → correct gedrag

## Resultaat
- Nieuwe registraties → zien welkomstbanner + onboarding checklist
- Bestaande accounts (> 7 dagen) → zien nooit meer de welkomstbanner
- Geen impact op andere features

