

# Nieuwe Modules Integreren in Sidebar + Console Fix

## Probleem

1. **Diesel Module** (`/finance/diesel`) — heeft route maar is **niet bereikbaar via sidebar**
2. **Offertes Dashboard** (`/sales/quotes`) — heeft route maar is **niet bereikbaar via sidebar**
3. **CO2 Rapportage** (`/co2`) — al in sidebar ✅
4. **Console error** — `DialogFooter` in DieselModule krijgt een `ref` maar is geen `forwardRef` component

## Oplossing

### 1. Sidebar: Diesel toevoegen aan Financieel sectie
**Bestand:** `src/components/layout/AppSidebar.tsx`

- Voeg toe aan `financieelItems` array (na "Tankpassen"):
  ```
  { title: "Diesel Staffels", icon: Fuel, href: "/finance/diesel" }
  ```
- Voeg toe aan `FEATURE_GATE_MAP`:
  ```
  "/finance/diesel": "basic_invoicing"
  ```

### 2. Sidebar: Offertes toevoegen aan Relatiebeheer sectie
- Voeg toe aan `relatiesBaseItems` array (na "Producten"):
  ```
  { title: "Offertes", icon: FileText, href: "/sales/quotes" }
  ```
  (Logische plek: offertes horen bij klantrelaties/CRM)

### 3. Console Error Fix: DialogFooter forwardRef
**Bestand:** `src/components/ui/dialog.tsx`

- Wrap `DialogFooter` in `React.forwardRef` zodat het refs kan ontvangen:
  ```typescript
  const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={cn(...)} {...props} />
    )
  );
  ```

### 4. Browser Test
- Na implementatie: navigeer naar sidebar, check of Diesel Staffels en Offertes zichtbaar en klikbaar zijn
- Check console op 0 errors

## Technische Details

```text
Bestanden te wijzigen:  2
  - src/components/layout/AppSidebar.tsx (2 items toevoegen)
  - src/components/ui/dialog.tsx (forwardRef fix)
Impact:                 Sidebar navigatie + console warning fix
Risico:                 Laag — alleen menu items + ref wrapper
```

