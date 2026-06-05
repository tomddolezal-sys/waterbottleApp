# Hearthstone Deck Builder

## Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS (utility-first, no separate component CSS)
- **Icons:** lucide-react
- **Data:** Fetched from Hearthstone JSON API — no backend needed
- **Persistence:** Browser `localStorage` for deck data

## Project structure
```
src/
├── app/
│   ├── layout.tsx      # Root layout, Inter font, global CSS variables
│   ├── page.tsx         # Full app (Browse, My Deck, Mulligan — all in one file)
│   └── globals.css      # Dark theme Tailwind + CSS custom properties + mana gem styles
└── lib/
    ├── types.ts         # HS_Card, Deck, filter type enums, mana curve interfaces
    ├── hearthstone.ts   # API fetch, image URL builder, card filtering
    ├── deck_storage.ts  # localStorage load/save for active deck
    └── probability.ts   # Hypergeometric probability calculator, mana curve analyzer
```

## Key decisions
- Cards fetched from `https://api.hearthstonejson.com/v1/latest/enUS/cards.json`
- Card images via `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/{cardId}.png`
- Only collectible cards with a mana cost are shown (enchantments filtered out)
- Deck is saved to `hearthstone_active_deck` in localStorage
- Two tabs: **Browse** (card gallery with search/filters) and **My Deck** (deck list + mulligan)

## Features

### My Deck Tab
- **Deck header**: editable name, import/export deck codes, card count (x/30)
- **Clear Deck button**: removes all cards from deck (with confirmation)
- **Draw Opening Hand**: draws 3 or 4 random cards from deck (coin toggle), endlessly repeatable
- **Mana Curve Analyzer** ("Calculator" button): bucket-based probability calculator

### Opening Hand Modal
- **Coin toggle**: switch between 3-card and 4-card (with coin) hand sizes
- **Card selection**: click any card to mark it for replacement (red X overlay)
- **Replace (N)**: swaps selected cards with new draws from deck, preserves card positions
- **Draw Fresh Hand**: discards entire hand, draws a new one (respects coin toggle)
- **X button**: closes modal (no "keep" concept — endless rolling, no reset needed)

### Mana Curve Analyzer
Replaces the old card-selecting mulligan calculator with a bucket-based approach.

**Buckets:**
- 0–2 mana (low)
- 3–5 mana (mid)
- 6+ mana (high)

**Usage:**
1. Click "Calculator" button to expand the panel
2. Select hand size: 3 cards or 4 cards (coin)
3. Set minimums per bucket using +/− buttons (capped at hand size total across all buckets)
4. Optional: "Keeping N cards" selector — accounts for cards you're planning to keep (reduces constraints conservatively)
5. Probability updates live when constraints change

**Probability calculation:** Brute-force enumeration of all C(30, handSize) hands (or C(30-k, handSize-k) when keeping k cards). Each hand is checked against the bucket constraints.

**Math for "keeping" mode:** When keeping k cards, effective constraint per bucket = max(0, minCount - k). This is the conservative case where kept cards contribute 0 to constraints.

### Card limits
- LEGENDARY: max 1 per deck
- Other rarities: max 2 per deck

## Types (types.ts)
```typescript
interface HS_Card {
  id, name, cost?, attack?, health?, durability?, type, rarity?,
  text?, set?, dbfId?, elite?, classes?, cardClass?
}

interface Deck { id, name, cards: { [cardId]: number }, createdAt }

interface ManaBucket { id, label, minCost, maxCost, color }
interface BucketConstraint { bucketId, minCount }
interface ManaCurveResult { probability, oddsString, totalHands, favorableHands, interpretation }
```

## Running the app
```bash
npm run dev    # Start dev server at http://localhost:3000
npm run build  # Production build
```

## Card data
Cards are loaded client-side from the Hearthstone JSON API. No server-side storage needed.

## Killing the dev server
```bash
# Find and kill by port
taskkill //PID $(wmic process where "commandline like '%next%dev%'" get processid 2>nul | findstr /r "[0-9]") //F

# Or kill by process name (Git Bash / WSL)
pkill -f "next dev"

# Or kill by PID (found via netstat or tasklist)
taskkill //PID <pid> //F
```

## Adding features
- `hearthstone.ts` is the API layer — swap card source without touching components
- `deckStorage.ts` handles localStorage persistence — swap for a backend API easily
- `probability.ts` handles all probability calculations:
  - `calculateMulliganProbability` — hypergeometric for specific card combos
  - `calculateManaCurveProbability` — brute-force mana curve probability with optional kept cards
  - `generateAllHands` — combination generator for hand enumeration
  - `handSatisfiesConstraints` — bucket constraint checker
- Card types: `MINION`, `SPELL`, `WEAPON` (from API type field)
- Rarities: `COMMON`, `RARE`, `EPIC`, `LEGENDARY` (legendaries max 1 per deck, others max 2)