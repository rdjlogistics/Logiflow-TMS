

# Fix: Order Status Inconsistentie & Adres Validatie

## Diagnose

### Status Sync — WERKT AL CORRECT
Na analyse van `StopCheckoutFlow.tsx` (lines 291-363): de status sync logica is **correct geïmplementeerd**:
- Eerste stop completed → trip status `onderweg`
- Alle stops completed → trip status `afgeleverd` (of `afgerond` bij `direct_complete` checkout_mode)
- De trip update gebeurt via `supabase.from('trips').update(statusUpdates).eq('id', tripId)` — dit is de single source of truth

**Mogelijke oorzaak van het probleem**: Het OrderOverview haalt data op met een standaard query die niet realtime is. Als de chauffeur een rit voltooit, moet de admin de pagina refreshen om de nieuwe status te zien.

### Wat WEL ontbreekt

1. **Realtime subscription op OrderOverview** — De pagina pollt niet automatisch na driver status changes
2. **Adres validatie** — Geen check op pickup_city === delivery_city
3. **Unassigned orders** — Geen automatische link naar Auto-Dispatch

## Fixes

### 1. Realtime status updates op OrderOverview
**Bestand:** `src/pages/OrderOverview.tsx`

Voeg een Supabase Realtime subscription toe op de `trips` tabel die `fetchOrders()` triggert bij status changes:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`orders-realtime-${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, () => {
      fetchOrders();
      fetchQuickStats();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

Dit zorgt dat zodra een chauffeur een stop afmeldt, het orderoverzicht automatisch de nieuwe status toont zonder page refresh.

### 2. Adres validatie in OrderForm
**Bestand:** `src/pages/OrderForm.tsx`

Voeg in de `handleSubmit` functie (vóór de RPC call) een waarschuwing toe:
```typescript
if (pickupCity && deliveryCity && 
    pickupCity.toLowerCase() === deliveryCity.toLowerCase() &&
    pickupAddress?.toLowerCase() === deliveryAddress?.toLowerCase()) {
  const confirmed = window.confirm('Ophaal- en afleveradres zijn hetzelfde. Klopt dit?');
  if (!confirmed) return;
}
```

### 3. Trips tabel realtime publicatie
Voeg `trips` toe aan de Supabase realtime publicatie zodat Postgres changes worden gebroadcast. Dit vereist een database migratie:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
```

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/pages/OrderOverview.tsx` — Realtime subscription toevoegen |
| **Edit** | `src/pages/OrderForm.tsx` — Adres validatie waarschuwing |
| **Migratie** | `ALTER PUBLICATION supabase_realtime ADD TABLE public.trips` |

