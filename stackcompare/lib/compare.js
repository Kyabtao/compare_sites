// Comparison engine: builds the comparison matrix and computes winners.
// Supports "computed" template fields (derived true-cost metrics).
const { getTemplate } = require('./templates');

// Extract a numeric value from spec text. Prefers numbers followed by the
// field's unit (e.g. "25W" in "Wired, PD3.2, 25W wireless"), falls back to the
// first number found.
function toNumber(value, unit) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const s = String(value).replace(/,/g, '');
  if (unit) {
    const unitAlts = {
      hrs: 'hours?|hrs?',
      kg: 'kgs?|kilograms?',
      g: 'g(?!b)', // exclude gb
      GB: 'gb',
      '₹/mo': '₹/mo',
      '₹/yr': '₹/yr',
      inch: 'inch(es)?',
      mAh: 'mah',
      days: 'days?',
      '%': '%'
    };
    const u = unitAlts[unit] || escapeRegExp(unit) + 's?';
    const re = new RegExp(`(?<![a-z])(\\d+(?:\\.\\d+)?)\\s*(?:${u})(?![a-z])`, 'i');
    const m = s.match(re);
    if (m) return parseFloat(m[1]);
  }
  // general unit-suffixed numbers
  const gen = s.match(/(\d+(?:\.\d+)?)\s*(w|mah|ah|gb|mb|tb|hz|mhz|ghz|mp|kg|g|inch|hrs|hours|days|fps|mm|cm|min)(?![a-z])/i);
  if (gen) return parseFloat(gen[1]);
  const first = s.match(/-?\d+(\.\d+)?/);
  if (!first) return null;
  const n = parseFloat(first[0]);
  return isNaN(n) ? null : n;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBool(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  if (['yes', 'y', 'true', '1', 'available', 'supported', 'included', '✓', '✔'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'not available', 'not supported', 'not included', '✗', '✘'].includes(s)) return false;
  return null;
}

// Approximate exchange rates (Sep 2026), used ONLY to score prices across
// currencies. Displayed prices always keep their original currency.
const RATES = { INR: 1, USD: 86.5, EUR: 96.5, GBP: 114, JPY: 0.58 };

function toBaseCurrency(priceValue, currency, unit) {
  const n = toNumber(priceValue, unit);
  if (n === null) return null;
  const code = String(currency || 'INR').toUpperCase();
  return n * (RATES[code] || 1);
}

/**
 * Build comparison result for a set of items + template.
 * items: [{ id, name, image, url, source, currency, specs: {key: value|string} }]
 */
function buildComparison(items, templateKey) {
  const tpl = getTemplate(templateKey);
  const fields = [...tpl.fields];
  const computedFields = tpl.computed || [];

  // gather custom fields (from manual entry / scraping) not in template
  const customKeys = new Set();
  for (const item of items) {
    for (const [key, value] of Object.entries(item.specs || {})) {
      if (key.startsWith('extra:')) continue;
      if (!fields.some((f) => f.key === key) && value !== null && value !== undefined && value !== '') {
        customKeys.add(key);
      }
    }
    for (const key of Object.keys(item.specs || {})) {
      if (key.startsWith('extra:')) customKeys.add(key);
    }
  }

  // per-field best computation
  const matrix = [];
  for (const f of fields) {
    const cells = items.map((it) => (it.specs && it.specs[f.key] !== undefined ? it.specs[f.key] : null));
    matrix.push({ field: f, cells, best: findBest(cells, f, items), different: cellsDiffer(cells) });
  }
  const customFields = [...customKeys].map((key) => ({
    key,
    label: key.startsWith('extra:') ? titleCase(key.slice(6)) : titleCase(key),
    type: 'text'
  }));
  for (const f of customFields) {
    const cells = items.map((it) => (it.specs && it.specs[f.key] !== undefined ? it.specs[f.key] : null));
    matrix.push({ field: f, cells, best: null, different: cellsDiffer(cells) });
  }

  // computed (derived) fields — true-cost metrics
  for (const cf of computedFields) {
    const field = { key: cf.key, label: cf.label, type: 'number', better: cf.better, unit: cf.unit };
    let cells;
    try {
      cells = items.map((it) => {
        const v = cf.formula(it.specs || {});
        return v === undefined ? null : v;
      });
    } catch (e) {
      cells = items.map(() => null);
    }
    matrix.push({ field, cells, best: findBest(cells, field, items), different: cellsDiffer(cells), computed: true });
  }

  // scoring: 1 point per field where item is (or ties for) best; share on ties
  const scores = items.map(() => 0);
  matrix.forEach((row) => {
    const best = row.best;
    if (!best || !row.different) return;
    best.forEach((idx) => {
      scores[idx] += 1 / best.length;
    });
  });
  const maxScore = Math.max(...scores, 0);
  const winners = scores.map((s, i) => (s === maxScore && maxScore > 0 ? i : -1)).filter((i) => i >= 0);

  return {
    templateKey,
    templateLabel: tpl.label,
    fields: matrix,
    scores,
    maxScore,
    winners,
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      image: it.image,
      url: it.url,
      source: it.source,
      description: it.description,
      currency: it.currency || null
    }))
  };
}

function findBest(cells, field, items) {
  const type = field.type || 'text';
  const better = field.better || 'higher';
  if (type === 'number') {
    let nums;
    if (field.key === 'price' && items) {
      // convert prices to INR so cross-currency comparisons are fair
      nums = cells.map((c, i) => toBaseCurrency(c, items[i].currency, field.unit));
    } else {
      nums = cells.map((c) => toNumber(c, field.unit));
    }
    if (nums.every((n) => n === null)) return null;
    const valid = nums.filter((n) => n !== null);
    const bestVal = better === 'lower' ? Math.min(...valid) : Math.max(...valid);
    return nums.map((n, i) => (n !== null && n === bestVal ? i : -1)).filter((i) => i >= 0);
  }
  if (type === 'boolean') {
    const bools = cells.map(normalizeBool);
    if (bools.every((b) => b === null)) return null;
    const want = better === 'yes' ? true : false;
    const hasWant = bools.some((b) => b === want);
    if (!hasWant) return null;
    return bools.map((b, i) => (b === want ? i : -1)).filter((i) => i >= 0);
  }
  if (type === 'list') {
    // more list items = better
    const counts = cells.map((c) => (Array.isArray(c) ? c.length : c ? String(c).split(';').filter(Boolean).length : 0));
    if (counts.every((c) => c === 0)) return null;
    const best = Math.max(...counts);
    return counts.map((c, i) => (c === best ? i : -1)).filter((i) => i >= 0);
  }
  return null; // text fields: no "best"
}

function cellsDiffer(cells) {
  const norm = cells.map((c) => (c === null || c === undefined || c === '' ? null : String(c).trim().toLowerCase()));
  const uniq = new Set(norm.filter((n) => n !== null));
  return uniq.size > 1;
}

function titleCase(s) {
  return String(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

module.exports = { buildComparison, toNumber, normalizeBool, RATES, toBaseCurrency };
