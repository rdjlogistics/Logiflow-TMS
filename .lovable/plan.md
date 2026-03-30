
# Fix: App crashes — `useAuth must be used within an AuthProvider`

## Root Cause

The previous edit to `useTenantSettings.ts` added `useCompany()` (which internally calls `useAuth()`). But in `App.tsx`, the component tree is:

```text
ErrorBoundary
  └─ QueryClientProvider
       └─ ThemeProvider          ← calls useTenantSettings → useCompany → useAuth ❌
            └─ AuthProvider      ← useAuth context lives HERE
                 └─ ...rest
```

`ThemeProvider` renders BEFORE `AuthProvider`, so `useAuth()` throws "must be used within an AuthProvider".

## Fix

Modify `useTenantSettings.ts` to NOT use `useCompany()`. Instead, query `tenant_settings` directly via Supabase (relying on RLS for tenant isolation, which already works). This restores the original pattern where `useTenantSettings` had no auth dependency.

### File: `src/hooks/useTenantSettings.ts`
- Remove `import { useCompany }` 
- Remove `useCompany()` call
- Query `tenant_settings` with `.limit(1).maybeSingle()` (RLS handles filtering)
- Set `queryKey` back to `['tenant-settings']`
- Remove `enabled: !!companyId` guard (always enabled — returns null if no RLS match)

This is safe because:
1. RLS on `tenant_settings` already filters by user's company
2. Before auth, the query returns null (no session = no RLS match)
3. The ThemeProvider already handles `null` gracefully (falls back to defaults)

### No other files need changes.
