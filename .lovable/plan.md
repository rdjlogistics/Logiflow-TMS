

# Fix: Stadsnamen Verdubbeld in Database

## Diagnose

Na uitgebreide codebase-analyse: **er is GEEN code-bug**. Alle 45+ bestanden die stadsnamen tonen gebruiken correcte patronen (`{trip.pickup_city} → {trip.delivery_city}`). De `capitalizeCity()` functie is idempotent. Geen dubbele concatenatie gevonden.

Het probleem zit **uitsluitend in de database data**:

| Tabel | Getroffen records |
|-------|-------------------|
| `trips` | 1 record: "Amsterdamamsterdam", "Rotterdamrotterdam" |
| `route_stops` | 2 records: "Amsterdamamsterdam", "Rotterdamrotterdam" |
| `customer_submissions` | 1 record (bronrecord) |

Dit is waarschijnlijk veroorzaakt door een eenmalige handmatige invoer of een eerder opgeloste bug.

## Fix

### Database migratie — corrigeer verdubbelde stadsnamen

Eén SQL migratie die alle drie de tabellen scant op herhaalde stadsnamen en ze corrigeert:

```sql
-- Fix trips
UPDATE trips SET pickup_city = left(pickup_city, length(pickup_city)/2)
WHERE lower(pickup_city) ~ '^(.+)\1$';

UPDATE trips SET delivery_city = left(delivery_city, length(delivery_city)/2)
WHERE lower(delivery_city) ~ '^(.+)\1$';

-- Fix route_stops
UPDATE route_stops SET city = left(city, length(city)/2)
WHERE lower(city) ~ '^(.+)\1$';

-- Fix customer_submissions
UPDATE customer_submissions SET pickup_city = left(pickup_city, length(pickup_city)/2)
WHERE lower(pickup_city) ~ '^(.+)\1$';

UPDATE customer_submissions SET delivery_city = left(delivery_city, length(delivery_city)/2)
WHERE lower(delivery_city) ~ '^(.+)\1$';
```

**Geen code wijzigingen nodig.** De display-code is overal correct.

### Bestanden

| Actie | Bestand |
|-------|---------|
| **Data fix** | SQL migratie via insert tool (6 UPDATE statements) |

