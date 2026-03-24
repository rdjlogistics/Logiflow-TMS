

# Plan: Fix 6 Audit Issues — Kritiek + Medium

## Overzicht

6 fixes in 3 categorieën: 3 kritieke mock-data vervangingen, 3 medium verbeteringen.

---

## 🔴 KRITIEK 1: RateManagement — Mock → Database

**Bestaande infra:** De `rate_contracts` tabel en `rate_contract_lanes` tabel bestaan al. De hook `useRateContractEngine.ts` heeft volledige CRUD (create, update, delete, duplicate) al werkend met de database.

**Probleem:** `src/pages/RateManagement.tsx` gebruikt `mockRateCards` en `mockLaneRates` arrays in plaats van de bestaande hook.

**Fix:** Herschrijf `RateManagement.tsx`:
- Verwijder `mockRateCards` en `mockLaneRates` arrays
- Importeer en gebruik `useRateContractEngine` hook
- Koppel `handleCreateRateCard` aan `createContract` mutation
- Koppel `handleSaveRateCard` aan `updateContract` mutation
- Koppel `handleEditLane` / lane CRUD aan `createLane` / `updateLane` mutations
- `filteredRateCards` leest uit `contracts` (live data)
- Export functie leest uit live data

Geen database migratie nodig — alles bestaat al.

---

## 🔴 KRITIEK 2 & 3: Community JointOrders + Workspaces

**Bestaande infra:** Geen database tabellen voor `joint_orders` of `workspaces`. De memory context zegt dat community features achter de `vervoerders_netwerk` feature gate zitten met "Coming Soon" messaging.

**Aanpak:** Aangezien dit een Scale-plan feature is die nog niet gelanceerd is, en het aanmaken van volledige multi-tenant community tabellen een groot project is dat los moet staan van deze audit:

**Fix:** Vervang mock data door een expliciet "Coming Soon" patroon (consistent met `CommunitySettlements.tsx` en `CommunityLedger.tsx` die dit al doen):
- `JointOrders.tsx`: Verwijder `mockJointOrders`, wrap in `FeatureGate feature="vervoerders_netwerk"`, toon "Coming Soon" card
- `CommunityWorkspaces.tsx`: Verwijder `mockWorkspaces`, wrap in `FeatureGate`, toon "Coming Soon" card

Dit elimineert het risico dat gebruikers denken dat hun acties opgeslagen worden. Geen mock data = geen misleiding.

---

## 🟡 MEDIUM 1: Bulk Operaties → Enkele Query

**Huidige staat:**
- **Orders bulk status:** Gebruikt al `.in('id', ids)` — is al 1 query, geen loop. ✅ Geen fix nodig.
- **Orders bulk driver assign:** Gebruikt al `.in('id', ids)`. ✅ OK.
- **Fleet bulk activate/deactivate:** Gebruikt `Promise.all` met individuele mutations. ❌ Fix nodig.
- **Customers bulk:** Geen bulk operatie gevonden in code (alleen individuele soft-delete).

**Fix Fleet:**
- In `VehicleOverview.tsx`, vervang `handleBulkAction` van `Promise.all(ids.map(...))` naar:
```ts
const { error } = await supabase
  .from('vehicles')
  .update({ is_active: action === 'activate' })
  .in('id', ids);
if (error) throw error;
```
Eén query, alles-of-niets op database niveau.

---

## 🟡 MEDIUM 2: Logo Verwijderen → Direct Database Sync

**Huidige staat:** `removeLogo()` in `AdminSettings.tsx` zet alleen `setSettings(...)` — lokale state.

**Fix:** `removeLogo` direct laten schrijven naar de database:
```ts
const removeLogo = async () => {
  if (!settings || !companyId) return;
  const { error } = await supabase
    .from('tenant_settings')
    .update({ company_logo_url: null })
    .eq('company_id', companyId);
  if (!error) {
    await supabase.from('companies')
      .update({ logo_url: null })
      .eq('id', companyId);
    setSettings({ ...settings, company_logo_url: null });
    toast({ title: 'Logo verwijderd' });
  } else {
    toast({ title: 'Fout bij verwijderen logo', variant: 'destructive' });
  }
};
```

---

## 🟡 MEDIUM 3: Stats Hooks — Toast bij Fouten

**Huidige staat:** `useTripStats`, `useCustomerStats`, `useDriverStats` doen `.catch(console.error)`.

**Fix:** In alle drie hooks, vervang `.catch(console.error)` door:
```ts
.catch((err) => {
  console.error(err);
  toast({ title: 'Statistieken laden mislukt', description: err.message, variant: 'destructive' });
})
```
Voeg `useToast` import toe aan elk van de 3 hooks.

---

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---|---|
| `src/pages/RateManagement.tsx` | Mock → `useRateContractEngine` |
| `src/pages/community/JointOrders.tsx` | Mock → Coming Soon + FeatureGate |
| `src/pages/community/CommunityWorkspaces.tsx` | Mock → Coming Soon + FeatureGate |
| `src/components/fleet/VehicleOverview.tsx` | Bulk loop → single `.in()` query |
| `src/pages/AdminSettings.tsx` | `removeLogo` direct naar DB |
| `src/hooks/useTripsData.ts` | Toast bij error |
| `src/hooks/useCustomersData.ts` | Toast bij error |
| `src/hooks/useDriversData.ts` | Toast bij error |

Geen database migraties nodig.

