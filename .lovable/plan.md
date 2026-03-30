

# Fix: B2B Portaal Wizard, B2C Redirect & Adresboek

## Diagnose

### Probleem 1 — B2B Onboarding "Volgende" knop doet niets
De code ziet er correct uit: `onClick={() => setStep((s) => s + 1)}` met `disabled={step === 0 && !canProceedStep0}`. De knop is disabled als `companyName` of `email` leeg is. **Mogelijke oorzaak**: `customer` data laadt langzaam of is `null`, waardoor de velden leeg blijven en `canProceedStep0 = false`. De knop lijkt niets te doen maar is eigenlijk disabled zonder visuele feedback.

**Fix**: Voeg duidelijke validatie-feedback toe (rode border + foutmelding bij lege verplichte velden) zodat de gebruiker ziet waarom de knop disabled is.

### Probleem 2 — B2C redirect naar B2B onboarding
`PortalGuard` (line 85) redirect **alle** portal-paden naar `/portal/b2b/onboarding` als `needsOnboarding = true`. Dit treft ook B2C gebruikers. De onboarding-check is gebaseerd op `portal_notification_preferences` — als die niet bestaan, wordt de gebruiker naar B2B onboarding gestuurd, zelfs vanuit `/portal/b2c`.

**Fix**: Alleen redirecten naar onboarding als het pad begint met `/portal/b2b`. B2C paden overslaan.

### Probleem 3 — Adresboek duplicaten
De code splitst correct: `favorites = filtered.filter(l => l.is_favorite)` en `others = filtered.filter(l => !l.is_favorite)`. Dit is geen code-bug — het zijn waarschijnlijk dubbele database records. Geen code fix nodig, maar ik voeg duplicaat-detectie toe bij het opslaan.

### Probleem 4 — Datum validatie ontbreekt
`pickupDate` in B2CBookingWizard is een text `<Input>` met `type="date"`. Er is geen `min` attribuut, dus datums in het verleden zijn mogelijk.

### Probleem 5 — Postcode/stad mismatch waarschuwing ontbreekt
Na postcode lookup wordt de stad automatisch ingevuld, maar als de gebruiker de stad handmatig wijzigt, is er geen waarschuwing.

## Fixes

### 1. PortalGuard — B2C niet redirecten naar B2B onboarding
**File:** `src/components/portal/shared/PortalGuard.tsx`

Line 85: Wijzig conditie van:
```
if (needsOnboarding && location.pathname !== "/portal/b2b/onboarding")
```
naar:
```
if (needsOnboarding && location.pathname.startsWith("/portal/b2b") && location.pathname !== "/portal/b2b/onboarding")
```

### 2. B2B Onboarding — Validatie feedback
**File:** `src/pages/portal/B2BOnboarding.tsx`

- Voeg `attempted` state toe (wordt `true` bij klik op Volgende als validatie faalt)
- Toon rode border + foutmelding bij lege `companyName` en `email`
- Wijzig Volgende-knop: als `!canProceedStep0`, zet `attempted = true` en toon feedback i.p.v. disabled

### 3. B2CBookingWizard — Datum min-attribuut + postcode waarschuwing
**File:** `src/components/portal/b2c/B2CBookingWizard.tsx`

- Zoek het date input veld en voeg `min={new Date().toISOString().split('T')[0]}` toe
- Na postcode lookup: sla de lookup-stad op in state (`lookupFromCity`, `lookupToCity`)
- Als de gebruiker de stad handmatig wijzigt en deze verschilt van de lookup-stad: toon gele waarschuwing ("Postcode geeft stad X aan, u heeft Y ingevuld")

### 4. Adresboek — Duplicaat detectie bij opslaan
**File:** `src/pages/portal/B2BAddressBook.tsx` of `src/hooks/useCustomerLocations.ts`

Bij `createLocation`: check of er al een adres met dezelfde `address_line + house_number + postcode` bestaat. Als ja → `window.confirm("Dit adres bestaat al. Wil je doorgaan?")`

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/portal/shared/PortalGuard.tsx` — B2C pad uitsluiten van onboarding redirect |
| **Edit** | `src/pages/portal/B2BOnboarding.tsx` — Validatie feedback op stap 1 |
| **Edit** | `src/components/portal/b2c/B2CBookingWizard.tsx` — Date min + postcode mismatch waarschuwing |
| **Edit** | `src/hooks/useCustomerLocations.ts` — Duplicaat adres detectie |

