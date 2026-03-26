

# Bevestiging: Stap 2, 3 & 4 Redesign — Functionaliteit & Data

## Conclusie
**Ja, alles blijft 100% werkend.** De geplande wijzigingen zijn puur visueel. De data-opslag logica wordt niet aangeraakt.

## Wat er nu al correct werkt (en blijft werken):

| Stap | Data die wordt opgeslagen | Waar |
|------|--------------------------|------|
| Bedrijf | KvK, BTW, IBAN, adres, naam, telefoon | `companies` tabel |
| TMS Plan | Geselecteerd plan ID | `tenant_subscriptions` tabel |
| AI Plan | Plan ID, credits, trial einddatum | `ai_tenant_subscriptions` tabel |
| Dashboard | Widget volgorde, thema keuze | `user_preferences` + localStorage |
| Onboarding status | Timestamp voltooiing | `tenant_settings` + `profiles` |

## Waarom het veilig is
- De redesign raakt **alleen** de JSX-rendering en CSS/animatie classes in `TMSPlanSelector`, `AIPlanSelector`, en de dashboard stap
- Alle `onSelect` callbacks (`setSelectedTMSPlanId`, `setSelectedAIPlanId`, etc.) blijven identiek
- De `handleComplete` functie (die alles opslaat) wordt niet gewijzigd
- Geen database migraties nodig

## Samenvatting
Het plan voegt alleen toe: geanimeerde headers, 3D hover effecten, consistente spacing. Nul impact op functionaliteit of data-opslag. Klaar om te implementeren.

