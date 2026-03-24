

# Plan: 3 Elite Class Fixes — Batch 2 Afronden

## Fix 1: Customer settings error handling
**Bestand:** `src/pages/Customers.tsx` (regels 256-265)

Wrap de `customer_settings` update in een aparte try/catch zodat een failure daar zichtbaar wordt:

```ts
// Save customer-specific settings
if (customerId) {
  const recipientsList = deliveryConfRecipients
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0);

  const { error: settingsError } = await supabase
    .from("customer_settings")
    .update({ ... })
    .eq("customer_id", customerId);

  if (settingsError) {
    console.error('Customer settings save failed:', settingsError);
    toast({
      title: "Klantinstellingen opslaan mislukt",
      description: settingsError.message,
      variant: "destructive",
    });
  }
}
```

## Fix 2: Driver beschikbaarheid — success toast
**Bestand:** `src/pages/Drivers.tsx` (regel 246)

Voeg success toast toe in de `else` branch van `handleAvailabilityChange`:
```ts
} else {
  toast({ title: "Beschikbaarheid bijgewerkt" });
  queryClient.invalidateQueries({ queryKey: ["drivers"] });
}
```

## Fix 3: Driver document delete — loading state
**Bestand:** `src/pages/Drivers.tsx`

- Voeg `const [deletingDocId, setDeletingDocId] = useState<string | null>(null);` toe bij de state declaraties
- Wrap `handleDeleteDocument` met loading guard:
```ts
const handleDeleteDocument = async (docId: string) => {
  if (deletingDocId) return; // prevent double click
  setDeletingDocId(docId);
  try {
    const { error } = await supabase.from("driver_documents").delete().eq("id", docId);
    if (error) {
      toast({ title: "Verwijderen mislukt", variant: "destructive" });
    } else {
      toast({ title: "Document verwijderd" });
      refetchDocs();
    }
  } finally {
    setDeletingDocId(null);
  }
};
```
- In de document delete button, voeg `disabled={deletingDocId === doc.id}` toe en toon `Loader2` spinner wanneer actief

