// LUNARIS dataset layer: loading, parsing and display helpers for 14 CSVs.
// The CSVs in data/ are authoritative; values are never altered here - only presented.
// Two schemas are supported:
//   generic  - category,parameter,value,unit,game_note,source_name,source_url
//   spatial  - <name column>, latitude_deg, longitude_deg, ... (sites, maria, craters)
// plus a few tables with their own columns (history, landing sites) handled as generic rows.

const NasaData = (() => {
  const DATASETS = {
    moon: 'moon_environment_dataset.csv',
    dust: 'moon_dust_dataset.csv',
    orbit: 'earth_moon_orbital_dataset.csv',
    regions: 'moon_regions_non_polar_dataset.csv',
    bodies: 'solar_system_bodies.csv',
    elements: 'planetary_orbital_elements.csv',
    sites: 'lunar_landing_sites.csv',
    maria: 'lunar_maria.csv',
    craters: 'lunar_craters_named.csv',
    ice: 'lunar_polar_ice_evidence.csv',
    resources: 'lunar_resources.csv',
    quakes: 'moonquake_dataset.csv',
    temps: 'lunar_temperature_profile.csv',
    transfers: 'earth_moon_transfer_examples.csv',
    history: 'lunar_missions_history.csv',
  };
  const rows = {};           // id -> row[]
  const index = {};          // id -> Map(key -> row)
  const origin = {};         // id -> 'csv' | 'embedded' | 'none'

  // Minimal RFC-4180 style parser (handles quoted fields, "" escapes, CRLF).
  function parseCSV(text) {
    const records = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(f => f.trim() !== '')) records.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some(f => f.trim() !== '')) records.push(row);

    const header = records.shift().map(h => h.trim());
    return records.map(r => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
      return obj;
    });
  }

  // Confidence label derived from each dataset's own wording.
  function classify(r) {
    const text = `${r.parameter || r.key_feature || r.highlight || ''} ${r.game_note || ''}`.toLowerCase();
    if (/simulant/.test(text)) return 'lab';
    if (/estimate|could be off|low-confidence|speculative|low confidence|model estimate|uncertainty/.test(text)) return 'estimate';
    if (/^derived/i.test(r.source_name || '') || /^derived/i.test(r.game_note || '')) return 'derived';
    if (/qualitative/.test(text)) return 'qual';
    if (/approx|~/i.test(`${r.unit || ''} ${r.value || ''}`.toLowerCase())) return 'approx';
    return 'nasa';
  }

  // Key for lookups: generic rows use "category|parameter" (falls back to parameter);
  // spatial rows use their name column.
  const NAMECOL = { sites: 'site', maria: 'name', craters: 'name', history: 'mission' };
  const keyOf = (id, r) => NAMECOL[id] ? r[NAMECOL[id]] : r.parameter;
  const ROWID = (id, r) => (r.category ? `${r.category}|${r.parameter}` : r[NAMECOL[id] || 'name']);

  async function loadOne(id) {
    const file = DATASETS[id];
    let text = null;
    try {
      const res = await fetch('data/' + file, { cache: 'no-store' });
      if (res.ok) { text = await res.text(); origin[id] = 'csv'; }
    } catch (e) { /* file:// or offline: use embedded copy below */ }
    const emb = window.LUNARIS_EMBEDDED;
    if (!text && emb && typeof emb[file] === 'string') { text = emb[file]; origin[id] = 'embedded'; }
    if (!text) { origin[id] = 'none'; rows[id] = []; index[id] = new Map(); return; }
    rows[id] = parseCSV(text).map(r => Object.assign(r, { confidence: classify(r), dataset: id }));
    const m = new Map();
    for (const r of rows[id]) {
      const k = keyOf(id, r);
      if (!m.has(k)) m.set(k, r);
      const full = ROWID(id, r);
      if (!m.has(full)) m.set(full, r);
    }
    index[id] = m;
  }

  async function load() {
    await Promise.all(Object.keys(DATASETS).map(loadOne));
    return count() > 0;
  }

  const get = (key, ds = 'moon') => (index[ds] && index[ds].get(key)) || null;

  // Numeric value (for derived calculations); NaN when not numeric.
  function num(key, ds = 'moon') {
    const r = get(key, ds);
    if (!r) return NaN;
    const m = /^-?[\d,]+(\.\d+)?([eE][+-]?\d+)?/.exec(String(r.value).replace(/,/g, ''));
    return m ? Number(m[0]) : NaN;
  }

  const SUP = { '-': '⁻', '+': '', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

  function fmtValue(v) {
    const sci = /^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/i.exec(v);
    if (sci) {
      const exp = String(Number(sci[2])).split('').map(ch => (ch in SUP ? SUP[ch] : ch)).join('');
      return `${sci[1]} × 10${exp}`;
    }
    if (/^-?\d{5,}(\.0+)?$/.test(v.replace(/,/g, ''))) return Number(v.replace(/,/g, '')).toLocaleString('en-US');
    return v.replace(/(^|[\s(])-(\d)/g, '$1−$2');
  }

  function fmtUnit(u) {
    if (!u || u === '-') return '';
    return u.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/(\d) C\b/g, '$1 °C').replace(/(^|[\s(])-(\d)/g, '$1−$2')
      .replace(/^deg$/, '°').replace(/^C$/, '°C');
  }

  // "1.62 m/s²" etc. Returns fallback text if the row is missing.
  function show(key, ds = 'moon', fallback = 'data unavailable') {
    if (!(ds in DATASETS)) { fallback = ds; ds = 'moon'; }   // show(key, fallback) shorthand
    const r = get(key, ds);
    if (!r) return fallback;
    const u = fmtUnit(r.unit);
    if (!u) return fmtValue(r.value);
    return u === '°' ? `${fmtValue(r.value)}°` : `${fmtValue(r.value)} ${u}`;
  }

  // "0.674°N, 23.473°E" for rows with coordinates.
  function coords(r) {
    if (typeof r === 'string') r = get(r, 'sites') || get(r, 'maria') || get(r, 'craters');
    if (!r || r.latitude_deg === undefined || r.latitude_deg === '') return null;
    const lat = Number(r.latitude_deg), lon = Number(r.longitude_deg);
    return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  }

  const TAGS = {
    nasa: 'NASA DATA',
    approx: 'NASA · APPROX.',
    qual: 'NASA · QUALITATIVE',
    estimate: 'ESTIMATE · UNCERTAIN',
    derived: 'DERIVED FROM NASA',
    lab: 'LAB SIMULANT',
    game: 'GAME MODEL',
  };

  function count() { return Object.values(rows).reduce((n, r) => n + (r ? r.length : 0), 0); }

  // Whole-body lookup for the exploration layer: body -> {field: row}.
  function bodyMap() {
    const map = {};
    for (const r of rows('bodies')) {
      (map[r.category] = map[r.category] || {})[r.parameter] = r;
    }
    return map;
  }

  return {
    load, get, num, show, coords, fmtValue, fmtUnit, TAGS, DATASETS, count, bodyMap,
    rows: id => rows[id] || [],
    get origin() { const o = Object.values(origin); return o.some(v => v === 'none') ? 'partial' : o.every(v => v === 'csv') ? 'csv' : 'embedded'; },
  };
})();
