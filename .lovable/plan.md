

# Batch 4 Audit: Facturatie — Resultaat

## Conclusie

De facturatiemodule is **grotendeels solide gebouwd**. Batch facturatie gaat via een Edge Function (`create-batch-invoices`), handmatige facturen schrijven direct naar de database, en de SEPA export genereert XML vanuit databasedata. Na grondige analyse zijn er **2 problemen** gevonden.

---

## Bevindingen

| Controle | Status | Detail |
|---|---|---|
| Factuurnummers atomisch | ✅ | `get_next_invoice_number` RPC met `FOR UPDATE` lock |
| Bedragen als numeric (niet float) | ✅ | Postgres `numeric` kolommen, geen JS float issues |
| BTW per regel opgeslagen | ✅ | `vat_percentage` + `vat_amount` per `invoice_line` |
| Factuurregels synchroon opgeslagen | ✅ | Insert invoice → insert lines in zelfde try/catch |
| Factuur ↔ klant relatie | ✅ | `customer_id` FK op `invoices` |
| Factuur ↔ rit relatie | ✅ | `invoice_lines.trip_id` + `trips.invoice_id` |
| SEPA export vanuit DB data | ✅ | `SEPAExportModal` ontvangt DB-gefetchte invoices + fetcht company vers |
| Financiële mutaties gelogd | ✅ | `financial_audit_log` trigger op `finance_transactions` |
| Betaalde facturen niet verwijderbaar (UI) | ✅ | Delete knop alleen zichtbaar bij `status === "concept"` (mobiel + desktop) |
| Betaalde facturen niet verwijderbaar (server) | 🔴 KRITIEK | `handleDeleteConfirm` doet geen statuscheck — directe API call kan elke factuur verwijderen |
| Fallback factuurnummer | 🔴 KRITIEK | `ManualInvoiceForm` genereert `Math.random()` nummer als RPC faalt — risico op duplicaten |

---

## 🔴 KRITIEK 1: Delete guard ontbreekt in `handleDeleteConfirm`

**Bestand:** `src/pages/Invoices.tsx` (regel 199-212)

De UI toont de delete-knop alleen voor concept-facturen, maar `handleDeleteConfirm` doet geen statusvalidatie. Een API-call of race condition kan een betaalde factuur verwijderen.

**Fix:** Voeg server-side guard toe:
```ts
const handleDeleteConfirm = async () => {
  if (!invoiceToDelete) return;
  try {
    // Server-side guard: alleen concept-facturen mogen verwijderd worden
    const { data: inv } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", invoiceToDelete)
      .single();
    
    if (inv?.status !== "concept") {
      toast({ title: "Alleen concept-facturen kunnen verwijderd worden", variant: "destructive" });
      return;
    }
    
    await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceToDelete);
    await supabase.from("invoices").delete().eq("id", invoiceToDelete).eq("status", "concept");
    // ...rest unchanged
```

De `.eq("status", "concept")` op de delete query is de ultieme guard — zelfs als de status check erboven door een race condition passeert, kan de delete nooit een niet-concept factuur raken.

---

## 🔴 KRITIEK 2: Random fallback factuurnummer

**Bestand:** `src/components/invoices/ManualInvoiceForm.tsx` (regel 125-130)

Als de `get_next_invoice_number` RPC faalt of `null` retourneert, wordt een random nummer gegenereerd: `RDJ-${year}-${Math.random()}`. Dit kan duplicaten veroorzaken bij concurrent gebruik.

**Fix:** Verwijder de fallback en faal hard:
```ts
const { data: numberData, error: numberError } = await supabase.rpc(
  "get_next_invoice_number", 
  { p_company_id: company?.id ?? '' }
);

if (numberError || !numberData) {
  toast.error("Factuurnummer genereren mislukt", { 
    description: "Probeer het opnieuw of neem contact op met support" 
  });
  return; // Stop — geen factuur aanmaken zonder gegarandeerd uniek nummer
}

const invoiceNumber = numberData;
```

Een factuur zonder atomisch uniek nummer mag nooit aangemaakt worden.

---

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---|---|
| `src/pages/Invoices.tsx` | Delete guard: statuscheck + `.eq("status", "concept")` |
| `src/components/invoices/ManualInvoiceForm.tsx` | Verwijder random fallback, faal hard bij RPC failure |

Geen database migraties nodig.

