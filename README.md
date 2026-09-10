# Compare Sites — Comparely + StackCompare

This repository contains two zero-dependency Node.js 18+ comparison websites. Both run with only Node built-ins (no `node_modules`, no build step).

## Projects

### 1. Comparely — `compare-site/` (port 3000)
**General-purpose comparison site** — compare anything side by side.

- Paste product URLs and auto-extract specs via built-in scraper (meta tags, JSON-LD, spec tables)
- Discover items via web search (DuckDuckGo HTML, no API key)
- Manual entry with custom fields
- 11 category templates: phones, laptops, TVs, cameras, audio, watches, streaming, software, credit cards, insurance, generic
- Smart scoring: best value per spec highlighted, overall winner picked (handles ties)
- Currency-aware pricing, CSV export, shareable links

📖 Detailed docs: [compare-site/README.md](compare-site/README.md)

### 2. StackCompare — `stackcompare/` (port 3001)
**Honest comparison of web-dev tools** — domain registrars, hosting, VPS, website builders, managed WordPress, business email, GPU cloud.

- India-first: ₹ pricing, UPI support, India data centers flagged
- 53 curated tools with Sep-2026 pricing (hosting pages block scrapers, so catalog is reliable)
- True-cost computed rows: `.com 5-yr cost`, `3-yr total`, `5-yr avg (₹/mo)`, `₹ per GB RAM`, renewal markup, etc.
- Renewal-trap badges when renewal ≥1.5× intro price
- Recommendation wizard (4 questions → top-3 picks)
- Same zero-dependency scraper + manual entry + CSV + share links

📖 Detailed docs: [stackcompare/README.md](stackcompare/README.md) — see also [stackcompare/DEPLOY.md](stackcompare/DEPLOY.md) for deployment.

## Quick Start

Prerequisites: **Node.js 18+** (Node 20 recommended).

### Run Comparely

```bash
cd compare-site
npm start
# or: node server.js
# opens http://localhost:3000
```

### Run StackCompare

```bash
cd stackcompare
npm start
# with custom port:
PORT=3001 npm start
# or: PORT=3001 node server.js
# opens http://localhost:3001 (or your PORT)
```

Both servers bind to `0.0.0.0` and serve:
- Static UI from `public/`
- API:
  - `GET /api/templates` → list category templates
  - `POST /api/scrape` → `{ url, template }` → extracted data
  - `POST /api/discover` → `{ q }` → search results
  - `POST /api/compare` → `{ items, template }` → matrix, scores, winners

## Repository Structure

```
.
├── compare-site/        # Comparely app
│   ├── server.js
│   ├── lib/             # templates, compare, scraper, discover
│   ├── public/          # index.html, app.js, styles.css
│   └── package.json
├── stackcompare/        # StackCompare app
│   ├── server.js
│   ├── lib/
│   ├── public/          # includes catalog.js (53 tools)
│   ├── DEPLOY.md
│   └── package.json
├── .github/workflows/ci.yml
├── .gitignore
└── README.md
```

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on `push` and `pull_request`:

- Checks out repo
- Sets up Node 20
- Runs `node --check` on every `.js` file in both projects (fails build on syntax error)
- Includes smoke tests for `/api/templates` counts and `/api/compare` winners

## Zero Dependencies

Both apps intentionally use only Node built-ins (`http`, `fs`, `path`, `url`, `https`). No Express, no npm install needed.

## License

MIT
