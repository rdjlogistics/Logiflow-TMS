

# Plan: POD Ontbreekt Knop Fixen

## Probleem
De "POD ontbreekt" knop op het dashboard linkt naar `/claims?filter=pod-missing`. De Claims pagina doet niets met die filter parameter — je ziet claims, geen ontbrekende PODs. Er bestaat al een dedicated **Digitale POD** pagina (`/operations/pod`) die een "In afwachting" tab heeft met precies de juiste data.

## Oplossing

### 1. Links aanpassen (2 bestanden)
Verander de href van `/claims?filter=pod-missing` naar `/operations/pod?tab=pending`:

| Bestand | Regel | Wijziging |
|---|---|---|
| `src/pages/Dashboard.tsx` | ~490 | `Link to="/operations/pod?tab=pending"` |
| `src/components/dashboard/OpsSnapshot.tsx` | ~93 | `href: "/operations/pod?tab=pending"` |

### 2. DigitalPOD: lees `tab` query param (1 bestand)
In `src/pages/operations/DigitalPOD.tsx`: gebruik `useSearchParams` om de `tab` query param te lezen als initiële waarde voor `activeTab`. Zo opent de pagina direct op de "pending" tab wanneer je vanuit het dashboard klikt.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/pages/Dashboard.tsx` | Link href → `/operations/pod?tab=pending` |
| `src/components/dashboard/OpsSnapshot.tsx` | href → `/operations/pod?tab=pending` |
| `src/pages/operations/DigitalPOD.tsx` | Lees `?tab=` param voor initiële tab selectie |

