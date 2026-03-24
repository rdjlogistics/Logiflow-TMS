

# Plan: AI Usage Dashboard Widget

## Wat
Een nieuwe dashboard widget `ai-usage` die real-time credit verbruik per dag toont als een compacte sparkline-achtige area chart, met credit status en snelle stats.

## Wijzigingen

### 1. Nieuw bestand: `src/components/dashboard/AIUsageWidget.tsx`
- Compacte widget met:
  - Credit progressiebalk (remaining / total)
  - 7-dagen area chart van dagelijks verbruik uit `ai_usage_daily_rollup`
  - Vandaag's verbruik highlight
  - Link naar volledige `/admin/ai-usage` pagina
- Gebruikt `useAICredits` hook voor subscription data
- Query `ai_usage_daily_rollup` voor laatste 7 dagen

### 2. Update: `src/components/dashboard/widgets/WidgetRegistry.ts`
- Voeg `ai-usage` widget toe aan registry:
  - Category: `analytics`, size: `small`, icon: `Sparkles`, minHeight: 240

### 3. Update: `src/components/dashboard/DraggableWidgetGrid.tsx`
- Import `AIUsageWidget` (lazy)
- Voeg `case 'ai-usage'` toe aan `renderWidget` switch

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/dashboard/AIUsageWidget.tsx` | **Nieuw** — widget component |
| `src/components/dashboard/widgets/WidgetRegistry.ts` | Registratie toevoegen |
| `src/components/dashboard/DraggableWidgetGrid.tsx` | Render case toevoegen |

