// LUNARIS scene layer: one procedural scene per game state, plus the launch timeline
// and the visual mission debrief. Adapted from the LUNA-01 prototype.

const Scenes = (() => {
  const { clamp, lerp, ease, easeIn } = MathX;
  const { background, grid, text, stamp, tag, glow, COL, TAU, D2R, TILT, VIEWS } = Draw;
  const W = Draw.W, H = Draw.H;

  // ================================================================ TITLE + EXPLORE
  const SCENES = {};

  SCENES.TITLE = (ctx, t) => {
    background(ctx, t, 2);
    const lh = Draw.lapseHours(t);
    Draw.earth(ctx, 150, 130, 40, lh);
    const mx = 930, my = 420, mr = 230, rot = -0.28;
    const p = Draw.onEllipse(mx, my, 320, 70, rot, t * 0.3);
    Draw.orbitHalf(ctx, mx, my, 320, 70, rot, false, COL.cyan, 0.8, 0.3);
    if (!p.front) Draw.spacecraft(ctx, p.x, p.y, 0.6, Math.sin(t) * 0.1, Draw.craftCfg(), t);
    Draw.moon(ctx, mx, my, mr, { lon: Draw.moonLon(lh) });
    Draw.orbitHalf(ctx, mx, my, 320, 70, rot, true, COL.cyan, 1, 0.5);
    if (p.front) Draw.spacecraft(ctx, p.x, p.y, 1, Math.sin(t) * 0.1, Draw.craftCfg(), t);
    // faint planets for depth (decoration only, labelled)
    const pl = [['Mars', 1130, 600, 9], ['Jupiter', 90, 620, 16], ['Venus', 380, 90, 7]];
    for (const [nm, x, y, r] of pl) Draw.planetDisc(ctx, x, y, r, nm, t, false);
    text(ctx, 'ORBIT SHOWN TILTED AND NOT TO SCALE · THE JOURNEY IS A SIMPLIFIED GAME MODEL', W / 2, 700, { align: 'center', size: 8.5, color: COL.faint, spacing: 1.5 });
  };

  SCENES.EXPLORE = (ctx, t, dt) => {
    background(ctx, t, 1.5);
    Draw.Cam.update();
    Draw.solarSystem(ctx, t, Game.hoverBody, Game.focusBody, false);
    if (Game.focusBody) {
      const hint = Game.focusBody === 'Moon' ? 'MISSION TARGET SELECTED' : 'DOUBLE-CLICK OR PRESS ESC TO DEFOCUS';
      text(ctx, hint, W / 2, 60, { align: 'center', size: 10.5, color: COL.amber, spacing: 3 });
    }
  };

  SCENES.MOONVIEW = (ctx, t) => {
    Draw.moonDive(ctx, t);
    for (const reg of Object.values(SITES)) {
      const p = Draw.project(reg.lat, reg.lon, 'near');
      if (!p.visible) continue;
      ctx.fillStyle = `rgba(232,165,75,${0.5 + 0.4 * Math.sin(t * 3 + reg.lat)})`;
      ctx.fillRect(Draw ? 430 + p.x * 210 - 1.5 : 0, 380 + p.y * 210 - 1.5, 3, 3);
    }
  };

  // ================================================================ BRIEFING + CHOOSE
  const BRIEF = { e: { x: 390, y: 400, r: 82 }, rx: 318, ry: 112, mr: 46 };
  SCENES.BRIEFING = (ctx, t) => {
    background(ctx, t, 2); grid(ctx);
    const E = BRIEF.e;
    const th = 0.55 - TAU * Draw.lapseHours(Game.sceneT) / (NasaData.num('Moon orbit|Sidereal rotation period', 'orbit') || 655.72);
    const d = Math.sin(th), k = 1 + 0.12 * d;
    const mx = E.x + Math.cos(th) * BRIEF.rx, my = E.y + d * BRIEF.ry, mr = BRIEF.mr * k;
    const faceLon = th / D2R + 90;
    const orbit = front => {
      ctx.save(); ctx.strokeStyle = COL.cyan; ctx.globalAlpha = front ? 0.45 : 0.2; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.ellipse(E.x, E.y, BRIEF.rx, BRIEF.ry, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke(); ctx.restore();
    };
    const drawMoon = () => {
      Draw.moon(ctx, mx, my, mr, { lon: faceLon });
      for (const reg of Object.values(SITES)) {
        const p = Draw.project(reg.lat, reg.lon, 'near', faceLon);
        if (!p.visible) continue;
        ctx.fillStyle = `rgba(232,165,75,${0.5 + 0.4 * Math.sin(t * 3 + reg.lat)})`;
        ctx.fillRect(mx + p.x * mr - 1.5, my + p.y * mr - 1.5, 3, 3);
      }
    };
    orbit(false);
    if (d < 0) drawMoon();
    Draw.earth(ctx, E.x, E.y, E.r, Draw.lapseHours(t));
    const pa = t * 0.9, pf = Math.sin(pa) > 0;
    const craft = () => Draw.spacecraft(ctx, E.x + Math.cos(pa) * 118, E.y + Math.sin(pa) * 30, 0.4, 0, Draw.craftCfg(), t, { deploy: { power: 0.3, comms: 0.3, payload: 0.3, data: 0.3 } });
    if (!pf) craft();
    ctx.save(); ctx.beginPath(); ctx.ellipse(E.x, E.y, 118, 30, 0, 0, TAU); ctx.strokeStyle = 'rgba(80,200,230,0.18)'; ctx.stroke(); ctx.restore();
    if (pf) craft();
    orbit(true);
    if (d >= 0) drawMoon();
    tag(ctx, 'EARTH', E.x, E.y + E.r + 50, COL.label, 'center');
    tag(ctx, 'MOON', mx, my + mr + 18, COL.label, 'center');
    tag(ctx, M.objective ? `SURVEY TARGET · ${M.objective.toUpperCase()} OBJECTIVE` : 'SURVEY TARGET · YOUR CHOICE', mx, my - mr - 12, COL.amber, 'center');
    tag(ctx, `MEAN DISTANCE ${NasaData.show('Mean distance from Earth (semi-major axis)', '')} · ORBIT ${NasaData.show('Moon orbit|Sidereal revolution period', 'orbit')}`, E.x, 640, COL.faint, 'center');
    text(ctx, 'Tidally locked: the Moon spins once per orbit, so the same face always points at Earth', E.x, 660, { align: 'center', size: 10, color: COL.label });
    Draw.spinCaption(ctx, E.x, 678, 'center');
    text(ctx, 'Orbit drawn tilted and not to scale', E.x, 694, { align: 'center', size: 9.5, color: COL.faint });
  };

  SCENES.OBJECTIVE = (ctx, t) => {
    background(ctx, t, 2); grid(ctx, 0.02);
    const mx = 1060, my = 560, mr = 130;
    Draw.moon(ctx, mx, my, mr, { lon: Draw.moonLon(Draw.lapseHours(t)) });
    Draw.earth(ctx, 170, 560, 58, Draw.lapseHours(t));
    // the four science questions as orbiting nodes around the Moon
    Object.values(OBJECTIVES).forEach((o, i) => {
      const a = t * 0.22 + i * TAU / 4;
      const x = mx + Math.cos(a) * 205, y = my + Math.sin(a) * 120 - 40;
      const on = M.objective === o.id;
      ctx.save();
      ctx.strokeStyle = on ? COL.amber : 'rgba(124,199,232,0.5)';
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.strokeRect(x - 9, y - 9, 18, 18);
      if (on) { ctx.globalAlpha = 0.25; ctx.fillStyle = COL.amber; ctx.fillRect(x - 9, y - 9, 18, 18); }
      ctx.restore();
      text(ctx, o.icon, x, y, { align: 'center', size: 11, color: on ? COL.amber : COL.cyan, glow: 1 });
      text(ctx, o.name.toUpperCase(), x, y - 20, { align: 'center', size: 8.5, color: on ? COL.amber : COL.faint, spacing: 1.2, glow: 1 });
    });
    tag(ctx, 'THE SCIENCE QUESTION DRIVES EVERY LATER DECISION', 40, 106, COL.cyan);
    text(ctx, 'Instruments · sites · data volume · risk all follow from what you choose to study', 40, 126, { size: 10.5, color: COL.faint });
  };

  // Target selection: nearside globe with candidate sites + farside inset
  const TG = { x: 330, y: 400, r: 245, fx: 700, fy: 590, fr: 70 };
  SCENES.TARGET = (ctx, t) => {
    background(ctx, t, 1); grid(ctx, 0.022);
    Draw.moon(ctx, TG.x, TG.y, TG.r);
    Draw.moon(ctx, TG.fx, TG.fy, TG.fr, { view: 'far' });
    tag(ctx, 'NEARSIDE · ALWAYS FACES EARTH', TG.x, TG.y - TG.r - 14, COL.label, 'center');
    tag(ctx, 'FARSIDE', TG.fx, TG.fy - TG.fr - 12, COL.label, 'center');
    text(ctx, 'never visible from Earth', TG.fx, TG.fy + TG.fr + 12, { align: 'center', size: 9, color: COL.faint });
    const taken = new Set(Object.values(SITES).map(r => r.dataKey).filter(Boolean));
    for (const row of NasaData.rows('sites')) {
      if (row.latitude_deg === '' || taken.has(row.site)) continue;
      const p = Draw.project(Number(row.latitude_deg), Number(row.longitude_deg), 'near');
      const x = TG.x + p.x * TG.r, y = TG.y + p.y * TG.r;
      ctx.strokeStyle = 'rgba(200,215,230,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.stroke();
      text(ctx, row.site.split(' - ')[0].split(' ')[0].toUpperCase(), x + 6, y + 8, { size: 7.5, color: 'rgba(200,215,230,0.5)', spacing: 1 });
    }
    const active = Game.preview || M.region;
    for (const reg of Object.values(SITES)) {
      const far = reg.side === 'far';
      const c = far ? { x: TG.fx, y: TG.fy, r: TG.fr } : { x: TG.x, y: TG.y, r: TG.r };
      const p = Draw.project(reg.lat, reg.lon, far ? 'far' : 'near');
      const x = c.x + p.x * c.r, y = c.y + p.y * c.r, on = reg.id === active;
      if (on) Draw.targetMarker(ctx, x, y, t, COL.amber, far ? 0.55 : 0.8);
      else { ctx.strokeStyle = 'rgba(232,165,75,0.75)'; ctx.lineWidth = 1; ctx.strokeRect(x - 5, y - 5, 10, 10); }
      const left = !far && p.x < -0.2, below = !far && p.y > 0.75;
      const lx = far ? c.x - c.r - 10 : left ? x - 16 : x + 16, ly = far ? c.y - 4 : below ? y + 22 : y - 12;
      text(ctx, reg.short, lx, ly, { size: 10.5, color: on ? COL.amber : 'rgba(232,165,75,0.8)', spacing: 1.5, align: far || left ? 'right' : 'left', weight: on ? 700 : 500, glow: 1 });
    }
    text(ctx, 'Apollo landing sites: NASA NSSDCA coordinates (regions dataset) · all sites: lunar_landing_sites.csv', 40, 700, { size: 9.5, color: COL.faint });
  };

  // ================================================================ ENGINEER (origami design)
  function designCraft(ctx, t, x, y, tint) {
    ctx.save();
    ctx.strokeStyle = 'rgba(140,170,200,0.12)'; ctx.lineWidth = 1;
    for (const rr of [90, 150, 210]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x - 240, y); ctx.lineTo(x + 240, y); ctx.moveTo(x, y - 230); ctx.lineTo(x, y + 230); ctx.stroke();
    ctx.setLineDash([]);
    for (let a = 0; a < 360; a += 10) {
      const r0 = a % 30 ? 206 : 200, ra = a * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ra) * r0, y + Math.sin(ra) * r0); ctx.lineTo(x + Math.cos(ra) * 210, y + Math.sin(ra) * 210); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(124,199,232,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 210, t * 0.3, t * 0.3 + 0.4); ctx.stroke();
    ctx.restore();
    Draw.spacecraft(ctx, x, y + Math.sin(t * 1.1) * 3, 3, Math.sin(t * 0.4) * 0.05, Draw.craftCfg(), t, { tint, deploy: Game.deploys });
  }

  function callout(ctx, x1, y1, x2, y2, label, value, color = COL.white) {
    ctx.save();
    ctx.strokeStyle = 'rgba(150,175,200,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2 + (x2 > x1 ? 18 : -18), y2); ctx.stroke();
    ctx.fillStyle = COL.cyan; ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.restore();
    const ax = x2 + (x2 > x1 ? 22 : -22), al = x2 > x1 ? 'left' : 'right';
    text(ctx, label, ax, y2 - 8, { align: al, size: 9.5, color: COL.faint, spacing: 2 });
    text(ctx, value, ax, y2 + 7, { align: al, size: 12.5, color });
  }

  const MODULE_LABELS = () => {
    const sel = Game.sel;
    return [
      ['POWER', sel.power ? POWER_SYSTEMS[sel.power].name.toUpperCase() : 'NOT SELECTED', sel.power ? COL.white : COL.amber],
      ['ANTENNA', sel.comms ? COMMS[sel.comms].name.toUpperCase() : 'NOT SELECTED', sel.comms ? COL.white : COL.amber],
      ['PAYLOAD', sel.payload ? INSTRUMENTS[sel.payload].name.toUpperCase() : 'NOT SELECTED', sel.payload ? COL.white : COL.amber],
      ['THERMAL', sel.thermal ? THERMALS[sel.thermal].name.toUpperCase() : 'NOT SELECTED', sel.thermal ? COL.white : COL.amber],
      ['NAV', sel.nav ? NAVS[sel.nav].name.toUpperCase() : 'NOT SELECTED', sel.nav ? COL.white : COL.amber],
      ['RECORDER', sel.data ? DATASYS[sel.data].name.toUpperCase() : 'NOT SELECTED', sel.data ? COL.white : COL.amber],
    ];
  };

  SCENES.DESIGN = (ctx, t) => {
    background(ctx, t, 1); grid(ctx, 0.03);
    // the decision panel occupies the lower strip: keep the craft in the visible upper band
    const x = 300, y = 185;
    designCraft(ctx, t, x, y);
    tag(ctx, 'ORIGAMI CONFIGURATION · LUNARIS-01 UNFOLDS AS YOU ENGINEER', 40, 106, COL.cyan);
    const labels = MODULE_LABELS();
    const pos = [
      [x - 95, y, 150, 148],       // POWER (label right-aligned toward centre)
      [x - 30, y - 80, 200, 112],  // ANTENNA
      [x + 55, y + 78, 470, 296],  // PAYLOAD
      [x - 95, y + 60, 150, 296],  // THERMAL
      [x + 40, y - 70, 320, 104],  // NAV
      [x - 60, y - 92, 150, 100],  // RECORDER
    ];
    labels.forEach(([lab, val, col], i) => { callout(ctx, pos[i][0], pos[i][1], pos[i][2], pos[i][3], lab, val, col); });
    const v = VEHICLES[Game.sel.vehicle];
    if (v) {
      rocket(ctx, 705, 302, 1, v.id, t, 0);
      text(ctx, 'LAUNCH VEHICLE', 745, 210, { size: 9.5, color: COL.faint, spacing: 2 });
      text(ctx, v.name.toUpperCase(), 745, 226, { size: 12.5, color: COL.white });
    } else text(ctx, 'LAUNCH VEHICLE · NOT SELECTED', 700, 300, { size: 11, color: COL.amber, spacing: 1 });
    if (Game.foldFlash) {
      const a = clamp(1 - (Game.t - Game.foldFlash) / 0.5);
      if (a > 0) {
        text(ctx, 'FOLD +', x + 130, y - 90 - (Game.t - Game.foldFlash) * 24, { align: 'center', size: 13, color: COL.amber, alpha: a, spacing: 2, glow: 1 });
      } else Game.foldFlash = 0;
    }
  };

  SCENES.DESIGN_REVIEW = (ctx, t) => {
    background(ctx, t, 1); grid(ctx, 0.03);
    const rv = Game.review;
    const x = 360, y = 380;
    const col = id => { const c = rv.checks.find(c => c.id === id); return c && c.ok ? COL.green : COL.red; };
    designCraft(ctx, t, x, y, { power: col('power'), mass: col('mass') });
    const sy = y - 200 + ((t * 140) % 400);
    const sg = ctx.createLinearGradient(0, sy - 40, 0, sy);
    sg.addColorStop(0, 'rgba(124,199,232,0)'); sg.addColorStop(1, 'rgba(124,199,232,0.1)');
    ctx.fillStyle = sg; ctx.fillRect(x - 230, sy - 40, 460, 40);
    ctx.fillStyle = 'rgba(124,199,232,0.45)'; ctx.fillRect(x - 230, sy, 460, 1);
    rv.checks.slice(0, 4).forEach((c, k) => {
      if (Game.sceneT < 0.3 + k * 0.35) return;
      const cy = 150 + k * 30;
      text(ctx, c.ok ? 'PASS' : 'FAIL', 40, cy, { size: 11, color: c.ok ? COL.green : COL.red, spacing: 2, weight: 700 });
      text(ctx, c.label.toUpperCase(), 92, cy, { size: 11, color: COL.label, spacing: 1.5 });
    });
    if (Game.sceneT > 1.8) stamp(ctx, rv.ok ? 'GO FOR LAUNCH' : 'NO-GO', x, 640, rv.ok ? COL.green : COL.red, 22, 0.75 + 0.25 * Math.abs(Math.sin(t * 2.5)));
  };

  // ================================================================ ROCKET + LAUNCH
  function flame(ctx, len, w, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const L = len * (0.92 + Math.random() * 0.16);
    const outer = ctx.createLinearGradient(0, 0, 0, L);
    outer.addColorStop(0, 'rgba(255,190,110,0.9)'); outer.addColorStop(0.35, 'rgba(255,120,40,0.55)'); outer.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = outer;
    ctx.beginPath(); ctx.moveTo(-w * 0.5, 0);
    ctx.bezierCurveTo(-w * 0.9, L * 0.3, -w * 0.4, L * 0.8, 0, L);
    ctx.bezierCurveTo(w * 0.4, L * 0.8, w * 0.9, L * 0.3, w * 0.5, 0);
    ctx.fill();
    const core = ctx.createLinearGradient(0, 0, 0, L * 0.45);
    core.addColorStop(0, 'rgba(255,255,245,1)'); core.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.moveTo(-w * 0.3, 0); ctx.quadraticCurveTo(0, L * 0.6, w * 0.3, 0); ctx.fill();
    for (let k = 1; k <= 3; k++) {
      const dy = L * 0.13 * k, dw = w * (0.22 - k * 0.04);
      ctx.fillStyle = `rgba(255,245,220,${0.5 - k * 0.12})`;
      ctx.beginPath(); ctx.moveTo(0, dy - 4); ctx.lineTo(dw, dy); ctx.lineTo(0, dy + 4); ctx.lineTo(-dw, dy); ctx.fill();
    }
    glow(ctx, 0, L * 0.15, L * 0.8, 'rgba(255,150,70,ALPHA)', 0.3);
    ctx.restore();
  }

  function rocket(ctx, x, y, s, type, t, thrust = 0) {
    const h = type === 'heavy' ? 150 : type === 'medium' ? 132 : 112, w = type === 'light' ? 15 : 19;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (thrust > 0) {
      ctx.save(); ctx.translate(0, 5); flame(ctx, 60 * thrust + 25, w * 1.2, t); ctx.restore();
      if (type === 'heavy') for (const sx of [-16, 16]) { ctx.save(); ctx.translate(sx, 3); flame(ctx, 46 * thrust + 18, 10, t); ctx.restore(); }
    }
    const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    body.addColorStop(0, '#7b828c'); body.addColorStop(0.3, '#eef0f2'); body.addColorStop(0.55, '#d7dade'); body.addColorStop(1, '#6d737c');
    if (type === 'heavy') {
      for (const sx of [-16, 16]) {
        ctx.fillStyle = body; ctx.fillRect(sx - 5, -88, 10, 88);
        ctx.beginPath(); ctx.moveTo(sx - 5, -88); ctx.quadraticCurveTo(sx - 4, -100, sx, -103); ctx.quadraticCurveTo(sx + 4, -100, sx + 5, -88); ctx.fill();
        ctx.fillStyle = '#2a2e35'; ctx.fillRect(sx - 4, 0, 8, 4);
      }
    }
    ctx.fillStyle = '#2a2e35';
    ctx.beginPath(); ctx.moveTo(-w * 0.32, 0); ctx.lineTo(-w * 0.46, 7); ctx.lineTo(w * 0.46, 7); ctx.lineTo(w * 0.32, 0); ctx.fill();
    ctx.fillStyle = body; ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#23272d';
    ctx.fillRect(-w / 2, -h * 0.62, w, 6);
    ctx.fillRect(-w / 2, -h * 0.18, w / 2, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-w / 2, -h * 0.9, w, 1);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.bezierCurveTo(-w / 2, -h - w * 1.1, -w * 0.15, -h - w * 1.8, 0, -h - w * 1.9);
    ctx.bezierCurveTo(w * 0.15, -h - w * 1.8, w / 2, -h - w * 1.1, w / 2, -h); ctx.fill();
    ctx.fillStyle = '#23272d';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * w / 2, -20); ctx.lineTo(side * (w / 2 + 6), -2); ctx.lineTo(side * w / 2, -3); ctx.fill();
    }
    ctx.restore();
  }

  // Launch timeline (s): final pre-launch poll, T-5 countdown, then ignition at T-0.
  const LT = { count: 3.4, ignite: 8.4, lift: 9.0, space: 12.6, sep: 13.6, end: 15.9 };
  const COUNT_CAPTIONS = { 5: 'GUIDANCE INTERNAL', 4: 'TANKS AT FLIGHT PRESSURE', 3: 'ENGINE CHILLDOWN COMPLETE', 2: 'ALL SYSTEMS ARMED', 1: 'COMMIT' };

  function launchShake(lt) {
    let a = 0;
    if (lt >= LT.ignite && lt < LT.space) {
      const since = lt - LT.ignite;
      a = 11 * Math.exp(-since * 1.6) + 3.2 * clamp(since / 0.4) * (1 - clamp((lt - LT.lift - 2) / 1.6));
    }
    if (lt >= LT.sep && lt < LT.sep + 0.6) a += 4 * (1 - (lt - LT.sep) / 0.6);
    if (lt >= LT.ignite - 1 && lt < LT.ignite) a += 0.9 * (lt - (LT.ignite - 1));
    return a;
  }

  SCENES.LAUNCH = (ctx, t) => {
    const lt = Game.sceneT, type = M.selectedVehicle || 'medium';
    const sh = launchShake(lt);
    if (sh > 0) ctx.translate((Math.random() - 0.5) * 2 * sh, (Math.random() - 0.5) * 2 * sh);
    if (lt < LT.space) {
      const climb = lt < LT.lift ? 0 : easeIn(clamp((lt - LT.lift) / (LT.space - LT.lift))) * 1400;
      const cam = Math.max(0, climb - 260);
      const k = clamp(cam / 900);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `rgb(${lerp(10, 2, k)},${lerp(18, 3, k)},${lerp(38, 8, k)})`);
      sky.addColorStop(0.75, `rgb(${lerp(34, 3, k)},${lerp(48, 5, k)},${lerp(78, 12, k)})`);
      sky.addColorStop(1, `rgb(${lerp(70, 4, k)},${lerp(66, 6, k)},${lerp(80, 14, k)})`);
      ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalAlpha = 0.3 + k * 0.7; Draw.drawStars(ctx); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(0, cam);
      ctx.fillStyle = '#07090d'; ctx.fillRect(-20, 610, W + 40, 500);
      ctx.fillStyle = '#0c1016';
      ctx.beginPath(); ctx.moveTo(-20, 612);
      for (let x = -20; x <= W + 20; x += 60) ctx.lineTo(x, 604 - Math.abs(Math.sin(x * 0.011)) * 16 - Math.abs(Math.sin(x * 0.037)) * 5);
      ctx.lineTo(W + 20, 612); ctx.fill();
      ctx.strokeStyle = '#262d38'; ctx.lineWidth = 1.5;
      ctx.strokeRect(466, 420, 24, 190);
      ctx.beginPath();
      for (let yy = 420; yy < 610; yy += 16) { ctx.moveTo(466, yy); ctx.lineTo(490, yy + 16); ctx.moveTo(490, yy); ctx.lineTo(466, yy + 16); }
      ctx.moveTo(466, 470); ctx.lineTo(438, 470); ctx.moveTo(466, 540); ctx.lineTo(440, 540);
      ctx.stroke();
      ctx.fillStyle = (t * 1.5) % 1 < 0.12 ? '#ff5040' : '#3a1410'; ctx.fillRect(476, 414, 4, 4);
      ctx.fillStyle = '#151a22'; ctx.fillRect(350, 606, 180, 8);
      if (lt > LT.ignite) {
        const f = clamp(1 - (lt - LT.ignite) / 2.5);
        glow(ctx, 420, 606, 380, 'rgba(255,170,90,ALPHA)', 0.45 * f + 0.08);
      }
      ctx.restore();
      const thrust = lt < LT.ignite ? 0 : clamp((lt - LT.ignite) / 0.35) * (1 + (lt > LT.lift ? 0.4 : 0));
      const rx = 420, ry = 604 - climb + cam;
      if (lt >= LT.ignite && !Game.launchBlast) {
        Game.launchBlast = true;
        for (let i = 0; i < 70; i++) {
          const a = Math.PI + Math.random() * Math.PI, v = 150 + Math.random() * 380;
          Draw.emit({ x: rx, y: 606 - cam, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.35, life: 2.8, max: 2.8, size: 16 + Math.random() * 20, grow: 36, drag: 0.955, add: false, soft: true, alpha: 0.55, color: '170,165,160' });
        }
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * TAU, v = 80 + Math.random() * 240;
          Draw.emit({ x: rx, y: 600 - cam, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 40, life: 0.9, max: 0.9, size: 3 + Math.random() * 4, drag: 0.94, color: '255,190,110' });
        }
      }
      if (thrust > 0) {
        const n = lt < LT.lift + 0.8 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          Draw.emit({ x: rx + (Math.random() - 0.5) * 10, y: ry + 12 - cam, vx: (Math.random() - 0.5) * 50, vy: 220 + Math.random() * 120, life: 0.45, max: 0.45, size: 3 + Math.random() * 3, color: '255,170,90' });
          if (climb < 500) Draw.emit({ x: rx + (Math.random() - 0.5) * 50, y: 604, vx: (Math.random() - 0.5) * 340, vy: -Math.random() * 50, life: 3, max: 3, size: 12 + Math.random() * 14, grow: 26, drag: 0.965, add: false, soft: true, alpha: 0.5, color: '165,162,158' });
          else Draw.emit({ x: rx + (Math.random() - 0.5) * 8, y: ry + 30 - cam, vx: (Math.random() - 0.5) * 20, vy: 40, life: 2.2, max: 2.2, size: 6, grow: 10, drag: 0.98, add: false, soft: true, alpha: 0.35, color: '160,160,165' });
        }
      } else if (Math.random() < (lt > LT.ignite - 1 ? 0.9 : 0.35)) {
        Draw.emit({ x: rx + (Math.random() - 0.5) * 20, y: 596, vx: (Math.random() - 0.5) * 16, vy: -12, life: 2, max: 2, size: 5, grow: 8, add: false, soft: true, alpha: 0.35, color: '215,220,228' });
      }
      Draw.drawParticles(ctx, cam);
      rocket(ctx, rx, ry, 1.35, type, t, thrust);
      if (lt < LT.count) {
        stamp(ctx, 'FINAL PRE-LAUNCH CHECKS', 420, 150, COL.cyan, 20);
        text(ctx, `LAUNCH DIRECTOR POLL · ${Math.min(Game.pollStep, 7)} OF 7 STATIONS GO`, 420, 196, { align: 'center', size: 11, color: COL.label, spacing: 2 });
        if (M.travel) text(ctx, `TRAVEL STRATEGY LOCKED · ${M.travel.short} · ≈${MathX.fmtDuration(M.travel.hours)}`, 420, 216, { align: 'center', size: 11, color: COL.amber, spacing: 2 });
      } else if (lt < LT.ignite) {
        const n = Math.ceil(LT.ignite - lt), frac = (LT.ignite - lt) - (n - 1);
        const enter = clamp((frac - 0.8) / 0.2), col = n === 1 ? COL.amber : COL.white;
        ctx.save();
        ctx.translate(420, 190); ctx.scale(1 + enter * 0.35, 1 + enter * 0.35);
        text(ctx, `T−${n}`, 0, 0, { align: 'center', size: 84, weight: 300, color: col, alpha: 1 - enter, spacing: 6, glow: 1 });
        ctx.restore();
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(420, 190, 74, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - frac)); ctx.stroke();
        ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(420, 190, 74, 0, TAU); ctx.stroke(); ctx.restore();
        text(ctx, COUNT_CAPTIONS[n], 420, 286, { align: 'center', size: 11, color: n === 1 ? COL.amber : COL.label, spacing: 3 });
        if (n === 1) { ctx.fillStyle = `rgba(232,165,75,${0.05 + 0.05 * Math.sin(t * 20)})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
      } else if (lt < LT.lift + 1.4) stamp(ctx, 'LIFTOFF!', 420, 170, COL.white, 44);
      const flash = clamp((lt - (LT.space - 0.35)) / 0.35);
      if (flash > 0) { ctx.fillStyle = `rgba(0,0,0,${flash})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    } else {
      background(ctx, t, 18);
      Draw.earth(ctx, 420, 1560, 1000, t);
      const st = lt - LT.space;
      const fade = 1 - clamp(st / 0.5);
      const ux = 200 + st * 60, uy = 320 - st * 12;
      const sep = clamp((lt - LT.sep) / 1.2);
      const cx = ux + 40 + sep * 120, cy = uy - sep * 30;
      ctx.save(); ctx.translate(ux, uy); ctx.rotate(Math.PI / 2 - 0.12); ctx.scale(0.9, 0.9);
      const sb = ctx.createLinearGradient(-10, 0, 10, 0);
      sb.addColorStop(0, '#7b828c'); sb.addColorStop(0.35, '#e8eaed'); sb.addColorStop(1, '#6d737c');
      ctx.fillStyle = sb; ctx.fillRect(-10, 0, 20, 60);
      ctx.fillStyle = '#23272d'; ctx.fillRect(-10, 0, 20, 4); ctx.fillRect(-7, 60, 14, 6);
      ctx.restore();
      if (lt < LT.sep) Draw.spacecraft(ctx, cx, cy, 1.1, -0.12, Draw.craftCfg(), t, { deploy: {} });
      else Draw.spacecraft(ctx, cx, cy, 1.1, -0.12 + sep * 0.12, Draw.craftCfg(), t, { deploy: Game.deploys });
      Draw.drawParticles(ctx);
      if (lt > LT.sep) tag(ctx, 'SPACECRAFT SEPARATION · SOLAR ARRAYS UNFOLDING', 420, 118, COL.cyan, 'center');
      if (lt > LT.end - 0.8) stamp(ctx, 'EARTH ORBIT REACHED', 420, 160, COL.green, 24);
      if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    }
  };

  // ================================================================ TRANSFER
  const TJ = { e: { x: 190, y: 500, r: 58 }, rp: 82, m: { x: 650, y: 200, r: 40 }, rl: 62, depart: 200 * D2R };
  const PATH_SHAPE = { fast: { l1: 120, l2: 110, lift: 0 }, balanced: { l1: 175, l2: 160, lift: -25 }, efficient: { l1: 250, l2: 240, lift: -60 } };
  function transferCurve(mode) {
    const sh = PATH_SHAPE[mode] || PATH_SHAPE.balanced;
    const p0 = { x: TJ.e.x + TJ.rp * Math.cos(TJ.depart), y: TJ.e.y + TJ.rp * Math.sin(TJ.depart) };
    const v = { x: -Math.sin(TJ.depart), y: Math.cos(TJ.depart) };
    const p3 = { x: TJ.m.x, y: TJ.m.y - TJ.rl };
    return [p0, { x: p0.x + v.x * sh.l1, y: p0.y + v.y * sh.l1 }, { x: p3.x - sh.l2, y: p3.y + sh.lift }, p3];
  }
  const cb = MathX.cubic, cbAng = MathX.cubicAng;
  function curvePath(ctx, c, from = 0, to = 1) {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const q = cb(c, from + (to - from) * i / 60); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
  }

  const TRANSFER = { park: 5.2, tli: 2.6, loi: 3.2, tliArc: 0.07 };
  const cruiseTime = () => (M.travel ? M.travel.cruiseHours : 73) / 13.5;
  const SC = { x: 400, y: 395 };

  function journeyCam() {
    const earthCam = { c: TJ.e, z: 2.1 }, wide = { c: { x: SC.x, y: SC.y - 52 }, z: 0.95 }, moonCam = { c: TJ.m, z: 2.3 };
    const blend = (a, b, k) => { k = ease(clamp(k)); return { c: { x: lerp(a.c.x, b.c.x, k), y: lerp(a.c.y, b.c.y, k) }, z: lerp(a.z, b.z, k) }; };
    const ph = Game.phase;
    if (ph === 'parking') return earthCam;
    if (ph === 'tli') return blend(earthCam, wide, (Game.phaseT - TRANSFER.tli * 0.45) / (TRANSFER.tli * 0.9));
    if (ph === 'loi' || ph === 'arrived') return blend(wide, moonCam, Game.phaseT / 1.3 + (ph === 'arrived' ? 1 : 0));
    return blend(earthCam, wide, (Draw.progressT('cruise') + TRANSFER.tli * 0.55) / (TRANSFER.tli * 0.9));
  }

  function journeyMET() {
    const tp = M.travel; if (!tp) return 0;
    const ph = Game.phase;
    if (ph === 'parking') return 0.2 + (PARKING_HOURS - 0.2) * clamp(Game.phaseT / TRANSFER.park);
    if (ph === 'tli') return PARKING_HOURS + 0.1 * clamp(Game.phaseT / TRANSFER.tli);
    if (ph === 'loi' || ph === 'arrived') return tp.hours;
    return PARKING_HOURS + 0.1 + (tp.cruiseHours - 0.1) * clamp(Draw.progressT('cruise') / cruiseTime());
  }

  SCENES.TRAJECTORY = (ctx, t) => {
    background(ctx, t, 1.5); grid(ctx, 0.022);
    const off = { x: 0, y: 44 };
    ctx.save(); ctx.translate(off.x, off.y);
    const lh = Draw.lapseHours(t);
    Draw.earth(ctx, TJ.e.x, TJ.e.y, TJ.e.r, lh);
    ctx.save(); ctx.strokeStyle = COL.cyan; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(TJ.e.x, TJ.e.y, TJ.rp, 0, TAU); ctx.stroke(); ctx.restore();
    Draw.moon(ctx, TJ.m.x, TJ.m.y, TJ.m.r, { lon: Draw.moonLon(lh) });
    ctx.save(); ctx.strokeStyle = COL.green; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(TJ.m.x, TJ.m.y, TJ.rl, 0, TAU); ctx.stroke(); ctx.restore();
    const active = Game.preview || Game.choice;
    const d = computeDesign(Game.sel);
    const labels = [];
    for (const id of ['efficient', 'balanced', 'fast']) {
      const c = transferCurve(id), on = id === active;
      ctx.save();
      ctx.strokeStyle = on ? COL.amber : 'rgba(150,175,200,0.5)'; ctx.lineWidth = on ? 2 : 1;
      ctx.setLineDash(on ? [] : [4, 5]);
      curvePath(ctx, c); ctx.stroke(); ctx.restore();
      if (on) {
        const u = (t * (id === 'fast' ? 0.3 : id === 'balanced' ? 0.24 : 0.16)) % 1;
        const q = cb(c, u);
        Draw.spacecraft(ctx, q.x, q.y, 0.4, cbAng(c, u), Draw.craftCfg(), t);
      }
      const m = cb(c, 0.42), tpn = travelPlan(id, d.mass, M.selectedEngine || (Game.sel && Game.sel.engine));
      labels.push({ x: SC.x + m.x, y: SC.y + m.y + off.y, id, on, text: `${TRAVEL_MODES[id].short} · ≈${MathX.fmtDuration(tpn.hours)}` });
    }
    const dp = transferCurve('balanced')[0];
    ctx.fillStyle = COL.amber; ctx.fillRect(dp.x - 2.5, dp.y - 2.5, 5, 5);
    ctx.restore();
    for (const l of labels) text(ctx, l.text, l.x - 14, l.y, { align: 'right', size: 10.5, color: l.on ? COL.amber : COL.label, spacing: 1.5, weight: l.on ? 700 : 500, glow: 1 });
    const dps = { x: dp.x, y: dp.y + off.y };
    text(ctx, 'TLI BURN POINT', dps.x - 8, dps.y - 10, { size: 9.5, color: COL.amber, spacing: 1.5, align: 'right', glow: 1 });
    tag(ctx, 'EARTH · PARKING ORBIT', TJ.e.x + off.x, TJ.e.y + off.y + 100, COL.label, 'center');
    tag(ctx, 'MOON · LUNAR ORBIT', TJ.m.x + off.x, TJ.m.y + off.y + 84, COL.label, 'center');
    tag(ctx, 'TRAVEL STRATEGY · HOW QUICKLY DO YOU WANT TO REACH THE MOON?', 40, 106, COL.cyan);
    if (NasaData.get('Perigee (closest)', 'orbit')) {
      tag(ctx, 'EARTH-MOON DISTANCE · THIS LAUNCH WINDOW', 40, 136);
      text(ctx, `${Math.round(M.moonDistance).toLocaleString('en-US')} km`, 40, 156, { size: 16, color: COL.white });
      text(ctx, `NASA range ${NasaData.show('Perigee (closest)', 'orbit')} (perigee) - ${NasaData.show('Apogee (farthest)', 'orbit')} (apogee)`, 40, 175, { size: 9.5, color: COL.faint });
    }
    text(ctx, 'Trajectories stylised, not to scale (simplified game model)', 40, 700, { size: 9.5, color: COL.faint });
  };

  SCENES.LAUNCH_WAIT = (ctx, t) => SCENES.LAUNCH(ctx, t);

  SCENES.TRANSFER = (ctx, t) => {
    Draw.hazardShake(ctx, t);
    background(ctx, t, 3); grid(ctx, 0.02);
    const tp = M.travel, mode = M.travelMode || 'balanced', c = transferCurve(mode), ph = Game.phase;
    const cam = journeyCam();
    ctx.save();
    ctx.translate(SC.x, SC.y); ctx.scale(cam.z, cam.z); ctx.translate(-cam.c.x, -cam.c.y);
    const lw = 1 / cam.z;
    const met = journeyMET();
    Draw.earth(ctx, TJ.e.x, TJ.e.y, TJ.e.r, met);
    ctx.save(); ctx.strokeStyle = COL.cyan; ctx.lineWidth = 1.2 * lw;
    ctx.globalAlpha = ph === 'parking' ? 0.7 : 0.25; ctx.setLineDash(ph === 'parking' ? [] : [3 * lw, 5 * lw]);
    ctx.beginPath(); ctx.arc(TJ.e.x, TJ.e.y, TJ.rp, 0, TAU); ctx.stroke(); ctx.restore();
    Draw.moon(ctx, TJ.m.x, TJ.m.y, TJ.m.r, { lon: Draw.moonLon(met) });
    if (ph === 'loi' || ph === 'arrived') {
      ctx.save(); ctx.strokeStyle = COL.green; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2 * lw;
      ctx.beginPath(); ctx.arc(TJ.m.x, TJ.m.y, TJ.rl, 0, TAU); ctx.stroke(); ctx.restore();
    }
    let s = 0;
    if (ph === 'tli') s = TRANSFER.tliArc * Math.pow(clamp(Game.phaseT / TRANSFER.tli), 2);
    else if (ph === 'cruise' || ph === 'hazard' || ph === 'hazardDone') {
      const u = clamp(Draw.progressT('cruise') / cruiseTime());
      s = TRANSFER.tliArc + (1 - TRANSFER.tliArc) * clamp(u + 0.16 * Math.sin(Math.PI * u));
    } else if (ph === 'loi' || ph === 'arrived') s = 1;
    ctx.save(); ctx.strokeStyle = 'rgba(150,175,200,0.35)'; ctx.lineWidth = 1 * lw; ctx.setLineDash([2 * lw, 6 * lw]);
    curvePath(ctx, c); ctx.stroke(); ctx.restore();
    if (s > 0) { ctx.save(); ctx.strokeStyle = COL.cyan; ctx.lineWidth = 1.6 * lw; curvePath(ctx, c, 0, s); ctx.stroke(); ctx.restore(); }

    let q, ang, thrust = false, scale = 0.55;
    if (ph === 'parking') {
      const w = 2 * TAU / TRANSFER.park, th = TJ.depart - w * (TRANSFER.park - Game.phaseT);
      q = { x: TJ.e.x + TJ.rp * Math.cos(th), y: TJ.e.y + TJ.rp * Math.sin(th) };
      ang = th + Math.PI / 2;
    } else if (ph === 'loi' || ph === 'arrived') {
      if (M.flags.missedCapture) {
        const k = Game.phaseT * 60, a = cbAng(c, 1);
        q = { x: c[3].x + Math.cos(a) * k, y: c[3].y + Math.sin(a) * k }; ang = a;
      } else {
        const th = -Math.PI / 2 + (ph === 'loi' ? Game.phaseT : TRANSFER.loi + Game.phaseT) * 1.1;
        q = { x: TJ.m.x + TJ.rl * Math.cos(th), y: TJ.m.y + TJ.rl * Math.sin(th) };
        ang = th + Math.PI / 2;
        if (ph === 'loi' && Game.phaseT < 1.5) { thrust = 2; ang += Math.PI; }
      }
    } else {
      q = cb(c, s); ang = cbAng(c, Math.max(0.002, s));
      if (ph === 'tli') { thrust = 2 + clamp(Game.phaseT / 0.6); }
      if (Draw.evading()) thrust = true;
    }
    if (thrust && thrust !== true && Math.random() < 0.8) {
      const back = ang + Math.PI;
      Draw.emit({ x: q.x + Math.cos(back) * 14, y: q.y + Math.sin(back) * 14, vx: Math.cos(back) * 60 + (Math.random() - 0.5) * 20, vy: Math.sin(back) * 60 + (Math.random() - 0.5) * 20, life: 0.7, max: 0.7, size: 1.2, color: '180,215,255' });
    }
    Draw.drawParticles(ctx);
    Draw.spacecraft(ctx, q.x, q.y, scale, ang, Draw.craftCfg(), t, { thrust, deploy: Game.deploys });
    ctx.restore();

    const qs = { x: SC.x + (q.x - cam.c.x) * cam.z, y: SC.y + (q.y - cam.c.y) * cam.z };
    Draw.hazardFx(ctx, t, qs.x, qs.y);
    const es = { x: SC.x + (TJ.e.x - cam.c.x) * cam.z, y: SC.y + (TJ.e.y - cam.c.y) * cam.z };
    const ms = { x: SC.x + (TJ.m.x - cam.c.x) * cam.z, y: SC.y + (TJ.m.y - cam.c.y) * cam.z };
    if (es.x > -100 && es.y < 760) tag(ctx, 'EARTH', es.x, es.y + TJ.e.r * cam.z + 18, COL.label, 'center');
    if (ms.x < 900) tag(ctx, 'MOON', ms.x, ms.y + TJ.m.r * cam.z + 16, COL.label, 'center');
    const titles = {
      parking: Game.phaseT < TRANSFER.park / 2 ? ['EARTH ORBIT', 'ORBIT 1 OF 2 · SYSTEMS CHECKOUT'] : ['PREPARING FOR TRANS-LUNAR INJECTION', 'ORBIT 2 OF 2 · ENGINE ARMED'],
      tli: ['TRANS-LUNAR INJECTION BURN', 'ENGINE FIRING · ACCELERATING OUT OF EARTH ORBIT'],
      cruise: ['TRANS-LUNAR COAST', `${tp ? tp.short : ''} TRAJECTORY`],
      hazard: ['TRANS-LUNAR COAST', 'ANOMALY IN PROGRESS'], hazardDone: ['TRANS-LUNAR COAST', 'ANOMALY RESOLVED'],
      loi: M.flags.missedCapture ? ['LUNAR CAPTURE FAILED', 'NOT ENOUGH PROPELLANT TO BRAKE'] : ['ENTERING LUNAR ORBIT', 'RETRO-BURN · LUNAR ORBIT INSERTION'],
      arrived: M.flags.missedCapture ? ['LUNAR CAPTURE FAILED', 'LUNARIS-01 FLEW PAST THE MOON'] : M.failure ? ['CAPTURED · NO FUEL LEFT', 'TOO LITTLE PROPELLANT FOR A SCIENCE ORBIT'] : ['LUNAR ORBIT ESTABLISHED', 'CAPTURE CONFIRMED'],
    }[ph] || ['', ''];
    const tcol = ph === 'tli' || ph === 'loi' ? COL.amber : (M.failure && (ph === 'loi' || ph === 'arrived')) ? COL.red : ph === 'arrived' ? COL.green : COL.cyan;
    stamp(ctx, titles[0], 420, 118, tcol, 17);
    text(ctx, titles[1], 420, 150, { align: 'center', size: 10.5, color: COL.label, spacing: 2 });
    if (tp) {
      const met = journeyMET();
      tag(ctx, 'MISSION ELAPSED TIME', 40, 196);
      text(ctx, `MET ${MathX.fmtMET(met)}`, 40, 216, { size: 18, color: COL.white, weight: 400 });
      tag(ctx, ph === 'arrived' || ph === 'loi' ? 'ARRIVED AFTER' : 'LUNAR ARRIVAL IN', 40, 244);
      text(ctx, ph === 'arrived' || ph === 'loi' ? MathX.fmtDuration(tp.hours) : MathX.fmtDuration(Math.max(0, tp.hours - met)), 40, 262, { size: 14, color: COL.amber });
      const remain = ph === 'parking' || ph === 'tli' ? tp.dist : ph === 'loi' || ph === 'arrived' ? 0 : tp.dist * (1 - s);
      tag(ctx, 'RANGE TO MOON', 40, 290);
      text(ctx, `${Math.round(remain).toLocaleString('en-US')} km`, 40, 308, { size: 14, color: COL.white });
      text(ctx, 'launch-window distance', 40, 324, { size: 8.5, color: COL.faint });
    }
    const bn = Game.burn;
    if (bn && Game.t - bn.t0 < bn.dur + 1.5) {
      const k = clamp((Game.t - bn.t0) / bn.dur), v = Math.round(lerp(bn.from, bn.to, k));
      const x = 40, y = 360;
      tag(ctx, `${bn.label} · PROPELLANT`, x, y, COL.amber);
      text(ctx, `${v}%`, x, y + 24, { size: 26, weight: 300, color: COL.white });
      ctx.fillStyle = 'rgba(150,175,200,0.15)'; ctx.fillRect(x, y + 44, 200, 5);
      ctx.fillStyle = COL.amber; ctx.fillRect(x, y + 44, 2 * v, 5);
      text(ctx, `−${bn.from - bn.to}%`, x + 80, y + 26, { size: 12, color: COL.red });
    }
  };

  // ================================================================ ORBIT + SURVEY
  const OR = { x: 390, y: 390, r: 175, rot: -0.2, low: [225, 58], high: [330, 96] };
  SCENES.ORBIT_DECISION = (ctx, t) => {
    background(ctx, t, 2); grid(ctx, 0.02);
    const active = Game.phase === 'choose' ? (Game.preview || Game.choice) : M.selectedOrbit;
    const orbitStyle = id => (id === active ? [COL.cyan, 1.6, 1] : ['rgba(150,175,200,1)', 0.8, 0.3]);
    for (const id of ['high', 'low']) { const [c, w, a] = orbitStyle(id); Draw.orbitHalf(ctx, OR.x, OR.y, OR[id][0], OR[id][1], OR.rot, false, c, w, a); }
    const act = active || 'high';
    const p = Draw.onEllipse(OR.x, OR.y, OR[act][0], OR[act][1], OR.rot, t * (act === 'low' ? 0.8 : 0.5));
    const cfg = Draw.craftCfg();
    if (!p.front) Draw.spacecraft(ctx, p.x, p.y, 0.5, Math.sin(t) * 0.2, cfg, t, { deploy: Game.deploys });
    Draw.moon(ctx, OR.x, OR.y, OR.r, { lon: Draw.moonLon(Draw.lapseHours(t)) });
    for (const id of ['high', 'low']) { const [c, w, a] = orbitStyle(id); Draw.orbitHalf(ctx, OR.x, OR.y, OR[id][0], OR[id][1], OR.rot, true, c, w, a); }
    if (p.front) Draw.spacecraft(ctx, p.x, p.y, 0.75, Math.sin(t) * 0.2, cfg, t, { thrust: Game.phase === 'inserting', deploy: Game.deploys });
    const lp = Draw.onEllipse(OR.x, OR.y, OR.low[0], OR.low[1], OR.rot, 1.25), hp = Draw.onEllipse(OR.x, OR.y, OR.high[0], OR.high[1], OR.rot, 1.1);
    tag(ctx, 'LOW ORBIT', lp.x + 10, lp.y + 14, act === 'low' ? COL.cyan : COL.faint);
    tag(ctx, 'HIGHER ORBIT', hp.x + 10, hp.y + 14, act === 'high' ? COL.cyan : COL.faint);
    tag(ctx, `MOON · MEAN RADIUS ${NasaData.show('Mean radius', '')}`, OR.x, 680, COL.label, 'center');
    text(ctx, 'Orbits stylised, not to scale (simplified game model)', OR.x, 698, { align: 'center', size: 9.5, color: COL.faint });
  };

  const SV = { x: 400, y: 365, r: 215, k: 1.5 };
  const SCAN_TIME = 4.5;
  function orbitPoint(theta, reg, view) {
    const d = (reg.lon - VIEWS[view]) * D2R;
    const xb = Math.cos(theta) * Math.sin(d), yb = Math.sin(theta), zb = Math.cos(theta) * Math.cos(d);
    const y = yb * Math.cos(TILT) + zb * Math.sin(TILT), z = zb * Math.cos(TILT) - yb * Math.sin(TILT);
    return { x: SV.x + xb * SV.k * SV.r, y: SV.y - y * SV.k * SV.r, front: z > 0 };
  }
  function orbitPath(ctx, reg, view, front) {
    ctx.save();
    ctx.strokeStyle = COL.cyan; ctx.globalAlpha = front ? 0.55 : 0.28; ctx.lineWidth = front ? 1 : 0.8;
    ctx.setLineDash(front ? [] : [3, 5]);
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= 160; i++) {
      const p = orbitPoint(i / 160 * TAU, reg, view);
      if (p.front === front) { if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; } else pen = false;
    }
    ctx.stroke();
    ctx.restore();
  }
  function surveyScene(ctx, t, o = {}) {
    background(ctx, t, 1.5);
    const reg = site(), view = Draw.siteView(reg);
    const tp = Draw.targetPos(SV.x, SV.y, SV.r, view);
    const latT = reg.lat * D2R;
    let th;
    const scanP = clamp(Draw.progressT('scanning') / SCAN_TIME);
    const inScan = Game.state === 'SURVEY' && ['scanning', 'hazard', 'hazardDone'].includes(Game.phase);
    if (inScan) th = latT + 0.3 - 0.6 * scanP;
    else if (o.parked || Game.phase === 'done') th = latT + 0.1;
    else th = latT + 1.2 + t * 0.35;
    const p = orbitPoint(th, reg, view);
    const cfg = Draw.craftCfg();
    orbitPath(ctx, reg, view, false);
    if (!p.front) Draw.spacecraft(ctx, p.x, p.y, 0.55, 0, cfg, t, { deploy: Game.deploys });
    Draw.moon(ctx, SV.x, SV.y, SV.r, { night: o.night || 0, view });
    Draw.targetMarker(ctx, tp.x, tp.y, t, COL.amber, 0.9);
    orbitPath(ctx, reg, view, true);
    if (view === 'far') tag(ctx, 'FARSIDE VIEW · EARTH IS BEHIND THE MOON', 40, 690, COL.faint);
    return { p, tp, cfg, reg };
  }

  SCENES.SURVEY = (ctx, t) => {
    Draw.hazardShake(ctx, t);
    const { p, tp, cfg, reg } = surveyScene(ctx, t);
    const scanning = Game.phase === 'scanning';
    if (scanning) {
      const mode = M.selectedObservation || 'standard';
      const width = mode === 'deep' ? 44 : mode === 'standard' ? 30 : 18;
      const sweep = Math.sin(Game.phaseT * 2.6) * width * 0.6;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(p.x, p.y, tp.x, tp.y);
      bg.addColorStop(0, 'rgba(124,199,232,0.32)'); bg.addColorStop(1, 'rgba(124,199,232,0.04)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tp.x - width + sweep, tp.y); ctx.lineTo(tp.x + width + sweep, tp.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(190,230,250,0.6)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tp.x + sweep, tp.y); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(124,199,232,0.35)'; ctx.lineWidth = 0.6;
      const fx = tp.x + sweep;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(fx - width, tp.y + k * 5); ctx.lineTo(fx + width, tp.y + k * 5); ctx.stroke(); }
      ctx.restore();
      if (Math.random() < (mode === 'deep' ? 0.7 : 0.4)) {
        const sx = tp.x + (Math.random() - 0.5) * width * 2;
        Draw.emit({ x: sx, y: tp.y, vx: (p.x - sx) * 0.9, vy: (p.y - tp.y) * 0.9, life: 1, max: 1, size: 1, color: '200,230,250' });
      }
    }
    Draw.drawParticles(ctx);
    Draw.spacecraft(ctx, p.x, p.y, p.front ? 0.8 : 0.55, 0, cfg, t, { thrust: Draw.evading(), deploy: Game.deploys });
    Draw.hazardFx(ctx, t, p.x, p.y, 106);
    const lx = Math.min(tp.x + 36, 600), ly = tp.y > 560 ? tp.y - 44 : tp.y + 36;
    tag(ctx, `TARGET · ${reg.name.toUpperCase()}`, lx, ly, COL.amber);
    text(ctx, reg.site, lx, ly + 16, { size: 9.5, color: COL.faint });
    if (Game.phase === 'done' && Game.lastGain) {
      const k = clamp(Game.phaseT / 1.5);
      text(ctx, `+${Game.lastGain} SCIENCE`, tp.x, tp.y - 60 - k * 24, { align: 'center', size: 18, color: COL.green, spacing: 3, alpha: 1 - k * 0.4, glow: 1 });
    }
    const paused = Game.phase === 'hazard' || Game.phase === 'hazardDone';
    if (scanning || paused) {
      tag(ctx, `ACQUIRING · ${SCANS[M.selectedObservation].name.toUpperCase()}${paused ? ' · PAUSED' : ''}`, 40, 130, paused ? COL.amber : COL.cyan);
      const pct = clamp(Draw.progressT('scanning') / SCAN_TIME);
      ctx.fillStyle = 'rgba(150,175,200,0.2)'; ctx.fillRect(40, 142, 220, 3);
      ctx.fillStyle = COL.cyan; ctx.fillRect(40, 142, 220 * pct, 3);
      text(ctx, `${Math.round(pct * 100)}%`, 270, 144, { size: 10.5, color: COL.white });
    }
  };

  function powerGauge(ctx, x, y, level, t) {
    const lv = clamp(level / 100);
    tag(ctx, 'BUS POWER', x, y);
    text(ctx, `${Math.round(level)}%`, x, y + 26, { size: 30, weight: 300, color: lv < 0.2 ? COL.red : COL.white });
    ctx.fillStyle = 'rgba(150,175,200,0.15)'; ctx.fillRect(x, y + 50, 200, 6);
    ctx.fillStyle = lv < 0.2 ? COL.red : lv < 0.4 ? COL.amber : COL.green; ctx.fillRect(x, y + 50, 200 * lv, 6);
    ctx.fillStyle = 'rgba(229,83,75,0.9)'; ctx.fillRect(x + 200 * RULES.healthyPower / 100, y + 46, 1, 14);
    text(ctx, `${RULES.healthyPower}% health line`, x + 200 * RULES.healthyPower / 100 + 4, y + 68, { size: 9, color: COL.faint });
  }

  SCENES.MISSION_EVENT = (ctx, t) => {
    const night = Game.phase === 'alert' ? clamp(Game.phaseT / 2.2) * 0.75 : 0.75;
    const { p, cfg } = surveyScene(ctx, t, { night, parked: true });
    Draw.drawParticles(ctx);
    Draw.spacecraft(ctx, p.x, p.y, 0.8, 0, cfg, t, { deploy: Game.deploys });
    const pulse = Math.abs(Math.sin(t * 2.5));
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(229,83,75,0)'); vg.addColorStop(1, `rgba(229,83,75,${0.08 + pulse * 0.1})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(229,83,75,${0.55 + 0.45 * pulse})`; ctx.fillRect(40, 102, 8, 8);
    text(ctx, 'MASTER CAUTION · POWER DEMAND', 58, 106, { size: 12, color: COL.red, spacing: 2, weight: 700 });
    const shown = Game.phase === 'alert' ? lerp(Game.powerBefore, M.power, clamp((Game.phaseT - 1) / 1.2)) : M.power;
    powerGauge(ctx, 40, 140, shown, t);
    tag(ctx, 'HEATERS · ON', 40, 240, COL.amber);
    text(ctx, `Night low ${NasaData.show('Surface temperature minimum (typical range)', '')}`, 40, 258, { size: 10, color: COL.faint });
    if (Game.phase !== 'alert' && Game.eventDrain) text(ctx, `−${Game.eventDrain}%`, 120, 166, { size: 14, color: COL.red, alpha: 1 - clamp(Game.sceneT / 6) * 0.5 });
  };

  // ================================================================ TRANSMISSION (RETURN)
  const TX = { m: { x: 140, y: 520, r: 105 }, c: { x: 390, y: 370 }, e: { x: 640, y: 205, r: 60 } };
  const packets = [];
  const TX_TIME = 5;
  SCENES.TRANSMISSION = (ctx, t, dt) => {
    background(ctx, t, 2); grid(ctx, 0.02);
    Draw.moon(ctx, TX.m.x, TX.m.y, TX.m.r);
    Draw.earth(ctx, TX.e.x, TX.e.y, TX.e.r, Draw.lapseHours(t));
    const tp = Draw.targetPos(TX.m.x, TX.m.y, TX.m.r, 'near');
    if (!tp.visible) tag(ctx, 'FAR SIDE TARGET · BEHIND THE LIMB', tp.x + 10, tp.y - 14, COL.amber);
    const sending = Game.phase === 'sending';
    const full = (Game.phase === 'choose' ? (Game.preview || Game.choice) : M.selectedTransmission) === 'full';
    ctx.save(); ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 20;
    ctx.strokeStyle = 'rgba(150,175,200,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(TX.c.x, TX.c.y); ctx.lineTo(TX.e.x, TX.e.y); ctx.stroke();
    ctx.restore();
    const rate = sending ? (full ? 16 : 7) : 1.2;
    if (Math.random() < rate * dt) packets.push({ seg: 0, p: 0 });
    if (sending && Math.random() < rate * dt) packets.push({ seg: 1, p: 0 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = packets.length - 1; i >= 0; i--) {
      const k = packets[i];
      k.p += dt * (k.seg === 0 ? 0.9 : 0.7);
      if (k.p >= 1) { packets.splice(i, 1); continue; }
      const a = k.seg === 0 ? tp : TX.c, b = k.seg === 0 ? TX.c : TX.e;
      const x = lerp(a.x, b.x, k.p), y = lerp(a.y, b.y, k.p), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const len = full ? 10 : 6;
      ctx.strokeStyle = k.seg === 0 ? 'rgba(232,180,110,0.9)' : 'rgba(150,215,245,0.95)';
      ctx.lineWidth = full ? 1.6 : 1.1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); ctx.stroke();
    }
    ctx.restore();
    if (sending) {
      ctx.save(); ctx.strokeStyle = COL.cyan;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.8 + k / 3) % 1;
        ctx.globalAlpha = 0.5 * (1 - ph); ctx.beginPath(); ctx.arc(TX.e.x, TX.e.y, TX.e.r + 6 + ph * 30, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    const ang = Math.atan2(TX.e.y - TX.c.y, TX.e.x - TX.c.x);
    Draw.spacecraft(ctx, TX.c.x, TX.c.y + Math.sin(t) * 2, 1.15, ang + Math.PI / 2 - 0.2, Draw.craftCfg(), t, { deploy: Game.deploys });
    tag(ctx, 'MOON', TX.m.x, TX.m.y + TX.m.r + 22, COL.label, 'center');
    tag(ctx, 'EARTH · DEEP SPACE NETWORK', TX.e.x, TX.e.y + TX.e.r + 22, COL.label, 'center');
    tag(ctx, 'LUNARIS-01', TX.c.x, TX.c.y + 56, COL.faint, 'center');
    if (sending) {
      const pct = clamp(Game.phaseT / TX_TIME);
      tag(ctx, 'DOWNLINK IN PROGRESS', 40, 112, COL.cyan);
      ctx.fillStyle = 'rgba(150,175,200,0.2)'; ctx.fillRect(40, 124, 220, 3);
      ctx.fillStyle = COL.cyan; ctx.fillRect(40, 124, 220 * pct, 3);
      text(ctx, `${Math.round(pct * 100)}%`, 270, 126, { size: 10.5, color: COL.white });
      // storage → returned indicator
      const stored = M.dataStored, returned = Math.round(stored * (full ? 1 : 0.75) * clamp(Game.phaseT / TX_TIME) * 10) / 10;
      tag(ctx, `DATA ${stored} GB → ${returned} GB`, 40, 150, COL.cyan);
    }
    if (Game.signalDelay) {
      const mx = (TX.c.x + TX.e.x) / 2, my = (TX.c.y + TX.e.y) / 2;
      text(ctx, `≈${Game.signalDelay.toFixed(2)} s light-time`, mx + 18, my + 14, { size: 10, color: COL.faint });
    }
  };

  // ================================================================ RESULT (EXPLAIN: visual debrief)
  SCENES.RESULT = (ctx, t) => {
    background(ctx, t, 2); grid(ctx, 0.02);
    const st = M.missionStatus, color = st === 'SUCCESS' ? COL.green : st === 'FAILURE' ? COL.red : COL.amber;
    Draw.earth(ctx, 180, 470, 78, Draw.lapseHours(t));
    Draw.moon(ctx, 690, 215, 52, { lon: Draw.moonLon(Draw.lapseHours(t)) });
    const p0 = { x: 240, y: 425 }, p1 = { x: 400, y: 120 }, p2 = { x: 640, y: 230 };
    const prog = clamp(Game.sceneT / 1.5);
    Draw.route(ctx, p0, p1, p2, t, st === 'FAILURE' ? Math.min(prog, 0.85) : prog, color, st !== 'FAILURE');
    const q = MathX.qb(p0, p1, p2, st === 'FAILURE' ? 0.85 : 1);
    if (st === 'FAILURE') {
      ctx.save(); ctx.translate(q.x, q.y);
      ctx.globalAlpha = 0.45 + 0.35 * Math.abs(Math.sin(t * 5));
      Draw.spacecraft(ctx, 0, 0, 0.75, t * 0.5, Draw.craftCfg(), t, { deploy: Game.deploys });
      ctx.restore();
      tag(ctx, 'LOSS OF SIGNAL', q.x, q.y - 40, COL.red, 'center');
      for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(229,83,75,${Math.random() * 0.06})`; ctx.fillRect(0, Math.random() * H, 800, 1 + Math.random() * 3); }
    } else {
      Draw.spacecraft(ctx, q.x + 50, q.y - 10, 0.65, 0, Draw.craftCfg(), t, { deploy: Game.deploys });
      ctx.save(); ctx.strokeStyle = color;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.5 + k / 3) % 1;
        ctx.globalAlpha = 0.6 * (1 - ph); ctx.beginPath(); ctx.arc(180, 470, 84 + ph * 60, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // ---- data flow chart (generated → stored → returned)
    const gen = M.dataGenerated, stored = M.dataStored, ret = M.dataReturned;
    const maxGB = Math.max(1, gen, M.storageGB);
    const bx = 830, bw = 360;
    const bars = [
      ['GENERATED', gen, COL.cyan, `${gen} GB`],
      ['STORED (RECORDER ' + M.storageGB + ' GB)', stored, COL.amber, `${stored} GB`],
      ['RETURNED TO EARTH', ret, COL.green, `${ret} GB`],
    ];
    tag(ctx, 'DATA FLOW · SCIENCE PACKAGE', bx, 320, COL.cyan);
    bars.forEach(([label, v, col, txt], i) => {
      const y = 344 + i * 34;
      text(ctx, label, bx, y, { size: 9, color: COL.faint, spacing: 1.5 });
      ctx.fillStyle = 'rgba(150,175,200,0.15)'; ctx.fillRect(bx, y + 10, bw, 8);
      ctx.fillStyle = col; ctx.fillRect(bx, y + 10, bw * clamp(v / maxGB), 8);
      if (i === 1 && M.storageGB < maxGB) {
        ctx.strokeStyle = COL.red; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(bx + bw * clamp(M.storageGB / maxGB), y + 4); ctx.lineTo(bx + bw * clamp(M.storageGB / maxGB), y + 22); ctx.stroke();
        ctx.setLineDash([]);
      }
      text(ctx, txt, bx + bw + 8, y + 14, { size: 10.5, color: COL.white });
    });
    if (M.storageLost > 0) text(ctx, `${M.storageLost} GB overflowed the recorder and was lost`, bx, 344 + 3 * 34, { size: 9.5, color: COL.red });
    // ---- site environment strip
    const reg = site();
    const sy = 500;
    tag(ctx, 'SITE ENVIRONMENT · ' + reg.short, 40, sy, COL.label);
    const sunlit = reg.side === 'far' ? 0.5 : 1;
    // illumination: sun icon with a night shade proportional to drain
    const sunX = 40, sunY = sy + 30;
    glow(ctx, sunX + 14, sunY, 26, 'rgba(255,200,120,ALPHA)', 0.5);
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(sunX + 14, sunY, 12, 0, TAU); ctx.fill();
    text(ctx, `ILLUMINATION ${Math.round(sunlit * 100)}%`, sunX + 36, sunY, { size: 10, color: COL.label });
    // temperature
    const tmin = NasaData.num('Surface temperature minimum (typical range)') || 95, tmax = NasaData.num('Surface temperature maximum (typical range)') || 390;
    const tempX = 40 + 230, tempY = sy + 30;
    const temp = clamp((M.science / Math.max(1, scienceGoal())), 0.15, 1);
    const tg = ctx.createLinearGradient(tempX, tempY, tempX + 120, tempY);
    tg.addColorStop(0, '#3c86c8'); tg.addColorStop(1, '#e0603c');
    ctx.fillStyle = 'rgba(150,175,200,0.15)'; ctx.fillRect(tempX, tempY - 5, 120, 10);
    ctx.fillStyle = tg; ctx.fillRect(tempX, tempY - 5, 120, 10);
    text(ctx, `SURFACE ${Math.round(tmin - 273)}°C → ${Math.round(tmax - 273)}°C`, tempX + 132, tempY, { size: 10, color: COL.label });
    // comms
    const comX = tempX + 300, comY = sy + 30;
    ctx.strokeStyle = M.communication >= 65 ? COL.green : COL.amber; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(comX + 8, comY, 9, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(comX + 8, comY, 14, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
    text(ctx, `COMM ${M.communication} · ${commLabel(M.communication)}`, comX + 32, comY, { size: 10, color: COL.label });
    stamp(ctx, st === 'SUCCESS' ? 'MISSION SUCCESS' : st === 'FAILURE' ? 'MISSION FAILURE' : 'PARTIAL SUCCESS', 420, 620, color, 26);
  };

  // ================================================================ REPORT backdrop
  SCENES.REPORT = (ctx, t) => {
    background(ctx, t, 1); grid(ctx, 0.025);
    Draw.moon(ctx, 1180, 700, 260, { lon: Draw.moonLon(Draw.lapseHours(t)) });
    Draw.earth(ctx, 90, 90, 30, Draw.lapseHours(t));
  };

  let starLayerCache = null;
  function frame(ctx, t, dt) {
    starLayerCache = null;
    const fn = SCENES[Game.state];
    ctx.save();
    if (fn) fn(ctx, t, dt);
    ctx.restore();
  }

  function init() { /* core handles init */ }

  return { frame, LT, TRANSFER, SCAN_TIME, TX_TIME, cruiseTime, transferCurve, rocket, SCENES, packets };
})();
