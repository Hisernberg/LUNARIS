// MathX - tiny vector / easing / noise toolkit (gl-matrix + mathjs inspired, dependency-free).
// Only the operations the game actually needs: 2D vectors, easing, value noise, formatting.
const MathX = (() => {
  const TAU = Math.PI * 2;

  // ---- scalars
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);      // ease in-out
  const easeIn = t => t * t * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const mix = (a, b, t) => (typeof a === 'object' ? { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) } : lerp(a, b, t));
  const inv = (a, b, v) => clamp((v - a) / (b - a || 1e-9));

  // ---- seeded RNG + 3D value noise + fBm (sampled on the sphere -> no seams)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise(seed) {
    const r = mulberry32(seed), perm = new Uint8Array(512), vals = new Float32Array(256);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) vals[i] = r();
    const hsh = (x, y, z) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];
    const sm = t => t * t * (3 - 2 * t);
    function n3(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
      const a = hsh(xi, yi, zi), b = hsh(xi + 1, yi, zi), c = hsh(xi, yi + 1, zi), d = hsh(xi + 1, yi + 1, zi);
      const e = hsh(xi, yi, zi + 1), f = hsh(xi + 1, yi, zi + 1), g = hsh(xi, yi + 1, zi + 1), k = hsh(xi + 1, yi + 1, zi + 1);
      const x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (k - g) * u;
      const y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
      return y1 + (y2 - y1) * w;
    }
    return (x, y, z, oct = 5) => {
      let s = 0, a = 0.5, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) { s += a * n3(x * f, y * f, z * f); norm += a; a *= 0.5; f *= 2.03; }
      return s / norm;
    };
  }

  // ---- 2D quadratic/cubic bezier + derivatives (trajectory math)
  const qb = (p0, p1, p2, t) => ({
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
  });
  const cubic = (c, u) => {
    const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, d = 3 * (1 - u) * u * u, e = u ** 3;
    return { x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x, y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y };
  };
  const cubicAng = (c, u) => {
    const p = cubic(c, Math.max(0, u - 0.004)), q = cubic(c, Math.min(1, u + 0.004));
    return Math.atan2(q.y - p.y, q.x - p.x);
  };

  // ---- orbital elements -> position (simplified Kepler, f = E - e sin E via Newton)
  // elements: { a, e, i, L (deg at J2000), peri (deg), node (deg), T (years) }
  // Returns heliocentric ecliptic position in AU at `days` past J2000.
  function keplerPos(el, days) {
    const n = 360 / (el.T * 365.25);                       // mean motion deg/day
    let M = ((el.L - el.peri) + n * days) % 360;           // mean anomaly
    const Mr = M * Math.PI / 180, er = el.e;
    let E = Mr;
    for (let k = 0; k < 5; k++) E = E - (E - er * Math.sin(E) - Mr) / (1 - er * Math.cos(E));
    const xv = el.a * (Math.cos(E) - er), yv = el.a * Math.sqrt(1 - er * er) * Math.sin(E);
    const pr = el.peri * Math.PI / 180, nr = el.node * Math.PI / 180, ir = el.i * Math.PI / 180;
    const xp = xv * Math.cos(pr) - yv * Math.sin(pr), yp = xv * Math.sin(pr) + yv * Math.cos(pr);
    return {
      x: xp,
      y: yp * Math.cos(nr) - Math.hypot(xp, yp) * Math.sin(nr) * Math.sin(ir),  // projected
      z: yp * Math.sin(ir),
    };
  }

  // ---- formatting
  function fmtDuration(h, long) {
    const d = Math.floor(h / 24), hr = Math.round(h - d * 24);
    const dd = hr === 24 ? d + 1 : d, hh = hr === 24 ? 0 : hr;
    return long ? `${dd} Day${dd === 1 ? '' : 's'} ${hh} Hour${hh === 1 ? '' : 's'}` : `${dd} d ${hh} h`;
  }
  const fmtMET = h => { const d = Math.floor(h / 24), hh = Math.floor(h - d * 24), mm = Math.floor((h * 60) % 60); return `${d} d ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const fmtNum = v => Math.round(v).toLocaleString('en-US');

  return { TAU, clamp, lerp, ease, easeIn, easeOut, smooth, dist, mix, inv, mulberry32, makeNoise, qb, cubic, cubicAng, keplerPos, fmtDuration, fmtMET, fmtNum };
})();
