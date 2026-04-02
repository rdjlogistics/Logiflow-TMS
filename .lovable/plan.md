

# Debiteuren & Incasso — iOS 27 "Elite Class" mobiele optimalisatie

## Probleem
De pagina toont op mobiel overlappende elementen: badges, bedragen en datums staan op één regel gepropt waardoor tekst afkapt. De accordion-trigger heeft te kleine touch targets en de layout is niet geoptimaliseerd voor smalle schermen.

## Wijzigingen

### Bestand: `src/pages/finance/Receivables.tsx`

**1. Bottom spacing**
- `pb-24 md:pb-6` op de main container zodat content boven de bottom nav blijft

**2. KPI Cards grid**
- `grid-cols-2` op mobiel (i.p.v. `grid-cols-1`) zodat 4 kaarten in 2x2 passen
- Kleinere padding in KPICard op mobiel: `pt-4 pb-3 md:pt-6 md:pb-5`

**3. Zoekbalk — Glassmorphism**
- `h-12 rounded-2xl backdrop-blur-xl bg-card/40 border-border/20 shadow-lg`

**4. Customer Accordion — Mobiel-first layout**
- Trigger: Stack verticaal op mobiel — bedrijfsnaam bovenaan, badges + bedrag op een aparte regel eronder
- Touch target: `min-h-[56px] py-4` 
- Bedrijfsnaam: `text-base font-semibold tracking-tight` op mobiel
- Badge "verlopen": kleiner formaat, `text-[10px]` op mobiel

**5. Invoice rijen in accordion — Mobiel stack**
- Op mobiel: verticale stack i.p.v. horizontale flex
- Factuurnummer + status badges op regel 1
- Datum + bedrag + mail-knop op regel 2
- Touch targets: `min-h-[48px]`

**6. Staggered animaties**
- Spring physics op accordion cards: `type: 'spring', stiffness: 260, damping: 24`
- Delay per card: `i * 0.05`

**7. Tabs — Grotere touch targets op mobiel**
- TabsTrigger: `px-4 py-2.5 text-sm` op mobiel

### Niet geraakt
- Desktop layout blijft ongewijzigd (alle wijzigingen via responsive breakpoints)
- Incasso en Credit Analytics tabs — geen wijzigingen
- Alle functionaliteit (navigatie, herinneringen, sorting) blijft 100% intact

## Resultaat
- 2x2 KPI grid op mobiel met compacte glassmorphism kaarten
- Gestapelde accordion layout die niet meer overlapt
- 48-56px touch targets overal
- Premium glassmorphism zoekbalk
- Proper safe-area spacing boven bottom nav

