# 🧰 StackCompare — the tools behind every website, compared honestly

A comparison site for the web-dev tools market: **domain registrars, shared hosting, VPS/cloud servers, website builders, managed WordPress hosting, business email, and GPU cloud** — with India (₹) pricing and a "true cost" angle nobody else does well.

**Zero dependencies** — runs on Node.js 18+ built-ins only.

## Why this niche?

- Huge, evergreen demand (every website needs a domain + hosting).
- Existing players (HostAdvice etc.) are US-centric — no India pricing context, no ₹ totals.
- The #1 real-world gotcha is invisible everywhere: **intro-vs-renewal price traps** (hosting renewals jump 3×–6×). StackCompare surfaces it directly.

## Features

- **Preloaded catalog** — 53 tools across 7 categories with curated Sep-2026 pricing (hosting sites block scrapers, so the catalog is the reliable path; scraping still available for other pages)
- **🧭 Recommendation wizard** — 4 quick questions (what you're building, budget, traffic, tech comfort) → top-3 picks with reasons → one-click compare
- **⚙️ Computed "true-cost" rows** — scored like real specs:
  - Domains: `.com 5-yr cost`, `.com 10-yr cost`, renewal markup
  - Hosting / WP hosting: `3-yr total`, `5-yr avg (₹/mo)`, renewal markup
  - VPS: `₹ per GB RAM`, `₹ per vCPU`
  - GPU cloud: `₹/hr per GB VRAM`, `24-hr run cost`
  - Email: `10-user yearly cost`
- **⚠️ Renewal-trap badges** — any tool whose renewal is ≥1.5× the intro price gets flagged in the item card and table
- **India-first fields** — UPI support, India data centers, Hindi phone support, ₹ prices
- **Smart winner scoring** with cross-currency price conversion ($1 ≈ ₹86.5, €1 ≈ ₹96.5)
- URL scraping (with honest "pricing pages often block bots" messaging), manual entry, CSV export, shareable links

## Quick start

```bash
cd stackcompare
npm start            # or: PORT=3001 node server.js
```

Open **http://localhost:3001** (or the port you chose).

## Categories

| Category | Fields that matter | Computed true-cost |
|---|---|---|
| 🌐 Domains | .com & .in 1st-yr + renewal, WHOIS privacy, UPI, DNSSEC, TLDs | 5-yr cost, 10-yr cost, markup |
| 🖥️ Hosting | intro/renewal ₹/mo, NVMe, sites, free domain, backups, India DC | 3-yr total, 5-yr avg, markup |
| ⚡ VPS | ₹/mo, vCPU, RAM, NVMe, bandwidth, India DC, hourly billing | ₹ per GB RAM, ₹ per vCPU |
| 🧱 Builders | ₹/mo, free plan, e-commerce, txn fee %, templates, storage | 3-yr total |
| 🔧 WP Hosting | managed WP: ₹/mo + renewal, storage, visits, staging, CDN | 3-yr total, markup |
| ✉️ Email | ₹/user/mo, mailbox size, IMAP, collaboration, India DC | 10-user yearly cost |
| 🎮 GPU Cloud | ₹/hr (H100), VRAM, spot, API, setup time, SLA | ₹/hr per GB VRAM, 24-hr cost |

## Deploying

See **[DEPLOY.md](DEPLOY.md)** — VPS + nginx + HTTPS (recommended, ~₹300–500/mo), free tiers (Render/Fly.io), or a static-export option.

## Project structure

```
stackcompare/
├── server.js            # HTTP server + API (Node built-ins)
├── lib/
│   ├── templates.js     # 7 category templates + computed-field formulas
│   ├── compare.js       # matrix, best-value detection, scoring
│   ├── scraper.js       # URL scraping (meta/JSON-LD/spec tables)
│   └── discover.js      # web search helper
├── public/
│   ├── index.html       # UI + wizard modal
│   ├── styles.css       # teal theme
│   ├── catalog.js       # 53 curated tools (Sep 2026 prices)
│   └── app.js           # frontend logic + wizard + true-cost display
├── DEPLOY.md            # deployment guide (VPS / free tiers / static)
└── package.json
```

## Honest caveats

- **Prices change.** Catalog data is curated Sep 2026 — providers run promos constantly. Every item links to the provider's pricing page; verify before buying.
- **Computed costs are estimates** — they assume a typical 36-month intro lock and static renewal rates.
- Hosting/registrar pricing pages usually block scrapers; the catalog is the primary data path.
- ₹ conversions use approximate static rates.
