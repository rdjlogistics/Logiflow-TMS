

# Fix: `send-sms` deploy error

## Probleem

De import `import { corsHeaders } from "@supabase/supabase-js/cors"` werkt niet in Deno edge functions — dit is een bare specifier die Deno niet kan resolven.

## Fix

Vervang regel 1 in `supabase/functions/send-sms/index.ts` met een handmatige CORS headers definitie, zoals alle andere edge functions in het project al doen:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
};
```

| # | Actie | Bestand |
|---|-------|---------|
| 1 | Vervang import door handmatige corsHeaders | `supabase/functions/send-sms/index.ts` regel 1 |

