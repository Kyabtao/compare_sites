// Comparely server — zero dependencies (Node 18+ built-ins only).
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { TEMPLATES, getTemplate } = require('./lib/templates');
const { fetchHtml, parsePage } = require('./lib/scraper');
const { buildComparison } = require('./lib/compare');
const { discover } = require('./lib/discover');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error('Request too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!resolved.startsWith(PUBLIC_DIR)) {
    send(res, 403, { error: 'Forbidden' });
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      send(res, 404, { error: 'Not found' });
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    // ---- API ----
    if (pathname.startsWith('/api/')) {
      if (req.method === 'GET' && pathname === '/api/templates') {
        send(res, 200, { templates: TEMPLATES });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/scrape') {
        const body = await readBody(req);
        const target = String(body.url || '').trim();
        if (!target) {
          send(res, 400, { error: 'Please provide a URL to scrape.' });
          return;
        }
        let parsedUrl;
        try {
          parsedUrl = new URL(target);
        } catch (e) {
          send(res, 400, { error: 'That does not look like a valid URL.' });
          return;
        }
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          send(res, 400, { error: 'Only http:// and https:// URLs are supported.' });
          return;
        }
        const template = getTemplate(body.template) ? body.template : 'generic';
        try {
          const html = await fetchHtml(parsedUrl.toString());
          const data = parsePage(html, parsedUrl.toString(), template);
          send(res, 200, data);
        } catch (e) {
          send(res, 422, { error: e.message || 'Failed to scrape this page.' });
        }
        return;
      }

      if (req.method === 'POST' && pathname === '/api/discover') {
        const body = await readBody(req);
        const q = String(body.q || '').trim();
        if (!q) {
          send(res, 400, { error: 'Please provide a search query.' });
          return;
        }
        try {
          const results = await discover(q, 8);
          send(res, 200, { results });
        } catch (e) {
          send(res, 422, { error: e.message || 'Search failed.' });
        }
        return;
      }

      if (req.method === 'POST' && pathname === '/api/compare') {
        const body = await readBody(req);
        const items = Array.isArray(body.items) ? body.items : [];
        if (items.length < 2) {
          send(res, 400, { error: 'Add at least 2 items to compare.' });
          return;
        }
        const template = getTemplate(body.template) ? body.template : 'generic';
        const result = buildComparison(items, template);
        send(res, 200, result);
        return;
      }

      send(res, 404, { error: 'Unknown API endpoint' });
      return;
    }

    // ---- static ----
    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, pathname);
      return;
    }
    send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    send(res, 500, { error: e.message || 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StackCompare running at http://0.0.0.0:${PORT}`);
});
