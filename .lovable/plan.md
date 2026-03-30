

# Polish: Professionele Empty States, Loading States & Error States

## Aanpak

De app heeft al 4 verschillende EmptyState componenten (`common/EmptyState`, `portal/shared/EmptyState`, `ui/EmptyState`, `pricing/EmptyState`) plus tientallen inline empty states. Veel pagina's gebruiken kale `Loader2` spinners zonder timeout. We consolideren naar **één set herbruikbare componenten** en passen die toe op de belangrijkste pagina's.

## Wat wordt gebouwd

### 1. Unified componenten in `src/components/common/`

**EmptyState.tsx** — al aanwezig, uitbreiden met:
- `actionHref` prop (Link ipv onClick)
- `illustration` variant (grotere iconen voor hoofdpagina's)

**LoadingState.tsx** — nieuw:
- Skeleton loader (niet alleen spinner)
- Na 10s: "Dit duurt langer dan verwacht" melding
- Na 30s: error state met "Opnieuw laden" knop
- Props: `message`, `onRetry`, `timeout` (default 10s)

**ErrorState.tsx** — nieuw:
- Icon (AlertTriangle), titel, beschrijving, retry knop
- Console.error voor technische details
- Props: `error`, `onRetry`, `title`

### 2. Toepassen op hoofdpagina's

| Pagina | Huidige staat | Nieuwe staat |
|--------|--------------|-------------|
| `/fleet` (VehicleOverview) | Kale tekst + icoon | EmptyState met "Voeg je eerste voertuig toe" + knop |
| `/orders` (OrderOverview) | Inline div | EmptyState component |
| `/customers` | Inline "Voeg je eerste klant toe" | EmptyState component |
| `/drivers` | Inline User icoon + tekst | EmptyState component |
| `/invoices` | Zoeken naar huidige staat | EmptyState component |
| `/messenger` | Al verbeterd (vorige fix) | Controleren/behouden |
| `/carriers` | Inline tekst | EmptyState component |

### 3. Loading states upgraden

Vervang kale `<Loader2 animate-spin>` door `<LoadingState>` met timeout op:
- FleetManagement (line 50)
- Drivers (line 679)
- Carriers (line 476, 1394)
- Invoices
- OrderOverview (al skeleton — behouden)

### 4. Error states toevoegen

Pagina's die data fetchen maar geen error handling hebben → voeg `<ErrorState>` toe bij fetch failures.

## Technische details

### LoadingState component
```tsx
// States: loading → slow (10s) → error (30s)
const [phase, setPhase] = useState<'loading' | 'slow' | 'error'>('loading');
useEffect(() => {
  const slow = setTimeout(() => setPhase('slow'), 10000);
  const err = setTimeout(() => setPhase('error'), 30000);
  return () => { clearTimeout(slow); clearTimeout(err); };
}, []);
```

### EmptyState aanroep voorbeeld
```tsx
<EmptyState
  icon={Truck}
  title="Nog geen voertuigen"
  description="Voeg je eerste voertuig toe om je vloot te beheren"
  action={{ label: "Voertuig toevoegen", onClick: () => setShowAdd(true) }}
/>
```

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/common/EmptyState.tsx` — actionHref prop toevoegen |
| **Create** | `src/components/common/LoadingState.tsx` — skeleton + timeout logica |
| **Create** | `src/components/common/ErrorState.tsx` — error display + retry |
| **Edit** | `src/components/fleet/VehicleOverview.tsx` — gebruik EmptyState |
| **Edit** | `src/pages/OrderOverview.tsx` — gebruik EmptyState |
| **Edit** | `src/pages/Customers.tsx` — gebruik EmptyState + LoadingState |
| **Edit** | `src/pages/Drivers.tsx` — gebruik EmptyState + LoadingState |
| **Edit** | `src/pages/Invoices.tsx` — gebruik EmptyState + LoadingState |
| **Edit** | `src/pages/Carriers.tsx` — gebruik EmptyState + LoadingState |
| **Edit** | `src/pages/FleetManagement.tsx` — gebruik LoadingState |

