# Waterbottle

Personal productivity app — notes, tasks, reminders. All data stored locally in your browser. No accounts, no server.

## Quick start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Add items** — type in the input and press Enter or click Add
- **Complete items** — click the checkbox or the item text
- **Delete items** — hover and click the trash icon
- **Filter** — All / Active (N) / Done (N) tabs
- **Persist** — data survives page refresh via `localStorage`

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- lucide-react icons
- File-based storage: `data/items.json` on the server (requires running server)

## API

- `GET /api/items` — returns the items array from `data/items.json`
- `POST /api/items` — saves the request body to `data/items.json`

## Project files

```
src/
├── app/
│   ├── layout.tsx      # Root layout, fonts, global styles
│   ├── page.tsx       # Full app (all components)
│   └── globals.css     # Tailwind + CSS variables
└── lib/
    ├── types.ts        # Item, FilterType interfaces
    └── storage.ts      # localStorage load/save
```

## Dev commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
```

## Killing the dev server

```bash
pkill -f "next dev"           # macOS/Linux/Git Bash
taskkill //PID <pid> //F      # Windows CMD
```

## Future upgrade path

The API route (`src/app/api/items/route.ts`) handles file I/O. To migrate to a database later, replace the `fs` calls in the route — component code stays the same.