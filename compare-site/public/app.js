/* ============ Comparely frontend ============ */
(function () {
  'use strict';

  // ---------- state ----------
  const state = {
    category: 'generic',
    items: [],
    result: null,
    templates: null,
    busy: false
  };

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

  const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

  function formatNumber(n, unit) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const num = Number(n);
    if (unit === '₹' || unit === '$' || unit === '€' || unit === '£' || unit === '¥') {
      return unit + num.toLocaleString('en-IN');
    }
    if (unit === '%') return num + '%';
    if (unit === '/5') return num + ' / 5';
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
    bindEvents();
    restoreFromHash();
  }

  // ---------- category chips ----------
  function renderChips() {
    const wrap = $('#categoryChips');
    wrap.innerHTML = '';
    for (const [key, t] of Object.entries(state.templates)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (key === state.category ? ' active' : '');
      btn.dataset.key = key;
      btn.innerHTML = `<span>${t.icon} ${escapeHtml(t.label)}</span><span class="chip-hint">${escapeHtml(t.hint)}</span>`;
      btn.addEventListener('click', () => {
        state.category = key;
        renderChips();
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
    // attach raw (unmatched) specs as custom fields so nothing is lost
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
    status.textContent = `Fetching ${url} …`;
    status.className = 'status-line';
    try {
      const data = await api('/api/scrape', { url, template: state.category });
      const specs = normalizeScrapedSpecs(data.specs);
      if (data.price && !specs.price) specs.price = data.price.value;
      const item = {
        id: uid(),
        name: data.title || fallbackTitle || 'Untitled item',
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
      status.textContent = `✓ Added “${item.name}” (${item.specCount} specs extracted)`;
      status.className = 'status-line success';
      $('#urlInput').value = '';
      renderItems();
      hideDiscover();
    } catch (e) {
      status.textContent = '✗ ' + e.message;
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
  }

  function renderItems() {
    const wrap = $('#itemsList');
    const count = $('#compareCount');
    const compareBtn = $('#compareBtn');
    wrap.innerHTML = '';
    count.textContent = state.items.length ? `· ${state.items.length}` : '';
    compareBtn.disabled = state.items.length < 2;

    if (!state.items.length) {
      wrap.innerHTML = `<div class="empty-hint">No items yet. Paste a URL above, search the web, or add an item manually.</div>`;
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
      const imgHtml = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;thumb-placeholder&quot;>${icon}</div>'">`
        : `<div class="thumb-placeholder">${icon}</div>`;
      card.innerHTML = `
        <div class="item-thumb">${imgHtml}</div>
        <div class="item-body">
          <p class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
          <p class="item-meta">
            <span class="badge ${item.manual ? 'manual' : ''}">${item.manual ? 'Manual' : 'Scraped'}</span>
            ${item.source ? `<span>${escapeHtml(item.source)}</span>` : ''}
            ${item.specCount ? `<span>${item.specCount} specs</span>` : ''}
          </p>
          ${priceStr ? `<p class="item-price">${escapeHtml(priceStr)}</p>` : ''}
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary edit-item">Edit</button>
          <button class="btn btn-ghost remove-item">Remove</button>
        </div>`;
      card.querySelector('.remove-item').addEventListener('click', () => {
        state.items = state.items.filter((i) => i.id !== item.id);
        renderItems();
      });
      card.querySelector('.edit-item').addEventListener('click', () => openManual(item));
      wrap.appendChild(card);
    }
  }

  // ---------- manual modal ----------
  function openManual(existing) {
    const modal = $('#manualModal');
    const fieldsWrap = $('#manualFields');
    fieldsWrap.innerHTML = '';

    // remove leftover custom rows from a previous session
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

    // custom fields for edit mode
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
    // custom rows (skip the empty template row)
    for (const row of document.querySelectorAll('.custom-field-row')) {
      const n = row.querySelector('.custom-name').value.trim();
      const v = row.querySelector('.custom-value').value.trim();
      if (n && v) specs['extra:' + n.toLowerCase()] = v;
    }

    const priceField = tplField('price');
    const priceVal = specs.price !== undefined ? toNumber(specs.price, priceField && priceField.unit) : null;
    const editId = $('#manualModal').dataset.editId;

    if (editId) {
      const idx = state.items.findIndex((i) => i.id === editId);
      if (idx >= 0) {
        state.items[idx].name = name;
        state.items[idx].image = safeImage($('#manualImage').value.trim()) || state.items[idx].image;
        state.items[idx].specs = specs;
        state.items[idx].currency = priceField && priceVal !== null ? (priceField.unit === '₹' ? 'INR' : null) : state.items[idx].currency;
        state.items[idx].specCount = Object.keys(specs).length;
      }
    } else {
      addManualItem({ name, image: $('#manualImage').value.trim(), specs });
    }
    closeManual();
  }

  // ---------- discover ----------
  async function runDiscover(e) {
    e.preventDefault();
    const q = $('#discoverInput').value.trim();
    if (!q || state.busy) return;
    state.busy = true;
    const status = $('#discoverStatus');
    const results = $('#discoverResults');
    results.hidden = true;
    status.hidden = false;
    status.textContent = 'Searching the web…';
    status.className = 'discover-status';
    try {
      const data = await api('/api/discover', { q });
      if (!data.results.length) throw new Error('No results found.');
      renderDiscover(data.results);
      status.textContent = 'Pick items to add — they will be scraped for specs.';
    } catch (e2) {
      status.textContent = '✗ ' + e2.message + ' You can still paste URLs directly above.';
      status.className = 'discover-status error';
    } finally {
      state.busy = false;
    }
  }

  function renderDiscover(list) {
    const wrap = $('#discoverResults');
    wrap.innerHTML = '';
    for (const r of list) {
      let host = '';
      try {
        host = new URL(r.url).hostname.replace(/^www\./, '');
      } catch (e) { /* ignore */ }
      const div = document.createElement('div');
      div.className = 'discover-item';
      div.innerHTML = `
        <div class="discover-info">
          <p class="discover-title" title="${escapeHtml(r.title)}">${escapeHtml(r.title)}</p>
          <p class="discover-meta">${escapeHtml(host || r.url)}${r.snippet ? ' — ' + escapeHtml(r.snippet) : ''}</p>
        </div>
        <button class="btn btn-primary btn-sm discover-add">+ Add</button>`;
      div.querySelector('.discover-add').addEventListener('click', () => addItemByUrl(r.url, r.title));
      wrap.appendChild(div);
    }
    wrap.hidden = false;
  }

  function hideDiscover() {
    $('#discoverResults').hidden = true;
    $('#discoverStatus').hidden = true;
    $('#discoverInput').value = '';
  }

  // ---------- sample data ----------
  function loadSample() {
    state.category = 'phones';
    renderChips();
    const now = Date.now();
    state.items = [
      {
        id: uid(), manual: true, name: 'iPhone 17', source: 'sample', currency: 'INR', image: null,
        specCount: 12,
        specs: {
          price: 79900, display: '6.3" OLED, 120Hz', refresh_rate: 120, processor: 'Apple A19',
          ram: 8, storage: 128, battery: 3355, charging: 45, camera: 48, front_camera: 24,
          os: 'iOS 26', weight: 171, waterproof: 'IP68', rating: 4.7
        }
      },
      {
        id: uid(), manual: true, name: 'Samsung Galaxy S26', source: 'sample', currency: 'INR', image: null,
        specCount: 12,
        specs: {
          price: 79999, display: '6.3" AMOLED, 120Hz', refresh_rate: 120, processor: 'Snapdragon 8 Elite Gen 5',
          ram: 12, storage: 256, battery: 4300, charging: 25, camera: 50, front_camera: 12,
          os: 'Android 16', weight: 167, waterproof: 'IP68', rating: 4.6
        }
      },
      {
        id: uid(), manual: true, name: 'Google Pixel 10', source: 'sample', currency: 'INR', image: null,
        specCount: 12,
        specs: {
          price: 76999, display: '6.3" OLED, 120Hz', refresh_rate: 120, processor: 'Google Tensor G5',
          ram: 12, storage: 128, battery: 4800, charging: 30, camera: 50, front_camera: 11,
          os: 'Android 16', weight: 170, waterproof: 'IP68', rating: 4.6
        }
      },
      {
        id: uid(), manual: true, name: 'OnePlus 14', source: 'sample', currency: 'INR', image: null,
        specCount: 12,
        specs: {
          price: 69999, display: '6.82" AMOLED, 120Hz', refresh_rate: 120, processor: 'Snapdragon 8 Elite',
          ram: 12, storage: 256, battery: 6000, charging: 100, camera: 50, front_camera: 32,
          os: 'Android 16 (OxygenOS)', weight: 212, waterproof: 'IP69', rating: 4.5
        }
      }
    ].map((it) => ({ ...it, id: uid() }));
    renderItems();
    toast('Sample data loaded — hit “Compare”!');
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
    const scoreOf = (i) => result.scores[i];
    if (!result.winners.length) {
      winnerCard.hidden = true;
    } else {
      winnerCard.hidden = false;
      const isTie = result.winners.length > 1;
      const bestScore = result.maxScore;
      const detail = isTie
        ? `It's a tie — each wins ${bestScore.toFixed(1)} of ${result.fields.filter((f) => f.best && f.different).length} scored specs.`
        : `Best in ${bestScore.toFixed(1)} of ${result.fields.filter((f) => f.best && f.different).length} scored specs.`;
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
    const scoredFields = result.fields.filter((f) => f.best && f.different).length;

    let html = '<thead><tr><th class="field-head">Spec</th>';
    for (let i = 0; i < items.length; i++) {
      html += `<th>${cellHeadHtml(items[i], result, i, scoredFields)}</th>`;
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
      html += `<tr><th>${escapeHtml(label)}${f.unit && f.type === 'number' ? ` <span style="color:#9ca3af;font-weight:400">(${escapeHtml(f.unit)})</span>` : ''}</th>`;
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
          if (f.key === 'price' && f.unit === '₹' && result.items[i].currency && result.items[i].currency !== 'INR') {
            const base = toBaseCurrency(v, result.items[i].currency, f.unit);
            if (base !== null) {
              content += `<span class="best-note" style="color:#9ca3af">≈ ₹${Math.round(base).toLocaleString('en-IN')}</span>`;
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

  function cellHeadHtml(item, result, i, scoredFields) {
    const icon = tpl().icon;
    const img = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;thumb-placeholder&quot;>${icon}</div>'">`
      : `<div class="thumb-placeholder">${icon}</div>`;
    const isWinner = result.winners.includes(i);
    return `<div class="cell-head">
      <div class="cell-head-top">${img}<div><div class="cell-title">${escapeHtml(item.name)}</div>
      <div class="cell-source">${item.source ? escapeHtml(item.source) : '—'}${item.url ? ' · <a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" style="color:#4f46e5">source ↗</a>' : ''}</div></div></div>
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
    const meta = [
      ['Source', ...r.items.map((i) => i.source || '')],
      ['Link', ...r.items.map((i) => i.url || '')]
    ];
    rows.push(...meta);
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
    a.download = 'comparison.csv';
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
        state.category = data.category && state.templates[data.category] ? data.category : 'generic';
        state.items = data.items.map((it) => ({ ...it, id: it.id || uid() }));
        renderChips();
        renderItems();
        runCompare();
        history.replaceState(null, '', location.pathname);
      }
    } catch (e) { /* ignore bad hash */ }
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
    $('#addCustomSpecBtn').addEventListener('click', () => {
      addCustomRow('', '');
    });
    $('#compareBtn').addEventListener('click', runCompare);
    $('#clearBtn').addEventListener('click', () => {
      state.items = [];
      state.result = null;
      $('#results').hidden = true;
      renderItems();
    });
    $('#discoverForm').addEventListener('submit', runDiscover);
    $('#sampleBtn').addEventListener('click', loadSample);
    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#shareBtn').addEventListener('click', shareLink);
    $('#editBtn').addEventListener('click', () => {
      $('#builder').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // the empty custom-spec row is in index.html (#customSpecRow);
  // new custom rows get inserted before it via addCustomRow().
  document.addEventListener('DOMContentLoaded', init);
})();
