// Astro - simplified astronomy layer (Astronomy Engine / orb.js inspired, dependency-free).
// Provides Moon phase & illumination direction, planet positions (from MathX Kepler solver +
// the planetary_orbital_elements dataset) and the in-game epoch clock.
// This is a transparent simplified model - positions are labelled in-game as derived/approximate.
const Astro = (() => {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const SYNODIC = 29.530588;            // days (new moon to new moon)
  const MOON_ORBIT_DAYS = 27.3217;      // sidereal
  const EARTH_DAY_H = 23.9345;

  let elements = {};                    // planet -> kepler elements (filled from dataset at boot)
  let day0 = Date.UTC(2026, 10, 10);    // game epoch anchor: 2026-11-10 (mission date)

  function setElements(map) { elements = map; }

  // days past J2000 for the game epoch
  const epochDays = () => (day0 - J2000) / 86400000;
  function setEpoch(date) { day0 = date; }

  // planet heliocentric position in AU (projected to the ecliptic plane for 2D view)
  function planetPos(name, days = epochDays()) {
    const el = elements[name];
    if (!el) return null;
    return MathX.keplerPos(el, days);
  }

  // phase angle of the Moon: 0 = new, 0.5 = full (approximate mean-motion model, game visual)
  function moonPhase(days = epochDays()) {
    return ((days % SYNODIC) / SYNODIC + 1) % 1;
  }
  const moonPhaseName = p => (p < 0.03 || p > 0.97 ? 'New Moon' : p < 0.22 ? 'Waxing Crescent' : p < 0.28 ? 'First Quarter' : p < 0.47 ? 'Waxing Gibbous' : p < 0.53 ? 'Full Moon' : p < 0.72 ? 'Waning Gibbous' : p < 0.78 ? 'Last Quarter' : 'Waning Crescent');

  // fraction of the disc lit (for the info card)
  const moonLitFraction = p => (1 - Math.cos(2 * Math.PI * p)) / 2;

  // Longitude of the point on the Moon that faces the Sun (degrees east of the Earth-facing point).
  // The Moon rotates once per orbit; the sub-Earth point is longitude 0 (tidal lock).
  function subSolarLon(days = epochDays()) {
    // synodic day drives the terminator walk across the near side
    return ((days % SYNODIC) / SYNODIC) * 360;
  }

  // Earth spin angle hours (for globe rendering consistency)
  const earthSpinHours = days => days * 24;

  const D2R = Math.PI / 180;
  return { J2000, setElements, setEpoch, epochDays, planetPos, moonPhase, moonPhaseName, moonLitFraction, subSolarLon, earthSpinHours, SYNODIC, MOON_ORBIT_DAYS, EARTH_DAY_H, D2R };
})();
