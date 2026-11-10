// LUNARIS v2 "MISSION CONTROL" layer: play modes, difficulties, team roles (hot-seat),
// composite scoring + grades, local leaderboard, shareable mission codes, phase tips,
// glossary and autosave. Loaded before state.js so its constants exist at reset time.

const MODE_CFG = { mode: 'career', diff: 'engineer', team: null };   // team: [{n, role}]

// ---------------------------------------------------------------- difficulties
const DIFFS = {
  cadet: {
    id: 'cadet', name: 'CADET', mult: 0.75, budget: 20, goal: -10, riskMult: 0.8, luck: 0.02,
    blurb: 'Generous budget, forgiving gambles (they always work out), lower science bar, on-screen advice.',
  },
  engineer: {
    id: 'engineer', name: 'ENGINEER', mult: 1.0, budget: 0, goal: 0, riskMult: 1, luck: 0,
    blurb: 'The designed experience: honest trade-offs, honest odds, full score.',
  },
  veteran: {
    id: 'veteran', name: 'VETERAN', mult: 1.35, budget: -5, goal: 5, riskMult: 1.25, luck: 0.12,
    blurb: 'Tighter budget, higher science bar, harsher risk and gambles that more often go wrong.',
  },
};
const diff = () => DIFFS[MODE_CFG.diff] || DIFFS.engineer;

// ---------------------------------------------------------------- team roles (hot-seat)
const ROLE_META = {
  director: { id: 'director', icon: '✪', short: 'DIRECTOR', title: 'MISSION DIRECTOR',
    color: 'amber',
    duties: ['Owns go/no-go: design review, launch, orbit choice', 'Arbitrates when the team disagrees', 'Answers for the mission as a whole'] },
  engineer: { id: 'engineer', icon: '◈', short: 'ENGINEER', title: 'SPACECRAFT ENGINEER',
    color: 'cyan',
    duties: ['Owns the bus: launch vehicle, propulsion, power, thermal', 'Keeps mass, power and fuel margins honest', 'Answers why the spacecraft survives'] },
  science: { id: 'science', icon: '◇', short: 'SCIENCE', title: 'SCIENCE LEAD',
    color: 'green',
    duties: ['Owns the question: objective, survey site, instrument, recorder', 'Chooses how hard to observe (scan mode)', 'Answers for the science returned'] },
  ops: { id: 'ops', icon: '◐', short: 'OPS', title: 'OPERATIONS & COMMS',
    color: 'violet',
    duties: ['Owns the link: antenna, navigation, travel strategy, downlink', 'Leads every hazard response in flight', 'Answers for getting the data home'] },
};

// Which role owns which decision. Anyone may discuss; the owner commits.
const OWNERS = {
  DESTINATION: 'director', OBJECTIVE: 'science', TARGET: 'science', DESIGN_REVIEW: 'director', TRAJECTORY: 'ops',
  LAUNCH: 'director', TRANSFER: 'ops', ORBIT_DECISION: 'director', SURVEY: 'science',
  MISSION_EVENT: 'ops', TRANSMISSION: 'ops', hazard: 'ops',
};
const GROUP_OWNER = {   // per-subsystem ownership on the DESIGN screen
  vehicle: 'engineer', engine: 'engineer', power: 'engineer', thermal: 'engineer',
  comms: 'ops', nav: 'ops', payload: 'science', data: 'science',
};

const Team = {
  list: [], active: 0, pending: null,
  setup(players) { this.list = players.map((p, i) => ({ n: p.n || `P${i + 1}`, role: p.role, i })); this.active = 0; },
  size() { return this.list.length; },
  enabled() { return MODE_CFG.team && this.list.length > 0; },
  current() { return this.list[this.active] || null; },
  memberByRole(r) { return this.list.find(p => p.role === r) || null; },
  ownerFor(st) { const r = OWNERS[st]; return (r && this.memberByRole(r)) || null; },
  label() { const c = this.current(); return c ? `P${c.i + 1} · ${ROLE_META[c.role].short} AT CONSOLE` : ''; },
  ask(member, run) { if (!member) { run(); return; } this.pending = { member, run }; UI.showHandover(member, run, false); },
  // state-entry suggestion: pass the console when another role owns this screen
  suggest(st) {
    if (!this.enabled()) return;
    const m = this.ownerFor(st);
    if (m && this.list[this.active] !== m) { this.pending = { member: m, run: null }; UI.showHandover(m, null, true); }
  },
  ready() {
    const p = this.pending; this.pending = null;
    if (p && p.member) this.active = p.member.i;
    UI.hideHandover();
    if (p && p.run) p.run(); else UI.render();
  },
  skip() { this.pending = null; UI.hideHandover(); UI.render(); },
};

// ---------------------------------------------------------------- scoring
// Transparent composite: every line shown to the player in the debrief.
function computeScore() {
  if (M.score) return M.score;
  const cap = budgetCap(), goal = scienceGoal();
  const sciPts = Math.round(Math.max(0, Math.min(1.25, M.science / goal)) * 45 * 10) / 10;
  const statusPts = M.missionStatus === 'SUCCESS' ? 25 : M.missionStatus === 'PARTIAL SUCCESS' ? 10 : 0;
  const budgetPts = Math.round(Math.max(0, (cap - M.budgetUsed) / cap) * 12 * 10) / 10;
  const fuelPts = Math.round(Math.max(0, Math.min(1, M.fuel / 40)) * 8 * 10) / 10;
  const powerPts = !M.failure && M.power >= RULES.healthyPower ? 6 : M.power >= RULES.lowPower ? 3 : 0;
  const riskPts = Math.round(Math.max(0, (RULES.riskCritical - M.risk) / RULES.riskCritical) * 8 * 10) / 10;
  let hzGood = 0, hzBad = 0;
  for (const h of M.hazards) {
    if (h.opt === 'kit' || (h.outcome === 'lucky' && h.opt !== 'kit')) hzGood++;
    if (h.outcome === 'unlucky' || h.hit) hzBad++;
  }
  const hazardPts = hzGood * 2 - hzBad * 3;
  const base = sciPts + statusPts + budgetPts + fuelPts + powerPts + riskPts + hazardPts;
  const d = diff();
  const teamBonus = Team.enabled() && Team.size() >= 3 ? 4 : 0;
  const modeMult = MODE_CFG.mode === 'sandbox' ? 0.9 : 1;
  const dest = destOf();
  const total = Math.max(0, Math.round((base + teamBonus) * d.mult * dest.scoreMult * modeMult));
  const grade = M.missionStatus === 'FAILURE' ? (total >= 45 ? 'C' : 'D')
    : total >= 92 ? 'S' : total >= 78 ? 'A' : total >= 62 ? 'B' : total >= 45 ? 'C' : 'D';
  const rows = [
    { k: 'SCIENCE RETURNED', v: `${M.science} / ${goal} at ${dest.shortName}`, p: sciPts, max: 56 },
    { k: 'MISSION STATUS', v: M.missionStatus || '—', p: statusPts, max: 25 },
    { k: 'BUDGET EFFICIENCY', v: `$${M.budgetUsed}M of $${cap}M`, p: budgetPts, max: 12 },
    { k: 'PROPELLANT MARGIN', v: `${M.fuel}% left`, p: fuelPts, max: 8 },
    { k: 'SPACECRAFT HEALTH', v: `${M.power}% power`, p: powerPts, max: 6 },
    { k: 'RISK CONTROL', v: `risk ${M.risk}`, p: riskPts, max: 8 },
    { k: 'HAZARD HANDLING', v: `${hzGood} clean · ${hzBad} costly`, p: hazardPts, max: 8 },
  ];
  if (teamBonus) rows.push({ k: 'TEAM SYNERGY', v: `${Team.size()} roles flew together`, p: teamBonus, max: 4 });
  M.score = { rows, base: Math.round(base * 10) / 10, mult: d.mult * dest.scoreMult, total, grade,
    mode: MODE_CFG.mode, diff: d.name, team: Team.enabled() ? Team.size() : 0,
    dest: dest.shortName, destMult: dest.scoreMult };
  return M.score;
}

// ---------------------------------------------------------------- leaderboard (local)
const BOARD = {
  KEY: 'lunaris-board',
  load() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
  save(list) { try { localStorage.setItem(this.KEY, JSON.stringify(list)); } catch (e) { /* ignore */ } },
  add(entry) {
    const list = this.load();
    list.push(entry);
    list.sort((a, b) => b.s - a.s);
    const rank = list.findIndex(e => e === entry) + 1;
    this.save(list.slice(0, 12));
    return rank;
  },
  top(n = 8) { return this.load().slice(0, n); },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ } },
};

// ---------------------------------------------------------------- share codes (save / share / compare designs)
const SHARE = {
  pack(o) {
    const json = JSON.stringify(o);
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return 'LUN2-' + b64;
  },
  unpack(str) {
    try {
      // accept a bare code, a relative path (#m=…) or a full pasted URL
      let s = String(str).trim();
      const at = s.indexOf('#m=');
      if (at >= 0) s = s.slice(at + 3);
      s = s.replace(/^LUN2-/, '').replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(s)));
      return JSON.parse(json);
    } catch (e) { return null; }
  },
  // Snapshot of everything that defines a mission design + its framing
  fromState() {
    return {
      v: 2, d: MODE_CFG.diff, m: MODE_CFG.mode, c: M.scenario, dst: M.dest || 'moon',
      o: M.objective, r: M.region, t: M.travelMode || null, g: Game.sel,
      tm: MODE_CFG.team ? MODE_CFG.team.map(p => p.role) : null,
    };
  },
  url() {
    const code = this.pack(this.fromState());
    return `${location.origin}${location.pathname}#m=${code}`;
  },
  text() { return this.url().replace(/^https?:\/\/[^/]+/, ''); },   // short relative form for chat paste
  // Apply a code: configure mode, draw the framed mission, preload the design. Returns error or null.
  applyCode(code) {
    const o = this.unpack(code);
    if (!o || o.v !== 2) return 'Code unreadable - check it was copied in full.';
    const err = id => `Unknown ${id} in code.`;
    if (o.d && !DIFFS[o.d]) return err('difficulty');
    if (o.c && !SCENARIOS[o.c]) return err('condition');
    if (o.o && !OBJECTIVES[o.o]) return err('objective');
    if (o.r && !SITES[o.r]) return err('site');
    const g = o.g || {};
    for (const [grp, table] of [['vehicle', VEHICLES], ['engine', ENGINES], ['power', POWER_SYSTEMS], ['thermal', THERMALS], ['comms', COMMS], ['nav', NAVS], ['payload', INSTRUMENTS], ['data', DATASYS]]) {
      if (g[grp] && !table[g[grp]]) return err('subsystem');
    }
    if (o.t && !TRAVEL_MODES[o.t]) return err('travel mode');
    MODE_CFG.mode = o.m === 'sandbox' ? 'sandbox' : 'career';
    MODE_CFG.diff = o.d || 'engineer';
    MODE_CFG.team = o.tm && o.tm.length ? o.tm.map((role, i) => ({ n: `P${i + 1}`, role })) : null;
    Team.list = MODE_CFG.team ? MODE_CFG.team.map((p, i) => ({ n: p.n, role: p.role, i })) : [];
    Team.active = 0;
    resetMission(o.c || undefined);
    M.dest = DESTS[o.dst] ? o.dst : 'moon';   // legacy v2 codes (no dst) land on the Moon
    if (o.r && destOf().sites && !destOf().sites.includes(o.r)) return `Site does not belong to ${destOf().shortName}.`;
    if (o.o) M.objective = o.o;
    if (o.r) M.region = o.r;
    if (o.t) Game.travelMode = o.t;   // travel plan is recomputed with the real mass at launch
    Game.sel = Object.assign(newSel(), g);
    Game.review = validateDesign(Game.sel);
    return null;
  },
};

// ---------------------------------------------------------------- autosave / resume
const SAVE = {
  KEY: 'lunaris-save',
  SAFE: ['DESTINATION', 'OBJECTIVE', 'TARGET', 'DESIGN', 'TRAJECTORY', 'ORBIT_DECISION', 'SURVEY', 'MISSION_EVENT', 'TRANSMISSION', 'BRIEFING'],
  store(state) {
    if (!this.SAFE.includes(state)) return;
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        state, at: Date.now(),
        M: JSON.parse(JSON.stringify(M)),
        sel: Game.sel, mode: MODE_CFG, team: Team.list, score: null,
      }));
    } catch (e) { /* storage unavailable */ }
  },
  peek() { try { return JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { return null; } },
  restore() {
    const snap = this.peek();
    if (!snap || !this.SAFE.includes(snap.state)) return false;
    try {
      Object.assign(M, snap.M);
      Game.sel = snap.sel;
      Object.assign(MODE_CFG, snap.mode || {});
      Team.list = snap.team || []; Team.active = 0;
      M.score = null;
      return true;
    } catch (e) { return false; }
  },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ } },
};

// ---------------------------------------------------------------- phase tips (first-run coaching)
const TIPS = {
  DESTINATION: 'Every world scales the budget and the science goal - and pays a score multiplier. Solar flux, light-time delay and radiation decide which subsystems survive the trip.',
  BRIEFING: 'The condition card changes every run - read it first. It decides whether power, budget or risk is your tightest constraint.',
  OBJECTIVE: 'The objective is the question you answer. It sets which instrument earns the most science - and how much data each point produces.',
  TARGET: 'Hover the site rows: each has real NASA data. Polar sites reward ice science but punish cameras; the far side pays best but cannot call Earth directly.',
  DESIGN: 'Every choice shows ▲ gain and ▼ cost before you commit. The tiles below are your live budget, mass, power and fuel margins - keep them all honest.',
  DESIGN_REVIEW: 'A NO-GO is free learning: fix the constraint it names and review again. There is rarely one perfect design.',
  TRAJECTORY: 'Fast transfers spend fuel and raise exposure; slow ones save fuel for the survey. Check the transit-hazard and night-load chips.',
  TRANSFER: 'Nothing to pilot - your design and strategy play out here. Watch the meters.',
  SURVEY: 'Match the scan to your recorder: a Deep Scan that overflows storage loses science. Power plan line shows the reserve you need for the downlink.',
  MISSION_EVENT: 'Lunar night is the classic power crunch. Sacrifice science, spend reserves, or risk hardware - the condition card told you which is cheapest.',
  TRANSMISSION: 'Comm capability sets the power cost of the link. A weak antenna can make full-resolution downlink unaffordable.',
  RESULT: 'The score is transparent on purpose: open the report to see exactly which decisions earned and which cost.',
  REPORT: 'Compare runs in LEARN and the Hall of Fame. Same objective, different designs - that is mission engineering.',
};
const SEEN = {
  KEY: 'lunaris-tips',
  has(k) { try { return (localStorage.getItem(this.KEY) || '').includes(k); } catch (e) { return true; } },
  mark(k) { try { const cur = localStorage.getItem(this.KEY) || ''; if (!cur.includes(k)) localStorage.setItem(this.KEY, cur + k); } catch (e) { /* ignore */ } },
};

// ---------------------------------------------------------------- glossary (LEARN)
const GLOSSARY = [
  ['Objective', 'The scientific question the mission exists to answer. Everything - instrument, site, orbit - is chosen to serve it.'],
  ['Budget cap', 'Total development cost allowed. Every subsystem has a price; money left over scores "budget efficiency".'],
  ['Mass budget', 'The launch vehicle lifts a fixed mass to the Moon. Overweight designs cannot launch - swap equipment or buy a bigger rocket.'],
  ['Power margin', 'Solar arrays and batteries minus everything that draws power (instruments, antennas, avionics). Below 60% at launch the design review fails; below 20% in flight, risk rises.'],
  ['Fuel (propellant)', 'Percent of tank loaded. Spent on transfers, orbit insertion and evasive burns. Keep ≥10% after arrival - it is a scored reserve.'],
  ['Trans-lunar injection (TLI)', 'The burn that pushes a spacecraft out of Earth orbit toward the Moon. It must come close to Earth\'s escape velocity.'],
  ['Lunar orbit insertion (LOI)', 'The braking burn that lets the Moon capture the spacecraft. Too little propellant left = fly-by, no mission.'],
  ['Transfer strategy', 'How fast you fly to the Moon. Fast: costly, riskier, arrives first. Fuel-saving: cheap, but days of extra cruise exposure.'],
  ['Comm capability', 'Antenna + power + vehicle support. Sets how much power the downlink costs; a weak link can make sending full-resolution data unaffordable.'],
  ['Data rate / storage', 'Science points become gigabytes. The recorder caps what you can keep until downlink - overflow is science lost forever.'],
  ['Downlink', 'The radio transmission of science data to Earth. Costs power; far-side targets must relay around the limb.'],
  ['Lunar night', '≈14 Earth days without sunlight. Heaters keep electronics alive - the deepest recurring power drain in the game.'],
  ['Risk', 'Accumulated stress on the spacecraft. ≥40: a data-loss anomaly during transmission. ≥75: permanent safe mode - mission lost.'],
  ['Hazard gamble', 'Some responses are probabilistic ("most swarms miss"). The odds are shown before you commit - that is the trade.'],
  ['Kit / counter-subsystem', 'A subsystem that unlocks a cheap, low-damage response to a specific hazard (armor vs meteoroids, rad-hard avionics vs storms).'],
  ['Permanently shadowed region', 'Polar crater floors that never see sunlight - the coldest measured places in the solar system and the likeliest home of water ice.'],
  ['Regolith', 'The loose dusty surface layer. Abrasive, electrostatically charged, and - in the game - a real threat to optics and panels.'],
  ['ISRU', 'In-Situ Resource Utilization: making propellant, oxygen or water from local material (regolith oxides, polar ice) instead of lifting it from Earth.'],
  ['Confidence tags', 'NASA DATA / APPROX / ESTIMATE / DERIVED / LAB SIMULANT - every value in LUNARIS says how solid it is. Real mission data works the same way.'],
  ['Gravity assist', 'Flying close past a planet to borrow a slice of its orbital momentum - free delta-v, paid for in years. MESSENGER needed 6 assists; Cassini 4; BepiColombo 9.'],
  ['RTG', 'Radioisotope Thermoelectric Generator: heat from decaying plutonium-238 converted to electricity. Beyond roughly Jupiter, sunlight is too weak for solar arrays - Voyager, Cassini, New Horizons, Perseverance and Europa Clipper all ride on RTGs.'],
  ['Light-time delay', 'Radio signals travel at light speed: 1.3 s to the Moon, ~12 min to Mars, ~43 min to Jupiter, ~4.2 h to Pluto. The farther the target, the more the spacecraft must act on its own.'],
  ['Aerobraking', 'Dipping into a planet\'s upper atmosphere to shed speed without burning fuel. Magellan and MRO shaved months off their missions with it - the economy transfer mode uses it.'],
  ['Flyby vs orbiter', 'Stopping costs almost as much delta-v as getting there. New Horizons chose a 21-hour Pluto pass over capture - more speed, less fuel, one chance.'],
  ['Solar flux', 'Sunlight falls off with the square of distance: 0.43\u00d7 at Mars, 0.037\u00d7 at Jupiter, 0.0006\u00d7 at Pluto. Power design must follow the destination.'],
  ['Biosignature', 'A measurement that suggests life - organics, cell-like structures, chemical disequilibrium. The best candidates live where liquid water meets energy: ocean moons and ancient deltas.'],
];

// ---------------------------------------------------------------- cadet advice
const HINTS = {
  vehicle: () => (destOf().fuelMult >= 1.6 ? 'heavy' : 'medium'),
  engine: () => (destOf().fuelMult >= 1.5 ? 'efficient' : 'std'),
  power: () => (destOf().flux < 0.3 ? 'rtg' : hasBatteryNeed() ? 'battery' : 'highcap'),
  thermal: () => {
    const need = destOf().thermalMin || 0;
    if (need >= 2) return 'armor';
    if (need >= 1) return 'radiator';
    return ((SCENARIOS[M.scenario] || {}).id === 'night' ? 'radiator' : 'basic');
  },
  comms: () => (site().side === 'far' || destOf().delayMin >= 30 ? 'highgain' : 'dish'),
  nav: () => ((destOf().rad || 0) >= 2 ? 'radhard' : 'startrack'),
  data: () => 'large',
  payload: () => {
    const best = objective().instruments;
    return Object.entries(best).filter(([, v]) => v >= Math.max(...Object.values(best)))[0][0];
  },
};
function hasBatteryNeed() {
  return (SCENARIOS[M.scenario] || {}).id === 'night' || (site().drain || 1) >= 1.1;
}
function hintFor(group) {
  if (MODE_CFG.diff !== 'cadet' || !HINTS[group]) return null;
  try { return HINTS[group](); } catch (e) { return null; }
}
