# ⚖️ Comparely — Compare anything, side by side

A general-purpose comparison site with a built-in web scraper. Paste product links, auto-extract specs, and get an instant side-by-side comparison with a winner pick.

**Zero dependencies** — runs on Node.js 18+ built-ins only.

## Features

- 🔍 **Web scraping** — paste any product URL; extracts title, image, price, rating, and specs from meta tags, JSON-LD structured data, and spec tables
- 🌐 **Discover** — search the web for items to compare (DuckDuckGo HTML, no API key)
- ✍️ **Manual entry** — full form per category plus unlimited custom spec fields
- 🧠 **Smart scoring** — highlights the best value per spec, scores each item, and crowns the overall winner (handles ties)
- 💱 **Currency-aware pricing** — prices in $/€/£ are converted to ₹ (approx. rates) for fair scoring; originals are still displayed
- 🏷️ **11 category templates** — phones, laptops, TVs, cameras, audio, watches, streaming, software, credit cards, insurance, generic
- 📤 **Export CSV** · 🔗 **Shareable links** (comparison encoded in URL) · 📱 responsive, modern UI

## Quick start

```bash
cd compare-site
npm start            # or: node server.js
```

Then open **http://localhost:3000**.

## How to use

1. **Pick a category** — it defines which specs matter and how winners are scored.
2. **Add items** — paste a product URL (scrape & add), search the web (Discover), or add manually.
3. **Hit Compare** — the table marks the best value per row with ✓, scores each item, and crowns a winner.
4. Export to CSV or copy a share link.

Good scraping targets: spec-heavy pages like `gsmarena.com`, manufacturer sites, smaller retailers. Big retailers (Amazon, Flipkart) often block bots — for those, add items manually.

## Project structure

```
compare-site/
├── server.js            # HTTP server + API (Node built-ins, no Express)
├── lib/
│   ├── scraper.js       # fetch + parse (meta, JSON-LD, spec tables, prices)
│   ├── templates.js     # category templates + spec-name → field mapping
│   ├── compare.js       # comparison matrix, best-value detection, scoring
│   └── discover.js      # DuckDuckGo HTML search
├── public/
│   ├── index.html       # UI
│   ├── styles.css       # styling
│   └── app.js           # frontend logic
└── package.json
```

## API

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/templates` | GET | — | category templates |
| `/api/scrape` | POST | `{ url, template }` | extracted product data + specs |
| `/api/discover` | POST | `{ q }` | web search results |
| `/api/compare` | POST | `{ items, template }` | comparison matrix, scores, winners |

## Notes & limitations

- Scraping is best-effort: results depend on the source page's structure and bot policy. Some sites return 403 — the app shows a friendly message suggesting manual entry.
- Detected specs are mapped to category fields with fuzzy matching; unmatched specs still appear as extra rows in the comparison.
- Exchange rates used for price scoring are approximate (static, as of Sep 2026).
- Always verify scraped data before making purchase decisions.
