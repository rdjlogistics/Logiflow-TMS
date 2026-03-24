

# Plan: iOS Liquid Glass Bottom Nav

## Wat verandert
De `MobileBottomNav.tsx` wordt volledig herontworpen naar modern iOS 26 / Apple Vision Pro "liquid glass" stijl:

### Verwijderen
- Pulse ring animatie achter de "Nieuw" knop
- De oversized floating orb-knop (te groot, te druk)
- Gradient accent line bovenaan
- Active pill background + active dot onderaan

### Nieuw ontwerp — Liquid Glass iOS Tab Bar
- **Glass bar**: `backdrop-blur-2xl` + `backdrop-saturate-[180%]` + subtiele witte border met lage opacity — exact zoals iOS 26 tab bars
- **Nieuw-knop**: Verkleind tot een nette cirkel (w-11 h-11) met zachte gradient, geen pulse, gelijk niveau als andere tabs — zoals iOS "+" knoppen
- **Actieve tab indicator**: Minimale iOS-stijl filled icon + bold label in primary kleur, geen achtergrond-pill maar een subtiele top-line (2px breed) boven het actieve icoon
- **Inactieve tabs**: Dunne outline iconen in `text-muted-foreground/70` — lichte, elegante look
- **Spacing**: Meer verticale padding, grotere touch targets (44pt minimum), labels op 11px
- **Animaties**: Zachte spring transitions op icon scale (1→1.08) bij active, `whileTap: scale 0.92` voor feedback — geen bouncy overdreven animaties

### Bestanden
| Bestand | Wijziging |
|---|---|
| `src/components/layout/MobileBottomNav.tsx` | Volledig herontwerp naar liquid glass iOS stijl |

