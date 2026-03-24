

# Fix: Case-Sensitive E-mail Domein Validatie

## Probleem
De validatie op regel 76 vergelijkt het domein uit het e-mailadres met het ingevoerde domein **case-sensitive**:
- Domein veld: `Rdjlogistics.nl` (hoofdletter R)
- E-mailadres: `Info@rdjlogistics.nl` (kleine letter r)
- `"rdjlogistics.nl" !== "Rdjlogistics.nl"` → foutmelding

Domeinnamen zijn per definitie case-insensitive (RFC 4343).

## Oplossing
Eén regel aanpassen in `src/components/settings/EmailDomainTab.tsx`:

Regel 76: `.toLowerCase()` toevoegen aan beide kanten van de vergelijking:
```typescript
if (emailDomainPart?.toLowerCase() !== domain.toLowerCase()) {
```

Dat is alles — één simpele fix.

