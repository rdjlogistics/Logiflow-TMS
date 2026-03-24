

# Optimalisatie: AI Prompts & History-Limiet

## Huidige Stand

### chatgpt edge function (1091 regels)
- **System prompt**: 37 regels, ~600 tokens — bevat redundante instructies en overlappende secties
- **History limiet**: 20 berichten (regel 900) — meer dan nodig, kost extra tokens per request
- **Tool loop**: stuurt volledige history + system prompt bij elke iteratie (max 4x)

### copilot edge function (99 regels)
- **System prompt**: 4 regels, compact — al redelijk efficiënt
- **History limiet**: GEEN — stuurt alles wat de client stuurt, onbeperkt
- **Geen trimming**: client-side stuurt alle berichten zonder limiet

## Wijzigingen

### 1. `supabase/functions/chatgpt/index.ts`

**System prompt inkorten** (van ~600 tokens naar ~300 tokens):
- Verwijder dubbele instructies ("geef specifieke cijfers" staat 2x)
- Combineer "Stijl" en "Intelligentie" secties
- Verwijder expliciete emoji-lijst (model weet dit al)
- Houd kernregels: Nederlands, tools gebruiken, tenant-isolatie, bevestiging bij mutaties

**History limiet verlagen**: regel 900 `.limit(20)` → `.limit(15)`

**Tool loop optimalisatie**: In `runToolLoop`, stuur alleen de laatste 15 berichten + system prompt naar het model i.p.v. de hele groeiende array

### 2. `supabase/functions/copilot/index.ts`

**History limiet toevoegen**: Beperk `messages` array tot laatste 15 berichten voordat ze naar het model gaan

**System prompt iets aanscherpen**: Voeg "max 150 woorden" toe voor nog kortere antwoorden

### 3. `src/hooks/useCopilot.ts`

**Client-side trimming**: Beperk `allMessages` tot laatste 15 voordat ze naar de edge function worden gestuurd (regel ~140)

## Token Besparing Schatting

| Maatregel | Besparing per request |
|---|---|
| Kortere system prompt chatgpt | ~300 tokens |
| History 20→15 berichten | ~500-1000 tokens (afhankelijk van gespreklengte) |
| Copilot history limiet | ~200-800 tokens |
| **Totaal** | **~1000-2100 tokens per request** |

Bij gemiddeld 14 requests/dag = ~14.000-29.000 tokens/dag minder.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `supabase/functions/chatgpt/index.ts` | Compactere system prompt, history limit 20→15, tool loop trimming |
| `supabase/functions/copilot/index.ts` | History limiet 15, "max 150 woorden" in prompt |
| `src/hooks/useCopilot.ts` | Client-side message trimming tot 15 |

