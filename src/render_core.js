// LUNARIS rendering core: stars, procedural globes (Earth/Moon), the solar-system
// exploration layer with a smooth camera, the origami spacecraft, rocket and particles.
// Every visual is drawn by code - no image files. Adapted from the LUNA-01 prototype.

const Draw = (() => {
  const W = 1280, H = 720, TAU = Math.PI * 2;
  const { clamp, lerp, ease, easeIn, smooth, mulberry32, makeNoise, qb, cubic, cubicAng } = MathX;
  const COL = {
    cyan: '#7cc7e8', amber: '#e8a54b', green: '#4fc38a', red: '#e5534b', white: '#e6edf3', violet: '#a78bfa',
    label: 'rgba(150,170,190,0.85)', faint: 'rgba(150,170,190,0.5)',
    font: '"Cascadia Mono","Consolas","Menlo","Courier New",monospace',
  };

  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ================================================================ STARS
  let starLayer = null;
  const twinkles = [];
  function buildStars() {
    const c = makeCanvas(W, H), g = c.getContext('2d'), r = mulberry32(7);
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.35);
    const band = g.createLinearGradient(0, -160, 0, 160);
    band.addColorStop(0, 'rgba(120,130,160,0)'); band.addColorStop(0.5, 'rgba(120,130,160,0.05)'); band.addColorStop(1, 'rgba(120,130,160,0)');
    g.fillStyle = band; g.fillRect(-W, -160, W * 2, 320);
    g.restore();
    for (let i = 0; i < 900; i++) {
      const x = r() * W, y = r() * H, s = r(), tint = r();
      const a = s > 0.985 ? 0.9 : 0.12 + Math.pow(r(), 2) * 0.55;
      const size = s > 0.985 ? 1.6 : s > 0.9 ? 1.1 : 0.7;
      g.fillStyle = tint > 0.93 ? `rgba(255,222,190,${a})` : tint > 0.85 ? `rgba(190,210,255,${a})` : `rgba(235,240,250,${a})`;
      g.fillRect(x, y, size, size);
    }
    starLayer = c;
    for (let i = 0; i < 40; i++) twinkles.push({ x: r() * W, y: r() * H, p: r() * TAU, s: 1 + r() * 0.8, sp: 0.6 + r() * 1.5 });
  }

  function background(ctx, t, drift = 4) {
    const bg = ctx.createRadialGradient(W * 0.4, H * 0.45, 100, W * 0.5, H * 0.5, W * 0.8);
    bg.addColorStop(0, '#060a12'); bg.addColorStop(1, '#020306');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const off = ((t * drift) % W + W) % W;
    ctx.drawImage(starLayer, -off, 0); ctx.drawImage(starLayer, W - off, 0);
    for (const s of twinkles) {
      const a = 0.35 + 0.45 * Math.abs(Math.sin(t * s.sp + s.p));
      const x = ((s.x - off) % W + W) % W;
      ctx.fillStyle = `rgba(240,244,250,${a})`;
      ctx.fillRect(x, s.y, s.s, s.s);
    }
  }

  function grid(ctx, alpha = 0.025) {
    ctx.strokeStyle = `rgba(140,170,200,${alpha})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 80) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += 80) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }

  function text(ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = `${o.weight || 500} ${o.size || 12}px ${COL.font}`;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
    ctx.fillStyle = o.color || COL.label;
    if (o.glow) { ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; }
    if (o.spacing) { try { ctx.letterSpacing = o.spacing + 'px'; } catch (e) { /* older browsers */ } }
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function stamp(ctx, str, x, y, color, size = 30, alpha = 1) {
    text(ctx, str, x, y, { align: 'center', size, color, spacing: size * 0.35, weight: 300, alpha, glow: 1 });
    ctx.save(); ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 1;
    const w = str.length * size * 0.95;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + size * 0.85); ctx.lineTo(x + w / 2, y + size * 0.85); ctx.stroke();
    ctx.restore();
  }

  function glow(ctx, x, y, r, color, alpha = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('ALPHA', alpha));
    g.addColorStop(1, color.replace('ALPHA', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Light direction for Earth and Moon (upper-left, towards the viewer).
  const LIGHT = (() => { const v = [-0.55, -0.42, 0.72], l = Math.hypot(...v); return v.map(c => c / l); })();

  // ================================================================ ROTATING GLOBES (Moon + Earth)
  const D2R = Math.PI / 180, TILT = 15 * D2R;
  const VIEWS = { near: 0, far: 180 };
  const MW = 1024, MH = 512;
  const GS = 512;
  let moonMap = null, earthMap = null;

  const MARIA = [
    [32.8, -15.6, 17], [28, 17.5, 10], [8.5, 31.4, 11], [17, 59.1, 8], [-7.8, 51.3, 9], [-15.2, 35.5, 5.5],
    [18, -57, 17], [5, -48, 14], [-5, -30, 10], [-21.3, -16.6, 10], [-24.4, -38.6, 6], [-10, -22, 6],
    [56, -20, 5], [56, 5, 5], [56, 28, 4], [13.3, 3.6, 4], [2, -2, 4], [-1, 12, 4], [21, -30, 6], [40, -45, 7],
    [27.3, 147.9, 3.5], [-19.4, -92.8, 3.5], [-53, -169, 16, 0.3],
  ];
  const NAMED_CRATERS = [
    [-43.3, -11.4, 2.4, true], [9.6, -20.1, 2.6, true], [8.1, -38, 1.3, true], [-58.4, -14.4, 3.6, false],
    [51.6, -9.3, 2.0, false], [-11.4, -1.4, 2.0, false], [-13.2, 3.0, 1.7, false], [-84.9, -35.5, 3.2, false],
    [30, 160, 3, false], [-10, 150, 4, false], [15, 175, 3.4, false], [-35, 140, 3, true], [45, -160, 3.5, false],
    [23.7, -47.5, 1.6, true],
  ];

  function viewVec(lat, lon, lon0) {
    const la = lat * D2R, lo = (lon - lon0) * D2R;
    const xb = Math.cos(la) * Math.sin(lo), yb = Math.sin(la), zb = Math.cos(la) * Math.cos(lo);
    return { x: xb, y: yb * Math.cos(TILT) + zb * Math.sin(TILT), z: zb * Math.cos(TILT) - yb * Math.sin(TILT) };
  }
  function project(lat, lon, view = 'near', centreLon) {
    const v = viewVec(lat, lon, centreLon == null ? VIEWS[view] : centreLon);
    return { x: v.x, y: -v.y, z: v.z, visible: v.z > 0 };
  }

  const colSin = new Float32Array(MW), colCos = new Float32Array(MW), rowSin = new Float32Array(MH), rowCos = new Float32Array(MH);
  for (let x = 0; x < MW; x++) { const lo = (x + 0.5) / MW * TAU - Math.PI; colSin[x] = Math.sin(lo); colCos[x] = Math.cos(lo); }
  for (let y = 0; y < MH; y++) { const la = Math.PI / 2 - (y + 0.5) / MH * Math.PI; rowSin[y] = Math.sin(la); rowCos[y] = Math.cos(la); }

  function buildMoonMap() {
    const N = MW * MH, rnd = mulberry32(42), fbm = makeNoise(5);
    const hgt = new Float32Array(N), alb = new Float32Array(N);
    const mariaV = MARIA.map(([la, lo, r, s]) => { const c = Math.cos(la * D2R); return [c * Math.sin(lo * D2R), Math.sin(la * D2R), c * Math.cos(lo * D2R), r, s || 1]; });
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x, bx = rowCos[y] * colSin[x], by = rowSin[y], bz = rowCos[y] * colCos[x];
      let m = 0, pert = -1;
      for (const [mx, my, mz, r, s] of mariaV) {
        const cosd = bx * mx + by * my + bz * mz;
        if (cosd < 0.85) continue;
        if (pert < 0) pert = fbm(bx * 3 + 7, by * 3, bz * 3, 3);
        const dd = Math.acos(Math.min(1, cosd)) / D2R, rr = r * (0.75 + 0.5 * pert);
        m = Math.max(m, s * smooth(rr + 2.5, rr - 2.5, dd));
      }
      const fine = fbm(bx * 14, by * 14, bz * 14, 3), mid = fbm(bx * 4 + 2, by * 4, bz * 4, 3);
      alb[i] = lerp(0.64, 0.3, m) + (fine - 0.5) * 0.1 + (mid - 0.5) * 0.08;
      hgt[i] = (fbm(bx * 7 + 9, by * 7, bz * 7, 4) - 0.5) * 6 * (1 - 0.6 * m);
    }
    const PX = 320;
    function crater(la, lo, rr, fresh, rays) {
      const cx = Math.cos(la) * Math.sin(lo), cy = Math.sin(la), cz = Math.cos(la) * Math.cos(lo);
      const ext = rr * (rays ? 7 : fresh ? 3 : 1.6), depth = rr * PX * 0.2;
      const y0 = Math.max(0, Math.floor((Math.PI / 2 - la - ext) / Math.PI * MH)), y1 = Math.min(MH - 1, Math.ceil((Math.PI / 2 - la + ext) / Math.PI * MH));
      const cxp = (lo + Math.PI) / TAU * MW, dxp = Math.min(MW / 2, Math.ceil(ext / TAU * MW / Math.max(0.05, Math.cos(la))));
      const ph = rnd() * TAU;
      for (let y = y0; y <= y1; y++) for (let k = -dxp; k <= dxp; k++) {
        const x = ((Math.floor(cxp) + k) % MW + MW) % MW, i = y * MW + x;
        const bx = rowCos[y] * colSin[x], by = rowSin[y], bz = rowCos[y] * colCos[x];
        const q = Math.acos(Math.min(1, bx * cx + by * cy + bz * cz)) / rr;
        if (q > 7) continue;
        if (q < 1) hgt[i] += depth * (q * q * 1.25 - 1);
        else if (q < 1.6) hgt[i] += depth * 0.25 * Math.exp(-Math.pow((q - 1) / 0.22, 2));
        if (fresh && q < 3) alb[i] += 0.1 * Math.exp(-q * 1.2) * (q > 0.9 ? 1 : 0.4);
        if (rays && q > 1 && q < 7) {
          const a = Math.atan2(by - cy, (x - cxp) / MW * TAU * rowCos[y]);
          alb[i] += 0.13 * Math.pow(Math.max(0, Math.cos(a * 7 + ph) * Math.cos(a * 3 - ph)), 6) * Math.exp(-(q - 1) / 2.5);
        }
      }
    }
    for (let k = 0; k < 1500; k++) {
      const rr = (1.3 + Math.pow(rnd(), 8) * 62) / PX;
      const la = Math.asin(2 * rnd() - 1), lo = rnd() * TAU - Math.PI;
      const i = Math.floor((Math.PI / 2 - la) / Math.PI * MH) * MW + Math.floor((lo + Math.PI) / TAU * MW);
      if (Math.cos(lo) > 0 && rnd() < 0.35) continue;
      if (rr * PX > 5 && alb[i] < 0.45 && rnd() < 0.75) continue;
      crater(la, lo, rr, rnd() < 0.1, false);
    }
    const shadows = [];
    for (const [la, lo, rd, rays] of NAMED_CRATERS) {
      crater(la * D2R, lo * D2R, rd * D2R, rays, rays);
      if (la < -80) shadows.push([la * D2R, lo * D2R, rd * D2R * 0.75]);
    }
    const le = LIGHT[0], ln = -LIGHT[1], lu = LIGHT[2], kS = 0.42 * (MW / TAU) / PX;
    const out = new Float32Array(N);
    for (let y = 1; y < MH - 1; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x, xl = y * MW + ((x + MW - 1) & (MW - 1)), xr = y * MW + ((x + 1) & (MW - 1));
      const gE = (hgt[xr] - hgt[xl]) * 0.5 * kS / Math.max(0.15, rowCos[y]), gN = (hgt[i - MW] - hgt[i + MW]) * 0.5 * kS;
      let shade = (lu - gE * le - gN * ln) / (lu * Math.sqrt(1 + gE * gE + gN * gN));
      let b = clamp(alb[i]) * Math.max(0.15, shade);
      if (rowSin[y] < -0.97) for (const [sla, slo, sr] of shadows) {
        const cosd = rowCos[y] * colSin[x] * Math.cos(sla) * Math.sin(slo) + rowSin[y] * Math.sin(sla) + rowCos[y] * colCos[x] * Math.cos(sla) * Math.cos(slo);
        if (Math.acos(Math.min(1, cosd)) < sr) b *= 0.3;
      }
      out[i] = b;
    }
    for (let x = 0; x < MW; x++) { out[x] = out[MW + x]; out[(MH - 1) * MW + x] = out[(MH - 2) * MW + x]; }
    moonMap = out;
  }

  function buildEarthMap() {
    const land = makeNoise(11), wet = makeNoise(23), cloud = makeNoise(37);
    const N = MW * MH;
    const rgb = new Uint8ClampedArray(N * 3), ocean = new Uint8Array(N), clouds = new Uint8Array(N);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x, X = rowCos[y] * colSin[x], Y = -rowSin[y], Z = rowCos[y] * colCos[x];
      const h = land(X * 1.6 + 2, Y * 1.6, Z * 1.6, 6);
      const lat = Math.abs(Y);
      let r, g, b;
      if (h > 0.53) {
        const m = wet(X * 3, Y * 3, Z * 3, 4);
        const desert = smooth(0.2, 0.42, lat) * (1 - smooth(0.45, 0.6, lat)) * smooth(0.45, 0.6, 1 - m);
        const elev = smooth(0.53, 0.75, h);
        r = lerp(46, 150, desert) + elev * 30; g = lerp(84, 124, desert) + elev * 20; b = lerp(42, 78, desert) + elev * 12;
      } else {
        const depth = smooth(0.35, 0.53, h);
        r = lerp(6, 22, depth); g = lerp(26, 78, depth); b = lerp(66, 130, depth);
        ocean[i] = 1;
      }
      if (lat > 0.82) { const ice = smooth(0.82, 0.9, lat); r = lerp(r, 232, ice); g = lerp(g, 238, ice); b = lerp(b, 245, ice); ocean[i] = 0; }
      rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
      clouds[i] = smooth(0.5, 0.72, cloud(X * 2.6 + 7, Y * 3.4, Z * 2.6, 6)) * 0.92 * 255;
    }
    earthMap = { rgb, ocean, clouds };
  }

  function makeLUT(GS2) {
    const R = GS2 / 2, pix = [], [lx, ly, lz] = LIGHT, ct = Math.cos(TILT), st = Math.sin(TILT);
    const hx = lx, hy = ly, hz = lz + 1, hl = Math.hypot(hx, hy, hz);
    const rows = [], lonf = [], lam = [], lamP = [], edge = [], spec = [], rim = [];
    for (let py = 0; py < GS2; py++) for (let px = 0; px < GS2; px++) {
      const nx = (px + 0.5 - R) / R, ny = (py + 0.5 - R) / R, d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2), yv = -ny;
      const yb = yv * ct - nz * st, zb = nz * ct + yv * st;
      const la = Math.asin(Math.max(-1, Math.min(1, yb))), lo = Math.atan2(nx, zb);
      const l = Math.max(0, nx * lx + ny * ly + nz * lz);
      pix.push(py * GS2 + px);
      rows.push(Math.min(MH - 1, Math.max(0, Math.floor((Math.PI / 2 - la) / Math.PI * MH))) * MW);
      lonf.push(lo / TAU);
      lam.push(l); lamP.push(0.05 + 1.1 * Math.pow(l, 0.85));
      edge.push(clamp((1 - Math.sqrt(d2)) * R * 1.2) * 255);
      spec.push(Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 70) * 170);
      rim.push(Math.pow(1 - nz, 2.5) * (0.25 + l));
    }
    return { pix: Int32Array.from(pix), rows: Int32Array.from(rows), lonf: Float32Array.from(lonf), lam: Float32Array.from(lam), lamP: Float32Array.from(lamP),
      edge: Uint8Array.from(edge), spec: Float32Array.from(spec), rim: Float32Array.from(rim) };
  }
  const LUTS = {}, globes = {};
  const globeSize = r => (r <= 50 ? 128 : r <= 110 ? 256 : GS);
  function globe(slot, size) {
    const id = slot + '@' + size;
    if (!LUTS[size]) LUTS[size] = makeLUT(size);
    if (!globes[id]) { const c = makeCanvas(size, size), g = c.getContext('2d'); globes[id] = { canvas: c, g, img: g.createImageData(size, size), key: null, L: LUTS[size] }; }
    return globes[id];
  }

  const colShift = lonDeg => ((lonDeg + 180) / 360 + 64);

  function renderMoon(slot, lonDeg, size = GS) {
    const G = globe(slot, size), key = Math.round(colShift(lonDeg) * MW);
    if (G.key === key) return G.canvas;
    const d = G.img.data, sh = colShift(lonDeg), L = G.L;
    for (let k = 0; k < L.pix.length; k++) {
      const b = moonMap[L.rows[k] + ((((L.lonf[k] + sh) * MW) | 0) & (MW - 1))] * L.lamP[k], o = L.pix[k] * 4;
      d[o] = b * 238; d[o + 1] = b * 232; d[o + 2] = b * 224; d[o + 3] = L.edge[k];
    }
    G.g.putImageData(G.img, 0, 0); G.key = key;
    return G.canvas;
  }

  function renderEarth(slot, lonDeg, cloudLonDeg, size = GS) {
    const G = globe(slot, size), key = Math.round(colShift(lonDeg) * MW) * 1e6 + Math.round(colShift(cloudLonDeg) * MW);
    if (G.key === key) return G.canvas;
    const d = G.img.data, sh = colShift(lonDeg), shc = colShift(cloudLonDeg), { rgb, ocean, clouds } = earthMap, L = G.L;
    for (let k = 0; k < L.pix.length; k++) {
      const ti = L.rows[k] + ((((L.lonf[k] + sh) * MW) | 0) & (MW - 1)), ci = L.rows[k] + ((((L.lonf[k] + shc) * MW) | 0) & (MW - 1));
      const l = L.lam[k], lit = 0.04 + 1.05 * l, sp = ocean[ti] ? L.spec[k] : 0;
      let r = rgb[ti * 3] * lit + sp, g = rgb[ti * 3 + 1] * lit + sp, b = rgb[ti * 3 + 2] * lit + sp;
      const ca = clouds[ci] / 255, cl = 245 * (0.05 + l);
      r += (cl - r) * ca; g += (cl - g) * ca; b += (cl * 1.02 - b) * ca;
      const rim = L.rim[k];
      const o = L.pix[k] * 4;
      d[o] = r + rim * 60; d[o + 1] = g + rim * 120; d[o + 2] = b + rim * 230; d[o + 3] = L.edge[k];
    }
    G.g.putImageData(G.img, 0, 0); G.key = key;
    return G.canvas;
  }

  const EARTH_DAY_H = () => NasaData.num('Earth|Sidereal rotation period', 'orbit') || 23.9345;
  const MOON_DAY_H = () => NasaData.num('Moon orbit|Sidereal rotation period', 'orbit') || 655.72;
  const LAPSE_H = 4;
  const lapseHours = t => t * LAPSE_H;
  const spinCaption = (ctx, x, y, align = 'left') => text(ctx,
    `TIME-LAPSE ×${(LAPSE_H * 3600).toLocaleString('en-US')} · Earth turns once per ${NasaData.show('Earth|Sidereal rotation period', 'orbit')}, Moon once per ${NasaData.show('Moon orbit|Sidereal rotation period', 'orbit')}`,
    x, y, { align, size: 9.5, color: COL.faint });
  const earthLon = h => -360 * h / EARTH_DAY_H();
  const moonLon = h => -360 * h / MOON_DAY_H();

  function moon(ctx, x, y, r, o = {}) {
    glow(ctx, x, y, r * 1.18, 'rgba(200,210,230,ALPHA)', 0.06);
    const lon = o.lon != null ? o.lon : VIEWS[o.view || 'near'];
    ctx.drawImage(renderMoon(o.slot || (o.view === 'far' ? 'moon:far' : 'moon:a'), lon, globeSize(r * (o.scaleAbs || 1))), x - r, y - r, r * 2, r * 2);
    if (o.night > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      const p = lerp(1.1, 0.15, o.night);
      const ng = ctx.createLinearGradient(x - r, y, x + r, y);
      ng.addColorStop(clamp(p - 0.22), 'rgba(2,3,8,0)');
      ng.addColorStop(clamp(p), 'rgba(2,3,8,0.9)');
      ng.addColorStop(1, 'rgba(2,3,8,0.95)');
      ctx.fillStyle = ng; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
    if (o.phase != null && o.night == null) {  // thin crescent shading for small moons (explore layer)
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      const sh = o.phase < 0.5 ? -1 : 1;
      const k = Math.abs(1 - o.phase * 2);
      const ng = ctx.createLinearGradient(x + sh * r, y, x - sh * r, y);
      ng.addColorStop(clamp(0.5 + 0.5 * k), 'rgba(2,3,8,0)');
      ng.addColorStop(clamp(1 - k * 0.85), 'rgba(2,3,8,0.85)');
      ng.addColorStop(1, 'rgba(2,3,8,0.92)');
      ctx.fillStyle = ng; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
  }

  const siteView = reg => (reg.side === 'far' ? 'far' : 'near');
  function siteOffset(reg, view) {
    const p = project(reg.lat, reg.lon, view || siteView(reg));
    if (p.visible) return p;
    const d = Math.hypot(p.x, p.y) || 1;
    return { x: p.x / d * 0.97, y: p.y / d * 0.97, z: 0, visible: false };
  }
  const targetPos = (x, y, r, view) => { const p = siteOffset(site(), view); return { x: x + p.x * r, y: y + p.y * r, visible: p.visible }; };

  function earth(ctx, x, y, r, h = 0) {
    const halo = ctx.createRadialGradient(x, y, r * 0.96, x, y, r * 1.12);
    halo.addColorStop(0, 'rgba(90,150,255,0.35)'); halo.addColorStop(1, 'rgba(90,150,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, TAU); ctx.fill();
    ctx.drawImage(renderEarth('earth:a', 60 + earthLon(h), 60 + earthLon(h * 1.08), globeSize(r)), x - r, y - r, r * 2, r * 2);
  }

  function targetMarker(ctx, x, y, t, color = COL.amber, size = 1) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    const p = (t * 0.5) % 1;
    ctx.globalAlpha = 0.8 * (1 - p);
    ctx.beginPath(); ctx.arc(x, y, (10 + p * 30) * size, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.95;
    const s = 22 * size, c = 7 * size;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * s, y + sy * (s - c)); ctx.lineTo(x + sx * s, y + sy * s); ctx.lineTo(x + sx * (s - c), y + sy * s);
    }
    ctx.moveTo(x - 5 * size, y); ctx.lineTo(x + 5 * size, y); ctx.moveTo(x, y - 5 * size); ctx.lineTo(x, y + 5 * size);
    ctx.stroke();
    ctx.restore();
  }

  // ================================================================ SOLAR SYSTEM (EXPLORE layer)
  // World space: heliocentric, 1 AU = PPAU px (camera zoom scales it). Planet disc sizes
  // are NOT to scale with orbits (real scale would hide everything) - sizes are log-scaled
  // from the planetary dataset and the overlay states that clearly.
  const SYS = {
    ppa: 90,                                   // px per AU at zoom 1 (camera multiplies)
    sun: { x: 0, y: 0, r: 26 },
    orbitAlpha: 0.35,
  };
  const PLANET_ORDER = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const PLANET_STYLE = {
    Mercury: { hue: ['#b9aa9a', '#7a6c5e'], kind: 'rocky' },
    Venus: { hue: ['#e8d0a0', '#a8875a'], kind: 'rocky' },
    Earth: { hue: ['#7fb2e0', '#3f6f9f'], kind: 'earth', label: 'HOME' },
    Mars: { hue: ['#d89268', '#94553a'], kind: 'rocky' },
    Jupiter: { hue: ['#e0c8a8', '#a07a50'], kind: 'gas', bands: true },
    Saturn: { hue: ['#e8d9b0', '#b09a60'], kind: 'gas', rings: true },
    Uranus: { hue: ['#bfe3e8', '#78a8b0'], kind: 'ice', rings: true },
    Neptune: { hue: ['#88a8e8', '#4068a8'], kind: 'ice' },
  };
  const planetScale = km => clamp(2.2 + Math.log10(Math.max(500, km) / 1000) * 4.2, 2.2, 13);  // visual radius at zoom 1

  let hitTargets = [];      // rebuilt each frame: [{x, y, r, body}] screen-space click targets
  const hitTest = (x, y) => {
    for (const h of hitTargets) if ((x - h.x) ** 2 + (y - h.y) ** 2 < h.r * h.r) return h.body;
    return null;
  };

  // camera: world-space focus + zoom with smooth tweening
  const Cam = {
    x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1, t0: 0, dur: 0.9,
    tween(x, y, z, dur = 0.9) {
      this.tx = x; this.ty = y; this.tz = z; this.t0 = performance.now() / 1000; this.dur = dur;
    },
    update() {
      const k = clamp((performance.now() / 1000 - this.t0) / this.dur);
      const e = ease(k);
      this.x = lerp(this.x, this.tx, e); this.y = lerp(this.y, this.ty, e); this.z = lerp(this.z, this.tz, e);
    },
    snap() { this.x = this.tx; this.y = this.ty; this.z = this.tz; },
    moving() { return Math.abs(this.x - this.tx) + Math.abs(this.y - this.ty) + Math.abs(this.z - this.tz) > 1e-3; },
    toScreen(wx, wy) { return { x: W / 2 + (wx - this.x) * SYS.ppa * this.z, y: H / 2 + (wy - this.y) * SYS.ppa * this.z }; },
    toWorld(sx, sy) { return { x: this.x + (sx - W / 2) / (SYS.ppa * this.z), y: this.y + (sy - H / 2) / (SYS.ppa * this.z) }; },
  };

  function planetDisc(ctx, x, y, r, name, t, highlight) {
    const st = PLANET_STYLE[name] || PLANET_STYLE.Mercury;
    ctx.save();
    // limb glow
    glow(ctx, x, y, r * 1.5, 'rgba(140,170,210,ALPHA)', highlight ? 0.28 : 0.1);
    if (st.rings) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.scale(1, 0.32);
      const ring = ctx.createRadialGradient(0, 0, r * 1.4, 0, 0, r * (st.kind === 'gas' ? 2.3 : 1.9));
      ring.addColorStop(0, 'rgba(220,210,180,0.0)'); ring.addColorStop(0.25, `rgba(220,210,180,${highlight ? 0.75 : 0.4})`);
      ring.addColorStop(0.8, `rgba(200,190,160,${highlight ? 0.6 : 0.3})`); ring.addColorStop(1, 'rgba(200,190,160,0)');
      ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, st.hue[0]); g.addColorStop(1, st.hue[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (st.bands && r > 5) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = `rgba(140,100,60,${0.10 + 0.06 * Math.abs(Math.sin(i * 2.3))})`;
        ctx.fillRect(x - r, y + i * r * 0.28, r * 2, r * 0.13);
      }
      ctx.restore();
    }
    if (st.kind === 'earth' && r > 5) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(90,150,70,0.5)';
      for (let i = 0; i < 5; i++) {
        const a = t * 0.05 + i * 2.1;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a * 1.3) * r * 0.5, r * 0.34, r * 0.2, a, 0, TAU); ctx.fill();
      }
      ctx.restore();
      glow(ctx, x, y, r * 1.25, 'rgba(110,170,255,ALPHA)', 0.3);
    }
    // terminator shading (sun at centre)
    const sh = ctx.createLinearGradient(x - r, y, x + r, y);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(2,3,8,0.75)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (highlight) {
      ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // Full explore scene. hover: body name or null; focus: body name or null.
  function solarSystem(ctx, t, hover, focus, moonDetail) {
    hitTargets = [];
    const days = Astro.epochDays() + Game.simDays;
    const focusB = focus;
    // sun
    const S = Cam.toScreen(0, 0);
    glow(ctx, S.x, S.y, 60 + Math.sin(t * 2) * 4, 'rgba(255,200,120,ALPHA)', 0.55);
    const sg = ctx.createRadialGradient(S.x, S.y, 2, S.x, S.y, SYS.sun.r);
    sg.addColorStop(0, '#fff8e0'); sg.addColorStop(0.55, '#ffd98a'); sg.addColorStop(1, '#ff9d3c');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(S.x, S.y, SYS.sun.r, 0, TAU); ctx.fill();
    hitTargets.push({ x: S.x, y: S.y, r: SYS.sun.r + 10, body: 'Sun' });
    // planet orbits + positions
    for (const name of PLANET_ORDER) {
      const pos = Astro.planetPos(name, days);
      if (!pos) continue;
      const P = Cam.toScreen(pos.x, pos.y);
      const high = name === hover || name === focusB;
      const a = AUOf(name);
      const alpha = high ? 0.8 : SYS.orbitAlpha * clamp(Cam.z);
      ctx.save();
      ctx.strokeStyle = high ? 'rgba(124,199,232,0.5)' : `rgba(150,175,200,${alpha * 0.4})`;
      ctx.lineWidth = high ? 1.2 : 0.8;
      ctx.setLineDash([2, 7]);
      ctx.beginPath(); ctx.ellipse(S.x, S.y, a * SYS.ppa * Cam.z, a * SYS.ppa * Cam.z * 0.995, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      const rad = Math.max(3.2, planetScale(bodyDiameter(name)) * Cam.z * 1.35 + 2.5);
      planetDisc(ctx, P.x, P.y, rad, name, t, high);
      text(ctx, name.toUpperCase(), P.x, P.y - rad - 10, { align: 'center', size: high ? 10.5 : 9, color: high ? COL.amber : COL.faint, spacing: 2, weight: high ? 700 : 500, glow: 1 });
      if (name === 'Earth') {
        // Moon (visual orbit exaggerated, grows with zoom so the pair separates; labelled as such)
        const mo = Astro.MOON_ORBIT_DAYS, md = ((days % mo) / mo) * TAU;
        const morb = 0.055 + 0.09 * clamp((Cam.z - 1) / 2);
        const MP = Cam.toScreen(pos.x + Math.cos(md) * morb, pos.y + Math.sin(md) * 0.7 * morb);
        const mrad = Math.max(3.5, (planetScale(3475) * Cam.z) * 1.15 + 2);
        ctx.save(); ctx.strokeStyle = `rgba(124,199,232,${high || hover === 'Moon' ? 0.6 : 0.3})`; ctx.setLineDash([2, 6]);
        ctx.beginPath(); ctx.ellipse(P.x, P.y, morb * SYS.ppa * Cam.z, morb * 0.7 * SYS.ppa * Cam.z, 0, 0, TAU); ctx.stroke(); ctx.restore();
        const ph = Astro.moonPhase(days);
        moon(ctx, MP.x, MP.y, mrad, { phase: ph, scaleAbs: 1 });
        // Moon target pushed BEFORE Earth's so the mission target wins overlapping clicks
        hitTargets.push({ x: MP.x, y: MP.y, r: Math.max(mrad + 14, 26), body: 'Moon' });
        if (hover === 'Moon' || focusB === 'Moon' || moonDetail) text(ctx, 'MOON · MISSION TARGET', MP.x, MP.y - mrad - 10, { align: 'center', size: 10, color: COL.amber, spacing: 2, weight: 700, glow: 1 });
      }
      hitTargets.push({ x: P.x, y: P.y, r: Math.max(rad + 12, 22), body: name });
    }
    // scale + model caption
    const au = Cam.z * SYS.ppa / 90;
    text(ctx, `MODEL: simplified Keplerian orbits from the planetary_orbital_elements dataset (epoch J2000) · planet sizes log-scaled, NOT to scale`, 18, H - 16, { size: 9, color: COL.faint });
    text(ctx, `1 AU = ${Math.round(SYS.ppa * Cam.z)} px · drag to pan · scroll to zoom · click a body`, 18, H - 30, { size: 9.5, color: COL.faint });
  }

  // semi-major axis in AU for a planet (from the orbital elements dataset)
  function AUOf(name) {
    const r = NasaData.get(`${name}|Semi-major axis`, 'elements');
    return r ? Number(r.value) : 1;
  }
  function bodyDiameter(name) {
    const r = NasaData.get(`${name}|Diameter`, 'bodies');
    return r ? Number(r.value.replace(/,/g, '')) || 5000 : 5000;
  }

  // Moon detail view (dive): large moon + Earth companion
  function moonDive(ctx, t) {
    background(ctx, t, 1);
    const mx = 430, my = 380, mr = 210;
    const days = Astro.epochDays() + Game.simDays;
    moon(ctx, mx, my, mr, { lon: moonLon(lapseHours(t)) });
    earth(ctx, 1040, 150, 68, lapseHours(t));
    tag(ctx, 'THE MOON · 384,400 KM FROM EARTH', mx, my - mr - 16, COL.label, 'center');
    tag(ctx, 'click BEGIN MISSION to leave the exploration layer', mx, my + mr + 24, COL.faint, 'center');
    spinCaption(ctx, mx, my + mr + 42, 'center');
    return { mx, my, mr };
  }

  function tag(ctx, str, x, y, color = COL.label, align = 'left') {
    text(ctx, str, x, y, { size: 10.5, color, spacing: 1.5, align });
  }

  // ================================================================ ORIGAMI SPACECRAFT
  // The craft unfolds as subsystems are chosen. cfg holds subsystem ids + per-module deploy.
  function panelCell(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#1a2a4a'); g.addColorStop(0.5, '#0f1b33'); g.addColorStop(1, '#162640');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(120,150,200,0.28)'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let gx = x + w / 6; gx < x + w - 0.5; gx += w / 6) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (let gy = y + h / 3; gy < y + h - 0.5; gy += h / 3) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    ctx.stroke();
    ctx.strokeStyle = '#6d7a8c'; ctx.lineWidth = 0.9; ctx.strokeRect(x, y, w, h);
  }

  function spacecraft(ctx, x, y, s, ang, cfg = {}, t = 0, o = {}) {
    const dep = o.deploy || {};
    const d = (k, base = 1) => dep[k] == null ? base : clamp(dep[k]);
    const pw = cfg.power || 'basic', inst = cfg.payload || cfg.instrument || 'camera';
    const comm = cfg.comms || 'patch', thermal = cfg.thermal || 'basic', engine = cfg.engine || 'std', nav = cfg.nav || 'imu', data = cfg.data || 'compact';
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);

    // ---- solar arrays (power) - unfold from the bus spine
    const P = pw === 'highcap' ? { n: 2, w: 30, h: 22 } : pw === 'battery' ? { n: 1, w: 38, h: 20 } : { n: 1, w: 32, h: 16 };
    const pwDep = d('power');
    for (const side of [-1, 1]) {
      const total = P.n * (P.w + 3) * pwDep;
      ctx.strokeStyle = '#8f99a8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(side * 16, 0); ctx.lineTo(side * (20 + total), 0); ctx.stroke();
      for (let k = 0; k < P.n; k++) {
        const w = P.w * pwDep;
        if (w < 1) continue;
        const px = side > 0 ? 22 + k * (w + 3) : -22 - k * (w + 3) - w;
        ctx.save();
        ctx.translate(side > 0 ? 22 + k * (P.w + 3) : -22 - k * (P.w + 3), 0);
        ctx.rotate(side * (1 - pwDep) * 1.2);        // fold-up feel
        panelCell(ctx, side > 0 ? 0 : -w, -P.h / 2, w, P.h);
        ctx.restore();
      }
      if (o.tint && o.tint.power) {
        ctx.strokeStyle = o.tint.power; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]);
        const px = side > 0 ? 20 : -20 - total - 4;
        ctx.strokeRect(px, -P.h / 2 - 4, total + 4, P.h + 8); ctx.setLineDash([]);
      }
    }

    // ---- high-gain antenna (comms) - unfolds upward
    const dishSize = comm === 'highgain' ? 17 : comm === 'dish' ? 12 : 7;
    const cmDep = d('comms');
    ctx.save();
    ctx.rotate(-cmDep * Math.PI / 2);              // hinge at the bus
    ctx.strokeStyle = '#a8b0bc'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -22); ctx.stroke();
    const dg = ctx.createLinearGradient(-dishSize, -24, dishSize, -24);
    dg.addColorStop(0, '#f0f2f5'); dg.addColorStop(1, '#9aa3ae');
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.ellipse(0, -24, dishSize, dishSize * 0.38, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = '#7d8793'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(0, -24, dishSize, dishSize * 0.38, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -24 - dishSize * 0.7); ctx.stroke();
    ctx.restore();
    if (comm === 'patch' || cmDep < 1) {
      ctx.strokeStyle = 'rgba(200,210,225,0.8)'; ctx.lineWidth = 1.4 * (1 - cmDep);
      ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(4, -18); ctx.stroke();
    }

    // ---- bus (gold multilayer insulation)
    const g = ctx.createLinearGradient(-16, -15, 16, 15);
    g.addColorStop(0, '#d8b25e'); g.addColorStop(0.45, '#a67c33'); g.addColorStop(0.55, '#b98c3c'); g.addColorStop(1, '#5e4318');
    ctx.fillStyle = g; ctx.fillRect(-16, -15, 32, 30);
    ctx.strokeStyle = 'rgba(255,236,190,0.28)'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-14, -9); ctx.lineTo(-6, -12); ctx.lineTo(2, -7); ctx.lineTo(9, -11); ctx.lineTo(15, -6);
    ctx.moveTo(-15, 2); ctx.lineTo(-7, -1); ctx.lineTo(0, 4); ctx.lineTo(8, 1); ctx.lineTo(15, 6);
    ctx.moveTo(-12, 10); ctx.lineTo(-3, 8); ctx.lineTo(6, 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(4, -15, 12, 30);
    ctx.strokeStyle = '#3d2c10'; ctx.lineWidth = 0.8; ctx.strokeRect(-16, -15, 32, 30);
    if (o.tint && o.tint.mass) { ctx.strokeStyle = o.tint.mass; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.strokeRect(-20, -19, 40, 38); ctx.setLineDash([]); }

    // ---- battery block (power system)
    if (pw === 'battery') {
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(-13, 15, 13, 7);
      ctx.fillStyle = '#4fc38a'; ctx.fillRect(-11, 17.5, 1.5, 1.5);
    }

    // ---- data recorder (data system): dark slab inside the bus
    const dtDep = d('data');
    if (dtDep > 0.2) {
      ctx.save(); ctx.translate(0, -4 + (1 - dtDep) * 14); ctx.globalAlpha = dtDep;
      ctx.fillStyle = '#2a3240'; ctx.fillRect(-6, -2, 12, 5);
      ctx.strokeStyle = '#5c6674'; ctx.lineWidth = 0.6; ctx.strokeRect(-6, -2, 12, 5);
      ctx.restore();
    }

    // ---- instrument bay (payload): unfolds downward
    const inDep = d('payload');
    ctx.save();
    ctx.translate(0, 15); ctx.rotate((1 - inDep) * 1.4); ctx.globalAlpha = 0.35 + inDep * 0.65;
    if (inst === 'camera') {
      ctx.fillStyle = '#2d3139'; ctx.fillRect(2, 0, 10, 9);
      ctx.fillStyle = '#10151c'; ctx.beginPath(); ctx.arc(7, 11, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(140,180,220,0.5)'; ctx.beginPath(); ctx.arc(6, 10, 1.2, 0, TAU); ctx.fill();
    } else if (inst === 'spectrometer') {
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(0, 0, 14, 10);
      ctx.fillStyle = '#23272e'; ctx.fillRect(2, 6, 10, 1.4);
      ctx.fillStyle = '#8f98a5'; ctx.fillRect(0, 0, 14, 1.5);
    } else if (inst === 'ice') {
      ctx.fillStyle = '#38526a'; ctx.fillRect(1, 0, 12, 8);
      ctx.fillStyle = '#9fd4e8'; ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(7, 15); ctx.lineTo(11, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,220,240,0.6)'; ctx.fillRect(5, 1, 4, 2);
    } else {
      ctx.strokeStyle = '#a8b0bc'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(16, 15); ctx.stroke();
      ctx.fillStyle = '#d4d8de'; ctx.beginPath(); ctx.arc(16, 16, 3.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#20252c'; ctx.beginPath(); ctx.arc(16, 16, 1.3, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // ---- thermal: armor plate / radiator fins
    if (thermal === 'armor') {
      ctx.fillStyle = '#8d949e'; ctx.fillRect(-24, -17, 3, 34);
      ctx.strokeStyle = '#5b626c'; ctx.lineWidth = 0.6; ctx.strokeRect(-24, -17, 3, 34);
      ctx.strokeStyle = '#a8b0bc'; ctx.beginPath(); ctx.moveTo(-21, -12); ctx.lineTo(-16, -12); ctx.moveTo(-21, 12); ctx.lineTo(-16, 12); ctx.stroke();
    } else if (thermal === 'radiator') {
      ctx.strokeStyle = '#cfd6dd'; ctx.lineWidth = 1.6;
      for (const dy of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(-16, dy); ctx.lineTo(-25, dy - 3); ctx.stroke(); }
    }

    // ---- nav pod / rad-hard vault
    if (nav === 'startrack' || nav === 'radhard') {
      ctx.fillStyle = nav === 'radhard' ? '#3b4250' : '#4a5462';
      ctx.fillRect(-10, -15, 12, 6);
      ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 0.6; ctx.strokeRect(-10, -15, 12, 6);
      ctx.fillStyle = '#1a1f26'; ctx.fillRect(-8, -14, 2, 4);
    }

    // ---- engine + nozzle (+ redundant tank)
    const noz = engine === 'powerful' ? 9 : engine === 'redundant' ? 8 : 6;
    ctx.fillStyle = '#4f5663';
    ctx.beginPath(); ctx.moveTo(-16, -noz); ctx.lineTo(-22 - noz, -noz + 2); ctx.lineTo(-22 - noz, noz - 2); ctx.lineTo(-16, noz); ctx.closePath(); ctx.fill();
    if (engine === 'redundant') {
      const tg = ctx.createRadialGradient(11, 20, 1, 13, 22, 7);
      tg.addColorStop(0, '#e7eaee'); tg.addColorStop(1, '#6f7680');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(-6, 21, 6, 0, TAU); ctx.fill();
    }

    // ---- thruster flame
    if (o.thrust) {
      const k = o.thrust === true ? 1 : o.thrust;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fl = (12 + Math.random() * 5) * k, fw = 4 + (k - 1) * 2;
      const fg = ctx.createLinearGradient(-22, 0, -22 - fl, 0);
      fg.addColorStop(0, 'rgba(235,245,255,0.95)'); fg.addColorStop(0.3, 'rgba(170,205,255,0.8)'); fg.addColorStop(1, 'rgba(120,160,255,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-22, -fw); ctx.lineTo(-22 - fl, 0); ctx.lineTo(-22, fw); ctx.fill();
      if (k > 1) glow(ctx, -24, 0, 10 * k, 'rgba(160,200,255,ALPHA)', 0.35);
      ctx.restore();
    }
    const blink = (t * 1.2) % 1 < 0.08;
    ctx.fillStyle = blink ? '#ff5a4a' : '#40201c'; ctx.fillRect(-17, -16, 1.8, 1.8);
    ctx.fillStyle = blink ? '#6dffa6' : '#1c3a28'; ctx.fillRect(15, -16, 1.8, 1.8);
    ctx.restore();
  }

  // Config for the spacecraft drawn from current engineer selections (or the committed design).
  function craftCfg() {
    const sel = Game.sel || {};
    return {
      power: M.selectedPowerSystem || sel.power || 'basic',
      payload: M.selectedPayload || sel.payload || 'camera',
      comms: M.selectedComms || sel.comms || 'patch',
      thermal: M.selectedThermal || sel.thermal || 'basic',
      engine: M.selectedEngine || sel.engine || 'std',
      nav: M.selectedNav || sel.nav || 'imu',
      data: M.selectedData || sel.data || 'compact',
    };
  }

  // ================================================================ PARTICLES
  const parts = [];
  function emit(p) { if (parts.length < 600) parts.push(Object.assign({ life: 1, max: 1, size: 2, grow: 0, drag: 1, add: true, color: '255,200,120' }, p)); }
  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt; p.y += p.vy * dt; p.size += p.grow * dt;
    }
  }
  function drawParticles(ctx, offY = 0) {
    for (const p of parts) {
      const a = clamp(p.life / p.max);
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      if (p.soft) {
        const gr = ctx.createRadialGradient(p.x, p.y + offY, 0, p.x, p.y + offY, p.size);
        gr.addColorStop(0, `rgba(${p.color},${a * (p.alpha || 1)})`); gr.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = gr;
        ctx.fillRect(p.x - p.size, p.y + offY - p.size, p.size * 2, p.size * 2);
      } else {
        ctx.fillStyle = `rgba(${p.color},${a * (p.alpha || 1)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y + offY, Math.max(0.3, p.size), 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function clearParticles() { parts.length = 0; }

  function burst(x, y, n, color, speed = 120, life = 1.2) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.7);
      emit({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: 1 + Math.random() * 1.2, drag: 0.96, color });
    }
  }

  // ================================================================ PATHS
  function route(ctx, p0, p1, p2, t, progress = 1, color = COL.cyan, dashed = true) {
    ctx.save();
    ctx.strokeStyle = 'rgba(150,175,200,0.28)'; ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 12;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); ctx.stroke();
    if (progress > 0) {
      ctx.setLineDash(dashed ? [] : [8, 6]);
      ctx.strokeStyle = color; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
      const n = 48;
      for (let k = 1; k <= n * progress; k++) { const q = qb(p0, p1, p2, k / n); ctx.lineTo(q.x, q.y); }
      const e = qb(p0, p1, p2, progress); ctx.lineTo(e.x, e.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function orbitHalf(ctx, cx, cy, rx, ry, rot, front, color, width, alpha) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
    ctx.setLineDash(front ? [] : [3, 5]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, front ? 0 : Math.PI, front ? Math.PI : TAU);
    ctx.stroke();
    ctx.restore();
  }
  const onEllipse = (cx, cy, rx, ry, rot, th) => {
    const ex = rx * Math.cos(th), ey = ry * Math.sin(th);
    return { x: cx + ex * Math.cos(rot) - ey * Math.sin(rot), y: cy + ex * Math.sin(rot) + ey * Math.cos(rot), front: Math.sin(th) > 0 };
  };

  function tag2(ctx, str, x, y, color = COL.label, align = 'left') { tag(ctx, str, x, y, color, align); }

  // ================================================================ HAZARD VISUALS
  function progressT(phase) {
    if (Game.phase === phase) return Game.phaseT;
    if (Game.hazard && Game.hazard.resume && Game.hazard.resume.phase === phase) return Game.hazard.resume.phaseT;
    return 0;
  }
  const evading = () => !!(Game.hazard && Game.hazard.opt === 'evade' && Game.t - Game.hazard.tDone < 1.6);
  const ROCKS = (() => { const r = mulberry32(3), out = []; for (let k = 0; k < 7; k++) out.push({ off: r(), spread: (r() - 0.5) * 0.5, size: 3 + r() * 5, spin: (r() - 0.5) * 4, pts: Array.from({ length: 7 }, () => 0.7 + r() * 0.5) }); return out; })();
  let lastCraft = { x: 400, y: 360 };

  function rock(ctx, x, y, s, rot, pts) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#9a9086'); g.addColorStop(1, '#3f3a35');
    ctx.fillStyle = g; ctx.beginPath();
    pts.forEach((k, i) => { const a = i / pts.length * TAU; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s * k, Math.sin(a) * s * k); });
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function hazardFx(ctx, t, cx, cy, bannerY = 186) {
    lastCraft = { x: cx, y: cy };
    const hz = Game.hazard;
    if (!hz) return;
    const since = t - hz.t0, active = !hz.done, after = hz.done ? t - hz.tDone : 0;
    const fade = active ? 1 : clamp(1 - after / 2.2);
    if (fade <= 0) return;
    ctx.save();
    if (hz.id === 'meteoroid') {
      const miss = hz.done && (hz.opt === 'evade' || hz.opt === 'kit' || hz.outcome === 'lucky');
      for (const r of ROCKS) {
        const dir = -0.55 + r.spread;
        const travel = active ? ((since * 0.18 + r.off) % 1) : 1 + after * 0.6;
        const dist = active ? lerp(520, 70, travel) : miss ? -after * 400 - r.off * 60 : 60 - after * 300;
        const x = cx + Math.cos(dir) * dist + (miss ? 60 + r.off * 40 : 0), y = cy + Math.sin(dir) * dist;
        ctx.globalAlpha = fade;
        const tg = ctx.createLinearGradient(x, y, x + Math.cos(dir) * 60, y + Math.sin(dir) * 60);
        tg.addColorStop(0, 'rgba(255,200,150,0.5)'); tg.addColorStop(1, 'rgba(255,200,150,0)');
        ctx.strokeStyle = tg; ctx.lineWidth = r.size * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(dir) * 60, y + Math.sin(dir) * 60); ctx.stroke();
        rock(ctx, x, y, r.size, t * r.spin, r.pts);
      }
      if (active) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 6));
        ctx.strokeStyle = COL.red; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(-0.55) * 420, cy + Math.sin(-0.55) * 420); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeRect(cx - 34, cy - 34, 68, 68);
        text(ctx, `IMPACT T−${Math.max(0, 90 - Math.floor(since * 4))} s`, cx - 34, cy - 44, { size: 10, color: COL.red, spacing: 1.5, weight: 700 });
      }
    } else if (hz.id === 'leak') {
      const n = active ? 3 : hz.outcome === 'unlucky' ? 4 : 0;
      for (let k = 0; k < n * fade; k++) emit({ x: cx + 18, y: cy + 6, vx: 120 + Math.random() * 90, vy: 30 + (Math.random() - 0.5) * 70, life: 1.1, max: 1.1, size: 2, grow: 7, drag: 0.97, add: false, soft: true, alpha: 0.6, color: '220,235,245' });
      if (active) text(ctx, 'TANK B PRESSURE ↓', cx + 30, cy - 30, { size: 10, color: COL.amber, spacing: 1.5, weight: 700, alpha: 0.6 + 0.4 * Math.abs(Math.sin(t * 5)) });
    } else if (hz.id === 'seu') {
      ctx.globalAlpha = fade;
      for (let k = 0; k < 5; k++) { ctx.fillStyle = `rgba(229,83,75,${Math.random() * 0.12})`; ctx.fillRect(0, Math.random() * H, 800, 1 + Math.random() * 4); }
      if (active) {
        ctx.fillStyle = `rgba(229,83,75,${0.25 + 0.25 * Math.abs(Math.sin(t * 8))})`;
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.fill();
        text(ctx, 'SAFE MODE', cx, cy - 40, { size: 11, color: COL.red, spacing: 3, weight: 700, align: 'center' });
      }
    } else if (hz.id === 'flare') {
      const flick = 0.85 + 0.15 * Math.sin(t * 13);
      const g = ctx.createRadialGradient(-40, 60, 10, -40, 60, 820);
      g.addColorStop(0, `rgba(255,236,200,${0.75 * fade * flick})`); g.addColorStop(0.18, `rgba(255,190,110,${0.3 * fade})`); g.addColorStop(0.6, `rgba(255,150,80,${0.08 * fade})`); g.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 800, H);
      ctx.strokeStyle = `rgba(255,220,170,${0.25 * fade})`; ctx.lineWidth = 1;
      for (let k = 0; k < 40 * fade; k++) {
        const x = Math.random() * 800, y = 90 + Math.random() * (H - 90);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 7); ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,245,230,${0.9 * fade})`;
      for (let k = 0; k < 50 * fade; k++) ctx.fillRect(Math.random() * 800, 90 + Math.random() * (H - 90), 1.6, 1.6);
    } else if (hz.id === 'dust') {
      for (let k = 0; k < 2 * fade; k++) {
        const a = Math.random() * TAU, d = 20 + Math.random() * 60;
        emit({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: -Math.sin(a) * 30, vy: Math.cos(a) * 30 - 5, life: 1.6, max: 1.6, size: 1.2 + Math.random() * 1.5, add: false, alpha: 0.7, color: '170,150,125' });
      }
      ctx.globalAlpha = 0.25 * fade; ctx.fillStyle = '#6b5d4a';
      ctx.beginPath(); ctx.arc(cx, cy, 55, 0, TAU); ctx.fill();
    } else if (hz.id === 'quake') {
      ctx.globalAlpha = fade;
      const amp = active ? 4 + 3 * Math.sin(t * 18) : clamp(1 - after) * 3;
      for (let k = 0; k < 6; k++) {
        ctx.strokeStyle = `rgba(124,199,232,${0.14 * fade})`; ctx.lineWidth = 1;
        const yy = cy - 60 + k * 24;
        ctx.beginPath();
        for (let x = cx - 220; x <= cx + 220; x += 14) ctx.lineTo(x, yy + Math.sin(x * 0.09 + t * 10 + k) * amp);
        ctx.stroke();
      }
      if (active) text(ctx, `SEISMIC TREMOR · PGA ${(0.02 + Math.abs(Math.sin(t * 3)) * 0.03).toFixed(3)} g`, cx - 100, cy - 78, { size: 9.5, color: COL.cyan, spacing: 1.5 });
    }
    ctx.restore();
    if (active) {
      const pulse = Math.abs(Math.sin(t * 4));
      ctx.fillStyle = `rgba(229,83,75,${0.5 + 0.5 * pulse})`; ctx.fillRect(40, bannerY - 4, 8, 8);
      text(ctx, `HAZARD · ${HAZARDS[hz.id].name.toUpperCase()}`, 58, bannerY, { size: 12, color: COL.red, spacing: 2, weight: 700 });
    }
  }

  function impact(color = '255,200,140') { burst(lastCraft.x, lastCraft.y, 40, color, 160, 0.9); }
  function hazardShake(ctx, t) {
    const hz = Game.hazard;
    if (!hz) return;
    let a = hz.done ? 0 : clamp(1 - (t - hz.t0) / 0.8) * 5;
    if (hz.done && hz.hit) a = Math.max(a, clamp(1 - (t - hz.tDone) / 0.7) * 9);
    if (a > 0) ctx.translate((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
  }

  function init() { buildStars(); buildMoonMap(); buildEarthMap(); }

  return {
    init, W, H, COL, TAU, D2R, TILT, VIEWS,
    background, grid, text, stamp, glow, tag, spinCaption, lapseHours, earthLon, moonLon,
    drawStars: (ctx, alpha = 1) => { ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(starLayer, 0, 0); ctx.restore(); },
    moon, earth, project, targetMarker, siteView, siteOffset, targetPos,
    renderMoon, renderEarth, makeCanvas, mulberry32,
    // solar system + camera
    SYS, Cam, PLANET_ORDER, solarSystem, moonDive, planetDisc, hitTest, hitTargets: () => hitTargets, AUOf, bodyDiameter, planetScale,
    // spacecraft
    spacecraft, craftCfg,
    // particles + paths
    emit, updateParticles, drawParticles, clearParticles, burst, route, orbitHalf, onEllipse,
    // hazards
    progressT, hazardFx, impact, hazardShake, evading, lastCraft: () => lastCraft,
  };
})();
