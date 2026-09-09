# 🚀 Deploying StackCompare (and Comparely)

Both sites are plain Node.js apps with **zero npm dependencies** — no build step, no
install. Deployment is just: get the folder onto a server, run `node server.js`, and
put a reverse proxy in front.

---

## Option 1 — A cheap VPS (₹300–₹500/mo) — recommended for India

Any VPS works: Hostinger KVM, Hetzner, DigitalOcean, Linode (all in the StackCompare
catalog 😉). This is the most reliable option and lets you run **both** sites on one box.

### 1. Get a VPS + point your domain

- Rent a VPS (1–2 GB RAM is plenty), install Ubuntu 22.04/24.04.
- At your registrar (e.g. Cloudflare), create DNS A records:
  - `stackcompare.example.com → <VPS IP>`
  - `comparely.example.com → <VPS IP>`

### 2. Install Node 20 (one-time)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Upload the site(s)

```bash
# from your laptop
scp -r stackcompare user@VPS_IP:~/
# (repeat for compare-site if you want both)
```

### 4. Run with systemd (auto-start + auto-restart)

Create `/etc/systemd/system/stackcompare.service`:

```ini
[Unit]
Description=StackCompare
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/stackcompare
ExecStart=/usr/bin/node server.js
Environment=PORT=3001
Restart=always
RestartSec=2
User=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now stackcompare
systemctl status stackcompare   # should show "active (running)"
```

(Repeat for `compare-site` with `PORT=3000` if deploying both.)

### 5. Reverse proxy — nginx + Let's Encrypt HTTPS

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/stackcompare`:

```nginx
server {
    server_name stackcompare.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;   # scraping can take a while
        proxy_send_timeout 30s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/stackcompare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d stackcompare.example.com   # free HTTPS
```

Done — your site is live at `https://stackcompare.example.com`.

---

## Option 2 — Zero-cost static hosting (limited!)

The UI is static, but the API (scraping, comparing, templates) needs Node.
You can run the **backend for free** on one of these, and keep the frontend wherever:

| Platform | Free plan | Notes |
|---|---|---|
| **Render** | ✅ free web service (Node) | sleeps after ~15 min idle; starts on first request. Deploy from GitHub. `Start command: node server.js` |
| **Fly.io** | ✅ generous free allowance | `fly launch`, set `PORT` env. Slightly more setup |
| **Railway** | trial credits only | fine for testing |
| **Glitch** | ✅ free Node | ok for demos; limited uptime |

Render setup (easiest free path):
1. Push the folder to GitHub.
2. New → Web Service → pick repo → runtime Node → build `""` → start `node server.js`.
3. Add env `PORT=10000`.
4. Attach a custom domain (free plan supports it).

⚠️ Free tiers sleep/rate-limit — fine for a portfolio demo, not for real traffic.

---

## Option 3 — Static export (no backend, read-only)

If you want a **pure static site** (GitHub Pages / Netlify, ₹0 forever), you lose
scraping, but the catalog + comparison table can work fully client-side:

```bash
# one-time: fetch templates to a static JSON file
curl -s http://localhost:3001/api/templates > public/templates.json
```

Then in `public/app.js` change init() to read `/templates.json` instead of
`/api/templates`, and replace `api('/api/compare', …)` with a local call to the
comparison logic (the code in `lib/compare.js` ports cleanly to browser JS).
This is a ~1-hour change — ask and I'll generate a `static/` version of the site.

---

## Things to know before going public

- **Catalog prices go stale.** Refresh `public/catalog.js` monthly (or set up a small
  cron + scraper — I can build that next).
- **Scraping from your server** hits provider sites with your VPS IP; some providers
  (AWS, GoDaddy) may block datacenter IPs. That's why the catalog is primary.
- **Legal / ToS:** price scraping is generally allowed for comparison sites, but check
  each provider's ToS; the site already disclaims that prices must be verified.
- **HTTPS is required** for the share-link clipboard feature to work smoothly.
- **Monitoring:** `journalctl -u stackcompare -f` for logs; add UptimeRobot (free)
  for uptime alerts.

---

## Local quick start (reminder)

```bash
cd stackcompare && PORT=3001 node server.js   # → http://localhost:3001
cd compare-site && PORT=3000 node server.js   # → http://localhost:3000
```
