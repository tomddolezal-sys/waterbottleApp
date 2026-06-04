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
    ├── types.ts         # HS_Card, Deck, filter type enums
    ├── hearthstone.ts   # API fetch, image URL builder, card filtering
    └── deckStorage.ts   # localStorage load/save for active deck
```

## Key decisions
- Cards fetched from `https://api.hearthstonejson.com/v1/latest/enUS/cards.json`
- Card images via `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/{cardId}.png`
- Only collectible cards with a mana cost are shown (enchantments filtered out)
- Deck is saved to `hearthstone_active_deck` in localStorage
- Two tabs: **Browse** (card gallery with search/filters) and **My Deck** (deck list + mulligan)
- Mulligan draws 3 random cards from current deck

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
- Card types: `MINION`, `SPELL`, `WEAPON` (from API type field)
- Rarities: `COMMON`, `RARE`, `EPIC`, `LEGENDARY` (legendaries max 1 per deck, others max 2)