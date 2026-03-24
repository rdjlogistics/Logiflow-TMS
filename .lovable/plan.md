

# Grondige Analyse: Error Toasts i.p.v. Werkende Knoppen

## Bewezen Bugs (met logs/bewijs)

### BUG 1: Factuur PDF Genereren — CRASHT ALTIJD
**Bewijs**: Edge function log:
```
ERROR: WinAnsi cannot encode "→" (0x2192)
```
**Root cause**: Invoice line descriptions bevatten het Unicode-teken `→`. De pdf-lib library kan dit niet encoden met standaard WinAnsi fonts.

**Bron van het `→` teken** (bewezen in code):
- `src/components/orders/EnhancedBulkActionsBar.tsx` lijn 392:
  ```ts
  description: `Transport ${order.order_number} - ${order.pickup_city} → ${order.delivery_city}`
  ```
- 9 invoice_lines in de database bevatten dit teken.

**Fix**:
1. **Edge function `generate-invoice-pdf`**: Sanitize alle tekst die naar pdf-lib gaat — vervang `→` door `-` of `->` voordat het getekend wordt. Dit is een defensieve fix die ALLE Unicode-problemen vangt.
2. **Broncode**: Vervang `→` door `-` in `EnhancedBulkActionsBar.tsx` lijn 392 zodat nieuwe factuurregels geen probleem meer veroorzaken.
3. **Database fix**: Update bestaande 9 invoice_lines die `→` bevatten.

### BUG 2: Bulk Verwijderen Chauffeurs — CRASHT
**Bewijs**: Postgres log:
```
ERROR: column drivers.deleted_at does not exist
```
**Root cause**: `src/pages/Carriers.tsx` lijn 316:
```ts
supabase.from("drivers").update({ deleted_at: new Date().toISOString() })
```
De `drivers` tabel heeft geen `deleted_at` kolom (bewezen via schema query).

**Fix**: Twee opties:
- A) Voeg `deleted_at` toe aan de `drivers` tabel (consistent met `customers`, `trips`, `carriers`)
- B) Gebruik echte delete of status-change in plaats van soft-delete

Optie A is consistenter met het bestaande patroon. Migratie: `ALTER TABLE drivers ADD COLUMN deleted_at timestamptz DEFAULT NULL;`

### BUG 3: Portaalaccounts — Werkt Wél, Maar Error Handling Maskeert Succes
**Bewijs**: Live test met echte customer ID retourneert HTTP 200:
```json
{"message":"Account aangemaakt","success":true,"userId":"7d11dbfd-..."}
```
De functie werkt. Als de user errors ziet, is het waarschijnlijk:
- Niet ingelogd (sessie verlopen) → 401 error
- Of: `supabase.functions.invoke` retourneert een `FunctionsHttpError` object dat niet correct uitgelezen wordt

**Fix**: Verbeter de error handling in `CreateCustomerPortalDialog.tsx` en `CreateDriverPortalDialog.tsx` om de exacte error message uit het response te halen, inclusief sessie-verlopen detectie.

### BUG 4: Order Opslaan — RPC Werkt, Maar Potentieel Company-ID Issue
**Bewijs**: `save_order_with_stops` RPC functie is correct. Geen recente postgres errors gevonden.
Als het faalt, is de meest waarschijnlijke oorzaak: `user_companies` lookup retourneert NULL → error "Geen bedrijf gekoppeld aan gebruiker".

**Fix**: Verstevig de `ensure-user-company` flow en voeg betere error messaging toe.

---

## Implementatieplan

### Stap 1: Fix PDF Generator — Edge Function
- Voeg een `sanitizeText()` helper toe die alle non-WinAnsi tekens vervangt
- Pas toe op alle strings die naar `page.drawText()` en `wrapText()` gaan

### Stap 2: Fix `→` in Broncode
- `EnhancedBulkActionsBar.tsx` lijn 392: `→` vervangen door `-`

### Stap 3: Fix Database — Bestaande Invoice Lines
- SQL migration: `UPDATE invoice_lines SET description = REPLACE(description, '→', '-') WHERE description LIKE '%→%';`

### Stap 4: Fix Drivers Soft-Delete
- Migratie: `ALTER TABLE drivers ADD COLUMN deleted_at timestamptz DEFAULT NULL;`

### Stap 5: Verbeter Error Handling Portal Dialogs
- Sessie-check toevoegen voor edge function calls
- Betere error message parsing uit FunctionsHttpError

### Bestanden die gewijzigd worden
| Bestand | Wijziging |
|---|---|
| `supabase/functions/generate-invoice-pdf/index.ts` | sanitizeText() toevoegen |
| `src/components/orders/EnhancedBulkActionsBar.tsx` | `→` → `-` |
| Database migratie | invoice_lines fix + drivers.deleted_at |
| `src/pages/Carriers.tsx` | Geen wijziging nodig na migratie |
| `src/components/customers/CreateCustomerPortalDialog.tsx` | Error handling verbeteren |
| `src/components/drivers/CreateDriverPortalDialog.tsx` | Error handling verbeteren |

