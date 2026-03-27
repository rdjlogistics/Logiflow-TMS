

# Fix: Build Error & Framer Motion Warnings

## Gevonden problemen

### 1. Ongewenst `bun.lock` bestand
Een `bun.lock` bestand is per ongeluk aangemaakt in een vorige edit. Het project gebruikt `package-lock.json`. Dit kan de build-pipeline verwarren.

**Fix**: Verwijder `bun.lock`.

### 2. Negatieve blur keyframes in animaties
De `slideVariants` in `OnboardingWizard.tsx` gebruikt `filter: 'blur(4px)'` in enter/exit animaties. Framer Motion interpoleert dit en genereert negatieve blur-waarden (`blur(-0.3px)`), wat ongeldige CSS is en warnings veroorzaakt.

**Fix**: Verander de `slideVariants` om geen `filter` property te gebruiken, of gebruik `opacity` alleen:

```typescript
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};
```

### 3. Ongebruikte `setLoadingWithTimeout` in `useAuth.tsx`
De functie `setLoadingWithTimeout` is gedefinieerd maar nooit aangeroepen — `setLoading` wordt direct gebruikt. Dit is geen error maar dead code.

**Fix**: Verwijder de ongebruikte functie of gebruik het consistent.

## Bestanden
1. **Verwijder**: `bun.lock`
2. **Edit**: `src/pages/OnboardingWizard.tsx` — Fix slideVariants blur
3. **Edit**: `src/hooks/useAuth.tsx` — Clean up unused code

