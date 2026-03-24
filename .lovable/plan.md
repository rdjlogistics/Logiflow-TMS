

# Fix: Copilot 401 Unauthorized — Verkeerde Auth Token

## Probleem
De copilot edge function (`supabase/functions/copilot/index.ts`) valideert het Bearer token als een **user JWT** via `supabase.auth.getClaims()`. Maar de frontend (`src/hooks/useCopilot.ts`) stuurt de **anon key** als Authorization header in plaats van het JWT token van de ingelogde gebruiker.

Dit veroorzaakt: `401 — {"error":"Invalid token"}` bij elke copilot request.

## Oplossing

### Bestand: `src/hooks/useCopilot.ts`

**Wijziging**: Haal het user session token op via `supabase.auth.getSession()` en gebruik dat als Bearer token in plaats van `backendAnonKey`.

1. Vervang de `backendAnonKey` import door een import van de supabase client
2. In `sendMessage`, haal de session token op vóór de fetch:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   if (!session?.access_token) {
     throw new Error('Je moet ingelogd zijn om Copilot te gebruiken.');
   }
   ```
3. Gebruik `session.access_token` als Bearer token:
   ```typescript
   Authorization: `Bearer ${session.access_token}`,
   ```

### Geen andere bestanden hoeven te wijzigen
De edge function is correct — die verwacht al een user JWT. Het probleem zit puur in de frontend.

### Test na fix
- "toon orders" → verwacht: `low` complexity, `gemini-2.5-flash-lite` model (zichtbaar in edge function logs)
- "analyseer mijn marges" → verwacht: `medium` complexity, `gemini-3-flash-preview` model

