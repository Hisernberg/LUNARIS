// State machine, main loop, input and boot.
// Flow: TITLE → EXPLORE (solar system) → MOONVIEW → BRIEFING → OBJECTIVE → TARGET →
//       DESIGN (origami engineer) → DESIGN_REVIEW → TRAJECTORY → LAUNCH → TRANSFER →
//       ORBIT_DECISION → SURVEY (hazards) → MISSION_EVENT → TRANSMISSION → RESULT → REPORT

const Game = {
  state: 'TITLE', t: 0, sceneT: 0, phase: '', phaseT: 0,
  preview: null, choice: null,
  sel: newSel(),
  deploys: {}, foldAt: {},
  review: null, launchStep: -1, lastGain: 0, eventDrain: 0, powerBefore: 100, signalDelay: 0,
  drainApplied: false, launchBlast: false, foldFlash: 0,
  hazard: null, hazardFired: {},
  travelMode: null, pollStep: 0, countdown: null, burn: null,
  hoverBody: null, focusBody: null, simDays: 0,
};

function newSel() { return { vehicle: null, engine: null, power: null, thermal: null, comms: null, nav: null, payload: null, data: null }; }
const DEPLOY_KEYS = ['power', 'comms', 'payload', 'data'];

Game.go = function (state) {
  this.state = state; M.missionStage = state;
  this.sceneT = 0; this.phase = ''; this.phaseT = 0;
  this.preview = null; this.choice = null;
  if (state === 'REPORT' || state === 'TITLE' || state === 'DESIGN') UI.hideToast();
  const enter = ENTER[state];
  if (enter) enter();
  UI.render();
};

Game.setPhase = function (p) { this.phase = p; this.phaseT = 0; this.choice = null; this.preview = null; UI.render(); };

function syncDeploys(instant) {
  for (const k of DEPLOY_KEYS) {
    if (Game.sel[k]) {
      if (Game.foldAt[k] == null || instant) { Game.deploys[k] = 1; Game.foldAt[k] = -10; }
    }
  }
}

const ENTER = {
  TITLE() { resetMission(); Game.sel = newSel(); Game.deploys = {}; Game.foldAt = {}; Game.travelMode = null; Game.hazard = null; Game.hazardFired = {}; Game.focusBody = null; Game.hoverBody = null; Draw.clearParticles(); },
  EXPLORE() {
    Game.focusBody = null;
    Draw.Cam.tween(0, 0.4, 1, 1.4);
    Sfx.whoosh(1.2);
  },
  MOONVIEW() {
    Sfx.whoosh(0.8);
    if (Game.focusBody !== 'Moon') Draw.Cam.tween(0, 0.4, 2.4, 1.2);
  },
  OBJECTIVE() { Game.phase = 'choose'; Game.choice = M.objective; },
  TARGET() { Game.phase = 'choose'; Game.choice = M.region; },
  DESIGN() { Game.phase = 'choose'; syncDeploys(true); },
  DESIGN_REVIEW() {
    Game.review = validateDesign(Game.sel);
    if (Game.review.ok) Sfx.confirm(); else Sfx.deny();
  },
  TRAJECTORY() {
    Game.phase = 'choose';
    const d = computeDesign(Game.sel);
    const ok = id => d.fuel - travelPlan(id, d.mass, Game.sel.engine).fuelTotal >= RULES.minArrivalFuel;
    Game.choice = Game.travelMode && ok(Game.travelMode) ? Game.travelMode : ok('balanced') ? 'balanced' : null;
    Game.preview = Game.choice;
  },
  LAUNCH() {
    commitDesign(Game.sel);
    setTravel(Game.travelMode);
    M.flightPhase = 'PRE_LAUNCH';
    Game.launchStep = 0; Game.pollStep = 0; Game.countdown = null;
    Game.phase = 'running'; Game.launchBlast = false;
    Draw.clearParticles();
  },
  TRANSFER() {
    Game.phase = 'parking'; M.flightPhase = 'EARTH_ORBIT'; Game.burn = null;
    if (Math.random() >= M.travel.hazardChance) Game.hazardFired[1] = 'none';
    Draw.clearParticles();
  },
  ORBIT_DECISION() { Game.phase = 'choose'; Game.hazard = null; },
  SURVEY() { Game.phase = 'brief'; Draw.clearParticles(); },
  MISSION_EVENT() {
    Game.hazard = null;
    Game.phase = 'alert'; Game.powerBefore = M.power; Game.drainApplied = false;
    Sfx.warning(); Sfx.setMood('tense');
  },
  TRANSMISSION() { Game.phase = 'choose'; Sfx.setMood('calm'); Scenes.packets.length = 0; },
  RESULT() {
    Game.hazard = null;
    Sfx.setMood('calm');
    Draw.clearParticles();
    const { status } = evaluate();
    if (status === 'SUCCESS') Sfx.success(); else if (status === 'FAILURE') Sfx.failure(); else Sfx.partial();
  },
  REPORT() { recordRun(); },
};

// ---------------------------------------------------------------- hazards
function startHazard(slot) {
  const id = drawHazard(slot, Game.hazardFired[1]);
  Game.hazardFired[slot] = id;
  Game.hazard = { id, slot, t0: Game.t, resume: { phase: Game.phase, phaseT: Game.phaseT }, done: false };
  Game.phase = 'hazard'; Game.phaseT = 0; Game.choice = null; Game.preview = null;
  Sfx.warning(); Sfx.hazard(id); Sfx.setMood('tense');
  UI.render();
}

function resolveActiveHazard(optId) {
  const hz = Game.hazard;
  const res = resolveHazard(hz.id, optId, hz.slot);
  Object.assign(hz, { done: true, opt: optId, outcome: res.outcome, tDone: Game.t, chips: res.chips });
  hz.hit = hz.id === 'meteoroid' && (optId === 'brace' || res.outcome === 'unlucky');
  if (hz.hit) { Draw.impact(); Sfx.impact(); }
  else if (res.outcome === 'unlucky' || (hz.id === 'leak' && optId !== 'kit')) Sfx.impact(0.4);
  else Sfx.confirm();
  if (M.failure) Sfx.failure();
  UI.toast(HAZARDS[hz.id].name.toUpperCase(), res.chips);
  Game.phase = 'hazardDone'; Game.phaseT = 0; Game.choice = null;
  UI.render();
}

function resumeFromHazard() {
  const r = Game.hazard.resume;
  Game.phase = r.phase; Game.phaseT = r.phaseT;
  Sfx.setMood('calm');
  if (r.phase === 'scanning') Sfx.scan(Math.max(0.5, Scenes.SCAN_TIME - r.phaseT));
  UI.render();
}

// ---------------------------------------------------------------- timed updates
function update(dt) {
  Game.t += dt; Game.sceneT += dt; Game.phaseT += dt;
  Draw.updateParticles(dt);
  UI.tickFact(Game.t);
  const s = Game.state;
  const hz = Game.hazard;
  if (hz && hz.done && Game.phase !== 'hazardDone' && Game.t - hz.tDone > 2.5) Game.hazard = null;

  // solar-system time-lapse + fold animations
  if (s === 'EXPLORE' || s === 'MOONVIEW') Game.simDays += dt * 0.5;
  for (const k of DEPLOY_KEYS) {
    if (Game.foldAt[k] != null && Game.deploys[k] < 1) {
      Game.deploys[k] = MathX.easeOut(MathX.clamp((Game.t - Game.foldAt[k]) / 0.7));
    }
  }

  if (s === 'LAUNCH' && Game.phase === 'running') {
    const LT = Scenes.LT, lt = Game.sceneT;
    const poll = Math.min(UI.POLL_COUNT, Math.floor(lt / (LT.count / (UI.POLL_COUNT + 0.5))));
    if (poll !== Game.pollStep) { Game.pollStep = poll; Sfx.click(); UI.render(); }
    if (lt >= LT.count && lt < LT.ignite) {
      const n = Math.ceil(LT.ignite - lt);
      if (n !== Game.countdown) { Game.countdown = n; M.flightPhase = 'COUNTDOWN'; Sfx.countdown(n); UI.render(); }
    }
    const marks = [0, LT.count, LT.ignite, LT.lift + 1.4, LT.space, LT.sep, LT.end];
    let step = 0;
    marks.forEach((m, k) => { if (lt >= m) step = k; });
    if (step !== Game.launchStep) {
      Game.launchStep = step;
      if (step === 2) { Game.countdown = 0; M.flightPhase = 'ASCENT'; Sfx.launch(); }
      if (step === 4) Draw.clearParticles();
      if (step === 5) Sfx.separation();
      if (step === 6) { Game.phase = 'done'; M.flightPhase = 'EARTH_ORBIT'; Sfx.confirm(); }
      UI.render();
    }
  }

  if (s === 'TRANSFER') {
    const TT = Scenes.TRANSFER;
    if (Game.phase === 'parking' && Game.phaseT >= TT.park) {
      const before = M.fuel;
      const chips = departEarth();
      M.flightPhase = 'TLI_BURN';
      Game.burn = { label: 'TLI BURN', from: before, to: M.fuel, t0: Game.t, dur: TT.tli };
      Sfx.tli(TT.tli);
      UI.toast('TRANS-LUNAR INJECTION', chips);
      Game.setPhase('tli');
    } else if (Game.phase === 'tli' && Game.phaseT >= TT.tli) {
      M.flightPhase = 'TRANS_LUNAR_TRANSFER';
      Game.setPhase('cruise');
    } else if (Game.phase === 'cruise') {
      const cs = Scenes.cruiseTime();
      if (!Game.hazardFired[1] && Game.phaseT >= cs * 0.4) startHazard(1);
      else if (Game.phaseT >= cs) {
        const before = M.fuel;
        const chips = arrive();
        Game.burn = M.failure ? null : { label: 'LOI BURN', from: before, to: M.fuel, t0: Game.t, dur: 1.4 };
        if (M.failure) Sfx.failure(); else Sfx.burn(1.6);
        UI.toast('LUNAR ORBIT INSERTION', chips);
        Game.setPhase('loi');
      }
    } else if (Game.phase === 'loi' && Game.phaseT >= TT.loi) {
      if (!M.failure) { M.flightPhase = 'LUNAR_ORBIT'; Sfx.confirm(); }
      Game.setPhase('arrived');
    }
  }

  if (s === 'ORBIT_DECISION' && Game.phase === 'inserting' && Game.phaseT >= 2) {
    Sfx.confirm();
    Game.setPhase('done');
  }

  if (s === 'SURVEY' && Game.phase === 'scanning') {
    if (!Game.hazardFired[2] && Game.phaseT >= 2.0) startHazard(2);
    else if (Game.phaseT >= Scenes.SCAN_TIME) {
      const before = M.science;
      const chips = runScan(M.selectedObservation);
      Game.lastGain = M.science - before;
      const tp = Draw.targetPos(400, 365, 215);
      Draw.burst(tp.x, tp.y, 60, '88,242,155', 90, 1.2);
      if (M.failure) Sfx.failure(); else Sfx.confirm();
      UI.toast(SCANS[M.selectedObservation].name.toUpperCase(), chips);
      Game.setPhase('done');
    }
  }

  if (s === 'MISSION_EVENT' && Game.phase === 'alert') {
    if (!Game.drainApplied && Game.phaseT >= 1) {
      Game.drainApplied = true;
      Game.eventDrain = eventDrain();
      UI.toast('LUNAR NIGHT HEATER LOAD', applyEventDrain());
      UI.hud();
    }
    if (Game.phaseT >= 2.6) Game.setPhase(M.failure ? 'done' : 'choose');
  }

  if (s === 'TRANSMISSION' && Game.phase === 'sending' && Game.phaseT >= Scenes.TX_TIME) {
    const chips = transmit(M.selectedTransmission);
    if (M.failure) Sfx.failure(); else Sfx.confirm();
    UI.toast('DOWNLINK RESULT', chips);
    Game.setPhase('done');
  }
}

// ---------------------------------------------------------------- actions
const ACTIONS = {
  start() { Sfx.startMusic(); Sfx.confirm(); Game.go('BRIEFING'); },
  explore() { Sfx.startMusic(); Sfx.confirm(); Game.go('EXPLORE'); },
  'back-explore'() { Sfx.click(); Game.go('EXPLORE'); },
  'to-mission'() { Sfx.confirm(); Game.go('BRIEFING'); },
  defocus() {
    Sfx.click();
    Game.focusBody = null;
    Draw.Cam.tween(0, 0.4, 1, 1.1);
    UI.render();
  },
  'to-objective'() { Sfx.click(); Game.go('OBJECTIVE'); },
  'to-target'() { Sfx.click(); Game.go('TARGET'); },
  'to-design'() { Sfx.click(); Game.go('DESIGN'); },
  pick(el) {
    const g = el.dataset.group, id = el.dataset.id;
    const isNew = !Game.sel[g];
    Game.sel[g] = id;
    if (isNew && DEPLOY_KEYS.includes(g)) {
      Game.foldAt[g] = Game.t; Game.deploys[g] = 0;
      Game.foldFlash = Game.t;
      Sfx.fold();
    } else Sfx.select();
    UI.render();
  },
  review() { if (computeDesign(Game.sel).complete) Game.go('DESIGN_REVIEW'); },
  redesign() { Sfx.click(); Game.go('DESIGN'); },
  'to-trajectory'() { if (Game.review && Game.review.ok) { Sfx.click(); Game.go('TRAJECTORY'); } },
  'to-transfer'() { Sfx.click(); Game.go('TRANSFER'); },
  'to-orbit'() { Sfx.click(); Game.go('ORBIT_DECISION'); },
  'to-survey'() { Sfx.click(); Game.go('SURVEY'); },
  plan() { Sfx.click(); Game.setPhase('choose'); },
  unplan() { Sfx.click(); Game.setPhase('brief'); },
  choose(el) {
    if (el.disabled) return;
    Game.choice = el.dataset.id;
    Game.preview = el.dataset.id;
    if (Game.state === 'TARGET') M.region = el.dataset.id;
    if (Game.state === 'OBJECTIVE') M.objective = el.dataset.id;
    if (Game.state === 'TRAJECTORY') Game.travelMode = el.dataset.id;
    Sfx.select();
    UI.render();
  },
  confirm() {
    const id = Game.choice, s = Game.state;
    if (!id) return;
    if (Game.phase === 'hazard') { resolveActiveHazard(id); return; }
    if (Game.phase !== 'choose') return;
    Sfx.confirm();
    if (s === 'OBJECTIVE') {
      M.objective = id;
      Game.go('TARGET');
    } else if (s === 'TARGET') {
      M.region = id;
      Game.go('DESIGN');
    } else if (s === 'TRAJECTORY') {
      const d = computeDesign(Game.sel);
      if (d.fuel - travelPlan(id, d.mass, M.selectedEngine || Game.sel.engine).fuelTotal < RULES.minArrivalFuel) return;
      Game.travelMode = id;
      Game.go('LAUNCH');
    } else if (s === 'ORBIT_DECISION') {
      if (!orbitAllowed(id)) return;
      const chips = chooseOrbit(id);
      Sfx.burn(1.8);
      UI.toast(ORBITS[id].name.toUpperCase(), chips);
      Game.setPhase('inserting');
    } else if (s === 'SURVEY') {
      M.selectedObservation = id;
      Sfx.scan(Scenes.SCAN_TIME);
      Game.setPhase('scanning');
    } else if (s === 'MISSION_EVENT') {
      const chips = chooseEvent(id);
      UI.toast(`OPTION ${EVENT.options[id].key}`, chips);
      Game.setPhase('done');
    } else if (s === 'TRANSMISSION') {
      M.selectedTransmission = id;
      Sfx.transmit(Scenes.TX_TIME, id === 'full');
      Game.setPhase('sending');
    }
  },
  'resume-hazard'() { Sfx.click(); if (M.failure) Game.go('RESULT'); else resumeFromHazard(); },
  'to-event'() { Sfx.click(); Game.go(M.failure ? 'RESULT' : 'MISSION_EVENT'); },
  'to-transmission'() { Sfx.click(); Game.go('TRANSMISSION'); },
  'to-result'() { Sfx.click(); Game.go('RESULT'); },
  'to-report'() { Sfx.click(); Game.go('REPORT'); },
  replay() {
    Sfx.confirm();
    resetMission();
    Game.sel = newSel(); Game.deploys = {}; Game.foldAt = {};
    Game.travelMode = null;
    Game.review = null; Game.lastGain = 0; Game.eventDrain = 0; Game.hazard = null; Game.hazardFired = {};
    Draw.clearParticles();
    Game.go('BRIEFING');
  },
  title() { Sfx.click(); Game.go('TITLE'); },
  mute() { Sfx.init(); Sfx.startMusic(); Sfx.toggleMute(); UI.setMuteLabel(); },
};

// ---------------------------------------------------------------- canvas input (explore)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

function fit() {
  const s = Math.min(window.innerWidth / Draw.W, window.innerHeight / Draw.H);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  const q = Math.max(1, Math.min(2, s * (window.devicePixelRatio || 1)));
  canvas.width = Math.round(Draw.W * q);
  canvas.height = Math.round(Draw.H * q);
  ctx.setTransform(q, 0, 0, q, 0, 0);
}

let dragging = false, dragMoved = 0, lastMouse = null;

function onMove(e) {
  const r = canvas.getBoundingClientRect();
  const sc = Draw.W / r.width;
  const x = (e.clientX - r.left) * sc, y = (e.clientY - r.top) * sc;
  lastMouse = { x, y };
  if (Game.state !== 'EXPLORE') return;
  if (dragging) {
    const Cam = Draw.Cam;
    const wx = -(x - lastMouseDown.x) / (Draw.SYS.ppa * Cam.z), wy = -(y - lastMouseDown.y) / (Draw.SYS.ppa * Cam.z);
    if (dragMoved > 6) {
      Cam.tx = Cam.startTx + wx; Cam.ty = Cam.startTy + wy;
      Cam.x = Cam.tx; Cam.y = Cam.ty;
      Game.hoverBody = null;
      return;
    }
  }
  const body = Draw.hitTest(x, y);
  if (body !== Game.hoverBody) {
    Game.hoverBody = body;
    if (body) Sfx.ping(body === 'Moon' ? 900 : 1500);
    UI.render();
  }
}

let lastMouseDown = null;
function onDown(e) {
  if (Game.state !== 'EXPLORE') return;
  const r = canvas.getBoundingClientRect();
  const sc = Draw.W / r.width;
  const x = (e.clientX - r.left) * sc, y = (e.clientY - r.top) * sc;
  lastMouseDown = { x, y };
  const Cam = Draw.Cam;
  Cam.startTx = Cam.tx; Cam.startTy = Cam.ty;
  dragging = true; dragMoved = 0;
}

function onUp() { dragging = false; }

function onWheel(e) {
  if (Game.state !== 'EXPLORE' && Game.state !== 'MOONVIEW') return;
  e.preventDefault();
  const Cam = Draw.Cam;
  const f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
  const nz = MathX.clamp(Cam.tz * f, 0.5, 14);
  Cam.tween(Cam.tx, Cam.ty, nz, 0.25);
}

function onCanvasClick(e) {
  if (Game.state !== 'EXPLORE') return;
  if (dragMoved > 6) return;
  const r = canvas.getBoundingClientRect();
  const sc = Draw.W / r.width;
  const x = (e.clientX - r.left) * sc, y = (e.clientY - r.top) * sc;
  const body = Draw.hitTest(x, y);
  if (!body) { return; }
  Sfx.confirm();
  if (body === 'Moon') {
    Game.focusBody = 'Moon';
    Game.go('MOONVIEW');
    return;
  }
  Game.focusBody = body;
  const pos = Astro.planetPos(body, Astro.epochDays() + Game.simDays);
  if (pos) Draw.Cam.tween(pos.x, pos.y, 2.2, 1.1);
  Sfx.whoosh(1.0);
  UI.render();
}

// ---------------------------------------------------------------- DOM input
function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el);
}

function onHover(e) {
  const el = e.target.closest('.opt');
  const id = el && !el.disabled ? el.dataset.id : null;
  if (Game.phase === 'choose' || Game.phase === 'hazard') Game.preview = id || Game.choice;
}

function onKey(e) {
  if (e.key === 'm' || e.key === 'M') { ACTIONS.mute(); return; }
  if (e.key === 'Escape') {
    if (Game.state === 'EXPLORE' && Game.focusBody) ACTIONS.defocus();
    if (Game.state === 'MOONVIEW') ACTIONS['back-explore']();
    return;
  }
  if (e.key === '+' || e.key === '=') { onWheel({ deltaY: -100, preventDefault() {} }); return; }
  if (e.key === '-') { onWheel({ deltaY: 100, preventDefault() {} }); return; }
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const panel = document.getElementById('panel');
  const opts = [...panel.querySelectorAll('.opt')];
  const idx = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
  if (idx != null && opts[idx] && !opts[idx].disabled) opts[idx].click();
}

// ---------------------------------------------------------------- main loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  Scenes.frame(ctx, Game.t, dt);
  requestAnimationFrame(loop);
}

async function boot() {
  Draw.init();
  fit();
  window.addEventListener('resize', fit);
  stage.addEventListener('click', onClick);
  stage.addEventListener('mouseover', onHover);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('click', onCanvasClick);
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', () => Sfx.init(), { once: true });
  await NasaData.load();
  // astronomy: build Kepler element map from the dataset, set epoch
  const elMap = {};
  for (const name of ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']) {
    const g = (param, fallback) => {
      const r = NasaData.get(`${name}|${param}`, 'elements');
      const v = r ? Number(r.value) : NaN;
      return isFinite(v) ? v : fallback;
    };
    elMap[name] = {
      a: g('Semi-major axis', 1), e: g('Eccentricity', 0),
      i: g('Inclination to ecliptic', 0), L: g('Mean longitude at J2000', 0),
      peri: g('Longitude of perihelion', 0), node: g('Longitude of ascending node', 0),
      T: g('Orbital period', 1),
    };
  }
  Astro.setElements(elMap);
  Astro.setEpoch(Date.UTC(2026, 10, 10));   // mission epoch: 2026-11-10
  setEarthMoon({
    mean: NasaData.num('Semi-major axis (mean Earth-Moon distance)', 'orbit'),
    perigee: NasaData.num('Perigee (closest)', 'orbit'),
    apogee: NasaData.num('Apogee (farthest)', 'orbit'),
  });
  resetMission();
  const delay = NasaData.num('One-way light/radio delay at mean distance', 'orbit');
  const dist = NasaData.num('Mean distance from Earth (semi-major axis)');
  Game.signalDelay = !isNaN(delay) ? delay : isNaN(dist) ? 0 : dist / 299792.458;
  UI.setMuteLabel();
  document.getElementById('loading').remove();
  Game.go('TITLE');
  requestAnimationFrame(loop);
}

boot();
