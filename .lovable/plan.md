

# Redesign: MobileBottomNav — iOS 26 Stijl

## Probleem
De huidige bottom nav heeft inconsistente sizing, te grote icon containers (w-10 h-10), de CTA-knop is niet verticaal gecentreerd t.o.v. de andere tabs, en het geheel voelt niet strak/professioneel genoeg voor de iOS 26 standaard.

## Oplossing
Complete herwrite van de MobileBottomNav naar een strak, minimalistisch iOS 26 design:

**Bestand:** `src/components/layout/MobileBottomNav.tsx`

### Visuele wijzigingen:
1. **Compactere layout** — Verwijder de oversized 10x10 icon containers; gebruik directe icons (20x20) zonder wrapper boxes
2. **CTA knop** — Verklein van w-11 h-11 naar w-10 h-10, verhoog iets boven de bar met een negatieve margin-top voor een floating effect, voeg subtiele ring/glow toe
3. **Actieve indicator** — Vervang de huidige bg-primary/15 box door een subtiele pill-indicator boven het icon (iOS 26 stijl dot/pill)
4. **Typografie** — Labels naar text-[10px] met tracking-wide, consistente spacing
5. **Centrering** — Alle items exact gelijk uitgelijnd via `place-items-center` op de grid, gelijke min-heights
6. **Kleuren** — Inactief: `text-white/40`, actief: `text-white` met subtiele glow, geen border op actieve items
7. **Path fix** — `/order/new` → `/orders/edit`

### Technische details:
- Grid blijft 5 kolommen maar met `place-items-center` voor perfecte centrering
- Geen icon wrapper divs meer voor niet-CTA items — direct icon + label stack
- CTA krijgt een `-mt-3` om boven de bar te floaten met een ring-2 ring-background border
- Actieve pill indicator: 4px breed, 2px hoog, rounded-full, boven het icon
- Spring physics behouden op tap (scale 0.9)

