// Web scraper: fetches a product page and extracts structured data.
// Uses only Node built-ins (fetch + regex parsing) — no dependencies.
const { matchField, normalizeName, getTemplate } = require('./templates');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15000;

// ---------- HTTP ----------

async function fetchHtml(url, redirectsLeft = MAX_REDIRECTS) {
  if (redirectsLeft <= 0) throw new Error('Too many redirects');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
  } finally {
    clearTimeout(timer);
  }
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get('location');
    if (!loc) throw new Error('Redirect without location');
    return fetchHtml(new URL(loc, url).toString(), redirectsLeft - 1);
  }
  if (res.status === 403 || res.status === 429 || res.status === 401) {
    throw new Error(
      `This site blocked the request (HTTP ${res.status}). Many big retailers block bots — try the product page on another site, or add the item manually.`
    );
  }
  if (!res.ok) throw new Error(`Site returned HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) throw new Error(`Expected an HTML page, got "${ct}"`);

  // stream with size cap
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      reader.cancel();
      throw new Error('Page too large (>5 MB)');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// ---------- HTML helpers (regex-based, no deps) ----------

function getMeta(html, property, name) {
  const prop = property ? new RegExp(`<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i') : null;
  const byProp = prop ? html.match(prop) : null;
  if (byProp) return decode(byProp[1]);

  const nm = name ? new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i') : null;
  const byName = nm ? html.match(nm) : null;
  if (byName) return decode(byName[1]);

  // attribute order may differ
  const alt = property
    ? new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i')
    : null;
  const byAlt = alt ? html.match(alt) : null;
  return byAlt ? decode(byAlt[1]) : null;
}

const NAMED_ENTITIES = {
  nbsp: ' ',
  thinsp: ' ',
  ensp: ' ',
  emsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  middot: '·',
  bull: '•',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  times: '×',
  divide: '÷',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"'
};

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
    .replace(/&([a-z]+);/gi, (m, name) =>
      NAMED_ENTITIES[name.toLowerCase()] !== undefined ? NAMED_ENTITIES[name.toLowerCase()] : m
    );
}

function stripTags(s) {
  return decode(String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function getTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]) : null;
}

function findById(html, id) {
  const re = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/(div|span|h1|h2|table|section)[^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function findByClass(html, cls, tag = 'div') {
  const re = new RegExp(`<${tag}[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function getJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = m[1].trim();
    if (!text) continue;
    // handle @graph arrays by brute-force JSON extraction
    for (const candidate of splitJsonBlocks(text)) {
      try {
        const obj = JSON.parse(candidate);
        collectJsonLd(obj, out);
      } catch (e) { /* ignore malformed */ }
    }
  }
  return out;
}

function splitJsonBlocks(text) {
  const out = [];
  try {
    const obj = JSON.parse(text);
    out.push(text); // whole block parses — collectJsonLd will walk @graph
    return out;
  } catch (e) { /* fall through */ }
  // naive brace balancing for concatenated objects
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) { out.push(text.slice(start, i + 1)); start = -1; }
    }
  }
  return out.length ? out : [text];
}

function collectJsonLd(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach((o) => collectJsonLd(o, out)); return; }
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    obj['@graph'].forEach((o) => collectJsonLd(o, out));
  }
  const type = Array.isArray(obj['@type']) ? obj['@type'].join(',') : String(obj['@type'] || '');
  if (/product|offer|review|thing/i.test(type)) out.push(obj);
}

// ---------- spec tables ----------

function extractTables(html) {
  const tables = [];
  const re = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    const rows = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(m[1]))) {
      const cells = [];
      const tdRe = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      let td;
      while ((td = tdRe.exec(tr[1]))) cells.push(stripTags(td[1]));
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

// ---------- price detection ----------

const CURRENCIES = [
  { symbol: '₹', code: 'INR', label: '₹' },
  { symbol: '$', code: 'USD', label: '$' },
  { symbol: '€', code: 'EUR', label: '€' },
  { symbol: '£', code: 'GBP', label: '£' },
  { symbol: '¥', code: 'JPY', label: '¥' }
];

/**
 * Detect a price in text. `minValue` guards against false positives
 * (e.g. "Rs 3.5" inside unrelated prose) when scanning large bodies.
 */
function detectPrice(text, minValue = 1) {
  if (!text) return null;
  // symbol/code before the number — prefers ₹ style prices when present
  for (const cur of CURRENCIES) {
    const re = new RegExp(`(?:${escapeRe(cur.symbol)}|${cur.code})\\s?(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{1,2})?)`, 'g');
    const m = text.match(re);
    if (m && m.length) {
      let n = parseFloat(m[0].replace(/[^0-9.,]/g, '').replace(/,/g, ''));
      if (!isNaN(n) && n >= minValue) {
        return { value: n, currency: cur.code, symbol: cur.label, raw: m[0] };
      }
    }
  }
  // "Rs. 1,299" / "Rs 1299"
  const rs = text.match(/Rs\.?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
  if (rs) {
    const n = parseFloat(rs[1].replace(/,/g, ''));
    if (!isNaN(n) && n >= minValue) return { value: n, currency: 'INR', symbol: '₹', raw: rs[0] };
  }
  // number before the code: "350 EUR", "1,299 USD"
  const codeAfter = text.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s?(INR|USD|EUR|GBP|JPY)/g);
  if (codeAfter) {
    for (const raw of codeAfter) {
      const n = parseFloat(raw.replace(/[^0-9.,]/g, '').replace(/,/g, ''));
      if (isNaN(n) || n < minValue) continue;
      const code = raw.match(/INR|USD|EUR|GBP|JPY/)[0];
      const cur = CURRENCIES.find((c) => c.code === code);
      return { value: n, currency: code, symbol: cur.label, raw };
    }
  }
  return null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickFromJsonLd(list, key) {
  for (const obj of list) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function jsonLdImages(obj) {
  const imgs = [];
  if (obj && obj.image) {
    const arr = Array.isArray(obj.image) ? obj.image : [obj.image];
    for (const im of arr) {
      if (typeof im === 'string') imgs.push(im);
      else if (im && typeof im === 'object' && im.url) imgs.push(im.url);
    }
  }
  return imgs;
}

// ---------- main parse ----------

function parsePage(html, url, templateKey = 'generic') {
  const jsonLd = getJsonLd(html);
  const product = jsonLd.find((o) => /product/i.test(String(o['@type'] || ''))) || {};
  const offers = Array.isArray(product.offers)
    ? product.offers[0]
    : product.offers && typeof product.offers === 'object'
      ? product.offers
      : {};
  const ratingObj = product.aggregateRating || {};

  // ---- title ----
  let title =
    stripTags(getMeta(html, 'og:title') || '') ||
    (typeof product.name === 'string' && product.name) ||
    getTitle(html) ||
    'Untitled item';

  // trim common site-suffix boilerplate from titles
  title = title
    .replace(/[\s|—-]*(?:full phone specifications|phone specifications|specifications|full specs|specs|buy online|official site|official website)[\s|—-]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) title = 'Untitled item';

  // ---- image ----
  const imgs = [
    getMeta(html, 'og:image'),
    getMeta(html, 'twitter:image'),
    (html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) || [])[1],
    ...jsonLdImages(product),
    ...jsonLd.flatMap(jsonLdImages)
  ].filter(Boolean);
  let image = imgs.find((i) => !i.includes('logo') && !i.includes('icon')) || imgs[0] || null;
  if (image && image.startsWith('//')) image = 'https:' + image;

  // ---- description ----
  const description =
    stripTags(getMeta(html, 'og:description') || '') ||
    (typeof product.description === 'string' && stripTags(product.description)) ||
    stripTags(getMeta(html, null, 'description') || '') ||
    null;

  // ---- brand ----
  const brand =
    (typeof product.brand === 'string' && product.brand) ||
    (product.brand && product.brand.name) ||
    (product.manufacturer && product.manufacturer.name) ||
    null;

  // ---- rating ----
  let rating = null, reviewCount = null;
  const rv = parseFloat(ratingObj.ratingValue);
  if (!isNaN(rv)) rating = rv;
  const rc = parseInt(ratingObj.reviewCount, 10);
  if (!isNaN(rc)) reviewCount = rc;

  // ---- price (JSON-LD first, then visible regex) ----
  let price = null;
  const offerPrice = offers.price !== undefined ? offers.price : offers.lowPrice;
  if (offerPrice !== undefined && offerPrice !== null) {
    const p = parseFloat(String(offerPrice).replace(/,/g, ''));
    if (!isNaN(p) && p > 0) {
      const currency = offers.priceCurrency || 'INR';
      const cur = CURRENCIES.find((c) => c.code === currency);
      price = { value: p, currency, symbol: cur ? cur.label : currency };
    }
  }
  if (!price) {
    // search visible text near "price" words
    const priceCtx =
      (findById(html, 'price') || '') +
      (findByClass(html, 'price', 'div') || '') +
      (findByClass(html, 'a-price', 'span') || '');
    price = detectPrice(priceCtx, 1);
    if (!price) {
      const bodyText = stripTags(html).slice(0, 60000);
      price = detectPrice(bodyText, 100);
    }
  }

  // ---- specs: spec tables + JSON-LD additionalProperty ----
  let specs = [];
  const seen = new Set();

  const JUNK = new Set([
    'nbsp', 'amp', 'rsquo', 'lsquo', 'ldquo', 'rdquo', 'hellip', 'middot',
    'raquo', 'laquo', 'bull', 'ndash', 'mdash', 'copy', 'reg', 'trade',
    'apos', 'quot', 'lt', 'gt', 'nbspnbsp'
  ]);

  const pushSpec = (name, value, source) => {
    const n = normalizeName(name);
    let v = stripTags(value);
    if (!n || !v || n.length < 2 || JUNK.has(n) || v === n) return;
    if (n.length > 80) return;
    if (v.length > 400) v = v.slice(0, 397) + '…';
    // skip rows whose value is just a price (e.g. GSMArena's
    // "256GB 8GB RAM = $ 656.00" storage-variant rows)
    const priceLike = detectPrice(v, 1);
    if (priceLike && v.replace(priceLike.raw, '').replace(/[^a-zA-Z]/g, '').length < 3) return;
    if (seen.has(n)) return;
    seen.add(n);
    const key = matchField(n, templateKey);
    specs.push({ key: key || null, name: n, label: titleCase(n), value: v, source });
  };

  // JSON-LD additionalProperty
  const addProps = product.additionalProperty || product.additionalproperty || [];
  if (Array.isArray(addProps)) {
    for (const p of addProps) {
      if (p && (p.name || p.propertyID) && (p.value !== undefined)) {
        pushSpec(p.name || p.propertyID, p.value, 'structured data');
      }
    }
  }

  // HTML tables: two-column key/value rows are specs
  for (const rows of extractTables(html)) {
    for (const row of rows) {
      if (row.length === 2) pushSpec(row[0], row[1], 'spec table');
      else if (row.length > 2) {
        // first cell is the name, rest are values
        pushSpec(row[0], row.slice(1).join(' / '), 'spec table');
      }
    }
  }

  // known e-commerce layouts
  const known = [
    { name: 'Title', node: findById(html, 'productTitle') },
    { name: 'Bullets', node: findByClass(html, 'feature-bullets', 'div') }
  ];
  for (const k of known) {
    if (k.node && k.name === 'Bullets') {
      const items = k.node.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const li of items) {
        const text = stripTags(li);
        if (text.length > 12) pushSpec(`bullet ${specs.length + 1}`, text, 'description');
      }
    }
  }

  // ---- post-processing fixes ----
  // "Memory: Card slot / No" rows are storage-expansion info, not RAM
  specs = specs.filter((s) => !(s.key === 'ram' && /card slot|microsd/i.test(s.value)));
  // derive RAM from gsmarena-style "Internal: 256GB 8GB RAM, ..." rows
  if (!specs.some((s) => s.key === 'ram')) {
    const storageSpec = specs.find((s) => s.key === 'storage');
    if (storageSpec) {
      const m = String(storageSpec.value).match(/(\d+)\s*GB\s*(\d+)\s*GB\s*RAM/i);
      if (m) specs.push({ key: 'ram', name: 'ram', label: 'RAM', value: m[2], source: 'derived' });
    }
  }

  // hostname as source label
  let source = 'web';
  try {
    source = new URL(url).hostname.replace(/^www\./, '');
  } catch (e) { /* ignore */ }

  // if template has a price field and price was detected, add it as a spec too
  if (price && getTemplate(templateKey).fields.some((f) => f.key === 'price')) {
    specs = specs.filter((s) => s.key !== 'price');
    specs.unshift({
      key: 'price',
      name: 'price',
      label: 'Price',
      value: String(price.value),
      price: true,
      source: 'page'
    });
  }
  if (rating !== null) {
    const key = matchField('rating', templateKey);
    if (key) {
      specs = specs.filter((s) => s.key !== key);
      specs.unshift({ key, name: 'rating', label: 'Rating', value: String(rating), rating: true, source: 'page' });
    }
  }

  return {
    title,
    image,
    description,
    brand,
    rating,
    reviewCount,
    price,
    specs,
    source,
    url
  };
}

function titleCase(s) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

module.exports = { fetchHtml, parsePage, detectPrice, stripTags };
