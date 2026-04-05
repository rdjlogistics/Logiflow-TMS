
# Login fix — één bron van waarheid, geen dubbele auth-logica meer

## Diagnose
Do I know what the issue is? Ja.

De echte fout zit niet in “de loginform” zelf maar in de auth-flow eromheen:

1. `useAuth.tsx` publiceert de sessie te vroeg naar de rest van de app tijdens bootstrap.
2. `PortalLogin.tsx` doet direct na `signInWithPassword` nog een losse `user_roles` check en kan de gebruiker meteen weer uitloggen op een tijdelijke `null`.
3. `PortalGuard.tsx` doet nóg een eigen rolcheck en behandelt “nog niet klaar / query-fout / geen data” alsof het “geen toegang” is.
4. Andere hooks (`useUserRole`, `useCompany`, `useOnboardingRequired`, `usePortalAuth`) starten protected queries zodra `user` bestaat, terwijl auth/RLS nog niet altijd veilig klaar is.
5. Daardoor krijg je exact het gedrag dat jij beschrijft: login lijkt te werken, daarna load error / redirect / vastloper / opnieuw login.

Kort: er zijn nu meerdere plekken die auth interpreteren. Dat moet terug naar 1 stabiele flow.

## Plan
### 1) Auth bootstrap hard maken
`src/hooks/useAuth.tsx`
- auth-bootstrap en “auth echt klaar voor queries” van elkaar scheiden
- sessie pas als bruikbaar behandelen nadat de initiële hydratatie echt rond is
- `onAuthStateChange` synchroon houden, zonder blokkerende side-effects
- `ensure-user-company` volledig fire-and-forget laten blijven

### 2) Alle protected queries achter auth readiness zetten
- `src/hooks/useUserRole.ts`
- `src/hooks/useCompany.ts`
- `src/hooks/useOnboardingRequired.ts`
- `src/hooks/usePortalAuth.ts`

Deze hooks mogen pas draaien als auth echt query-safe is.  
Belangrijk: `null` tijdens bootstrap mag nooit meer worden geïnterpreteerd als “geen rechten” of “geen company”.

### 3) Portal auth centraliseren
Nieuw: `src/hooks/usePortalAccess.ts`
- haalt alle relevante rollen op (`klant`, `admin`, `medewerker`)
- bepaalt centraal:
  - `hasPortalAccess`
  - `hasKlantRole`
  - `needsOnboarding`
- gebruikt retry/loading/error states
- behandelt transient fouten als tijdelijk probleem, niet als definitieve weigering

Dit wordt de enige bron van waarheid voor portal login + guard.

### 4) Portal login ont-dubbelen
`src/pages/portal/PortalLogin.tsx`
- directe rolquery na login verwijderen
- géén directe sign-out meer op basis van een vroege `null`
- na succesvolle login alleen laten doorstromen naar de portal-flow
- e-mail normaliseren met `trim().toLowerCase()`
- meteen het vergeten-wachtwoord pad nalopen, want de portal verwijst nu naar `/reset-password` terwijl die publieke route gecontroleerd moet worden

### 5) Portal guard veilig maken
`src/components/portal/shared/PortalGuard.tsx`
- overschakelen op de centrale portal hook
- alleen redirecten als toegang definitief geweigerd is
- bij loading of query-fout: nette herstelstatus / retry UI, geen foutieve logout of bounce
- multi-role gebruikers deterministisch behandelen i.p.v. `limit(1)` op `user_roles`

### 6) ProtectedRoute stabiliseren
`src/components/auth/ProtectedRoute.tsx`
- role checks pas starten als auth echt klaar is
- geen “Rol niet gevonden” meer tonen tijdens bootstrap
- auto-retry alleen gebruiken bij echte rol-ophaalproblemen, niet bij auth-hydratatie

### 7) Kleine auth-opruiming zodat dit niet weer dubbel gaat
- `src/pages/Auth.tsx`
- `src/pages/DriverLogin.tsx`

Zelfde veilige e-mailnormalisatie en geen extra losse auth-beslissingen buiten de centrale flow.

## Bestanden
- `src/hooks/useAuth.tsx`
- `src/hooks/useUserRole.ts`
- `src/hooks/useCompany.ts`
- `src/hooks/useOnboardingRequired.ts`
- `src/hooks/usePortalAuth.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/portal/shared/PortalGuard.tsx`
- `src/pages/portal/PortalLogin.tsx`
- `src/pages/Auth.tsx`
- `src/pages/DriverLogin.tsx`
- nieuw: `src/hooks/usePortalAccess.ts`

## Verwacht resultaat
Na deze fix:
- klanten worden niet meer direct na login foutief uitgelogd
- geen valse “geen toegang” door te vroege rolchecks
- geen load-loop door protected queries vóór auth readiness
- geen dubbele auth-logica meer tussen loginpagina, guards en hooks
- stabiele login voor zowel hoofdapp als klantenportaal

## Technische details
- Geen databasewijziging nodig
- Geen backendmigratie nodig
- De fix zit volledig in auth sequencing, query gating en het verwijderen van dubbele loginlogica
- Dit is minimaal invasief: ik hou de bestaande routes en schermen aan, maar maak de auth-laag eindelijk eenduidig en betrouwbaar

## Validatie na implementatie
Ik zou dit daarna gericht nalopen op:
1. `/auth` login
2. `/portal/login` klantlogin
3. onboarding redirect na portal login
4. multi-role gebruiker
5. harde refresh direct na login
6. mobiele flow met bestaande sessie / localStorage
