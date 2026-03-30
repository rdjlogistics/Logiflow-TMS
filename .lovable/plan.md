

# Fix: Bruto Winst & Marge Berekening

## Root Cause

The `avgMargin` in `OrderOverview.tsx` line 387-388 calculates a **simple average of stored `profit_margin_pct`** values from the database. These stored values can be stale or inconsistent with the actual `sales_total` and `purchase_total`. Meanwhile `totalProfit` is correctly computed from raw data (`sales - purchase`).

This causes the contradiction: totalProfit = -€2.154 but avgMargin = 37% (from old stored percentages).

Additionally, the profit card in `QuickStatsHeader.tsx` always uses `text-success` (green) regardless of whether profit is negative.

## Fix

### 1. `src/pages/OrderOverview.tsx` — Weighted margin calculation
Replace line 387-388:
```typescript
// OLD: simple average of stored (potentially stale) percentages
avgMargin: pricedOrders.reduce((sum, t) => sum + (t.profit_margin_pct || 0), 0) / pricedOrders.length

// NEW: weighted margin from actual totals
avgMargin: stats.totalRevenue > 0 
  ? (stats.totalProfit / stats.totalRevenue) * 100 
  : 0,
```

### 2. `src/components/orders/QuickStatsHeader.tsx` — Dynamic color for profit
Line 90: change from hardcoded `text-success` to dynamic based on positive/negative:
```typescript
valueClass: stats.totalProfit >= 0 ? "text-success" : "text-destructive",
```
Line 92-93: dynamic gradient and icon color:
```typescript
gradient: stats.totalProfit >= 0 ? "from-success/20 to-success/10" : "from-destructive/20 to-destructive/10",
iconColor: stats.totalProfit >= 0 ? "text-success" : "text-destructive",
```
Line 95: margin badge color dynamic:
```typescript
{ label: `Gem. marge: ${stats.avgMargin.toFixed(1)}%`, 
  color: stats.avgMargin >= 0 ? "bg-success/10 text-success font-semibold" : "bg-destructive/10 text-destructive font-semibold" }
```

### Files
| File | Change |
|------|--------|
| `src/pages/OrderOverview.tsx` | Weighted avgMargin from totals |
| `src/components/orders/QuickStatsHeader.tsx` | Dynamic profit/margin colors |

