

# Fix: Dubbele Onboarding & Beperkte Functies voor Nieuwe Accounts

## Probleem 1: Onboarding verschijnt 2x
**Oorzaak**: Race condition. Na signup roept `useAuth` de `ensure-user-company` edge function aan (async, deferred via `setTimeout`). Tegelijkertijd checkt `DashboardLayout` via `useOnboardingRequired` of er een `user_companies` record bestaat. Als `ensure-user-company` nog niet klaar is, vindt de check geen company → redirect naar `/onboarding`. Zodra de edge function wél klaar is, kan de onboarding wizard opnieuw triigeren of wegnavigeren, wat de "dubbele" ervaring veroorzaakt.

Daarnaast: na het afronden van de onboarding doet de wizard `navigate('/')` → DashboardLayout laadt opnieuw → `useOnboardingRequired` refetcht maar de query-invalidatie is mogelijk nog niet resolved → korte 2e redirect naar `/onboarding`.

## Probleem 2: Nieuwe accounts hebben beperkte functies
**Oorzaak**: `useSubscriptionPlan` haalt de `tenant_subscriptions` op met `.limit(1).maybeSingle()`. RLS filtert op basis van de company (tenant_id). Als `ensure-user-company` faalt of de subscription niet correct wordt geprovisioned (bijv. default plan i.p.v. het geselecteerde plan), krijgt het nieuwe account een ander plan dan Rouche (Scale). De `features_json` van dat plan bevat minder features → FeatureGate blokkeert functies.

## Oplossing

### 1. Voorkom race condition in `useOnboardingRequired` (`src/hooks/useOnboardingRequired.ts`)
- Wacht tot `ensure-user-company` klaar is voordat de onboarding-check draait
- Voeg een `ready` state toe: check of `user_companies` al bestaat, zo niet → wacht max 5s met polling (500ms interval) tot de edge function het record aanmaakt
- Als er na 5s nog geen company is, dan pas `needsOnboarding = true` retourneren

### 2. Voorkom dubbele redirect in `OnboardingWizard` (`src/pages/OnboardingWizard.tsx`)
- Na `handleComplete`: zet een lokale `completed` ref op `true` en gebruik die om de `useEffect` die checkt op `!needsOnboarding` te bypassen
- Wacht op query invalidation resolve voordat `navigate('/')` wordt aangeroepen (dit gebeurt al met `await`, maar voeg een extra guard toe)

### 3. Fix subscription provisioning (`src/pages/OnboardingWizard.tsx` → `handleComplete`)
- Als er geen `tenant_subscriptions` record bestaat voor de company, **maak er een aan** met het geselecteerde TMS plan (in plaats van alleen `update`)
- Gebruik `upsert` i.p.v. `update` voor `tenant_subscriptions` zodat het werkt ongeacht of `ensure-user-company` de subscription al heeft aangemaakt
- Zorg dat de trial-periode correct wordt gezet (14 dagen, status 'trial')

### 4. Verbeter `useAuth.tsx` — wacht op company link voor loading state
- Pas de `ensureUserCompanyLink` aan zodat `loading` pas op `false` gaat nadat de company-link is gegarandeerd (of gefaald na retries)
- Dit voorkomt dat `DashboardLayout` te vroeg rendert en de onboarding-check doet voordat de company bestaat

### Bestanden die worden gewijzigd:
1. **`src/hooks/useOnboardingRequired.ts`** — Polling/retry logica toevoegen
2. **`src/pages/OnboardingWizard.tsx`** — `handleComplete` upsert + completed guard
3. **`src/hooks/useAuth.tsx`** — Loading state koppelen aan company-link completion

### Geen database wijzigingen nodig
Alle fixes zijn client-side logica verbeteringen.

