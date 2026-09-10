/* ============ StackCompare frontend ============ */
(function () {
  'use strict';

  // ---------- state ----------
  const state = {
    category: 'domains',
    items: [],
    result: null,
    templates: null,
    busy: false
  };

  const CATALOG = window.STACK_CATALOG || [];

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeImage(url) {
    if (url && /^https?:\/\//i.test(url)) return url;
    return null;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 2600);
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function toNumber(value, unit) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    const s = String(value).replace(/,/g, '');
    if (unit) {
      const unitAlts = {
        hrs: 'hours?|hrs?',
        kg: 'kgs?|kilograms?',
        g: 'g(?!b)',
        GB: 'gb',
        '₹/mo': '₹\\s*/\\s*mo',
        '₹/yr': '₹\\s*/\\s*yr',
        inch: 'inch(es)?',
        mAh: 'mah',
        days: 'days?',
        '%': '%'
      };
      const u = unitAlts[unit] || unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?';
      const re = new RegExp(`(?<![a-z])(\\d+(?:\\.\\d+)?)\\s*(?:${u})(?![a-z])`, 'i');
      const m = s.match(re);
      if (m) return parseFloat(m[1]);
    }
    const gen = s.match(/(\d+(?:\.\d+)?)\s*(w|mah|ah|gb|mb|tb|hz|mhz|ghz|mp|kg|g|inch|hrs|hours|days|fps|mm|cm|min)(?![a-z])/i);
    if (gen) return parseFloat(gen[1]);
    const first = s.match(/-?\d+(\.\d+)?/);
    if (!first) return null;
    const n = parseFloat(first[0]);
    return isNaN(n) ? null : n;
  }

  const RATES = { INR: 1, USD: 86.5, EUR: 96.5, GBP: 114, JPY: 0.58 };

  function toBaseCurrency(priceValue, currency, unit) {
    const n = toNumber(priceValue, unit);
    if (n === null) return null;
    const code = String(currency || 'INR').toUpperCase();
    return n * (RATES[code] || 1);
  }

  function normalizeBool(value) {
    if (typeof value === 'boolean') return value;
    const s = String(value).toLowerCase().trim();
    if (['yes', 'y', 'true', '1', 'available', 'supported', 'included', '✓', '✔'].includes(s)) return true;
    if (['no', 'n', 'false', '0', 'not available', 'not supported', 'not included', '✗', '✘'].includes(s)) return false;
    return null;
  }

  function formatNumber(n, unit) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const num = Number(n);
    const PREFIX = ['₹', '₹/mo', '₹/yr', '₹/hr', '₹/user/mo'];
    if (PREFIX.includes(unit) || ['$', '€', '£', '¥', '×', '%', '/5'].includes(unit)) {
      let prefix = PREFIX.includes(unit) ? '₹' : unit === '×' ? '' : '';
      let suffix = '';
      if (unit === '₹/mo') suffix = '/mo';
      else if (unit === '₹/yr') suffix = '/yr';
      else if (unit === '₹/hr') suffix = '/hr';
      else if (unit === '₹/user/mo') suffix = '/user/mo';
      else if (unit === '×') suffix = '×';
      else if (unit === '%') suffix = '%';
      else if (unit === '/5') suffix = ' / 5';
      return prefix + num.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + suffix;
    }
    return num.toLocaleString('en-IN') + (unit ? ' ' + unit : '');
  }

  function fmtFieldValue(field, value) {
    if (value === null || value === undefined || value === '') return '';
    if (field.type === 'number') return formatNumber(toNumber(value, field.unit), field.unit);
    if (field.type === 'boolean') return value === true ? 'Yes' : value === false ? 'No' : String(value);
    if (field.type === 'list') {
      const arr = Array.isArray(value) ? value : String(value).split(';').filter(Boolean);
      return arr.join(' • ');
    }
    return String(value);
  }

  const tpl = () => state.templates[state.category] || state.templates.generic;
  const tplField = (key) => tpl().fields.find((f) => f.key === key) || null;
  const tplComputed = (key) => (tpl().computed || []).find((f) => f.key === key) || null;

  // ---------- init ----------
  async function init() {
    try {
      const data = await (await fetch('/api/templates')).json();
      state.templates = data.templates;
    } catch (e) {
      toast('Could not load templates — reload the page.');
      return;
    }
    renderChips();
    renderCatalog();
    bindEvents();
    restoreFromHash();
  }

  // ---------- category chips ----------
  function renderChips() {
    const wrap = $('#categoryChips');
    wrap.innerHTML = '';
    const order = ['domains', 'hosting', 'vps', 'builders', 'wp_hosting', 'email', 'gpu', 'generic'];
    for (const key of order) {
      const t = state.templates[key];
      if (!t) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (key === state.category ? ' active' : '');
      btn.dataset.key = key;
      btn.innerHTML = `<span>${t.icon} ${escapeHtml(t.label)}</span><span class="chip-hint">${escapeHtml(t.hint)}</span>`;
      btn.addEventListener('click', () => {
        state.category = key;
        renderChips();
        renderCatalog();
        renderItems();
      });
      wrap.appendChild(btn);
    }
  }

  // ---------- catalog ----------
  function renderCatalog() {
    const wrap = $('#catalogList');
    wrap.innerHTML = '';
    const cat = CATALOG.filter((c) => c.cat === state.category);
    for (const entry of cat) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.catName = entry.name;
      const added = state.items.some((i) => i.catalogName === entry.name);
      btn.className = 'catalog-btn' + (added ? ' added' : '');
      const priceField = tplField('price');
      const priceStr = priceField && entry.specs.price !== null && entry.specs.price !== undefined
        ? formatNumber(toNumber(entry.specs.price, priceField.unit), priceField.unit)
        : '';
      btn.innerHTML = `<span>${added ? '✓ ' : '+ '}${escapeHtml(entry.name)}</span><span class="cb-price">${escapeHtml(priceStr)}</span>`;
      btn.addEventListener('click', () => {
        if (added) return;
        state.items.push({
          id: 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          catalogName: entry.name,
          name: entry.name,
          image: null,
          url: entry.url || null,
          source: 'catalog',
          description: null,
          currency: 'INR',
          specs: { ...entry.specs },
          manual: false,
          specCount: Object.keys(entry.specs).length
        });
        renderCatalog();
        renderItems();
      });
      wrap.appendChild(btn);
    }
  }

  // ---------- items ----------
  function uid() {
    return 'it_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function normalizeScrapedSpecs(specs) {
    const map = {};
    for (const spec of specs || []) {
      if (!spec.key) continue;
      const field = tplField(spec.key);
      let value = spec.value;
      if (field) {
        if (field.type === 'number') {
          const n = toNumber(value, field.unit);
          if (n !== null) value = n;
        } else if (field.type === 'boolean') {
          const b = normalizeBool(value);
          if (b !== null) value = b;
        }
      }
      if (map[spec.key] === undefined) map[spec.key] = value;
    }
    for (const spec of specs || []) {
      if (spec.key) continue;
      const extraKey = 'extra:' + spec.name;
      if (map[extraKey] === undefined) map[extraKey] = spec.value;
    }
    return map;
  }

  async function addItemByUrl(url, fallbackTitle) {
    if (state.busy) return;
    state.busy = true;
    const status = $('#addStatus');
    const spinner = $('#addUrlBtn .spinner');
    const label = $('#addUrlBtn .btn-label');
    spinner.hidden = false;
    label.textContent = 'Scraping…';
    status.hidden = false;
    status.textContent = `Fetching ${url} … (pricing pages often block bots)`;
    status.className = 'status-line';
    try {
      const data = await api('/api/scrape', { url, template: state.category });
      const specs = normalizeScrapedSpecs(data.specs);
      if (data.price && !specs.price) specs.price = data.price.value;
      const item = {
        id: uid(),
        name: data.title || fallbackTitle || 'Untitled tool',
        image: safeImage(data.image),
        url: data.url || url,
        source: data.source || 'web',
        description: data.description || null,
        currency: data.price ? data.price.currency : null,
        specs,
        manual: false,
        specCount: (data.specs || []).length
      };
      state.items.push(item);
      status.textContent = `✓ Added “${item.name}” (${item.specCount} specs extracted) — double-check prices, scrapers can misread them`;
      status.className = 'status-line success';
      $('#urlInput').value = '';
      renderItems();
      renderCatalog();
    } catch (e) {
      status.textContent = '✗ ' + e.message + ' — try the catalog or manual entry instead.';
      status.className = 'status-line error';
    } finally {
      spinner.hidden = true;
      label.textContent = 'Scrape & add';
      state.busy = false;
    }
  }

  function addManualItem(data) {
    const specs = { ...data.specs };
    state.items.push({
      id: data.id || uid(),
      name: data.name,
      image: safeImage(data.image),
      url: data.url || null,
      source: data.source || 'manual',
      description: null,
      currency: data.currency || null,
      specs,
      manual: true,
      specCount: Object.keys(specs).length
    });
    renderItems();
    renderCatalog();
  }

  function renderItems() {
    const wrap = $('#itemsList');
    const count = $('#compareCount');
    const compareBtn = $('#compareBtn');
    wrap.innerHTML = '';
    count.textContent = state.items.length ? `· ${state.items.length}` : '';
    compareBtn.disabled = state.items.length < 2;

    if (!state.items.length) {
      wrap.innerHTML = `<div class="empty-hint">No tools added yet. Quick-add from the catalog above, paste a pricing-page URL, or add manually.</div>`;
      return;
    }

    for (const item of state.items) {
      const card = document.createElement('div');
      card.className = 'item-card';
      const icon = tpl().icon;
      const priceField = tplField('price');
      const priceVal = item.specs.price ?? null;
      const priceStr = priceField && priceVal !== null && priceVal !== undefined
        ? formatNumber(toNumber(priceVal, priceField.unit), priceField.unit)
        : '';
      const markup = renewalMarkup(item);
      const imgHtml = `<div class="thumb-placeholder">${icon}</div>`;
      card.innerHTML = `
        <div class="item-thumb">${imgHtml}</div>
        <div class="item-body">
          <p class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
          <p class="item-meta">
            <span class="badge ${item.manual ? 'manual' : ''}">${item.manual ? 'Manual' : item.source === 'catalog' ? 'Catalog' : 'Scraped'}</span>
            ${item.source && item.source !== 'catalog' && item.source !== 'manual' ? `<span>${escapeHtml(item.source)}</span>` : ''}
          </p>
          ${priceStr ? `<p class="item-price">${escapeHtml(priceStr)}</p>` : ''}
          ${markup && markup >= 1.5 ? `<span class="trap-badge">⚠ renewal ${markup.toFixed(1)}×</span>` : ''}
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary edit-item">Edit</button>
          <button class="btn btn-ghost remove-item">Remove</button>
        </div>`;
      card.querySelector('.remove-item').addEventListener('click', () => {
        state.items = state.items.filter((i) => i.id !== item.id);
        renderItems();
        renderCatalog();
      });
      card.querySelector('.edit-item').addEventListener('click', () => openManual(item));
      wrap.appendChild(card);
    }
  }

  function renewalMarkup(item) {
    const price = toNumber(item.specs.price, tplField('price') && tplField('price').unit);
    const renewal = toNumber(item.specs.renewal);
    if (price && renewal && price > 0) return renewal / price;
    return null;
  }

  // ---------- manual modal ----------
  function openManual(existing) {
    const modal = $('#manualModal');
    const fieldsWrap = $('#manualFields');
    fieldsWrap.innerHTML = '';

    document.querySelectorAll('.custom-field-row:not(#customSpecRow)').forEach((r) => r.remove());

    $('#manualName').value = existing ? existing.name : '';
    $('#manualImage').value = existing && existing.image ? existing.image : '';
    modal.dataset.editId = existing ? existing.id : '';

    for (const f of tpl().fields) {
      const wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = `<span class="field-label">${escapeHtml(f.label)}${f.unit && f.type === 'number' ? ` <span class="optional">(${escapeHtml(f.unit)})</span>` : ''}</span>
        <input type="text" data-field-key="${escapeHtml(f.key)}" placeholder="${f.type === 'boolean' ? 'yes / no' : ''}" />`;
      const input = wrap.querySelector('input');
      if (existing && existing.specs[f.key] !== undefined && existing.specs[f.key] !== null) {
        input.value = existing.specs[f.key];
      }
      fieldsWrap.appendChild(wrap);
    }

    if (existing) {
      for (const [key, val] of Object.entries(existing.specs)) {
        if (key.startsWith('extra:')) addCustomRow(key.slice(6), val);
      }
    }

    modal.hidden = false;
    $('#manualName').focus();
  }

  function closeManual() {
    $('#manualModal').hidden = true;
  }

  function addCustomRow(name, value) {
    const row = document.createElement('div');
    row.className = 'custom-field-row';
    row.innerHTML = `
      <label class="field"><span class="field-label">Custom spec</span>
        <input type="text" class="custom-name" placeholder="Spec name" value="${escapeHtml(name || '')}" /></label>
      <label class="field"><span class="field-label">&nbsp;</span>
        <input type="text" class="custom-value" placeholder="Value" value="${escapeHtml(value || '')}" /></label>
      <button type="button" class="btn btn-ghost remove-custom" title="Remove">✕</button>`;
    row.querySelector('.remove-custom').addEventListener('click', () => row.remove());
    const insertBefore = $('#customSpecRow');
    insertBefore.parentNode.insertBefore(row, insertBefore);
  }

  function submitManual(e) {
    e.preventDefault();
    const name = $('#manualName').value.trim();
    if (!name) return;
    const specs = {};
    for (const input of document.querySelectorAll('#manualFields input')) {
      const key = input.dataset.fieldKey;
      const raw = input.value.trim();
      if (!raw) continue;
      const field = tplField(key);
      if (field && field.type === 'number') {
        const n = toNumber(raw, field.unit);
        specs[key] = n !== null ? n : raw;
      } else if (field && field.type === 'boolean') {
        const b = normalizeBool(raw);
        specs[key] = b !== null ? b : raw;
      } else if (field && field.type === 'list') {
        specs[key] = raw.split(';').map((s) => s.trim()).filter(Boolean);
      } else {
        specs[key] = raw;
      }
    }
    for (const row of document.querySelectorAll('.custom-field-row')) {
      const n = row.querySelector('.custom-name').value.trim();
      const v = row.querySelector('.custom-value').value.trim();
      if (n && v) specs['extra:' + n.toLowerCase()] = v;
    }

    const editId = $('#manualModal').dataset.editId;
    if (editId) {
      const idx = state.items.findIndex((i) => i.id === editId);
      if (idx >= 0) {
        state.items[idx].name = name;
        state.items[idx].image = safeImage($('#manualImage').value.trim()) || state.items[idx].image;
        state.items[idx].specs = specs;
        state.items[idx].specCount = Object.keys(specs).length;
      }
    } else {
      addManualItem({ name, image: $('#manualImage').value.trim(), specs });
    }
    closeManual();
  }

  // ---------- sample data ----------
  function loadSample() {
    state.category = 'hosting';
    renderChips();
    renderCatalog();
    const sampleNames = ['Hostinger Premium', 'Bluehost Basic', 'SiteGround StartUp', 'ChemiCloud Starter', 'InterServer Standard', 'GoDaddy Economy'];
    state.items = CATALOG
      .filter((c) => c.cat === 'hosting' && sampleNames.includes(c.name))
      .map((entry) => ({
        id: 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        catalogName: entry.name,
        name: entry.name,
        image: null,
        url: entry.url || null,
        source: 'catalog',
        description: null,
        currency: 'INR',
        specs: { ...entry.specs },
        manual: false,
        specCount: Object.keys(entry.specs).length
      }));
    renderCatalog();
    renderItems();
    toast('Sample loaded — 6 shared hosts, hit “Compare”!');
    $('#builder').scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- compare ----------
  async function runCompare() {
    if (state.items.length < 2) return;
    const btn = $('#compareBtn');
    btn.disabled = true;
    btn.textContent = 'Comparing…';
    try {
      const result = await api('/api/compare', { items: state.items, template: state.category });
      state.result = result;
      renderResults(result);
      $('#results').hidden = false;
      $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      toast('✗ ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Compare <span id="compareCount">· ${state.items.length}</span>`;
      btn.disabled = state.items.length < 2;
    }
  }

  function renderResults(result) {
    // ----- winner card -----
    const winnerCard = $('#winnerCard');
    const winnerNames = result.winners.map((i) => result.items[i].name);
    if (!result.winners.length) {
      winnerCard.hidden = true;
    } else {
      winnerCard.hidden = false;
      const isTie = result.winners.length > 1;
      const bestScore = result.maxScore;
      const detail = isTie
        ? `It's a tie — each wins ${bestScore.toFixed(1)} of ${result.fields.filter((f) => f.best && f.different).length} scored specs.`
        : `Best in ${bestScore.toFixed(1)} of ${result.fields.filter((f) => f.best && f.different).length} scored specs (incl. true-cost metrics).`;
      winnerCard.innerHTML = `
        <div class="winner-emoji">${isTie ? '🤝' : '🏆'}</div>
        <div class="winner-text">
          <h2>${isTie ? 'Too close to call!' : 'Overall winner'}</h2>
          <p>${detail}</p>
        </div>
        <div class="winner-items">
          ${winnerNames.map((n) => `<span class="winner-pill ${isTie ? 'tie-pill' : ''}">${escapeHtml(n)}</span>`).join('')}
        </div>`;
    }

    // ----- table -----
    const table = $('#compareTable');
    const items = result.items;

    let html = '<thead><tr><th class="field-head">Spec</th>';
    for (let i = 0; i < items.length; i++) {
      html += `<th>${cellHeadHtml(items[i], result, i)}</th>`;
    }
    html += '</tr></thead><tbody>';

    // score row
    html += '<tr><th>Overall score</th>';
    for (let i = 0; i < items.length; i++) {
      const s = result.scores[i];
      const pct = result.maxScore > 0 ? Math.round((s / result.maxScore) * 100) : 0;
      const isWinner = result.winners.includes(i);
      html += `<td><div class="cell-value"><div class="score-bar"><div class="score-fill" style="width:${pct}%"></div></div>
        <div class="score-label">${s.toFixed(1)} wins · ${pct}%</div>
        ${isWinner ? '<span class="rank-badge winner" style="margin-top:6px">★ Winner</span>' : ''}
      </div></td>`;
    }
    html += '</tr>';

    // field rows
    for (const row of result.fields) {
      const f = row.field;
      const label = f.label || (f.key.startsWith('extra:') ? titleCase(f.key.slice(6)) : titleCase(f.key));
      const computed = !!row.computed;
      html += `<tr><th>${escapeHtml(label)}
        ${computed ? '<span class="computed-label">(computed)</span>' : ''}
        ${f.unit && f.type === 'number' ? ` <span style="color:#9ca3af;font-weight:400">(${escapeHtml(f.unit)})</span>` : ''}</th>`;
      for (let i = 0; i < row.cells.length; i++) {
        const v = row.cells[i];
        const isBest = row.best && row.best.includes(i);
        const empty = v === null || v === undefined || v === '';
        let cls = 'cell-value';
        if (isBest) cls += ' best';
        if (!row.different) cls += ' same';
        let content;
        if (empty) {
          content = '<span class="cell-empty">—</span>';
        } else if (f.type === 'number') {
          content = '<strong>' + escapeHtml(formatNumber(toNumber(v, f.unit), f.unit)) + '</strong>';
          if (f.key === 'price' && f.unit && f.unit.includes('₹') && result.items[i].currency && result.items[i].currency !== 'INR') {
            const base = toBaseCurrency(v, result.items[i].currency, f.unit);
            if (base !== null) {
              content += `<span class="best-note" style="color:#9ca3af">≈ ₹${Math.round(base).toLocaleString('en-IN')}</span>`;
            }
          }
          // renewal trap note
          if (f.key === 'renewal' && result.items[i].currency === 'INR') {
            const markup = renewalMarkup(state.items.find((si) => si.name === result.items[i].name) || { specs: {} });
            if (markup && markup >= 1.5) {
              content += `<span class="trap-badge" style="margin-left:6px">⚠ ${markup.toFixed(1)}× intro</span>`;
            }
          }
        } else if (f.type === 'boolean') {
          content = v === true ? '<strong style="color:#059669">Yes ✓</strong>' : v === false ? 'No' : escapeHtml(String(v));
        } else if (f.type === 'list') {
          const arr = Array.isArray(v) ? v : String(v).split(';').filter(Boolean);
          content = escapeHtml(arr.join(' • '));
        } else {
          content = escapeHtml(String(v));
        }
        html += `<td><div class="${cls}">${content}${f.type === 'text' && isBest ? '<span class="best-note">✓ best pick</span>' : ''}</div></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
    table.innerHTML = html;
  }

  function cellHeadHtml(item, result, i) {
    const icon = tpl().icon;
    const isWinner = result.winners.includes(i);
    return `<div class="cell-head">
      <div class="cell-head-top"><div class="thumb-placeholder">${icon}</div><div>
        <div class="cell-title">${escapeHtml(item.name)}</div>
        <div class="cell-source">${item.source ? escapeHtml(item.source) : '—'}${item.url ? ' · <a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" style="color:#0f766e">pricing page ↗</a>' : ''}</div>
      </div></div>
      ${isWinner ? '<span class="rank-badge winner">★ Winner</span>' : ''}
    </div>`;
  }

  function titleCase(s) {
    return String(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }

  // ---------- export / share ----------
  function exportCsv() {
    if (!state.result) return;
    const r = state.result;
    const rows = [];
    const header = ['Spec', ...r.items.map((i) => i.name)];
    rows.push(header);
    rows.push(['Source', ...r.items.map((i) => i.source || '')]);
    rows.push(['Link', ...r.items.map((i) => i.url || '')]);
    for (const row of r.fields) {
      const f = row.field;
      const label = f.label || (f.key.startsWith('extra:') ? titleCase(f.key.slice(6)) : titleCase(f.key));
      rows.push([label, ...row.cells.map((v) => {
        if (v === null || v === undefined || v === '') return '';
        if (f.type === 'number') return toNumber(v, f.unit);
        if (f.type === 'boolean') return v ? 'Yes' : 'No';
        return String(v);
      })]);
    }
    rows.push(['Overall score', ...r.scores.map((s) => s.toFixed(1))]);
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stackcompare.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function shareLink() {
    const payload = { category: state.category, items: state.items };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const url = location.origin + location.pathname + '#s=' + b64;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast('🔗 Share link copied to clipboard!'),
        () => fallbackCopy(url)
      );
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('🔗 Share link copied to clipboard!');
    } catch (e) {
      toast('Link: ' + text);
    }
    ta.remove();
  }

  function restoreFromHash() {
    const m = location.hash.match(/^#s=(.+)$/);
    if (!m) return;
    try {
      const json = decodeURIComponent(escape(atob(m[1])));
      const data = JSON.parse(json);
      if (data.items && Array.isArray(data.items) && data.items.length >= 2) {
        state.category = data.category && state.templates[data.category] ? data.category : 'domains';
        state.items = data.items.map((it) => ({ ...it, id: it.id || uid() }));
        renderChips();
        renderCatalog();
        renderItems();
        runCompare();
        history.replaceState(null, '', location.pathname);
      }
    } catch (e) { /* ignore bad hash */ }
  }

  // ---------- wizard ----------
  const WIZARD_STEPS = [
    {
      id: 'purpose',
      question: 'What are you building?',
      options: [
        { value: 'business', icon: '💼', label: 'Business / client website', sub: 'A site that represents a business or client work' },
        { value: 'blog', icon: '📝', label: 'Personal blog or portfolio', sub: 'Your own corner of the web' },
        { value: 'store', icon: '🛒', label: 'Online store', sub: 'Selling products or services' },
        { value: 'ai', icon: '🤖', label: 'AI / dev project', sub: 'App, API, ML training, or experiments' }
      ]
    },
    {
      id: 'budget',
      question: 'What is your monthly budget (₹)?',
      options: [
        { value: 'low', icon: '🪙', label: 'Under ₹300 / month', sub: 'Keep it lean' },
        { value: 'mid', icon: '💵', label: '₹300 – ₹1,000 / month', sub: 'Comfortable middle ground' },
        { value: 'high', icon: '💰', label: '₹1,000+ / month', sub: 'Performance and support matter more' }
      ]
    },
    {
      id: 'traffic',
      question: 'How much traffic do you expect?',
      options: [
        { value: 'small', icon: '🌱', label: 'Just starting', sub: 'Low traffic — a few hundred visits a month' },
        { value: 'growing', icon: '📈', label: 'Growing', sub: 'Thousands of visits per month' },
        { value: 'high', icon: '🚀', label: 'High traffic', sub: '10,000+ visits per month or heavy workloads' }
      ]
    },
    {
      id: 'skill',
      question: 'How comfortable are you with servers & tech?',
      options: [
        { value: 'beginner', icon: '🧘', label: 'Beginner', sub: 'I want it to just work — managed everything' },
        { value: 'comfortable', icon: '🔧', label: 'Comfortable', sub: 'I can follow tutorials and tweak configs' },
        { value: 'expert', icon: '🧑‍💻', label: 'Expert', sub: 'SSH, Docker, CLI — bring it on' }
      ]
    }
  ];

  const PURPOSE_CATS = {
    business: ['hosting', 'domains', 'wp_hosting'],
    blog: ['builders', 'hosting'],
    store: ['builders', 'hosting', 'wp_hosting'],
    ai: ['vps', 'gpu']
  };

  function openWizard() {
    state.wizard = { step: 0, answers: {} };
    $('#wizardModal').hidden = false;
    $('#wizResult').hidden = true;
    renderWizardStep();
  }

  function closeWizard() {
    $('#wizardModal').hidden = true;
  }

  function renderWizardStep() {
    const w = state.wizard;
    const step = WIZARD_STEPS[w.step];
    $('#wizQuestion').hidden = false;
    $('#wizOptions').hidden = false;
    $('#wizResult').hidden = true;
    $('#wizStepLabel').textContent = `Step ${w.step + 1} of ${WIZARD_STEPS.length}`;
    $('#wizFill').style.width = `${((w.step + 1) / WIZARD_STEPS.length) * 100}%`;
    $('#wizQuestion').textContent = step.question;
    $('#wizBackBtn').hidden = w.step === 0;
    const wrap = $('#wizOptions');
    wrap.innerHTML = '';
    for (const opt of step.options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wiz-opt';
      btn.innerHTML = `<span class="opt-icon">${opt.icon}</span><span><span class="opt-label">${escapeHtml(opt.label)}</span><br/><span class="opt-sub">${escapeHtml(opt.sub)}</span></span>`;
      btn.addEventListener('click', () => {
        w.answers[step.id] = opt.value;
        if (w.step < WIZARD_STEPS.length - 1) {
          w.step++;
          renderWizardStep();
        } else {
          renderWizardResult();
        }
      });
      wrap.appendChild(btn);
    }
  }

  function wizardBack() {
    if (state.wizard.step > 0) {
      state.wizard.step--;
      renderWizardStep();
    }
  }

  function scoreEntry(entry, a) {
    const price = toNumber(entry.specs.price);
    let s = 0;
    const reasons = [];
    if (PURPOSE_CATS[a.purpose] && PURPOSE_CATS[a.purpose].includes(entry.cat)) {
      s += 3;
      reasons.push('fits what you are building');
    } else {
      s -= 1;
    }
    if (price !== null && price !== undefined) {
      const max = { low: 300, mid: 1000, high: Infinity }[a.budget];
      if (price <= max) {
        s += 3;
        reasons.push('within budget');
      } else if (price <= max * 1.5) {
        s += 1;
        reasons.push('a bit over budget');
      } else {
        s -= 2;
      }
    }
    if (a.traffic === 'high') {
      if (entry.cat === 'wp_hosting') { s += 2; reasons.push('handles high traffic'); }
      else if (entry.cat === 'hosting' && price !== null && price < 250) { s -= 2; }
      else if (entry.cat === 'vps') { s += 1; }
    }
    if (a.skill === 'beginner') {
      if (['vps', 'gpu'].includes(entry.cat)) s -= 3;
      else if (['hosting', 'builders'].includes(entry.cat)) { s += 1; reasons.push('easy to use'); }
    }
    if (a.skill === 'expert' && ['vps', 'gpu'].includes(entry.cat)) {
      s += 2;
      reasons.push('full control');
    }
    return { score: s, reasons };
  }

  function renderWizardResult() {
    const a = state.wizard.answers;
    $('#wizQuestion').hidden = true;
    $('#wizOptions').hidden = true;
    $('#wizBackBtn').hidden = false;

    const scored = CATALOG
      .map((entry) => ({ entry, ...scoreEntry(entry, a) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);
    const picks = scored.filter((r) => r.score > 0);

    const wrap = $('#wizResult');
    wrap.hidden = false;

    const catLabel = (cat) => (state.templates[cat] ? state.templates[cat].label : cat);
    const priceStr = (entry) => {
      const tplPrice = (state.templates[entry.cat] && state.templates[entry.cat].fields.find((f) => f.key === 'price')) || null;
      const unit = tplPrice ? tplPrice.unit : undefined;
      return entry.specs.price !== null && entry.specs.price !== undefined
        ? formatNumber(toNumber(entry.specs.price, unit), unit)
        : '—';
    };

    let html = `<h4>Based on your answers, these fit best:</h4>`;
    for (const r of picks) {
      html += `<div class="wiz-pick reco">
        <span class="pick-icon">${(state.templates[r.entry.cat] || {}).icon || '⚖️'}</span>
        <div class="pick-info">
          <div class="pick-name">${escapeHtml(r.entry.name)} <span class="badge" style="margin-left:4px">${escapeHtml(catLabel(r.entry.cat))}</span></div>
          <div class="pick-why">${r.reasons.slice(0, 2).map(escapeHtml).join(' · ') || 'solid all-rounder'}</div>
        </div>
        <span class="pick-price">${escapeHtml(priceStr(r.entry))}</span>
      </div>`;
    }
    if (!picks.length) {
      html += `<p style="color:var(--text-2);font-size:14px">No catalog match — try browsing categories directly, or add tools manually.</p>`;
    }
    html += `<div class="wiz-result-actions">
      <button class="btn btn-primary" id="wizCompareBtn">Compare these picks</button>
      <button class="btn btn-ghost" id="wizRestartBtn">Start over</button>
    </div>`;
    wrap.innerHTML = html;

    $('#wizRestartBtn').addEventListener('click', () => {
      state.wizard = { step: 0, answers: {} };
      $('#wizQuestion').hidden = false;
      $('#wizOptions').hidden = false;
      wrap.hidden = true;
      renderWizardStep();
    });
    $('#wizCompareBtn').addEventListener('click', () => {
      if (!picks.length) { closeWizard(); return; }
      // use the category of the top pick
      const top = picks[0].entry.cat;
      state.category = top;
      state.items = picks.map((r) => ({
        id: 'wiz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        catalogName: r.entry.name,
        name: r.entry.name,
        image: null,
        url: r.entry.url || null,
        source: 'catalog',
        description: null,
        currency: 'INR',
        specs: { ...r.entry.specs },
        manual: false,
        specCount: Object.keys(r.entry.specs).length
      }));
      closeWizard();
      renderChips();
      renderCatalog();
      renderItems();
      runCompare();
    });
  }

  // ---------- events ----------
  function bindEvents() {
    $('#urlForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const url = $('#urlInput').value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        const s = $('#addStatus');
        s.hidden = false;
        s.textContent = '✗ Please enter a full URL starting with http:// or https://';
        s.className = 'status-line error';
        return;
      }
      addItemByUrl(url);
    });
    $('#manualBtn').addEventListener('click', () => openManual(null));
    $('#manualForm').addEventListener('submit', submitManual);
    $('#modalCloseBtn').addEventListener('click', closeManual);
    $('#modalCancelBtn').addEventListener('click', closeManual);
    $('#manualModal').addEventListener('click', (e) => {
      if (e.target === $('#manualModal')) closeManual();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#manualModal').hidden) closeManual();
    });
    $('#addCustomSpecBtn').addEventListener('click', () => addCustomRow('', ''));
    $('#compareBtn').addEventListener('click', runCompare);
    $('#clearBtn').addEventListener('click', () => {
      state.items = [];
      state.result = null;
      $('#results').hidden = true;
      renderItems();
      renderCatalog();
    });
    $('#sampleBtn').addEventListener('click', loadSample);
    $('#wizardBtn').addEventListener('click', openWizard);
    $('#wizardCloseBtn').addEventListener('click', closeWizard);
    $('#wizBackBtn').addEventListener('click', wizardBack);
    $('#wizardModal').addEventListener('click', (e) => {
      if (e.target === $('#wizardModal')) closeWizard();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#wizardModal').hidden) closeWizard();
    });
    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#shareBtn').addEventListener('click', shareLink);
    $('#editBtn').addEventListener('click', () => {
      $('#builder').scrollIntoView({ behavior: 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
