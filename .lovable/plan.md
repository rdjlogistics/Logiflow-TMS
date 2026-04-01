

# OnboardingChecklist naar boven verplaatsen

## Probleem

De `<OnboardingChecklist />` component staat op regel 592 in `src/pages/Dashboard.tsx`, helemaal onderaan de pagina — ná de header, stats, OPS snapshot, widget grid én snelle acties. Voor nieuwe accounts is dit het belangrijkste element, maar het is onzichtbaar zonder te scrollen.

## Oplossing

Verplaats `<OnboardingChecklist />` van regel 592 (na "Snelle acties") naar direct ná de mobile quick stats grid en desktop OPS snapshot — dus vóór de "Jouw Dashboard" widget sectie. Dit zorgt ervoor dat nieuwe gebruikers het onboarding-blok meteen zien als eerste content na de header.

## Technisch

| Actie | Bestand | Wat |
|-------|---------|-----|
| **Edit** | `src/pages/Dashboard.tsx` | Verwijder `<OnboardingChecklist />` van regel 592; voeg het toe rond regel 511 (na de mobiele OPS sectie, vóór de widget grid sectie) |

## Resultaat

Nieuwe accounts zien de onboarding checklist ("Welkom bij je Command Center") direct bovenaan het dashboard, zonder te hoeven scrollen.

