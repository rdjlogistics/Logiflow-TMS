

# Verificatie Resultaten — Facturatie, Plan-weergave, Klantenlijst

## 1. FACTUURNUMMERING ✅ CORRECT

| Check | Status | Detail |
|-------|--------|--------|
| Batch facturatie | ✅ | `create-batch-invoices` edge function gebruikt `get_next_invoice_number` RPC (line 187-189) |
| Handmatige factuur | ✅ | `ManualInvoiceForm.tsx` gebruikt `get_next_invoice_number` RPC (line 140), geen fallback — faalt hard bij RPC fout |
| Bulk actions bar | ✅ | `EnhancedBulkActionsBar.tsx` gebruikt `get_next_invoice_number` RPC (line 363) |
| Oude `generate_invoice_number` | ✅ | Geen frontend referenties meer — alleen nog in types.ts (auto-generated, onschadelijk) |

Alle drie factuuraanmaak-paden gebruiken de correcte sequentiële `get_next_invoice_number` RPC. Geen random nummers meer mogelijk.

## 2. PLAN WEERGAVE ✅ CORRECT

| Locatie | Bron | Status |
|---------|------|--------|
| Sidebar header | `useSubscriptionPlan().plan?.name` (line 443) | ✅ Toont plan naam + trial info |
| Instellingen / Abonnement tab | `useSubscriptionPlan()` (line 71-82) | ✅ Volledige plan info |
| Upgrade pagina | Haalt plans op uit DB met `max_users`, `max_vehicles`, `max_orders_month` | ✅ Geen "undefined" — plan interface (line 14-27) heeft alle velden |
| PlanBadge component | `useSubscriptionPlan()` (line 12) | ✅ |
| SubscriptionGate | `useSubscriptionPlan()` (line 17) | ✅ |

### Feature Iconen ✅ CORRECT
- **SubscriptionTab** (line 450-454): enabled = `Check` met `text-emerald-500` (groene checkmark), disabled = `X` met `text-muted-foreground/50` (grijze X) + doorgestreepte tekst
- **UpgradePricingTab** (line 301-305): Toont alleen enabled features met `Check` icoon — correct
- **FEATURE_LABELS** in beide bestanden gebruiken de juiste database keys (`order_management`, `digital_pod`, etc.)

### CreditBadge ✅ CORRECT
- Toont "AI Credits" label, niet een misleidend plan-label

## 3. KLANTENLIJST ✅ CORRECT

| Check | Status | Detail |
|-------|--------|--------|
| Duplicaat detectie (naam) | ✅ | `ilike` query op `company_name` + `window.confirm` (line 232-243) |
| Duplicaat detectie (email) | ✅ | Exacte match op `email` + `window.confirm` (line 245-258) |
| Alleen bij nieuwe klanten | ✅ | Check zit in `if (!editingCustomer)` block (line 231) |
| Test-data markering | ✅ | `isTestCustomer()` helper (line 450-452): naam bevat "test" OF email eindigt op `@ghevd8.nl` |
| Test badge weergave | ✅ | Rode "Test" badge in zowel mobiel (line 853) als desktop (line 958) |
| "Verberg test-data" filter | ✅ | Checkbox toggle (line 545), filtering op line 463 |
| Incomplete badge | ✅ | Oranje "Incompleet" badge in mobiel (line 854) en desktop (line 959) |

## Conclusie

**Alle drie gebieden zijn correct geïmplementeerd.** Geen problemen gevonden. Geen code wijzigingen nodig.

- Factuurnummering: 3/3 aanmaakpaden gebruiken sequentiële RPC
- Plan weergave: 5/5 locaties gebruiken `useSubscriptionPlan` hook
- Feature iconen: groene checkmark voor inbegrepen, grijze X voor niet-inbegrepen
- Klantenlijst: duplicaat detectie, test-markering en incomplete badges werken correct

