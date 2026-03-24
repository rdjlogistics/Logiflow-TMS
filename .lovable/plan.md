

# Apple Setup Experience — Onboarding Wizard Redesign

## Concept
Transformeer de huidige 6-stappen wizard naar een immersive Apple-device-setup ervaring. Net als wanneer je een nieuwe iPhone/Mac voor het eerst aanzet: elke stap heeft échte configuratie, validatie, en visuele feedback. Geen "doorklikkertje" maar een setup die je bedrijf daadwerkelijk klaarzet.

## Huidige situatie
`src/pages/OnboardingWizard.tsx` — 6 stappen (Welkom, Bedrijf, TMS, AI, Dashboard, Start). Visueel al glassmorphism maar de stappen voelen als doorklikken: geen validatie, geen inline feedback, welkomscherm is statisch.

## Nieuwe stappen & business logica

### Stap 0: "Hallo" — Cinematic Intro
- Geanimeerd "Hallo" scherm à la iPhone opstart (grote typografie, fade-in sequence)
- Taal detectie badge, tijdstip-gebaseerde begroeting ("Goedemorgen/Goedemiddag")
- Animated truck icon met 3D perspective tilt (Vision Pro depth effect)
- Snelheidsoverzicht: "Dit duurt ~3 minuten" met animated timeline dots

### Stap 1: Bedrijf verificatie (echte business logica)
- **KvK-nummer live lookup**: Na invoer KvK, toon gevalideerde bedrijfsnaam + adres met groene checkmark animation
- **BTW-nummer format validatie**: Inline NL-formaat check met real-time feedback
- **IBAN validatie**: Mod97 check met bank-icoon dat verschijnt na geldige IBAN
- Elk veld krijgt een ✓ animatie zodra valide — progress ring rond de stap-indicator vult
- "Skip for now" optie met subtiele warning dat facturen nog niet mogelijk zijn

### Stap 2: TMS Plan (bestaande `TMSPlanSelector` behouden)
- Toevoegen: interactieve vergelijkingswidget — tik op een feature om verschil tussen plannen te zien
- 3D card tilt effect op hover (Vision Pro depth)
- Selectie bevestiging met confetti-pulse ring

### Stap 3: AI Co-pilot (bestaande `AIPlanSelector` behouden)
- Toevoegen: live demo preview — bij selectie van een plan verschijnt een mini-chat bubble met een voorbeeld AI-interactie
- "Probeer nu" knop die een echte test-vraag stuurt naar de copilot

### Stap 4: Dashboard personalisatie
- Drag-and-drop widget preview met live rearrangement
- Thema switcher met instant full-screen preview transition (viewTransition API)
- Vision Pro-style depth cards die reageren op muis/touch positie

### Stap 5: "Klaar" — Launch sequence
- Animated checklist van alles wat geconfigureerd is (met groene vinkjes die sequentieel verschijnen)
- Confetti/particle burst bij "Start met LogiFlow"
- Redirect naar dashboard met crossfade transition

## Technische wijzigingen

### Bestanden

1. **`src/pages/OnboardingWizard.tsx`** — Complete rewrite van de step rendering:
   - Cinematic intro animatie sequence
   - Per-field validatie state tracking
   - KvK/BTW/IBAN inline validators
   - ViewTransition API voor thema preview
   - Mouse parallax voor Vision Pro depth effect

2. **`src/components/onboarding/validators.ts`** (nieuw) — Business logica validators:
   - `validateKvK(value)` — 8 cijfers check
   - `validateBTW(value)` — NL + 9 cijfers + B + 2 cijfers format
   - `validateIBAN(value)` — Mod97 algorithme
   - `validatePhone(value)` — NL telefoon format

3. **`src/components/onboarding/CinematicIntro.tsx`** (nieuw) — Animated "Hallo" welkomscherm:
   - Staggered text reveal met spring physics
   - Tijdstip-gebaseerde begroeting
   - Animated timeline preview van alle stappen
   - 3D truck icon met perspective transform

4. **`src/components/onboarding/CompanyVerificationStep.tsx`** (nieuw) — Bedrijfsstap met validatie:
   - Per-veld validatie indicators (✓/✗ icons)
   - Progress ring die vult per valide veld
   - Inline format hints
   - Animated field transitions

5. **`src/components/onboarding/LaunchSequence.tsx`** (nieuw) — Finale stap:
   - Sequential checklist animation
   - Particle/confetti effect
   - Summary cards met slide-in

### Geen database wijzigingen nodig
Alle business logica is client-side validatie. De bestaande `handleComplete` save-logica blijft intact.

### Responsive
- **Mobile (iOS 26)**: Bottom-anchored navigation, 48px touch targets, safe-area insets, swipe between steps
- **Desktop (macOS/Vision Pro)**: Centered content max-w-3xl, mouse parallax depth, hover 3D card tilts, keyboard navigation (←/→ arrows)

