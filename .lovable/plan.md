

# Plan: iOS 26 Bottom Nav — Consistente Blue Vibes + Active Indicator Onderaan

## Problemen
1. **Kleur verandert** bij navigatie — de `bg-background/40` pakt de achtergrondkleur van de pagina op, waardoor de balk er anders uitziet per route
2. **Active indicator staat bovenaan** (top-line) — moet **onderaan** de balk voor een clean iOS 26 look, zoals in de screenshot
3. **Active state styling inconsistent** — bij Instellingen zie je een mooie rounded box, maar bij Home/Orders niet

## Oplossing

**Bestand:** `src/components/layout/MobileBottomNav.tsx`

### Wijzigingen:
1. **Vaste blauwe achtergrond** — Vervang `bg-background/40` met een solide deep-blue gradient die consistent blijft ongeacht de pagina: `bg-[hsl(228,60%,12%)]/95 backdrop-blur-2xl`
2. **Active indicator naar onder** — Verplaats de `layoutId="tab-indicator"` div van `-top-2` naar `bottom` positie, als een subtiele lijn onder het actieve item
3. **Active state = rounded box** — Net als Instellingen in de screenshot: actief item krijgt een `rounded-xl bg-primary/15 border border-primary/20` container rondom icon + label
4. **Consistente icon kleuren** — Alle icons in dezelfde blauwe tint (`text-blue-300/70` inactive, `text-white` active) voor die iOS 26 vibe
5. **CTA knop** — + knop behoudt gradient maar past in de blauwe toon

### Visueel resultaat:
- Vaste diep-blauwe balk die nooit van kleur verandert
- Actief item heeft rounded box highlight (zoals screenshot bij Instellingen)
- Subtiele glow-lijn **onder** het actieve item
- Alles synchroon blauw — iOS 26 Liquid Glass vibes

Één bestand, geen backend wijzigingen.

