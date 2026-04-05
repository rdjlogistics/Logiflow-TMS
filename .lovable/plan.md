

# Tarieven & Contracten — Elite Class Optimalisatie

## Overzicht

De twee pricing-pagina's (RateContracts + DynamicPricing) zijn functioneel solide: alle CRUD-operaties werken via de database, hooks zijn correct opgezet. De upgrade richt zich op drie pijlers: **elite visuele uitstraling** (iOS 27), **ontbrekende business logica** voor transport, en **mobiele optimalisatie**.

## Huidige staat

- **RateContracts**: 741 regels, 4 tabs (Contracten, Zones, Toeslagen, Rating Monitor). Werkt met database maar UI is basis-tabelstijl, geen mobiele kaartweergave, geen contract-activering workflow, geen verloopdatum-waarschuwingen.
- **DynamicPricing**: 775 regels, 4 tabs (Calculator, Prijsregels, Surge Factors, Marktanalyse). Calculator werkt via Edge Function. Regel-Switch doet visueel niets (geen onCheckedChange). Marktanalyse is read-only zonder acties.
- **ContractLanesDialog**: Volledig functioneel (CRUD lanes met zones). 530 regels.

## Plan

### 1. RateContracts pagina — Elite redesign + business logica

**Visueel:**
- Stats-kaarten upgraden naar glassmorphism met gradient-iconen en micro-animaties
- Tabellen vervangen door responsive kaarten op mobiel (`md:hidden` kaartlayout, `hidden md:block` tabel)
- Status-badges met kleurgradients en pulse-effecten voor "wacht op goedkeuring"
- iOS-style grouped list look voor mobiele kaarten

**Business logica toevoegen:**
- **Contract activering/goedkeuring workflow**: Knoppen "Goedkeuren" en "Activeren" op concept-contracten die `updateContractStatus` aanroepen (hook bestaat al, wordt niet gebruikt in UI)
- **Verloopdatum-waarschuwing**: Contracts die binnen 30 dagen verlopen krijgen een amber warning-badge
- **Verlopen contract auto-markering**: Visueel markeren van contracten waarvan `effective_to < now()`
- **Quick-filter knoppen**: Actief / Concept / Verlopen filterknoppen boven de tabel
- **Tariefzone validatie**: Bij zone-aanmaak postcoderange-formaat valideren (NL: 4 cijfers)
- **Toeslag business defaults**: Pre-fill standaard transport toeslagen (wachttijd, laadklep, ADR, pallet-wissel) bij "Nieuwe Toeslag"

### 2. DynamicPricing pagina — Functionele fixes + elite UI

**Bugs fixen:**
- Pricing rule Switch: `onCheckedChange` toevoegen die `useUpdatePricingRule` aanroept om `is_active` te togglen
- Surge factor delete-mogelijkheid toevoegen (ontbreekt)
- Calculator resultaat opslaan in `price_calculations` tabel (edge function doet dit al, maar bevestiging tonen)

**Business logica:**
- **Marktanalyse met actie**: "Pas multiplier toe" knop bij elke regio die automatisch een surge factor aanmaakt op basis van `suggested_multiplier`
- **Prijsgeschiedenis tab**: Vervang marktanalyse-tab door split: bovenaan marktdata, onderaan recente berekeningen met trend-indicatie
- **Voertuigtype impact**: Toon in calculator resultaat welk voertuigtype-toeslag is toegepast

**Visueel:**
- Glassmorphism stat-kaarten met gradient achtergronden
- Calculator resultaat met animated counter-effect (CSS-only)
- Regel-kaarten met drag-handle voor prioriteit-herordening (visueel, later functioneel)
- Mobiele kaartlayout voor regels en factors

### 3. Mobiele optimalisatie (iOS 27 vibes)

- Alle tabellen: responsive kaartlayout met 48px touch targets
- Bottom sheet-stijl voor create/edit dialogen op mobiel
- Swipe-acties op kaarten (visuele hint met chevron)
- Safe-area insets respecteren
- Hairline borders (0.5px) consistent toepassen
- TabsList horizontaal scrollbaar op kleine schermen

### 4. Gedeelde verbeteringen

- Zoekfunctie verbeteren: debounce + highlight matching tekst
- Lege-staat illustraties upgraden met gradient-iconen
- Loading skeletons met shimmer-effect
- Toast-bevestigingen verrijken met undo-optie bij verwijderingen
- Alle € bedragen consistent formatteren met `toLocaleString('nl-NL')`

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---|---|
| `src/pages/pricing/RateContracts.tsx` | Complete UI redesign, business logica, mobiel |
| `src/pages/pricing/DynamicPricing.tsx` | Bug fixes, business logica, elite UI |
| `src/hooks/useRateContractEngine.ts` | Expose `updateContractStatus` + rate lane mutations in return |
| `src/hooks/useDynamicPricing.ts` | Toevoegen `useDeleteSurgeFactor`, `useDeletePricingRule` |
| `src/components/pricing/ContractLanesDialog.tsx` | Mobiele layout + glassmorphism |
| `src/components/pricing/EditContractDialog.tsx` | Mobiele optimalisatie |
| `src/components/pricing/EditZoneDialog.tsx` | Postcode validatie |
| `src/components/pricing/EditAccessorialDialog.tsx` | Transport defaults |
| `src/components/pricing/EmptyState.tsx` | Gradient icon upgrade |

## Risico

Laag — alle database-tabellen en hooks bestaan al. Geen schema-wijzigingen nodig. Puur UI + business logica die bestaande mutations correct aanroept.

