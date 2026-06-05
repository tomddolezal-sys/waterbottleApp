# Hearthstone Deck Builder

A Next.js web app for browsing Hearthstone cards, building decks, and analyzing mulligan probabilities. Card data is fetched from the Hearthstone JSON API — no backend needed.

**Live:** http://3.133.162.134

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploying to EC2

The app runs in a Docker container on an EC2 instance (Ubuntu). To redeploy after code changes:

```powershell
.\deploy.ps1
```

The script packages the source, uploads it to the EC2 instance, builds the Docker image, and restarts the container with a health check.

**First-time EC2 setup (if building from scratch):**

```bash
# SSH into the instance
ssh -i "MY-AWS-KEYPAIR.pem" ec2-user@ec2-3-133-162-134.us-east-2.compute.amazonaws.com

# Install Docker
sudo apt-get update && sudo apt-get install -y docker.io
sudo service docker start
sudo usermod -aG docker ec2-user

# Build and run
docker build -t hearthstone-app .
docker run -d --name hearthstone-app -p 80:3000 --restart unless-stopped hearthstone-app
```

**Required AWS security group inbound rules:**

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | 0.0.0.0/0 |
| SSH | 22 | your IP |

## Features

- **Browse** — card gallery with search/filter
- **My Deck** — build and save decks (localStorage)
- **Opening Hand** — draw and replace cards
- **Mana Curve Analyzer** — probability calculator for mana curve buckets
- **Import/Export** deck codes

## Rate limiting & security

`src/middleware.ts` enforces per-IP limits on every request:

| Setting | Value |
|---------|-------|
| Rate limit | 100 req/min per IP |
| Max request body | 1 MB |
| On limit exceeded | `429 Too Many Requests` + `Retry-After` |

Response headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` are added to all responses.

## Project structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout, Inter font, global styles
│   ├── page.tsx        # Full app (Browse, My Deck, Mulligan)
│   └── globals.css     # Dark theme Tailwind + mana gem styles
└── lib/
    ├── types.ts        # HS_Card, Deck, filter types
    ├── hearthstone.ts  # API fetch, image URL builder, card filtering
    ├── deck_storage.ts # localStorage load/save
    └── probability.ts  # Hypergeometric + mana curve probability

Dockerfile           # Multi-stage production build
deploy.ps1           # Deploy script (Windows → EC2)
src/middleware.ts    # Rate limiter + body size cap
next.config.ts       # output: 'standalone'
```

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- lucide-react
- Hearthstone JSON API (client-side fetch, no backend)
- Docker container on EC2 (port 80)