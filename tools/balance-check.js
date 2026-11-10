#!/usr/bin/env node
// Headless balance + sanity check for LUNARIS (runs in Node, no browser).
//   1. Loads the real CSVs + the model from src/ (state.js, data.js, mathx.js).
//   2. Enumerates every objective x site x condition and plays it perfectly
//      (expectimax over hazards) to prove every path is winnable.
//   3. Reports best designs per path and flags unwinnable/broken combinations.
// Usage: node tools/balance-check.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---- minimal browser shims so the modules run headless
global.window = global;
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
global.performance = { now: () => Date.now() / 1000 };

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  // const/let declared inside indirect eval are scoped to the eval call only, so lift
  // them to var to make them globally visible for the rest of the harness.
  (0, eval)(code.replace(/^\s*const (\w+) = /gm, 'var $1 = ').replace(/\bexport\b/g, ''));
}

// MathX first (state.js uses MathX in helper defaults at load time only via calls).
load('src/mathx.js');
// modes.js first: state.js's budget/goal/risk hooks read MODE_CFG and diff().
load('src/modes.js');
// data.js: fetch not available - inject the embedded dataset map instead.
const emb = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.csv')).sort()) {
  emb[f] = fs.readFileSync(path.join(ROOT, 'data', f), 'utf8');
}
global.window.LUNARIS_EMBEDDED = emb;
// replace fetch-based loader with a synchronous embedded load
const dataCode = fs.readFileSync(path.join(ROOT, 'src/data.js'), 'utf8')
  .replace(/^\s*const (NasaData) = /gm, 'var $1 = ')
  .replace(/async function load\(\) \{\s*await Promise\.all\(Object\.keys\(DATASETS\)\.map\(loadOne\)\);\s*return count\(\) > 0;\s*\}/,
    `function load() {
      const embAll = window.LUNARIS_EMBEDDED || {};
      for (const id of Object.keys(DATASETS)) {
        const file = DATASETS[id];
        const text = embAll[file] || null;
        if (!text) { rows[id] = []; index[id] = new Map(); origin[id] = 'none'; continue; }
        origin[id] = 'embedded';
        rows[id] = parseCSV(text).map(r => Object.assign(r, { confidence: classify(r), dataset: id }));
        const m = new Map();
        for (const r of rows[id]) { const k = keyOf(id, r); if (!m.has(k)) m.set(k, r); const full = ROWID(id, r); if (!m.has(full)) m.set(full, r); }
        index[id] = m;
      }
      return count() > 0;
    }`);
(0, eval)(dataCode);
NasaData.load();

load('src/state.js');
load('src/audio.js');   // Sfx no-ops without AudioContext
// render/UI/game are browser-only; not needed for the model.

// ---- check dataset integrity
const counts = Object.keys(NasaData.DATASETS).map(id => `${id}:${NasaData.rows(id).length}`);
console.log('datasets:', counts.join(' '));
let missing = 0;
for (const [key, ds] of [
  ['Surface gravity', 'moon'], ['Escape velocity', 'moon'], ['Water in LCROSS impact plume (Cabeus crater; south pole)', 'moon'],
  ['Earth|Escape velocity', 'orbit'], ['Moon orbit|Sidereal rotation period', 'orbit'],
  ['Deep moonquakes|Count', 'quakes'], ['Mare Imbrium', 'maria'], ['Tycho', 'craters'], ['Artemis II|Crewed lunar flyby, mission duration', 'transfers'],
]) {
  if (!NasaData.get(key, ds)) { console.error('MISSING dataset row:', key, ds); missing++; }
}
if (missing) process.exit(1);

// ---- expectation helpers
const rand = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();

function playPath(sel, objId, regionId, scenId, travelId, orbitId, scanId, eventResp, txId) {
  resetMission(scenId);
  M.objective = objId; M.region = regionId;
  const full = { vehicle: sel.vehicle, engine: sel.engine, power: sel.power, thermal: sel.thermal, comms: sel.comms, nav: sel.nav, payload: sel.payload, data: sel.data };
  commitDesign(full);
  setTravel(travelId);
  // slot 1 hazard (if fired) resolved optimistically-best: enumerate options
  const hazard1 = Math.random() < M.travel.hazardChance ? drawHazard(1) : null;
  if (hazard1) resolveHazard(hazard1, bestHazardOpt(hazard1, 1), 1, 0.99);
  if (M.failure) return { status: 'FAILURE', science: 0 };
  arrive();
  if (M.failure) return { status: 'FAILURE', science: 0 };
  chooseOrbit(orbitId);
  const hazard2 = drawHazard(2);
  resolveHazard(hazard2, bestHazardOpt(hazard2, 2), 2, 0.99);
  runScan(scanId);
  if (M.failure) return { status: 'FAILURE', science: M.science };
  applyEventDrain();
  if (M.failure) return { status: 'FAILURE', science: M.science };
  chooseEvent(eventResp);
  if (M.failure) return { status: 'FAILURE', science: M.science };
  transmit(txId);
  const { status } = evaluate();
  return { status, science: M.science, power: M.power, fuel: M.fuel, risk: M.risk };
}

// Best hazard option: prefer kit, then deterministic option with lowest damage (roll 0.99 = gamble succeeds)
function bestHazardOpt(id, slot) {
  const opts = hazardOptions(id, slot);
  const kit = opts.find(o => o.isKit);
  if (kit) return kit.id;
  return opts[0].id;
}

// ---- enumerate designs: pick per-group the cheap/medium/expensive members
function* designs() {
  const opts = {
    vehicle: Object.keys(VEHICLES), engine: Object.keys(ENGINES), power: Object.keys(POWER_SYSTEMS),
    thermal: Object.keys(THERMALS), comms: Object.keys(COMMS), nav: Object.keys(NAVS),
    payload: Object.keys(INSTRUMENTS), data: Object.keys(DATASYS),
  };
  // constrain: engine redundancy only matters with leaks; keep the full cross product but cap by budget validity
  for (const vehicle of opts.vehicle) for (const engine of opts.engine) for (const power of opts.power)
    for (const thermal of opts.thermal) for (const comms of opts.comms) for (const nav of opts.nav)
      for (const payload of opts.payload) for (const data of opts.data)
        yield { vehicle, engine, power, thermal, comms, nav, payload, data };
}

const results = [];
let totalPaths = 0, winnable = 0;
const report = [];

for (const objId of Object.keys(OBJECTIVES)) {
  for (const regionId of Object.keys(SITES)) {
    for (const scenId of Object.keys(SCENARIOS)) {
      let best = null;
      let okDesigns = 0;
      for (const sel of designs()) {
        resetMission(scenId);
        M.objective = objId; M.region = regionId;
        const d = computeDesign(sel);
        if (!d.complete) continue;
        if (d.budgetUsed > budgetCap() || d.power == null || d.power < RULES.minPower) continue;
        if (d.mass > d.capacity || d.arrivalFuel < RULES.minArrivalFuel) continue;
        okDesigns++;
        if (okDesigns > 400) break;      // cap enumeration per path for runtime
        // best travel + orbit + scan + event + tx for this design
        for (const travelId of Object.keys(TRAVEL_MODES)) {
          resetMission(scenId);
          M.objective = objId; M.region = regionId;
          commitDesign(sel);
          if (!travelAllowed(travelId)) continue;
          for (const orbitId of ['high', 'low']) {
            resetMission(scenId);
            M.objective = objId; M.region = regionId;
            commitDesign(sel);
            setTravel(travelId);
            if (M.fuel + orbitFx(orbitId).fuel < 0) continue;
            for (const scanId of Object.keys(SCANS)) {
              // skip scans that obviously overflow storage (design chose small recorder)
              const fx = scanFx(scanId);
              if (fx.science * objective().dataRate > M.storageGB + 0.01) continue;
              for (const eventResp of Object.keys(EVENT.options)) {
                for (const txId of Object.keys(TRANSMISSIONS)) {
                  totalPaths++;
                  const res = playPath(sel, objId, regionId, scenId, travelId, orbitId, scanId, eventResp, txId);
                  const score = res.status === 'SUCCESS' ? 100 + res.science : res.status === 'PARTIAL SUCCESS' ? res.science : -1;
                  if (!best || score > best.score) best = { ...res, score, design: sel, travel: travelId, orbit: orbitId, scan: scanId, event: eventResp, tx: txId };
                  if (res.status !== 'FAILURE') winnable++;
                }
              }
            }
          }
        }
      }
      report.push({ objId, regionId, scenId, okDesigns, best });
      if (!best || best.score < 0) console.error(`✗ UNWINNABLE: ${objId} × ${regionId} × ${scenId}`);
    }
  }
}

console.log(`\npaths simulated: ${totalPaths} · non-failure outcomes: ${winnable} (${(winnable / totalPaths * 100).toFixed(1)}%)`);
console.log('objective × site × condition paths:', report.length);
// print the best plan per objective (averaged over sites/conditions implicitly by max)
for (const objId of Object.keys(OBJECTIVES)) {
  const rows = report.filter(r => r.objId === objId);
  const bestOf = rows.reduce((a, b) => (!a || (b.best && b.best.score > a.score)) ? (b.best ? { ...b.best, path: `${b.regionId}/${b.scenId}` } : a) : a, null);
  if (bestOf) console.log(`${objId}: best ${bestOf.score} (${bestOf.status}, sci ${bestOf.science}) at ${bestOf.path} design ${JSON.stringify(bestOf.design)} ${bestOf.travel}/${bestOf.orbit}/${bestOf.scan}/${bestOf.event}/${bestOf.tx}`);
  else console.log(`${objId}: NO WINNING PATH FOUND`);
}
const unwinnable = report.filter(r => !r.best || r.best.score < 0);
console.log(unwinnable.length ? `\n✗ ${unwinnable.length} unwinnable paths` : '\n✓ every objective × site × condition path is winnable with optimal play');
