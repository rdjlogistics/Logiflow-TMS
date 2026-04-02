

# Optimaliseer Klanten pagina — iOS 27 "Elite Class" mobiele weergave

## Huidige staat
De Klanten pagina gebruikt standaard `Card` componenten zonder glassmorphism, een platte toolbar met knoppen die op mobiel naast elkaar gedrukt staan, en simpele kaarten zonder premium styling.

## Wijzigingen

### Bestand: `src/pages/Customers.tsx`

**1. Toolbar — Glassmorphism zoekbalk + compacte actieknoppen**
- Zoekbalk: `backdrop-blur-xl bg-card/40 border-white/10 rounded-2xl` met grotere hoogte (`h-12`) en `shadow-lg`
- Actieknoppen (CSV, Prullenbak, Nieuwe klant): Op mobiel alleen iconen tonen, labels `hidden sm:inline`. Wrappen in een horizontaal scrollbare `flex gap-2 overflow-x-auto` container
- "Verberg test-data" checkbox: Verplaats naar een compactere pill-toggle met glassmorphism achtergrond

**2. Klantenlijst header — Premium glassmorphism card**
- Vervang `<Card>/<CardHeader>` door glassmorphism container: `backdrop-blur-xl bg-card/50 border border-white/10 rounded-2xl`
- Titel "Klanten (23)" met `text-xl font-bold tracking-tight`

**3. Mobiele klantenkaarten — Elite Class redesign**
- Buitenste card: `backdrop-blur-xl bg-card/50 border border-white/10 rounded-2xl shadow-lg` met `overflow-hidden`
- Bovenrand: `h-px bg-gradient-to-r from-transparent via-white/10 to-transparent` highlight
- Bedrijfsnaam: `text-base font-semibold tracking-tight`
- Contactpersoon: `text-sm text-muted-foreground/80`
- Portal badge: Pill met `backdrop-blur-sm bg-emerald-500/15 border-emerald-500/30 text-emerald-400 rounded-full px-3 py-1`
- Email/Stad grid: Subtielere labels met `text-[11px] uppercase tracking-wider text-muted-foreground/60`
- Actieknoppen onderaan: `border-t border-white/5` met grotere touch targets (`min-h-[48px]`) en subtiele icoon-kleuring
- Staggered entry animatie: `delay: i * 0.05` met spring physics

**4. Bulk selection toolbar — Glassmorphism floating bar**
- Van `bg-muted/50 rounded-lg` naar `backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-xl`

**5. Bottom spacing**
- Voeg `pb-24` toe aan de main container zodat content niet achter de bottom nav verdwijnt

### Niet geraakt
- Desktop tabelweergave blijft ongewijzigd
- Dialogen (bewerken, prullenbak, historie) blijven ongewijzigd
- Alle functionaliteit (CRUD, CSV export, portal) blijft 100% intact

## Resultaat
- Glassmorphism kaarten met `backdrop-blur-xl` en subtiele borders
- Premium zoekbalk met frosted glass effect
- Grotere touch targets (48px) voor iOS accessibility
- Staggered spring animaties bij laden
- Proper safe-area spacing boven bottom nav

