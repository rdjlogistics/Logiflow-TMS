

# Lighthouse Audit op productie-URL

## Wat we doen
Een Lighthouse audit draaien op `https://rdjlogistics.lovable.app` — de gepubliceerde versie zonder Lovable preview-overhead. Dit geeft realistische scores die representatief zijn voor wat echte gebruikers ervaren.

## Aanpak
1. Lighthouse CLI draaien tegen `https://rdjlogistics.lovable.app` met dezelfde categorieën (Performance, Accessibility, Best Practices, SEO)
2. HTML-rapport opslaan als `lighthouse-production-2026-04-04.html`
3. Scores vergelijken met de preview-audit (v2) om het verschil door preview-overhead zichtbaar te maken
4. Concrete verbeterpunten rapporteren die specifiek voor productie gelden

## Verwacht resultaat
- Significant hogere Performance-score (preview had ~820ms auth-bridge overhead + wrapper scripts)
- Rapport beschikbaar als downloadbaar HTML-bestand
- Vergelijkingstabel preview vs productie

