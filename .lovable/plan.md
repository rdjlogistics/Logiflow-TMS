

# Fix: Messenger Empty State, AI Assistent Send, Spacing

## Diagnose

### Probleem 1 — Messenger Loading Spinner
De Messenger pagina (`src/pages/Messenger.tsx`) laadt trips, niet chat-kanalen. De loading state werkt correct: `loading` begint als `true`, wordt `false` na fetch. Als er geen trips zijn toont hij "Geen ritten gevonden". **Maar**: er ontbreekt een timeout — als de fetch hangt (netwerk probleem, auth issue), blijft de spinner eindeloos draaien. Fix: voeg een 5-seconden timeout toe die de loading state afbreekt en een empty state toont.

### Probleem 2 — AI Assistent Send
De code structuur is correct: `handleSubmit` → `sendMessage` → `fetch(edgeFunctionUrl('chatgpt'))`. Er zijn **geen** console errors of network requests naar `chatgpt` zichtbaar, wat betekent dat `sendMessage` vroegtijdig returnt (line 151: `if (!user || !message.trim()) return`). 

**Root cause**: De `user` check faalt. De `useAuth` hook geeft `null` terug terwijl de `ChatGPT` page zelf al een auth-check doet en dit zou moeten blokkeren. Maar als de auth state nog aan het laden is wanneer `sendMessage` wordt aangeroepen, is `user` tijdelijk `null`.

**Fix**: 
1. Voeg error feedback toe als `sendMessage` niets doet (geen user → toast "Niet ingelogd")
2. Voeg een fallback error toast toe als de fetch mislukt zonder exception
3. Log naar console voor debugging

### Probleem 3 — Spacing "Gesprekken0"
De code in `AutoDispatch.tsx` en `DispatchDashboard.tsx` toont de badge correct als apart element. **Maar**: op mobile (`hidden sm:inline`) wordt de "Gesprekken" tekst verborgen en alleen de badge toont. Als `activeConversations` 0 is, toont de badge "0" direct naast het icoon. De conditie `stats?.activeConversations && stats.activeConversations > 0` zou 0 moeten filteren, maar `stats?.activeConversations` kan `0` zijn wat falsy is — dit is correct.

Laat me zoeken naar het exacte patroon dat "Gesprekken0" veroorzaakt:

Waarschijnlijk zit het probleem in een ander component. De fix: zoek en repareer alle plekken waar count direct aan de tekst wordt geplakt.

## Fixes

### 1. Messenger — Loading Timeout + Empty State
**File:** `src/pages/Messenger.tsx`

- Voeg `useEffect` toe met `setTimeout(5000)` die `setLoading(false)` aanroept als loading nog `true` is
- Wijzig de lege-lijst empty state tekst naar: icoon MessageSquare, "Geen gesprekken", subtekst "Start een gesprek vanuit een order of rit"
- Clear timeout bij unmount

### 2. AI Assistent — Send Feedback
**File:** `src/hooks/useChatGPT.ts`

- In `sendMessage`: als `!user`, toon toast "Niet ingelogd" in plaats van stille return
- Voeg `console.error` toe bij edge cases
- Wrap de hele fetch in een try-catch die altijd feedback geeft

**File:** `src/components/chatgpt/ChatGPTPanel.tsx`

- In `handleSubmit`: als `sendMessage` returnt zonder actie, toon een toast
- Voeg error boundary toe voor het geval de edge function niet beschikbaar is

### 3. Spacing Fix
**File:** `src/pages/ai/AutoDispatch.tsx` (line 180)

- Verander badge weergave: voeg spatie/haakjes toe aan tab label
- Badge tonen als `(0)` alleen als `stats?.activeConversations !== undefined`

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/pages/Messenger.tsx` — 5s timeout + empty state tekst |
| **Edit** | `src/hooks/useChatGPT.ts` — Toast bij `!user`, betere error handling |
| **Edit** | `src/components/chatgpt/ChatGPTPanel.tsx` — Feedback bij gefaalde send |
| **Edit** | `src/pages/ai/AutoDispatch.tsx` — Spacing fix op tab label |

