

# Fix: Inkoopfactuur e-mail versturen faalt — `getClaims` bestaat niet

## Probleem

De edge function `send-purchase-invoice-email` gebruikt `supabase.auth.getClaims()` (regel 10), maar deze methode bestaat niet in de Supabase JS client. Dit veroorzaakt een runtime crash voordat de functie iets kan doen — geen logs, geen foutmelding, alleen een generieke edge function error.

## Fix

**1 bestand**: `supabase/functions/send-purchase-invoice-email/index.ts`

De authenticatie aanpassen naar het bewezen patroon dat alle andere werkende edge functions gebruiken:

1. Vervang `getClaims()` door `getUser()` met de bearer token
2. Haal `user.id` op in plaats van `cd.claims.sub`
3. Gebruik hetzelfde auth-patroon als `create-batch-purchase-invoices` (dat wél werkt)

### Concreet

```typescript
// OUD (crasht):
const { data: cd, error: ce } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
// ... cd.claims.sub

// NIEUW (werkt):
const anonClient = createClient(url, anonKey);
const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
// ... user.id
```

Na de fix wordt de edge function opnieuw gedeployed.

## Impact
- Geen database migratie nodig
- Geen frontend wijzigingen nodig (parameters matchen al correct na eerdere fix)
- Na deployment werkt het versturen van inkoopfactuur e-mails end-to-end

