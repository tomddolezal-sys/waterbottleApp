# Hearthstone Deck Builder — SPEC.md

## 1. Concept & Vision

A sleek Hearthstone card browser and deck builder with a **mulligan simulator** for testing opening hands. The app feels like a tavern workbench — dark, warm, golden accents. It's fast, focused, and lets you build decks and test your starting hands without needing a full Hearthstone client.

## 2. Design Language

**Aesthetic:** Dark tavern theme — near-black backgrounds, warm gold accents, card surfaces in dark gray.

**Colors:**
- Background: `#1a1a1a` (near black)
- Surface: `#2d2d2d`
- Surface hover: `#3d3d3d`
- Border: `#3d3d3d`
- Gold accent: `#c9a227`
- Gold hover: `#e0b830`
- Text primary: `#f5f5f5`
- Text secondary: `#a0a0a0`
- Mana gem: `#2563eb` → `#ef4444` (high cost)
- Legendary: `#9333ea`

**Typography:**
- Font: `Inter` via next/font
- Headings: 600 weight
- Body: 400 weight

**Spatial system:**
- Base unit: 4px
- Card grid: `repeat(auto-fill, minmax(140px, 1fr))`
- Max content width: 1152px (6xl)

**Motion philosophy:**
- Hover: border glow on cards, `150ms ease`
- Modal: fade in backdrop, `200ms`
- No gratuitous animations

**Visual assets:**
- Card images: `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/{cardId}.png`
- Icons: lucide-react
- Mana gems: CSS-styled circles with gradient and glow

## 3. Layout & Structure

```
┌─────────────────────────────────────────────────────┐
│  Header: "🃏 Hearthstone Deck Builder" (sticky)      │
├─────────────────────────────────────────────────────┤
│  Tab nav: Browse Cards | My Deck (with count badge) │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Browse Tab]                                       │
│  ├─ Search bar + Mana/Type/Rarity filters           │
│  ├─ "X cards" count                                 │
│  └─ Card grid (140px min, responsive)               │
│                                                     │
│  [My Deck Tab]                                      │
│  ├─ Editable deck name + card count (X/30)         │
│  ├─ Mana curve bar chart                           │
│  └─ Deck list table (count, name, cost, type)      │
│                                                     │
│  [Mulligan Modal]                                   │
│  └─ 3 drawn cards displayed with full art          │
│     + Mulligan / Keep buttons                      │
└─────────────────────────────────────────────────────┘
```

**Responsive:** Max-width container centered. Card grid auto-fills. Filters stack on mobile.

## 4. Features & Interactions

### Browse Cards
- Cards fetched from `https://api.hearthstonejson.com/v1/latest/enUS/cards.json`
- Only collectible cards with a mana cost shown (no enchantments)
- Card grid shows image, mana gem, name, type, attack/health
- Hover reveals `+` add-to-deck overlay
- Click `+` to add card to deck (respects max 2, or 1 for legendaries)
- Search: filters by card name (case-insensitive, instant)
- Mana filter: 0–9, 10+
- Type filter: Minion / Spell / Weapon
- Rarity filter: Common / Rare / Epic / Legendary
- Shows first 200 cards with "Showing 200 of X" note

### My Deck
- Editable deck name (click to edit)
- Card count shown as X/30
- Add cards from Browse tab
- Remove cards via `−` button in list
- Mana curve visualization (10 bars, count per mana cost)
- Table: count, name (colored by rarity), cost, type, remove button
- **Import button** — opens modal to paste a Hearthstone deck code string; decodes it and adds cards to deck
- **Export button** — copies current deck as a Hearthstone deck code to clipboard (shows "Copied!" feedback)
- Deck persists in localStorage via `hearthstone_active_deck` key

### Mulligan Simulator
- Enabled when deck has ≥10 cards
- "Draw Opening Hand" button in My Deck tab
- Draws 3 random cards from deck
- Modal displays cards with full art, name, mana cost
- "Mulligan" button: returns to deck and draws 3 new random cards
- "Keep This Hand" button: closes modal
- Only one mulligan per session (button disabled after use)

### Edge Cases
- API failure: shows error with retry button
- Empty deck: shows "Your deck is empty" message
- Card with no render image: shows name placeholder
- Legendary at 2/2: won't add more (max 1)
- No cards matching filter: "No cards match your filters"

## 5. Component Inventory

**`Card`** — Card image, mana gem, name (rarity color), type badge, attack/health. Hover shows `+` overlay.

**`BrowseTab`** — Search input, filter selects, card count, responsive card grid.

**`MyDeckTab`** — Editable name, deck count, mana curve chart, deck table.

**`MulliganModal`** — Full-screen overlay, 3 drawn cards with art, Mulligan + Keep buttons.

**`Header`** — App title, sticky.

**`TabNav`** — Browse + My Deck tabs with active state and card count badge.

## 6. Technical Approach

**Framework:** Next.js 16 (App Router) + TypeScript
**Styling:** Tailwind CSS utility classes + CSS custom properties for theme
**Icons:** lucide-react
**Data:** Fetched from Hearthstone JSON API (no server storage)
**Persistence:** localStorage for active deck

**Key files:**
```
src/
├── app/
│   ├── layout.tsx      # Root layout, Inter font, global CSS
│   ├── page.tsx        # All components (Browse, My Deck, Mulligan)
│   └── globals.css     # Dark theme CSS variables + mana gem styles
└── lib/
    ├── types.ts        # HS_Card, Deck, filter enums
    ├── hearthstone.ts  # fetchCards(), getCardImageUrl(), filterCards(), deckFromCode(), deckToCode()
    └── deckStorage.ts  # localStorage load/save for decks
```

**Data model:**
```typescript
interface HS_Card {
  id: string; name: string; cost?: number; attack?: number;
  health?: number; durability?: number; type: string;
  rarity?: string; text?: string; set?: string; dbfId?: number;
  elite?: boolean; classes?: string[]; cardClass?: string;
}

interface Deck {
  id: string; name: string;
  cards: { [cardId: string]: number }; // 1 or 2 per cardId
  createdAt: number;
}
```

**Image URL:** `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/{cardId}.png`

**API:** `https://api.hearthstonejson.com/v1/latest/enUS/cards.json` — returns all cards as object with cardId keys.

## 7. Out of Scope (for later)

- Multiple saved decks
- Card detail modal (click to see text/mechanics)
- Card text preview on hover
- Filter by set, card class
- Responsive card grid optimization
- Infinite scroll / pagination

## Changelog

- **2026-06-03** — Full rewrite: replaced Waterbottle todo app with Hearthstone deck builder. Browse cards from Hearthstone JSON API, build decks, mulligan simulator.
- **2026-06-03** — Added import/export deck codes using HearthSim spec (header byte, version, format, card blocks). Import now wipes deck fresh instead of merging.
- **2026-06-03** — Fixed deck code decoder to use HearthSim block format: header → version → format → heroes/single/double/n-copy blocks with varint length prefixes.