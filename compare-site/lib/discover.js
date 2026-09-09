// "Discover" — searches the web for items to compare via DuckDuckGo's HTML
// endpoint (no API key needed). Experimental: can fail; UI handles gracefully.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d));
}

function stripTags(s) {
  return decode(String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

async function discover(query, max = 8) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' }
    });
  } catch (e) {
    throw new Error('Search service unreachable — check your internet connection.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 403 || res.status === 429) {
    throw new Error('Search service rate-limited us — try again in a minute.');
  }
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status}).`);
  const html = await res.text();

  const results = [];
  const linkRe = /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const snipRe = /<a[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  const snippets = [];
  let sm;
  while ((sm = snipRe.exec(html))) snippets.push(stripTags(sm[1]));

  let m, i = 0;
  while ((m = linkRe.exec(html)) && results.length < max) {
    let href = m[1];
    // DDG redirect wrapper
    const uddg = href.match(/uddg=([^&]+)/);
    if (uddg) {
      try {
        href = decodeURIComponent(uddg[1]);
      } catch (e) { /* keep raw */ }
    }
    if (!/^https?:\/\//i.test(href)) continue;
    // skip DDG ad-redirects and internal links
    if (/duckduckgo\.com\/y\.js|duckduckgo\.com\/l\/|duckduckgo\.com\//i.test(href)) continue;
    const title = stripTags(m[2]);
    if (!title) continue;
    results.push({ title, url: href, snippet: snippets[i] || null });
    i++;
  }
  if (!results.length) throw new Error('No results found — try different keywords.');
  return results;
}

module.exports = { discover };
