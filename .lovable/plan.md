

# Plan: Intelligent Model Routing in Copilot

## Wat
De copilot gebruikt nu altijd `google/gemini-3-flash-preview`. We voegen intelligent routing toe: simpele vragen gaan naar het goedkopere/snellere `google/gemini-2.5-flash-lite`, complexe vragen blijven op `gemini-3-flash-preview`.

## Hoe

**Bestand:** `supabase/functions/copilot/index.ts`

De `detectComplexity` functie bestaat al en retourneert `"none"`, `"low"`, of `"medium"`. We gebruiken dit om het model te kiezen:

| Complexity | Model | Reden |
|---|---|---|
| `none` / `low` | `google/gemini-2.5-flash-lite` | Simpele vragen: status checks, lijsten, zoeken |
| `medium` | `google/gemini-3-flash-preview` | Analyse, vergelijkingen, advies, briefings |

Wijzigingen:
1. Model selectie op basis van `complexity` — één helper variabele `model` toevoegen
2. Beide `fetch` calls (tool-loop + streaming) gebruiken de dynamische `model` variabele
3. Credit deduction logt het juiste model naam

Geen frontend wijzigingen nodig. Alleen de edge function + deploy.

