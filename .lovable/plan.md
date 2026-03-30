

# Fix: AI Assistent "Geen bedrijf gekoppeld"

## Root Cause

De chatgpt edge function (line 1746) zoekt `company_id` op de `profiles` tabel:
```ts
const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
```

**Twee bugs:**
1. `profiles` tabel heeft GEEN `company_id` kolom — bedrijfskoppeling zit in `user_companies`
2. Query filtert op `.eq("id", userId)` maar de kolom heet `user_id`

Resultaat: altijd `null` → HTTP 403 "Geen bedrijf gekoppeld"

Dezelfde bug zit ook in `supabase/functions/copilot/index.ts` (line 258).

## Fix

Vervang de profiles query door een `user_companies` query in beide edge functions:

```ts
// OUD (broken):
const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
const tenantId = profile?.company_id;

// NIEUW (correct):
const { data: uc } = await supabase.from("user_companies").select("company_id").eq("user_id", userId).eq("is_primary", true).maybeSingle();
const tenantId = uc?.company_id;
```

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `supabase/functions/chatgpt/index.ts` — line 1746-1747: fix tenant lookup |
| **Edit** | `supabase/functions/copilot/index.ts` — line 258: fix tenant lookup |

