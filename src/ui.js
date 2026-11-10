// LUNARIS HTML overlay: HUD, phase tracker, decision panels, explore cards,
// debrief report, mission history (LEARN). Panels rebuild only on state/phase/selection changes.

const UI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MINUS = '−';
  const show = (key, ds) => esc(NasaData.show(key, ds || 'moon'));

  // ------------------------------------------------------------ small builders
  const chips = list => `<span class="chips">${list.map(c => `<span class="chip ${c.tone}">${esc(c.t)}</span>`).join('')}</span>`;

  function btn(label, act, o = {}) {
    return `<button class="btn ${o.cls || ''}" data-act="${act}" ${o.id ? `data-id="${o.id}"` : ''} ${o.primary ? 'data-primary' : ''} ${o.disabled ? 'disabled' : ''}>${label}</button>`;
  }

  function header(kicker, title, sub) {
    return `<div class="ph"><div class="kicker">${kicker}</div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;
  }

  function tag(conf) { return `<em class="tag ${conf}">${NasaData.TAGS[conf]}</em>`; }
  function src(r) { return r ? ` title="Source: ${esc(r.source_name)} - ${esc(r.source_url)}"` : ''; }

  function dRow(label, key, ds = 'moon', fmt = null, conf = null) {
    const r = NasaData.get(key, ds);
    if (!r) return `<div class="drow"><span class="dl">${label}</span><span class="dv">data unavailable</span></div>`;
    const v = show(key, ds);
    return `<div class="drow"${src(r)}><span class="dl">${label}</span><span class="dv">${fmt ? fmt(v, r) : v}${tag(conf || r.confidence)}</span></div>`;
  }

  function halfDay() {
    const syn = NasaData.num('Synodic period (sunrise to sunrise)');
    return isNaN(syn) ? null : (syn / 2).toFixed(1);
  }

  // NASA DATA -> interpretation -> gameplay consequence
  function insight(dataHtml, meaning, game) {
    return `<div class="insight">
      <div class="i-row"><span class="i-k">NASA DATA</span><span>${dataHtml}</span></div>
      <div class="i-row"><span class="i-k">MEANING</span><span>${meaning}</span></div>
      <div class="i-row"><span class="i-k game">GAME EFFECT</span><span>${game}</span></div>
    </div>`;
  }

  function sources(list) {
    const seen = new Map();
    for (const ref of list) {
      const [k, ds] = Array.isArray(ref) ? ref : [ref, 'moon'];
      const r = NasaData.get(k, ds);
      if (r && !seen.has(r.source_url)) seen.set(r.source_url, r.source_name);
    }
    if (!seen.size) return '';
    return `<details class="sources"><summary>Sources (${seen.size})</summary><ul>${[...seen].map(([u, n]) =>
      `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a></li>`).join('')}</ul></details>`;
  }

  function option(o) {
    return `<button class="opt ${o.selected ? 'selected' : ''} ${o.kit ? 'kitopt' : ''}" data-act="${o.act || 'choose'}" data-id="${o.id}" ${o.group ? `data-group="${o.group}"` : ''} aria-pressed="${!!o.selected}" ${o.disabled ? 'disabled' : ''}>
      <span class="opt-top">${o.key ? `<span class="opt-key">${o.key}</span>` : ''}<span class="opt-name">${o.name}</span>${o.badge ? `<span class="opt-badge">${o.badge}</span>` : ''}${o.selected ? '<span class="opt-sel">SELECTED</span>' : ''}</span>
      ${o.desc ? `<span class="opt-desc">${o.desc}</span>` : ''}
      ${o.chips ? chips(o.chips) : ''}
      ${o.warn ? `<span class="opt-warn">⚠ ${o.warn}</span>` : ''}
    </button>`;
  }

  const powerWarn = (fx, final) => {
    const after = M.power + (fx.power || 0);
    if (fx.power && after <= 0) return 'Would drain ALL power - spacecraft lost';
    if (final && after < RULES.healthyPower) return `Ends at ${after}% power - health objective (≥ ${RULES.healthyPower}%) missed`;
    if (fx.power && after < RULES.lowPower) return `Power would fall below ${RULES.lowPower}% (+${rk(10)} risk)`;
    return '';
  };

  function powerPlan(extra) {
    const need = RULES.healthyPower + txCost('compressed'), needFull = RULES.healthyPower + txCost('full');
    return `<p class="plan"><b>Power plan</b>Now ${M.power}%. ${extra || ''}Keep ≈${need}% for a compressed or ≈${needFull}% for a full downlink to end healthy.</p>`;
  }

  function conditionCard(compact) {
    const sc = scenario();
    const r = sc.nasa ? NasaData.get(sc.nasa) : null;
    return `<div class="cond">
      <div class="cond-h"><span class="cond-i">${sc.icon}</span><span><small>MISSION CONDITION · RANDOM EACH RUN</small><b>${sc.name}</b></span></div>
      ${compact ? '' : `<p>${sc.brief}</p>`}
      <ul>${sc.effects.map(e => `<li>${e}</li>`).join('')}</ul>
      ${r && !compact ? `<div class="drow"${src(r)}><span class="dl">${sc.nasaLabel}</span><span class="dv">${show(sc.nasa)}${tag(r.confidence)}</span></div>` : ''}
    </div>`;
  }

  function objectiveList(obj) {
    const items = obj && obj.length ? obj : [
      { label: `Return ≥ ${scienceGoal()} science to Earth` },
      { label: `Spacecraft healthy at the end (power ≥ ${RULES.healthyPower}%)` },
      { label: `Keep a fuel reserve ≥ ${RULES.fuelReserve}%` },
    ];
    return `<ol class="objs">${items.map(o => `<li class="${o.ok === true ? 'ok' : o.ok === false ? 'bad' : ''}"><span>${o.ok === true ? '✓' : o.ok === false ? '✗' : '○'}</span>${o.label}${o.value != null ? ` <em>${o.value}</em>` : ''}</li>`).join('')}</ol>`;
  }

  // Pre-launch threat forecast (odds depend on target, condition and orbit).
  function threatStrip() {
    const list = threatForecast().sort((a, b) => b.p - a.p);
    return `<div class="threats"><span class="th-l">THREAT FORECAST</span>${list.map(t =>
      `<span class="threat ${t.level.toLowerCase()}" title="${esc(t.name)}: ~${Math.round(t.p * 100)}% chance${t.lowOnly ? ' (mostly in low orbit)' : ''}. Counter: ${t.kit ? esc(t.kit.name) : 'none'} - ${t.kitSelected ? 'INSTALLED' : 'not on board'}">${HAZARDS[t.id].icon} ${t.name.split(' ')[t.id === 'seu' ? 1 : 0]} <b>${t.level === 'MODERATE' ? 'MOD' : t.level}</b>${t.lowOnly ? '*' : ''}</span>`).join('')}</div>`;
  }

  // ------------------------------------------------------------ site data (from all datasets)
  function siteRows(reg) {
    const rows = [];
    if (reg.dataKey) rows.push(dRow('Landing coordinates', reg.dataKey, 'regions', () => esc(NasaData.coords(NasaData.get(reg.dataKey, 'regions')) || 'coordinates unavailable')));
    (reg.data || []).forEach((key, i) => {
      const ds = (reg.dataDs || [])[i] || 'moon';
      let label = key.split('|').pop();
      if (key.includes(' - ')) label = key.split(' - ')[0];
      const r = NasaData.get(key, ds);
      if (r && r.dataset === 'craters') label = `${r.name} crater`;
      if (r && r.dataset === 'moon' && key.startsWith('Radiation')) label = 'Apollo surface dose';
      rows.push(dRow(label.charAt(0).toUpperCase() + label.slice(1), key, ds));
    });
    return rows;
  }

  const bestInstrument = objId => {
    const best = OBJECTIVES[objId].instruments;
    return Object.entries(best).filter(([k, v]) => v >= Math.max(...Object.values(best))).map(([k]) => INSTRUMENTS[k].name).join(', ');
  };

  // ------------------------------------------------------------ NASA facts feed
  const FACTS = [
    () => { const e = NasaData.num('Earth|Escape velocity', 'orbit'), m = NasaData.num('Escape velocity'); return [`Leaving Earth needs ${show('Earth|Escape velocity', 'orbit')} - about ${(e / m).toFixed(1)}× the Moon's ${show('Escape velocity')}.`, 'derived']; },
    () => [`The Moon's distance swings between ${show('Perigee (closest)', 'orbit')} and ${show('Apogee (farthest)', 'orbit')} every orbit.`, 'nasa'],
    () => [`The Moon drifts ${show('Recession rate from Earth', 'orbit')} farther from Earth every year.`, 'nasa'],
    () => [`The Moon turns once every ${show('Moon orbit|Sidereal rotation period', 'orbit')} - exactly one orbit - so the same face always points at Earth.`, 'nasa'],
    () => [`Earth and Moon circle a shared centre ${show("Barycenter distance from Earth's center", 'orbit')} from Earth's centre - inside Earth (radius ${show('Equatorial radius', 'orbit')}).`, 'derived'],
    () => [`The Moon's orbit is tilted ${show('Inclination to ecliptic', 'orbit')} to Earth's orbit - so eclipses don't happen every month.`, 'nasa'],
    () => [`Average lunar dust grain: ${show('Average particle size', 'dust')} - ${show('Particle shape', 'dust').toLowerCase()} and abrasive to seals.`, 'nasa'],
    () => [`A dust layer of ${show('Dust covering that halves solar-cell output', 'dust')} can halve a solar cell's output.`, 'nasa'],
    () => [`Over ${show('Whole Moon|Known pits', 'regions').replace(' count', '')} pits are known on the Moon; ${esc((NasaData.get('Whole Moon|Known pits', 'regions') || {}).game_note || '')}.`, 'nasa'],
    () => [`The farside crust is ${show('Farside|Crust thickness', 'regions')} thick versus ${show('Nearside|Crust thickness', 'regions')} on the nearside.`, 'nasa'],
    () => [`Radio signals take ${show('One-way light/radio delay at mean distance', 'orbit')} to cross the Earth-Moon gap.`, 'derived'],
    () => [`Apollo seismometers logged ${show('Apollo seismic network|Total recorded events', 'quakes')} events in 8 years - including ${show('Deep moonquakes|Count', 'quakes')} deep moonquakes 700-1200 km down.`, 'nasa'],
    () => [`The Apollo 12 lander impact made the Moon "ring like a bell": shaking continued for ${show('Moonquake physics|Shaking duration (impacts)', 'quakes')}.`, 'nasa'],
    () => [`Bound oxygen makes up ${show('Regolith (bulk soil)|Oxygen bound in oxides', 'resources')} of lunar soil by weight - the feedstock for future ISRU plants.`, 'nasa'],
    () => [`Mare regolith holds an estimated ${show('Helium-3|Concentration in mare regolith', 'resources')} of helium-3 - a potential fusion fuel with no terrestrial supply.`, 'estimate'],
    () => [`Radar mapped ice deposits holding at least ${show('Mini-SAR (Chandrayaan-1, 2009-10)|Radar-detected ice deposits, north pole', 'ice')} in small north-polar craters.`, 'estimate'],
    () => [`Permanently shadowed crater floors stay at ${show('Permanently shadowed regions|Measured floor temperatures', 'temps')} - colder than Pluto's average.`, 'nasa'],
    () => [`Apollo 11 took ${show('Apollo 11|Transfer Earth orbit -> Moon', 'transfers')} from Earth orbit to the Moon - the calibration point for a BALANCED transfer.`, 'estimate'],
    () => [`Artemis II flew a ${show('Artemis II|Crewed lunar flyby, mission duration', 'transfers')} crewed lunar flyby in 2026 - the first crewed Moon mission in over 50 years.`, 'nasa'],
    () => [`Mare Imbrium spans ${show('Mare Imbrium', 'maria')} - one of ${NasaData.rows('maria').length} mapped lunar maria.`, 'approx'],
    () => [`Tycho crater is ${show('Tycho', 'craters')} across, with bright rays stretching over 1,500 km.`, 'approx'],
    () => [`So far ${NasaData.rows('sites').length} landing sites are logged in this game's dataset - from Luna 2 (1959) to Chang'e 6 (2024).`, 'nasa'],
    () => [`The LCROSS impact plume contained ${show('Water in LCROSS impact plume (Cabeus crater; south pole)', 'moon')} water - some grains nearly pure ice.`, 'approx'],
    () => [`The Moon's surface temperature swings ${show('Equatorial surface|Diurnal swing', 'temps')} between day and night - thermal design is a core trade-off.`, 'approx'],
  ];
  let factIdx = Math.floor(Math.random() * FACTS.length), factAt = 0;
  function factHtml() {
    let f;
    try { f = FACTS[factIdx % FACTS.length](); } catch (e) { f = null; }
    if (!f || /unavailable/.test(f[0])) return '';
    return `<span class="f-k">DID YOU KNOW</span><span class="f-t">${f[0]}</span>${tag(f[1])}`;
  }
  const factBox = () => `<div class="fact" id="fact">${factHtml()}</div>`;
  function tickFact(t) {
    if (t - factAt < 7) return;
    factAt = t;
    const el = $('fact');
    if (!el) return;
    factIdx++;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    el.innerHTML = factHtml();
  }

  // ------------------------------------------------------------ panels per state
  const P = {};

  P.TITLE = () => {
    const n = NasaData.count();
    return {
      cls: 'title', html: `
      <div class="title-block">
        <div class="kicker">NASA SPACE APPS CHALLENGE 2026 · SPACE MISSION DESIGN GAME</div>
        <h1>LUNARIS</h1>
        <div class="title-sub">DESIGN BEYOND EARTH</div>
        <p class="tagline">Explore the solar system. Choose the mission. Engineer the spacecraft. Discover the consequences.<br>
        A continuous engineering story - not a collection of menus.</p>
        <div class="actions" style="justify-content:center">
          ${btn('EXPLORE THE SOLAR SYSTEM', 'explore', { cls: 'go', primary: true })}
        </div>
        ${btn('SKIP EXPLORATION · START MISSION', 'start')}
        <p class="fine">${n ? `${Object.keys(NasaData.DATASETS).length} NASA-sourced datasets loaded · ${n} values (${NasaData.origin === 'csv' ? 'local CSV' : 'embedded copy of local CSV'})` : '⚠ datasets could not be loaded'} · Sound optional (M)</p>
      </div>` };
  };

  // ---- explore: body info card
  P.EXPLORE = () => {
    const b = Game.focusBody;
    if (!b) {
      return { cls: 'explore-card hidden', html: '' };
    }
    if (b === 'Moon') {
      return {
        cls: 'explore-card', html: `
        <div class="head"><b>THE MOON</b><span>MISSION TARGET</span></div>
        <div class="data">
          ${dRow('Class', 'Moon|Class', 'bodies')}
          ${dRow('Diameter', 'Moon|Diameter', 'bodies')}
          ${dRow('Surface gravity', 'Moon|Surface gravity', 'bodies', v => `${v} · ${show('Moon|Gravity relative to Earth', 'bodies')} of Earth`)}
          ${dRow('Distance from Earth', 'Moon|Distance from Earth', 'bodies')}
          ${dRow('Rotation = orbit', 'Moon|Rotation period', 'bodies', v => `${v} (tidally locked)`)}
          ${dRow('Water in polar plume', 'Water in LCROSS impact plume (Cabeus crater; south pole)', 'moon')}
        </div>
        <p class="note">The same face always points at Earth; the far side never does. Water ice hides in permanently shadowed polar craters - your science objective will decide where to look.</p>
        ${btn('BEGIN MISSION PLANNING', 'to-mission', { cls: 'go', primary: true })}
        ${btn('BACK TO SOLAR SYSTEM', 'defocus', { cls: 'ghost' })}` };
    }
    const rows = ['Class', 'Mass', 'Diameter', 'Surface gravity', 'Escape velocity', 'Rotation period', 'Distance from Sun', 'Orbital period', 'Mean temperature', 'Known moons', 'Ring system']
      .filter(k => NasaData.get(`${b}|${k}`, 'bodies'))
      .map(k => dRow(k, `${b}|${k}`, 'bodies'));
    const note = (NasaData.get(`${b}|Class`, 'bodies') || {}).game_note || '';
    return {
      cls: 'explore-card', html: `
      <div class="head"><b>${b.toUpperCase()}</b>${b === 'Earth' ? '<span>HOME</span>' : ''}</div>
      <div class="data">${rows.join('')}</div>
      <p class="note">${esc(note)} Values from the NASA planetary fact sheet (hover a row for its source).</p>
      ${btn('DEFOCUS', 'defocus', { cls: 'ghost' })}` };
  };

  P.MOONVIEW = () => {
    const phase = Astro.moonPhaseName(Astro.moonPhase(Astro.epochDays() + Game.simDays));
    const lit = Math.round(Astro.moonLitFraction(Astro.moonPhase(Astro.epochDays() + Game.simDays)) * 100);
    return {
      cls: 'explore-card', html: `
      <div class="head"><b>THE MOON</b><span>MISSION TARGET</span></div>
      <p class="pitch">Earth's only natural satellite. One orbit = one rotation: the near side always faces home, the far side never does.</p>
      <div class="data">
        ${dRow('Diameter', 'Moon|Diameter', 'bodies')}
        ${dRow('Surface gravity', 'Moon|Surface gravity', 'bodies', v => `${v} · ${show('Moon|Gravity relative to Earth', 'bodies')} of Earth`)}
        ${dRow('Escape velocity', 'Moon|Escape velocity', 'bodies', v => `${v} vs Earth's ${show('Earth|Escape velocity', 'bodies')}`)}
        ${dRow('Rotation (sidereal)', 'Moon|Rotation period', 'bodies')}
        <div class="drow"><span class="dl">Modelled phase now</span><span class="dv">${esc(phase)} · ${lit}% lit${tag('derived')}</span></div>
        ${dRow('Water (LCROSS plume)', 'Water in LCROSS impact plume (Cabeus crater; south pole)', 'moon')}
      </div>
      <p class="note">Phase and illumination are computed from a simplified mean-motion model (game layer). Physical values are NASA data.</p>
      ${btn('BEGIN MISSION PLANNING', 'to-mission', { cls: 'go', primary: true })}
      ${btn('BACK TO SOLAR SYSTEM', 'back-explore', { cls: 'ghost' })}` };
  };

  P.BRIEFING = () => ({
    cls: 'right', html: `
    ${header('MISSION BRIEFING', 'You are the Mission Director', 'Pick a science objective and a survey site, engineer LUNARIS-01, survive the flight, and bring the data home. You never fly the spacecraft - you make the calls.')}
    ${conditionCard()}
    <div class="lbl">OBJECTIVES · ALL THREE FOR FULL SUCCESS</div>
    ${objectiveList()}
    <div class="kvs">
      <div class="kv"><span>Budget cap</span><b>$${budgetCap()}M</b></div>
      <div class="kv"><span>In-flight hazards</span><b>2 random · odds shown before launch</b></div>
      <div class="kv"><span>Risk</span><b>≥ ${RULES.riskHigh} data loss · ≥ ${RULES.riskCritical} mission lost</b></div>
    </div>
    <p class="note">▲ benefit · ▼ cost. Every option shows both before you commit. Budget, power, fuel and risk figures are a simplified game model.</p>
    ${btn('CHOOSE THE SCIENCE OBJECTIVE', 'to-objective', { cls: 'go', primary: true })}` });

  P.OBJECTIVE = () => {
    const opts = Object.values(OBJECTIVES).map((o, k) => {
      const on = M.objective === o.id;
      return option({
        id: o.id, key: k + 1, name: `${o.icon} ${o.name}`, desc: on ? `<i>${o.question}</i>` : '',
        chips: on ? [{ t: `▲ ${bestInstrument(o.id)} +${Math.max(...Object.values(o.instruments))} per scan`, tone: 'good' },
                    { t: `▼ Data ×${o.dataRate.toFixed(2)} GB per science point`, tone: 'bad' }] : null,
        badge: on ? 'BEST: ' + bestInstrument(o.id).toUpperCase() : '',
        selected: on,
      });
    }).join('');
    const obj = OBJECTIVES[M.objective];
    const detail = obj ? `
      <div class="lbl">${obj.name.toUpperCase()} · WHY IT MATTERS</div>
      <div class="data">
        <div class="drow"><span class="dl">${obj.nasa.label}</span><span class="dv">${show(obj.nasa.key, obj.nasa.ds)}${tag(NasaData.get(obj.nasa.key, obj.nasa.ds).confidence)}</span></div>
      </div>
      <p class="pitch">${esc(obj.nasa.note)}</p>
      <div class="chain"><span class="cause">${obj.consequence.split('.')[0]}</span><span class="arrow">→</span><span class="effect">${obj.consequence.split('.').slice(1).join('.').trim() || 'drives the design'}</span></div>
      ${sources([[obj.nasa.key, obj.nasa.ds]])}` : '<p class="note">Select an objective to see its NASA grounding. The objective decides which instrument, site and data system make sense.</p>';
    return {
      cls: 'right', html: `
      ${header('CHOOSE · STEP 1 OF 2', 'The Science Question', `Condition: <b>${scenario().name}</b>. First decide what to learn - then where to learn it. Each objective rewards a different instrument.`)}
      <div class="opts compact">${opts}</div>
      ${detail}
      ${btn(obj ? `OBJECTIVE SET: ${obj.name.toUpperCase()} · CHOOSE SITE` : 'SELECT AN OBJECTIVE', 'confirm', { cls: 'go', primary: true, disabled: !obj })}` };
  };

  P.TARGET = () => {
    const opts = Object.values(SITES).map((reg, k) => {
      const on = M.region === reg.id;
      const mult = (reg.obj || {})[M.objective] || 1;
      return option({
        id: reg.id, key: k + 1, name: reg.name, desc: on ? reg.kind : '',
        chips: on ? [{ t: `▲ ${reg.gain}`, tone: 'good' }, { t: `▼ ${reg.loss}`, tone: 'bad' },
                    { t: `${mult > 1 ? '▲' : mult < 1 ? '▼' : '•'} ${OBJECTIVES[M.objective].name} science ×${mult}`, tone: mult > 1 ? 'good' : mult < 1 ? 'bad' : 'neutral' }] : null,
        badge: mult > 1.04 ? 'STRONG FIT' : mult < 0.96 ? 'POOR FIT' : '', selected: on,
      });
    }).join('');
    const reg = SITES[M.region];
    const detail = reg ? `
      <div class="lbl">${reg.name.toUpperCase()} · NASA DATA</div>
      <p class="pitch">${reg.pitch}</p>
      <div class="data">${siteRows(reg).slice(0, 4).join('')}</div>
      ${sources((reg.data || []).map((k, i) => [k, (reg.dataDs || [])[i] || 'moon']))}` : '<p class="note">Select a site to see its NASA data. The site decides hazards, temperature drain and communication conditions.</p>';
    return {
      cls: 'right target', html: `
      ${header('CHOOSE · STEP 2 OF 2', 'Choose the Survey Site', `Objective: <b>${OBJECTIVES[M.objective].name}</b>. Each region rewards a different pairing and brings different risks.`)}
      <div class="opts compact">${opts}</div>
      ${detail}
      ${btn(reg ? `TARGET ${reg.short} · ENGINEER SPACECRAFT` : 'SELECT A SITE', 'confirm', { cls: 'go', primary: true, disabled: !reg })}` };
  };

  function designCard(group, o, selected, stat, badge) {
    return `<button class="dcard ${selected ? 'selected' : ''}" data-act="pick" data-group="${group}" data-id="${o.id}" aria-pressed="${selected}">
      <span class="dc-name"><span>${o.name}${selected ? ' <i>✓</i>' : ''}</span>${badge || ''}</span>
      <span class="dc-stat">${stat}</span>
      <span class="dc-gain">▲ ${o.gain}</span>
      ${o.loss ? `<span class="dc-loss">▼ ${o.loss}</span>` : ''}
    </button>`;
  }

  function tile(label, value, sub, ok) {
    const mark = ok === true ? '<i class="ok">✓</i>' : ok === false ? '<i class="bad">✗</i>' : '';
    return `<div class="tile ${ok === false ? 'bad' : ''}"><span class="t-l">${label} ${mark}</span><b>${value}</b><span class="t-s">${sub}</span></div>`;
  }

  P.DESIGN = () => {
    const s = Game.sel, d = computeDesign(s), reg = site(), obj = objective();
    const dash = '—';
    const mk = (group, table, statFn) => Object.values(table).map(o => designCard(group, o, s[group] === o.id, statFn(o))).join('');
    const threats = threatForecast();
    const groups = [
      ['1 · LAUNCH VEHICLE', 'vehicle', VEHICLES, o => `$${o.cost}M · ≤${o.capacity} kg · fuel ${o.fuel}%`],
      ['2 · PROPULSION MODULE', 'engine', ENGINES, o => `$${o.cost}M · ${o.mass} kg · burns ×${o.fuelMult}`],
      ['3 · POWER SYSTEM', 'power', POWER_SYSTEMS, o => `$${o.cost}M · ${o.mass} kg · power ${o.power}%`],
      ['4 · THERMAL PROTECTION', 'thermal', THERMALS, o => `$${o.cost}M · ${o.mass} kg · drain ×${o.drainMult}`],
      ['5 · COMMUNICATIONS', 'comms', COMMS, o => `$${o.cost}M · ${o.mass} kg · comm +${o.comm}`],
      ['6 · NAVIGATION', 'nav', NAVS, o => `$${o.cost}M · ${o.mass} kg${o.science ? ` · +${o.science} scan` : ''}`],
      ['7 · SCIENCE PAYLOAD', 'payload', INSTRUMENTS, o => {
        const b = instrBonus(o);
        return `$${o.cost}M · ${o.mass} kg · power ${MINUS}${o.draw} · base ${o.scan}`;
      }],
      ['8 · DATA SYSTEM', 'data', DATASYS, o => `$${o.cost}M · ${o.mass} kg · ${o.storage} GB`],
    ];
    const payloadBadges = o => {
      const b = instrBonus(o);
      return `<span class="dc-tgt ${b > 0 ? 'good' : b < 0 ? 'bad' : ''}" title="Science bonus per scan here and for this objective">${b > 0 ? '+' : b < 0 ? MINUS : '±'}${Math.abs(b)}</span>`;
    };
    const sections = groups.map(([title, group, table, stat]) => `
      <div class="group"><h3>${title}</h3><div class="cards${Object.keys(table).length > 4 ? 5 : Object.keys(table).length === 3 ? 3 : 4}">${
        Object.values(table).map(o => designCard(group, o, s[group] === o.id, stat(o), group === 'payload' ? payloadBadges(o) : '')).join('')
      }</div></div>`).join('');
    const tiles = [
      tile('BUDGET USED', `$${d.budgetUsed}M`, `cap $${budgetCap()}M`, d.budgetUsed <= budgetCap()),
      tile('MASS', `${d.mass} kg`, `limit ${d.capacity == null ? dash : d.capacity} kg`, d.capacity == null ? null : d.mass <= d.capacity),
      tile('POWER', d.power == null ? dash : `${d.power}%`, `min ${RULES.minPower}%`, d.power == null ? null : d.power >= RULES.minPower),
      tile('FUEL', d.fuel == null ? dash : `${d.fuel}%`, d.arrivalFuel == null ? 'set by vehicle' : `≈${d.arrivalFuel}% at Moon (balanced)`, d.arrivalFuel == null ? null : d.arrivalFuel >= RULES.minArrivalFuel),
      tile('COMM', `${d.comm}`, `${commLabel(d.comm).toLowerCase()}${reg.side === 'far' ? ' · far side!' : ''}`, null),
      tile('STORAGE', `${d.storage == null ? dash : d.storage} GB`, `scan ≈${d.sciencePotential == null ? dash : Math.round(d.sciencePotential * obj.dataRate)} GB`, d.storage == null || d.sciencePotential == null ? null : d.sciencePotential * obj.dataRate <= d.storage),
      tile('SCIENCE / SCAN', d.sciencePotential == null ? dash : `${d.sciencePotential}`, `standard · goal ${scienceGoal()}`, null),
    ].join('');
    return {
      cls: 'wide', html: `
      ${header(`ENGINEER · ${obj.name.toUpperCase()} AT ${reg.short} <button class="link" data-act="to-objective">change objective</button> <button class="link" data-act="to-target">change site</button>`, 'Origami Spacecraft Engineering', 'Each subsystem unfolds on the craft as you choose it. Every advantage has a cost - shown before you commit.')}
      ${sections}
      ${threatStrip()}
      <div class="tiles">${tiles}</div>
      <div class="actions">${btn(d.complete ? 'RUN DESIGN REVIEW' : 'SELECT EVERY SUBSYSTEM', 'review', { cls: 'go', primary: true, disabled: !d.complete })}</div>` };
  };

  P.DESIGN_REVIEW = () => {
    const rv = Game.review;
    const rows = rv.checks.map(c => `
      <div class="check ${c.ok ? 'ok' : 'bad'}">
        <span class="c-mark">${c.ok ? '✓ OK' : '✗ FAIL'}</span>
        <span class="c-body"><b>${c.label}</b><span>${c.value}</span>${c.ok ? '' : `<span class="c-fix">${c.fix}</span>`}</span>
      </div>`).join('');
    return {
      cls: 'right', html: `
      ${header('ENGINEER · VALIDATION', 'Design Review', rv.ok ? 'All critical constraints satisfied. Objective fit shown for information.' : 'Launch blocked: one or more critical constraints violated.')}
      <div class="checks">${rows}</div>
      <div class="verdict ${rv.ok ? 'ok' : 'bad'}">${rv.ok ? 'GO FOR LAUNCH' : 'NO-GO · RETURN TO DESIGN'}</div>
      ${rv.ok ? threatStrip() : ''}
      <div class="actions">
        ${rv.ok ? btn('PLAN TRAVEL STRATEGY', 'to-trajectory', { cls: 'go', primary: true }) : ''}
        ${btn('MODIFY DESIGN', 'redesign', { primary: !rv.ok })}
      </div>` };
  };

  // ---- Travel strategy
  function travelSummary(tp, fuelNow) {
    return `<div class="travel-sum">
      <div><span>Selected strategy</span><b>${tp.short}</b></div>
      <div><span>Estimated lunar arrival</span><b>${MathX.fmtDuration(tp.hours, true)}</b></div>
      <div><span>Estimated fuel cost</span><b>${tp.fuelTotal}% <small>TLI ${tp.tli} + LOI ${tp.loi}</small></b></div>
      <div><span>Remaining fuel</span><b>${fuelNow - tp.fuelTotal}%</b></div>
    </div>`;
  }
  P.TRAJECTORY = () => {
    const d = computeDesign(Game.sel);
    const engine = M.selectedEngine || (Game.sel && Game.sel.engine);
    const opts = Object.keys(TRAVEL_MODES).map((id, k) => {
      const m = TRAVEL_MODES[id], tp = travelPlan(id, d.mass, engine), left = d.fuel - tp.fuelTotal, ok = left >= RULES.minArrivalFuel;
      const hz = Math.round(tp.hazardChance * 100);
      return option({
        id, key: k + 1, name: m.name, badge: id === 'balanced' ? 'RECOMMENDED' : `FUEL USE ${m.usage}`, desc: `<i>${m.ref}</i>`,
        chips: [{ t: `⏱ ≈${MathX.fmtDuration(tp.hours)}`, tone: 'neutral' }, chip('fuel', -tp.fuelTotal)]
          .concat(tp.cruisePower ? [chip('power', -tp.cruisePower)] : []).concat(tp.risk ? [chip('risk', tp.risk)] : [])
          .concat([{ t: `${hz < 50 ? '▲' : hz > 80 ? '▼' : '•'} Transit hazard ${hz}%`, tone: hz < 50 ? 'good' : hz > 80 ? 'bad' : 'neutral' },
            { t: `${tp.nightFactor < 0.97 ? '▲' : tp.nightFactor > 1.03 ? '▼' : '•'} Night load ×${tp.nightFactor.toFixed(2)}`, tone: tp.nightFactor < 0.97 ? 'good' : tp.nightFactor > 1.03 ? 'bad' : 'neutral' }]),
        selected: Game.choice === id, disabled: !ok,
        warn: !ok ? `Not enough fuel: would arrive with ${left}% (need ${RULES.minArrivalFuel}%)` : left < RULES.fuelReserve + 12 ? `Arrives with only ${left}% fuel` : '',
      });
    }).join('');
    const sel = Game.choice ? travelPlan(Game.choice, d.mass, engine) : null;
    return {
      cls: 'right', html: `
      ${header('OPERATE · TRAVEL STRATEGY <button class="link" data-act="redesign">modify design</button>', 'How Fast to the Moon?', `Faster = more fuel &amp; risk. Slower = saves fuel, but days longer in transit. Launch fuel ${d.fuel}%.`)}
      <div class="opts">${opts}</div>
      ${sel ? travelSummary(sel, d.fuel) : ''}
      ${btn(sel ? `LOCK ${sel.short} · FINAL PRE-LAUNCH CHECKS` : 'SELECT A TRAVEL STRATEGY', 'confirm', { cls: 'go', primary: true, disabled: !sel })}` };
  };

  const POLL = () => [`Objective · ${M.objective ? OBJECTIVES[M.objective].name.toUpperCase() : '—'}`, `Site · ${site().short}`,
    `Vehicle · ${VEHICLES[M.selectedVehicle].name}`,
    `Trajectory · ${M.travel ? M.travel.short : '—'} (locked)`, 'Propellant loaded', 'Range safety', 'Weather', 'Flight director'];
  const POLL_COUNT = 7;
  const LAUNCH_STEPS = ['Final pre-launch checks', 'Countdown T−5', 'Ignition · Liftoff', 'Max-Q · ascent', 'Stage separation', 'Spacecraft separation · arrays unfold', 'Earth orbit reached'];
  P.LAUNCH = () => {
    const i = Game.launchStep, tp = M.travel;
    const list = LAUNCH_STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${k < i ? '✓' : k === i ? '▶' : '○'} ${s}${k === 1 && i === 1 && Game.countdown ? ` · T−${Game.countdown}` : ''}</li>`).join('');
    const pct = Math.round((Math.max(0, i) / (LAUNCH_STEPS.length - 1)) * 100);
    const poll = POLL().map((s, k) => `<li class="${k < Game.pollStep ? 'go' : ''}"><span>${s}</span><b>${k < Game.pollStep ? 'GO' : '…'}</b></li>`).join('');
    const title = i === 0 ? 'Final Pre-Launch Checks' : i === 1 ? `Countdown · T−${Game.countdown || 5}` : VEHICLES[M.selectedVehicle].name;
    return {
      cls: 'right', html: `
      ${header('OPERATE · LAUNCH', title, tp ? `Strategy locked: <b>${tp.short}</b> · est. arrival ${MathX.fmtDuration(tp.hours, true)} · transfer fuel ${tp.fuelTotal}%.` : 'Automatic sequence. No piloting required.')}
      <ul class="poll">${poll}</ul>
      <div class="progress"><i style="width:${pct}%"></i><span>${pct}%</span></div>
      <ol class="steps">${list}</ol>
      ${Game.phase === 'done' ? `<div class="verdict ok">✓ EARTH ORBIT REACHED</div>${btn('BEGIN EARTH ORBIT OPERATIONS', 'to-transfer', { cls: 'go', primary: true })}`
        : `<div class="data">${dRow('Earth escape speed', 'Earth|Escape velocity', 'orbit')}</div>${factBox()}`}` };
  };

  // ---- In-flight hazard panel (shared by TRANSFER and SURVEY)
  function gambleChips(o) {
    const pc = Math.round(o.chance * 100);
    return [{ t: `${pc}%: no damage`, tone: 'good' }, { t: `${100 - pc}%:`, tone: 'bad' }].concat(fxChips(o.bad));
  }
  function hazardPanel() {
    const hz = Game.hazard, h = HAZARDS[hz.id];
    const c = counterFor(h);
    const protectedBy = c.selected;
    const where = hz.slot === 1 ? 'LUNAR TRANSFER' : 'LUNAR SURVEY';
    if (Game.phase === 'hazard') {
      const opts = hazardOptions(hz.id, hz.slot).map((o, k) => option({
        id: o.id, key: k + 1, name: o.name, desc: o.desc, kit: o.isKit,
        badge: o.isKit ? 'SUBSYSTEM' : o.chance != null ? 'GAMBLE' : '',
        chips: o.chance != null ? gambleChips(o) : (fxChips(o.fx).length ? fxChips(o.fx) : [{ t: 'No cost', tone: 'good' }]),
        selected: Game.choice === o.id, warn: powerWarn(o.chance != null ? o.bad : o.fx),
      })).join('');
      return {
        cls: 'right alert', html: `
        ${header(`⚠ HAZARD · ${where}`, h.name, h.brief)}
        ${insight(`${h.nasa.label}: ${show(h.nasa.key, h.nasa.ds)}${NasaData.get(h.nasa.key, h.nasa.ds) ? tag(NasaData.get(h.nasa.key, h.nasa.ds).confidence) : ''}`,
          h.nasa.note + (h.scenarioNote ? ` <i>${h.scenarioNote}</i>` : ''),
          protectedBy ? `Your <b>${c.option.name}</b> unlocks a low-cost response.` : `No matching subsystem on board${c.option ? ` - ${c.option.name} would have helped` : ''}.`)}
        <div class="opts">${opts}</div>
        ${btn(Game.choice ? 'EXECUTE RESPONSE' : 'SELECT A RESPONSE', 'confirm', { cls: 'go', primary: true, disabled: !Game.choice })}` };
    }
    const entry = M.log.filter(l => l.stage === 'Hazard').pop();
    const verdict = hz.outcome === 'lucky' ? 'The gamble paid off.' : hz.outcome === 'unlucky' ? 'The gamble failed.' : hz.opt === 'kit' ? `Your ${c.option.name} did its job.` : 'Handled - at a cost.';
    return {
      cls: M.failure ? 'right alert' : 'right', html: `
      ${header('HAZARD RESOLVED', h.name, verdict)}
      ${entry ? `<div class="logline"><b>${esc(entry.title)}</b>${chips(entry.chips)}<span>${esc(entry.detail)}</span></div>` : ''}
      ${M.failure ? `<div class="verdict bad">✗ ${M.failure}</div>${btn('VIEW MISSION RESULT', 'resume-hazard', { cls: 'warn', primary: true })}`
        : btn(hz.slot === 1 ? 'RESUME LUNAR TRANSFER' : 'RESUME SURVEY', 'resume-hazard', { cls: 'go', primary: true })}` };
  }

  P.TRANSFER = () => {
    if (Game.phase === 'hazard' || Game.phase === 'hazardDone') return hazardPanel();
    const tp = M.travel;
    const plan = tp ? `<div class="kvs">
        <div class="kv"><span>Strategy</span><b>${tp.short} · ${MathX.fmtDuration(tp.hours, true)}</b></div>
        <div class="kv"><span>TLI burn / LOI burn</span><b>${tp.tli}% / ${tp.loi}% fuel</b></div>
        <div class="kv"><span>Transit hazard chance</span><b>${Math.round(tp.hazardChance * 100)}%</b></div>
      </div>` : '';
    if (Game.phase === 'parking') {
      return {
        cls: 'right', html: `
        ${header('OPERATE · EARTH ORBIT', 'Earth Parking Orbit', 'LUNARIS-01 has reached Earth orbit. Two orbits of systems checkout before the trans-lunar injection (TLI) burn.')}
        ${plan}
        ${insight(`Earth escape velocity ${show('Earth|Escape velocity', 'orbit')}${tag('nasa')}.`,
          'Orbit is not enough to reach the Moon: the TLI burn must boost LUNARIS-01 close to Earth\'s escape velocity.',
          `A <b>${tp ? tp.short : ''}</b> transfer spends <b>${tp ? tp.tli : '?'}% fuel</b> on this burn.`)}
        ${factBox()}
        <div class="wait">◌ Orbiting Earth…</div>` };
    }
    if (Game.phase === 'tli') {
      const e = M.log.filter(l => l.title === 'Trans-lunar injection burn').pop();
      return {
        cls: 'right', html: `
        ${header('OPERATE · TRANS-LUNAR INJECTION', 'Engine Burn', `Main engine firing. LUNARIS-01 is accelerating out of Earth orbit onto a ${tp ? tp.name.toLowerCase() : ''} trajectory.`)}
        ${e ? `<div class="logline"><b>${esc(e.title)}</b>${chips(e.chips)}<span>${esc(e.detail)}</span></div>` : ''}
        ${plan}
        <div class="wait">◌ Burning… fuel now ${M.fuel}%</div>` };
    }
    if (Game.phase === 'loi') {
      return {
        cls: M.failure ? 'right alert' : 'right', html: `
        ${header('OPERATE · LUNAR ORBIT INSERTION', M.failure ? 'Capture Failed' : 'Entering Lunar Orbit', M.failure ? '' : `Retro-burn to slow below lunar escape speed: fuel −${tp ? tp.loi : '?'}%.`)}
        ${M.failure ? `<div class="verdict bad">✗ ${M.failure}</div>${btn('VIEW MISSION RESULT', 'to-result', { cls: 'warn', primary: true })}` : `${plan}<div class="wait">◌ Braking…</div>`}` };
    }
    const dist = dRow('Mean distance', 'Semi-major axis (mean Earth-Moon distance)', 'orbit');
    const range = dRow('Range', 'Perigee (closest)', 'orbit', v => `${v} (perigee) to ${show('Apogee (farthest)', 'orbit')} (apogee)`);
    const vel = dRow('Moon speed', 'Moon orbit|Mean orbital velocity', 'orbit', v => `${v} around Earth`);
    const delay = dRow('Radio delay', 'One-way light/radio delay at mean distance', 'orbit', v => `${v} one way`);
    if (Game.phase === 'cruise') {
      return {
        cls: 'right', html: `
        ${header('OPERATE · TRANS-LUNAR COAST', 'Lunar Transfer', `Engine off - coasting to the Moon on a ${tp ? tp.name.toLowerCase() : 'transfer'} (${tp ? MathX.fmtDuration(tp.hours, true) : ''}). Tracking stations are watching for trouble.`)}
        <div class="data">${dist}${range}${vel}${delay}</div>
        ${factBox()}
        <p class="note">Travel is a stylised animation - not a real orbital-mechanics simulation.</p>
        <div class="wait">◌ In transit…</div>` };
    }
    if (M.failure) {
      return {
        cls: 'right alert', html: `
        ${header('OPERATE · LUNAR ORBIT INSERTION', 'Mission Lost at the Moon', '')}
        <div class="verdict bad">✗ ${M.failure}</div>
        ${btn('VIEW MISSION RESULT', 'to-result', { cls: 'warn', primary: true })}` };
    }
    const loi = M.log.find(l => l.title === 'Lunar orbit insertion burn');
    const used = M.log.filter(l => l.stage === 'Transfer' && /burn/.test(l.title)).reduce((a, l) => a + l.chips.filter(c => /Fuel/.test(c.t)).reduce((b, c) => b + Number(c.t.replace(/[^0-9]/g, '')), 0), 0);
    return {
      cls: 'right', html: `
      ${header('OPERATE · LUNAR ORBIT', 'Lunar Orbit Established', 'Braking burn complete. LUNARIS-01 has been captured by the Moon.')}
      <div class="kvs">
        <div class="kv"><span>Travel time (${tp ? tp.short : ''})</span><b>${tp ? MathX.fmtDuration(tp.hours, true) : '—'}</b></div>
        <div class="kv"><span>Propellant used for the transfer</span><b>${used}%</b></div>
        <div class="kv"><span>Fuel remaining</span><b>${M.fuel}%</b></div>
      </div>
      ${insight(`Lunar escape velocity ${show('Escape velocity')}${tag('nasa')} vs Earth's ${show('Earth|Escape velocity', 'orbit')}${tag('nasa')}.`,
        'The Moon\'s weak gravity makes capture cheap compared with leaving Earth - but LUNARIS-01 must still brake below lunar escape speed.',
        `Orbit insertion burn → ${loi ? chips(loi.chips) : ''}`)}
      ${btn('CHOOSE LUNAR ORBIT', 'to-orbit', { cls: 'go', primary: true })}` };
  };

  P.ORBIT_DECISION = () => {
    if (Game.phase !== 'choose') {
      const done = Game.phase === 'done';
      return {
        cls: 'right', html: `
        ${header('OPERATE', ORBITS[M.selectedOrbit].name, done ? 'Orbit established.' : 'Executing orbit adjustment burn…')}
        ${done ? `${chips(M.log.filter(l => l.stage === 'Orbit').flatMap(l => l.chips))}${btn('BEGIN LUNAR SURVEY', 'to-survey', { cls: 'go', primary: true })}` : `${factBox()}<div class="wait">◌ Burning…</div>`}` };
    }
    const reg = site();
    const opts = ['low', 'high'].map((id, k) => {
      const fx = orbitFx(id), allowed = orbitAllowed(id);
      return option({
        id, key: k + 1, name: ORBITS[id].name, desc: ORBITS[id].desc + (id === 'low' && reg.dust > 1.5 ? ' Dusty target: low orbit raises the dust threat.' : ''), chips: fxChips(fx),
        selected: Game.choice === id, disabled: !allowed,
        warn: !allowed ? `Not enough fuel (${M.fuel}% left)` : M.fuel + fx.fuel < RULES.fuelReserve ? `Leaves ${M.fuel + fx.fuel}% fuel - reserve objective missed, +${rk(15)} risk` : powerWarn(fx),
      });
    }).join('');
    return {
      cls: 'right', html: `
      ${header('OPERATE', 'Orbit Decision', `Fuel ${M.fuel}%. Last planned fuel decision - keep ≥ ${RULES.fuelReserve}% in reserve.${reg.fuel ? ` Reaching ${reg.short.toLowerCase()} costs ${reg.fuel}% extra.` : ''}`)}
      ${insight(`Surface pressure ${show('Atmospheric surface pressure')}${tag('nasa')}`,
        'Effectively a vacuum: no air drag, so even a low orbit is possible.',
        'Low orbit = closer, more detailed observations but more correction burns, risk and exposure to lofted dust.')}
      <div class="opts">${opts}</div>
      ${btn(Game.choice ? `CONFIRM ${ORBITS[Game.choice].name.toUpperCase()}` : 'SELECT AN ORBIT', 'confirm', { cls: 'go', primary: true, disabled: !Game.choice })}
      ${sources([['Atmospheric surface pressure'], ['Escape velocity']])}` };
  };

  function siteInsight() {
    const reg = site(), I = INSTRUMENTS[M.selectedPayload], b = instrBonus(I), obj = objective();
    const rows = siteRows(reg);
    const first = rows.length ? rows[0].replace(/<div class="drow"[^>]*><span class="dl">([^<]*)<\/span><span class="dv">/, '$1: ').replace(/<\/span><\/div>$/, '') : '';
    return insight(first, reg.pitch,
      `${I.name}: <b>${b > 0 ? '+' : b < 0 ? MINUS : '±'}${Math.abs(b)} science</b> per scan here · ${obj.name} ×${objMult()} (game modifiers).`);
  }

  P.SURVEY = () => {
    if (Game.phase === 'hazard' || Game.phase === 'hazardDone') return hazardPanel();
    const I = INSTRUMENTS[M.selectedPayload], reg = site(), obj = objective();
    if (Game.phase === 'brief') {
      return {
        cls: 'right', html: `
        ${header('OPERATE · SURVEY', `Target: ${reg.name}`, `${reg.site} · ${reg.kind}. Objective: ${obj.name}.`)}
        <div class="data">
          ${siteRows(reg).join('')}
          ${dRow('Gravity', 'Surface gravity')}
          ${dRow('Surface dose (Apollo)', 'Surface dose rate measured during Apollo')}
        </div>
        <p class="note">Hover a row for its NASA source. Tags show whether a value is measured, approximate, an estimate, qualitative, derived or a lab simulant.</p>
        ${btn('PLAN OBSERVATION', 'plan', { cls: 'go', primary: true })}
        ${sources((reg.data || []).map((k, i) => [k, (reg.dataDs || [])[i] || 'moon']).concat([['Surface gravity'], ['Surface dose rate measured during Apollo']]))}` };
    }
    if (Game.phase === 'choose') {
      const opts = Object.values(SCANS).map((s, k) => {
        const fx = scanFx(s.id), b = instrBonus(I);
        const dataGB = Math.round((fx.science + Math.min(0, M.scanAdjust)) * obj.dataRate * 10) / 10;
        const over = dataGB > M.storageGB ? Math.round((dataGB - M.storageGB) * 10) / 10 : 0;
        return option({
          id: s.id, key: k + 1, name: s.name,
          desc: `Science ≈ ${I.scan} × ${s.mult}${reg.sci !== 1 ? ` × ${reg.sci}` : ''}${objMult() !== 1 ? ` × ${objMult()}` : ''} → ≈${dataGB} GB data`,
          chips: fxChips(fx),
          selected: Game.choice === s.id,
          warn: powerWarn(fx) || (over > 0 ? `⚠ ${over} GB exceeds the ${M.storageGB} GB recorder - ${Math.round(over / obj.dataRate)} science would be lost` : ''),
        });
      }).join('');
      return {
        cls: 'right', html: `
        ${header('OPERATE · SURVEY', 'Observation Plan', `Science ${M.science} so far · goal ${scienceGoal()} · recorder ${M.dataStored} / ${M.storageGB} GB. A mid-scan hazard is possible.`)}
        <div class="lbl">YOUR INSTRUMENT: ${I.name.toUpperCase()} <button class="link" data-act="unplan">target data</button></div>
        ${siteInsight()}
        ${powerPlan(`Next: ≈${eventDrain()}% heater load. `)}
        <div class="opts">${opts}</div>
        ${btn(Game.choice ? `START ${SCANS[Game.choice].name.toUpperCase()}` : 'SELECT A SCAN MODE', 'confirm', { cls: 'go', primary: true, disabled: !Game.choice })}` };
    }
    if (Game.phase === 'scanning') {
      return { cls: 'right', html: `${header('OPERATE · SURVEY', SCANS[M.selectedObservation].name, `${I.name} collecting data over ${reg.name}…`)}${factBox()}<div class="wait">◌ Scanning…</div>` };
    }
    const entry = M.log.filter(l => l.stage === 'Survey').pop();
    return {
      cls: 'right', html: `
      ${header('OPERATE · SURVEY', 'Survey Complete', entry ? entry.detail : '')}
      ${entry ? chips(entry.chips) : ''}
      ${M.failure ? `<div class="verdict bad">✗ ${M.failure}</div>${btn('VIEW MISSION RESULT', 'to-result', { cls: 'warn', primary: true })}`
        : btn('CONTINUE MISSION', 'to-event', { cls: 'go', primary: true })}` };
  };

  P.MISSION_EVENT = () => {
    const battery = POWER_SYSTEMS[M.selectedPowerSystem].battery;
    if (Game.phase === 'alert') {
      return { cls: 'right alert', html: `${header('⚠ MISSION EVENT', 'Power Demand Increase', 'The survey target is entering lunar night…')}<div class="wait bad">◌ Analysing power bus…</div>` };
    }
    const hd = halfDay();
    const intro = `
      ${header('⚠ MISSION EVENT', 'Power Demand Increase', `Heaters on: <b>Power ${MINUS}${Game.eventDrain}%</b>${battery ? ' (battery backup absorbed most of it)' : ' (no battery backup)'}. Now at ${M.power}%.`)}
      ${insight(`Night lasts ≈${hd || '?'} Earth days${tag('derived')}; surface drops to ${show('Surface temperature minimum (typical range)')}${tag('nasa')}.`,
        'No sunlight for the panels, and electronics must be heated to survive.',
        `Choose what to sacrifice: power, science, or safety.`)}`;
    if (Game.phase === 'choose') {
      const opts = Object.values(EVENT.options).map(o => {
        const fx = eventFx(o.id);
        return option({ id: o.id, key: o.key, name: o.name, desc: o.desc, chips: fxChips(fx), selected: Game.choice === o.id, warn: powerWarn(fx) || (fx.risk > 0 && M.risk + fx.risk >= RULES.riskHigh ? `Risk would reach ${M.risk + fx.risk} - data-loss anomaly` : '') });
      }).join('');
      return {
        cls: 'right alert', html: `${intro}${powerPlan()}<div class="opts">${opts}</div>
        ${btn(Game.choice ? `EXECUTE OPTION ${EVENT.options[Game.choice].key}` : 'SELECT A RESPONSE', 'confirm', { cls: 'go', primary: true, disabled: !Game.choice })}` };
    }
    const entry = M.log.filter(l => l.stage === 'Event').pop();
    return {
      cls: 'right', html: `
      ${header('MISSION EVENT RESOLVED', entry ? entry.title : '', entry ? entry.detail : '')}
      ${entry ? chips(entry.chips) : ''}
      ${M.failure ? `<div class="verdict bad">✗ ${M.failure}</div>${btn('VIEW MISSION RESULT', 'to-result', { cls: 'warn', primary: true })}`
        : btn('PREPARE DATA TRANSMISSION', 'to-transmission', { cls: 'go', primary: true })}` };
  };

  P.TRANSMISSION = () => {
    const c = M.communication, reg = site(), obj = objective();
    if (Game.phase === 'choose') {
      const opts = Object.values(TRANSMISSIONS).map((t, k) => {
        const fx = txFx(t.id);
        const returnable = Math.round(M.science * t.mult);
        const warn = -fx.power > M.power ? 'Not enough power to finish - transmission would be cut off' : powerWarn(fx, true) || (fx.risk ? `Link risk: +${fx.risk}` : '');
        return option({ id: t.id, key: k + 1, name: t.name, desc: `${t.desc} ${M.dataStored} GB stored → ≈${Math.round(M.dataStored * t.mult * 10) / 10} GB returned · ${returnable} science received`, chips: fxChips(fx), selected: Game.choice === t.id, warn });
      }).join('');
      const far = reg.side === 'far'
        ? dRow('Line of sight', 'Moon orbit|Sidereal rotation period', 'orbit', v => `Rotation ${v} = one orbit (tidal lock), so the far side never sees Earth. Game model: data is stored and relayed from the limb.`)
        : `<div class="drow"><span class="dl">Line of sight</span><span class="dv">Earth in view from ${reg.short.toLowerCase()} (nearside)${tag('game')}</span></div>`;
      return {
        cls: 'right', html: `
        ${header('RETURN · DATA TRANSMISSION', 'Get the Science Home', `${M.science} science onboard · ${M.dataStored} / ${M.storageGB} GB stored.`)}
        <div class="data">
          <div class="drow"><span class="dl">Comm capability</span><span class="dv">${c} · ${commLabel(c)}${tag('game')}</span></div>
          ${far}
          ${dRow('Signal delay', 'One-way light/radio delay at mean distance', 'orbit', v => `${v} one way`)}
          <div class="drow"><span class="dl">Risk</span><span class="dv">${M.risk} · ${riskLevel(M.risk)}${M.risk >= RULES.riskHigh ? ' - anomaly expected' : ''}${tag('game')}</span></div>
        </div>
        <p class="note">Comm capability and site location set the power cost. Goal ${scienceGoal()} science with power ≥ ${RULES.healthyPower}% at the end.</p>
        <div class="opts">${opts}</div>
        ${btn(Game.choice ? 'BEGIN DOWNLINK' : 'SELECT A MODE', 'confirm', { cls: 'go', primary: true, disabled: !Game.choice })}` };
    }
    if (Game.phase === 'sending') {
      return { cls: 'right', html: `${header('RETURN', TRANSMISSIONS[M.selectedTransmission].name, reg.side === 'far' ? 'Far side → store → limb → Earth' : 'Moon → LUNARIS-01 → Earth')}<div class="wait">◌ Transmitting…</div>` };
    }
    const entries = M.log.filter(l => l.stage === 'Transmission');
    return {
      cls: 'right', html: `
      ${header('RETURN · COMPLETE', M.failure ? 'Transmission Interrupted' : 'Transmission Complete', `${M.science} science received at Earth · ${M.dataReturned} GB returned.`)}
      ${entries.map(e => `<div class="logline"><b>${e.title}</b>${chips(e.chips)}<span>${e.detail}</span></div>`).join('')}
      ${btn('VIEW MISSION RESULT', 'to-result', { cls: M.failure ? 'warn' : 'go', primary: true })}` };
  };

  const STATUS_ICON = { SUCCESS: '✓', 'PARTIAL SUCCESS': '◐', FAILURE: '✗' };
  const statusCls = s => (s === 'SUCCESS' ? 'ok' : s === 'FAILURE' ? 'bad' : 'mid');

  P.RESULT = () => ({
    cls: 'right', html: `
    ${header('EXPLAIN · MISSION RESULT', `<span class="status ${statusCls(M.missionStatus)}">${STATUS_ICON[M.missionStatus]} ${M.missionStatus}</span>`)}
    <div class="bigsci ${statusCls(M.missionStatus)}"><b>${M.science}</b><span>science returned from ${site().short.toLowerCase()}<br>goal ${scienceGoal()}${M.transmittedFraction < 1 ? ` · only ${Math.round(M.transmittedFraction * 100)}% of the downlink completed` : ''}</span></div>
    <div class="lbl">OBJECTIVES · ${scenario().name.toUpperCase()}</div>
    ${objectiveList(M.objectives)}
    <ul class="reasons">${M.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
    ${btn('OPEN VISUAL DEBRIEF REPORT', 'to-report', { cls: 'go', primary: true })}` });

  // ---- EXPLAIN: decision impact chains
  function decisionChains() {
    return M.log.filter(l => ['Objective', 'Target', 'Design', 'Travel', 'Orbit', 'Survey', 'Event', 'Transmission'].includes(l.stage)).map(l => {
      const downs = [];
      if (l.stage === 'Design') {
        if (/Power System/.test(l.title)) downs.push(M.selectedPowerSystem === 'battery' ? 'absorbed the lunar-night heater load' : 'set the power margin for every later choice');
        if (/Recorder/.test(l.title)) downs.push(M.flags.storageOverflow ? 'the storage limit actually cost science during the survey' : 'held every scan you generated');
        if (/Antenna|Comms/i.test(l.title) || COMMS[Game.sel.comms] && COMMS[Game.sel.comms].name === l.title) downs.push(`comm capability ${M.communication} → downlink power cost`);
        if (/Engine/.test(l.title)) downs.push(`burn fuel ×${ENGINES[M.selectedEngine].fuelMult}`);
      }
      if (l.stage === 'Travel') downs.push(`transit hazard ${Math.round(M.travel.hazardChance * 100)}% · night load ×${M.travel.nightFactor.toFixed(2)}`);
      if (l.stage === 'Orbit') downs.push(l.title.includes('Low') ? 'sharper observations but more risk' : 'stable but less detail');
      if (l.stage === 'Survey') downs.push(`recorder now ${M.dataStored}/${M.storageGB} GB`);
      if (l.stage === 'Event') downs.push(M.selectedEventResponse === 'reduce' ? 'kept power safe at a science cost' : M.selectedEventResponse === 'reserve' ? 'spent reserve power' : 'kept observing at a risk cost');
      if (l.stage === 'Transmission') downs.push(`returned ${M.dataReturned} GB · ${M.science} science`);
      return `<div class="chain"><span class="cause">${esc(l.title)}</span>${chips(l.chips)}${downs.length ? `<span class="arrow">→</span><span class="effect">${esc(downs.join('; '))}</span>` : ''}</div>`;
    }).join('');
  }

  function dataChart() {
    const rows = [
      ['GENERATED', M.dataGenerated, 'cyan', `${M.dataGenerated} GB`],
      ['STORED', M.dataStored, 'amber', `${M.dataStored} GB (recorder ${M.storageGB} GB)`],
      ['RETURNED', M.dataReturned, 'green', `${M.dataReturned} GB`],
      ['LOST (OVERFLOW)', M.storageLost, 'red', `${M.storageLost} GB`],
    ];
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="barchart">${rows.map(([l, v, col, txt]) => `
      <div class="barrow"><span class="b-l">${l}</span><div class="b-track"><i class="b-fill ${col}" style="width:${MathX.clamp(v / max) * 100}%"></i></div><span class="b-v">${txt}</span></div>`).join('')}</div>`;
  }

  // ---- LEARN: mission history comparison
  function historyTable() {
    const hist = HISTORY.load();
    if (hist.length < 2) return '';
    const rows = hist.map(h => `<tr><td>${esc(h.date)}</td><td class="${statusCls(h.status)}">${STATUS_ICON[h.status] || '—'} ${esc(h.status || '')}</td><td><b>${h.science}</b>/${h.goal}</td><td>${esc(h.objective || '')}</td><td>${esc(h.region || '')}</td><td>${esc(h.instrument || '')}</td><td>${esc(h.condition || '')}</td><td>${esc(h.travel || '')}</td><td>$${h.budget}M</td></tr>`).join('');
    return `
      <div class="lbl">LEARN · YOUR LAST ${hist.length} MISSIONS · COMPARE DESIGNS</div>
      <table class="hist">
        <tr><th>DATE</th><th>RESULT</th><th>SCIENCE</th><th>OBJECTIVE</th><th>SITE</th><th>INSTRUMENT</th><th>CONDITION</th><th>TRAVEL</th><th>COST</th></tr>
        ${rows}
      </table>
      <p class="note">Every run changes the condition and the hazards. Which design matched which condition? What would you keep, what would you swap?</p>`;
  }

  P.REPORT = () => {
    const st = M.missionStatus, strat = strategyLabel();
    const txLine = M.selectedTransmission
      ? `${commLabel(M.communication)} link · ${M.selectedTransmission === 'full' ? 'full resolution' : 'compressed'} · ${Math.round(M.transmittedFraction * 100)}% delivered`
      : 'No transmission';
    const tiles = [
      tile('MISSION STATUS', `<span class="status ${statusCls(st)}">${STATUS_ICON[st]} ${st}</span>`, `${site().name}`, null),
      tile('SCIENCE RETURNED', `${M.science}`, `goal ${scienceGoal()} · collected ${M.collectedScience || M.science}`, M.science >= scienceGoal()),
      tile('POWER REMAINING', `${M.power}%`, `health line ${RULES.healthyPower}%`, !M.failure && M.power >= RULES.healthyPower),
      tile('FUEL REMAINING', `${M.fuel}%`, `reserve target ${RULES.fuelReserve}%`, M.fuel >= RULES.fuelReserve),
      tile('DATA RETURNED', `${M.dataReturned} GB`, `of ${M.dataGenerated} GB generated`, M.dataGenerated ? M.dataReturned / M.dataGenerated >= 0.6 : null),
      tile('BUDGET USED', `$${M.budgetUsed}M`, `${Math.round(M.budgetUsed / budgetCap() * 100)}% of $${budgetCap()}M cap`, null),
      tile('MISSION RISK', `${riskLevel(M.risk)}`, `risk score ${M.risk} (game model)`, M.risk < RULES.riskHigh),
      tile('HAZARDS', `${M.hazards.length}`, M.hazards.map(h => HAZARDS[h.id].name.split(' ')[h.id === 'seu' ? 1 : 0].toLowerCase()).join(' · ') || 'none', null),
      tile('TRAVEL', M.travel ? M.travel.short : '—', M.travel ? `${MathX.fmtDuration(M.travel.hours)} · ${M.travel.fuelTotal}% fuel · ${scenario().name}` : scenario().name, null),
    ].join('');
    return {
      cls: 'report', html: `
      <div class="rep-head">
        <div>${header('EXPLAIN · VISUAL MISSION DEBRIEF', 'LUNARIS-01 Mission Report', `${M.objective ? OBJECTIVES[M.objective].name : "—"} at ${M.region ? site().name : "—"} · ${txLine}`)}</div>
        <div class="actions">${btn('NEW MISSION', 'replay', { cls: 'go', primary: true })}${btn('TITLE', 'title', { cls: 'ghost' })}</div>
      </div>
      <div class="tiles four">${tiles}</div>
      <div class="lbl">OBJECTIVES</div>
      ${objectiveList(M.objectives)}
      <div class="lbl">DATA FLOW · GENERATED → STORED → RETURNED</div>
      ${dataChart()}
      <div class="lbl">YOUR KEY DECISIONS → CONSEQUENCES</div>
      <div class="decs">${decisionChains()}</div>
      ${historyTable()}
      <p class="note">Every new mission draws a new random condition and new hazards. Tip: ${strat.next} &nbsp;·&nbsp; Budget, power, fuel, science and risk are a <b>simplified game model</b>. Lunar values come from the ${Object.keys(NasaData.DATASETS).length} NASA-sourced datasets (sources shown in-game).</p>` };
  };

  // ------------------------------------------------------------ render / HUD
  let lastKey = '';
  function render() {
    const panel = $('panel');
    const build = P[Game.state];
    const res = build ? build() : null;
    const focusSel = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset : null;
    const focusKey = focusSel && focusSel.act ? `[data-act="${focusSel.act}"]${focusSel.id ? `[data-id="${focusSel.id}"]` : ''}` : null;
    if (!res) { panel.className = 'panel hidden'; panel.innerHTML = ''; return; }
    if (panel.className !== `panel ${res.cls}` || Game.state === 'DESIGN') { panel.scrollTop = 0; }
    panel.className = `panel ${res.cls}`;
    panel.innerHTML = res.html;
    const key = Game.state + '|' + Game.phase;
    if (key !== lastKey) { panel.scrollTop = 0; lastKey = key; }
    const again = focusKey && panel.querySelector(focusKey);
    if (again) again.focus({ preventScroll: true });
    tracker();
    hud();
  }

  const TRACK = ['CHOOSE', 'ENGINEER', 'LAUNCH', 'TRANSFER', 'OPERATE', 'RETURN', 'EXPLAIN'];
  const STAGE_INFO = {
    BRIEFING: [-1, 'MISSION BRIEFING'], OBJECTIVE: [0, 'CHOOSE · SCIENCE OBJECTIVE'],
    TARGET: [0, 'CHOOSE · SURVEY SITE'],
    DESIGN: [1, 'ENGINEER · ORIGAMI SPACECRAFT'], DESIGN_REVIEW: [1, 'ENGINEER · DESIGN VALIDATION'],
    TRAJECTORY: [2, 'OPERATE · TRAVEL STRATEGY'], LAUNCH: [2, 'OPERATE · LAUNCH'],
    TRANSFER: () => [3, 'OPERATE · LUNAR TRANSFER'], ORBIT_DECISION: [4, 'OPERATE · ORBIT + SURVEY'],
    SURVEY: [4, 'OPERATE · LUNAR SURVEY'], MISSION_EVENT: [4, 'OPERATE · MISSION EVENT'],
    TRANSMISSION: [5, 'RETURN · DATA TRANSMISSION'], RESULT: [6, 'EXPLAIN · MISSION RESULT'], REPORT: [6, 'EXPLAIN · DEBRIEF + LEARN'],
  };
  function tracker() {
    const raw = STAGE_INFO[Game.state];
    const info = typeof raw === 'function' ? raw() : raw;
    const vis = !!info;
    $('hud').classList.toggle('hidden', !vis);
    $('tracker').classList.toggle('hidden', !vis);
    if (!vis) return;
    const [idx, label] = info;
    const tgt = M.region ? `<div class="cond-badge tgt">◎ ${SITES[M.region].short}</div>` : '';
    const obj = M.objective ? `<div class="cond-badge tgt">⚗ ${OBJECTIVES[M.objective].name.toUpperCase()}</div>` : '';
    $('tracker').innerHTML = `<ol>${TRACK.map((s, k) => `<li class="${k < idx ? 'done' : k === idx ? 'now' : ''}"><i></i>${s}</li>`).join('')}</ol>${obj}${tgt}<div class="cond-badge" title="${scenario().effects.join(' · ')}">${scenario().icon} ${scenario().name.toUpperCase()}</div><div class="stage-label">${label}</div>`;
  }

  const prev = {};
  function meter(id, value, max, text) {
    const el = $(id);
    const bar = el.querySelector('i'), out = el.querySelector('b');
    const v = value == null ? 0 : value;
    bar.style.width = `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
    out.textContent = text;
    el.classList.toggle('low', value != null && (id === 'm-power' || id === 'm-fuel') && v / max < 0.2);
    if (prev[id] != null && value != null && value !== prev[id]) {
      el.classList.remove('up', 'down'); void el.offsetWidth;
      el.classList.add(value > prev[id] ? 'up' : 'down');
    }
    prev[id] = value;
  }

  function hud() {
    let v;
    if (Game.state === 'BRIEFING' || Game.state === 'OBJECTIVE' || Game.state === 'TARGET') v = { power: null, fuel: null, budget: budgetCap(), data: 0, science: 0, risk: 0 };
    else if (Game.state === 'DESIGN' || Game.state === 'DESIGN_REVIEW' || Game.state === 'TRAJECTORY') {
      const d = computeDesign(Game.sel);
      v = { power: d.power, fuel: d.fuel, budget: budgetCap() - d.budgetUsed, data: 0, science: 0, risk: d.risk };
    } else v = { power: M.power, fuel: M.fuel, budget: M.budget, data: M.dataStored, science: M.science, risk: M.risk };
    meter('m-power', v.power, 100, v.power == null ? '—' : `${v.power}%`);
    meter('m-fuel', v.fuel, 100, v.fuel == null ? '—' : `${v.fuel}%`);
    meter('m-budget', Math.max(0, v.budget), budgetCap(), `$${v.budget}M`);
    meter('m-data', v.data || 0, M.storageGB || 40, v.state === 'DESIGN' || !M.storageGB ? `${v.data || 0} GB` : `${v.data || 0} / ${M.storageGB} GB`);
    meter('m-science', v.science, 100, `${v.science} / ${scienceGoal()}`);
    $('m-science').querySelector('.bar').style.setProperty('--goal', `${scienceGoal()}%`);
    const lvl = riskLevel(v.risk);
    const r = $('risk');
    r.innerHTML = `RISK <b>${lvl}</b> <small>${v.risk}</small>`;
    r.className = `risk ${lvl.toLowerCase()}`;
    r.title = `Mission risk (game model). ≥${RULES.riskHigh}: data-loss anomaly · ≥${RULES.riskCritical}: mission lost`;
  }

  let toastTimer = null;
  function toast(title, list) {
    const el = $('toast');
    el.innerHTML = `<b>${esc(title)}</b>${chips(list)}`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  function setMuteLabel() {
    const b = $('mute');
    b.textContent = Sfx.muted ? 'AUDIO OFF' : 'AUDIO ON';
    b.setAttribute('aria-pressed', String(!Sfx.muted));
  }

  function hideToast() { $('toast').classList.remove('show'); }

  return { render, hud, toast, hideToast, setMuteLabel, tickFact, POLL_COUNT };
})();
