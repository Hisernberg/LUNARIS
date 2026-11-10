// DESTINATIONS: the solar-system expansion. One registry entry per flyable world.
// Numbers in the GAME MODEL fields (fuelMult, budgets, science goals) are balance
// values, not NASA measurements. Physics framing values (solar flux, one-way light
// time, gravity, transit times) are real, rounded, and labelled with confidence
// tags in the UI. Moon behaviour is byte-compatible with the pre-expansion game.

// ---------------------------------------------------------------- destination registry
const DESTS = {
  moon: {
    id: 'moon', name: 'THE MOON', shortName: 'Moon', icon: '☾', tier: 1, scoreMult: 1.0,
    kind: "Earth's companion · 3 days from home",
    pitch: 'The classic first step: cheap to reach, harsh to survive. Water ice hides in permanently shadowed polar craters.',
    budget: 100, sciGoal: 1.0,
    flux: 1.0, fluxLabel: '×1.00 (Earth-normal)', delayMin: 0.02, delayLabel: '1.3 seconds',
    rad: 0, radLabel: 'none (no belts)', thermalMin: 0, grav: '0.166 g', distKm: 384400,
    fuelMult: 1.0, tliShare: 0.6, transit: { fast: 2.5, balanced: 3.1, efficient: 4.9 },
    txMult: 1.0,
    objectives: ['water', 'mapping', 'composition', 'environment'],
    sites: ['south_pole', 'tranquillitatis', 'marius', 'descartes', 'farside', 'aristarchus'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'dust', 'quake'],
    event: { name: 'Lunar night heater load', alert: 'The survey target is entering lunar night…',
      facts: [{ k: 'Night length', v: '≈14 Earth days (half the synodic period)', tag: 'derived' }] },
    orbits: { low: 'Low Lunar Orbit', high: 'Higher Lunar Orbit' },
    orbitInsight: { data: 'Effectively a vacuum: no air drag, so even a low orbit is possible.', effect: 'Low orbit = closer, more detailed observations but more correction burns, risk and exposure to lofted dust.' },
    terms: { inj: 'Trans-lunar injection', coast: 'Trans-lunar coast', capture: 'Lunar orbit insertion', captureShort: 'LOI', captureFail: 'flew past the Moon', arrived: 'Lunar orbit established', choose: 'CHOOSE LUNAR ORBIT', survey: 'BEGIN LUNAR SURVEY' },
    travelTitle: 'How Fast to the Moon?',
    travelSub: 'Faster = more fuel &amp; risk. Slower = saves fuel, but days longer in transit.',
    modeRefs: {
      fast: 'Quicker than Apollo 8 (≈69 h 08 m to lunar orbit)',
      balanced: 'Apollo 11 reference (≈75 h 50 m to reach the Moon)',
      efficient: 'Artemis I / Blue Ghost reference (≈5-25 days, fuel-saving paths)',
    },
    heritage: [
      { name: 'Apollo 11 · 1969', note: 'First crewed landing - the BALANCED transfer calibration point.' },
      { name: 'Artemis II · 2026', note: 'Crewed lunar flyby - humans return to the Moon after 50+ years.' },
      { name: "Chang'e 6 · 2024", note: 'First far-side sample return.' },
      { name: 'SLIM · 2024', note: 'Japan\'s pinpoint (≤100 m) landing demo.' },
    ],
  },

  mars: {
    id: 'mars', name: 'MARS', shortName: 'Mars', icon: '♂', tier: 2, scoreMult: 1.3,
    kind: 'The rusty frontier · 6-9 month cruise',
    pitch: 'Ancient river deltas and buried ice. The best near-term target in the search for past life - and a global dust storm season that punished Opportunity.',
    budget: 122, sciGoal: 1.0,
    flux: 0.43, fluxLabel: '×0.43 (solar still works)', delayMin: 12, delayLabel: '3-22 minutes',
    rad: 1, radLabel: 'thin atmosphere, no belts', thermalMin: 0, grav: '0.38 g', distKm: 225000000,
    fuelMult: 1.3, tliShare: 0.65, transit: { fast: 195, balanced: 260, efficient: 320 },
    txMult: 1.0, aerobrake: 'Economy mode uses aerobraking (Magellan/MRO heritage)',
    objectives: ['water', 'mapping', 'composition', 'environment', 'life'],
    sites: ['jezero', 'gale', 'utopia', 'south_cap'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'conjunction', 'dust'],
    event: { name: 'Mars night + dust dimming', alert: 'Dust is dimming the panels and night is falling…',
      facts: [{ k: 'Sol (Mars day)', v: '24 h 39 min', tag: 'nasa' }, { k: 'Atmosphere', v: 'thin CO₂ - dust loads optics and cells', tag: 'nasa' }] },
    orbits: { low: 'Low Mars Orbit', high: 'High Mars Orbit' },
    orbitInsight: { data: 'Atmosphere ≈0.6% of Earth pressure - thick enough for aerobraking, too thin for parachutes alone.',
      effect: 'Low orbit = sharper imaging but more correction burns and dust exposure. Aerobraking trims capture fuel (economy mode).' },
    terms: { inj: 'Trans-Mars injection', coast: 'Trans-Mars coast', capture: 'Mars orbit insertion', captureShort: 'MOI', captureFail: 'flew past Mars', arrived: 'Mars orbit established', choose: 'CHOOSE MARS ORBIT', survey: 'BEGIN MARS SURVEY' },
    travelTitle: 'How Fast to Mars?',
    travelSub: 'The Hohmann window opens every 26 months. Faster = more fuel; slower saves fuel for the surface campaign.',
    modeRefs: {
      fast: 'Perseverance-class fast cruise (≈203 days, 2020)',
      balanced: 'Classic Hohmann transfer (≈259 days)',
      efficient: 'Slow cruise with aerobraking capture (≈320 days, MRO heritage)',
    },
    heritage: [
      { name: 'Perseverance + MOXIE · 2021', note: 'Made oxygen from CO₂ air - ISRU proven on Mars.' },
      { name: 'Curiosity · 2012', note: 'Found ancient habitable lakebed chemistry in Gale Crater.' },
      { name: 'InSight · 2018', note: 'First marsquakes measured - SEIS listened for 4 years.' },
      { name: 'Opportunity · 2004', note: '15-year rover; a 2018 global dust storm finally silenced it.' },
      { name: 'Viking 1 · 1976', note: 'First successful Mars surface mission.' },
    ],
  },

  venus: {
    id: 'venus', name: 'VENUS', shortName: 'Venus', icon: '♀', tier: 3, scoreMult: 1.4,
    kind: 'The greenhouse twin · 5 month cruise',
    pitch: 'Surface: 465°C under 92 atmospheres. At 55 km altitude: the most Earth-like air pressure in the solar system. Thermal design decides everything.',
    budget: 125, sciGoal: 1.15,
    flux: 1.9, fluxLabel: '×1.91 (panels run hot)', delayMin: 9, delayLabel: '4-14 minutes',
    rad: 0, radLabel: 'thick atmosphere shields', thermalMin: 2, grav: '0.90 g', distKm: 261000000,
    fuelMult: 1.35, tliShare: 0.6, transit: { fast: 115, balanced: 150, efficient: 200 },
    txMult: 1.1, aerobrake: 'Economy mode aerobrakes into orbit (Magellan heritage)',
    objectives: ['mapping', 'composition', 'environment'],
    sites: ['cloud_deck', 'sapas_mons', 'maxwell_montes'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'acid', 'soak', 'wind'],
    event: { name: 'Superrotation dusk + thermal soak', alert: 'The platform crosses into the superrotation night side…',
      facts: [{ k: 'Surface temperature', v: '≈465°C day and night', tag: 'nasa' }, { k: 'Cloud-top wind', v: '≈360 km/h (superrotation)', tag: 'nasa' }] },
    orbits: { low: 'Low Venus Orbit', high: 'High Venus Orbit' },
    orbitInsight: { data: '92 bar surface pressure - the crushing weight of a 90-km-deep CO₂ ocean.',
      effect: 'Orbit is the survivable vantage. Low orbit gives radar detail; the surface itself demands hardened armor.' },
    terms: { inj: 'Trans-Venus injection', coast: 'Trans-Venus coast', capture: 'Venus orbit insertion', captureShort: 'VOI', captureFail: 'flew past Venus', arrived: 'Venus orbit established', choose: 'CHOOSE VENUS ORBIT', survey: 'BEGIN VENUS SURVEY' },
    travelTitle: 'How Fast to Venus?',
    travelSub: 'Venus is close and often reachable in under 5 months - but arrival is where designs die.',
    modeRefs: {
      fast: 'Direct high-energy cruise (≈115 days)',
      balanced: 'Hohmann transfer (≈150 days)',
      efficient: 'Slow cruise with aerobraking capture (Magellan heritage, ≈200 days)',
    },
    heritage: [
      { name: 'Venera 13 · 1982', note: 'Survived 127 minutes on the surface - the record.' },
      { name: 'Magellan · 1990', note: 'Radar-mapped 98% of the surface; aerobraked into its final orbit.' },
      { name: 'Akatsuki · 2015', note: 'Rides the superrotation winds at cloud height.' },
      { name: 'DAVINCI · upcoming', note: 'Descent probe through the atmosphere to the surface.' },
    ],
  },

  mercury: {
    id: 'mercury', name: 'MERCURY', shortName: 'Mercury', icon: '☿', tier: 3, scoreMult: 1.5,
    kind: 'The Sun-scorched sprinter · assist-chain arrival',
    pitch: 'Deep in the Sun\'s gravity well: reaching orbit costs more Δv than reaching Pluto. Water ice survives in polar craters that never see the Sun.',
    budget: 145, sciGoal: 1.2,
    flux: 1.65, fluxLabel: '×1.65 (up to ×4.6 at perihelion)', delayMin: 8, delayLabel: '5-11 minutes',
    rad: 2, radLabel: 'solar flares hit hard this close', thermalMin: 1, grav: '0.38 g', distKm: 92000000,
    fuelMult: 1.65, tliShare: 0.6, transit: { fast: 400, balanced: 520, efficient: 1080 },
    txMult: 1.1,
    objectives: ['water', 'mapping', 'composition', 'environment'],
    sites: ['borealis_pole', 'caloris', 'hokusai'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'cycling', 'conjunction'],
    event: { name: 'Mercury noon thermal peak', alert: 'The subsolar point rotates overhead…',
      facts: [{ k: 'Day-night swing', v: '−180°C to +430°C', tag: 'nasa' }, { k: 'Solar day', v: '176 Earth days (2 Mercury years)', tag: 'nasa' }] },
    orbits: { low: 'Low Mercury Orbit', high: 'High Mercury Orbit' },
    orbitInsight: { data: 'No atmosphere, deep gravity well: capture needs more Δv than any other planet.',
      effect: 'Low orbit is punishing on fuel and thermal cycling - the fuel-saving assist chain is how MESSENGER and BepiColombo did it.' },
    terms: { inj: 'Trans-Mercury injection', coast: 'Trans-Mercury coast', capture: 'Mercury orbit insertion', captureShort: 'MOI', captureFail: 'flew past Mercury', arrived: 'Mercury orbit established', choose: 'CHOOSE MERCURY ORBIT', survey: 'BEGIN MERCURY SURVEY' },
    travelTitle: 'How Fast to Mercury?',
    travelSub: 'Direct arrivals need enormous capture propellant. The fuel-saving mode is the real flight-proven path: a gravity-assist chain.',
    modeRefs: {
      fast: 'Direct capture (huge propellant budget)',
      balanced: 'One Venus assist (≈17 months)',
      efficient: 'MESSENGER/BepiColombo-style assist chain (≈3 years, ≥6 flybys)',
    },
    heritage: [
      { name: 'MESSENGER · 2011', note: '6 gravity assists over 6.6 years to reach orbit - then mapped polar ice.' },
      { name: 'BepiColombo · en route', note: '9 gravity assists, arriving 2026.' },
      { name: 'Mariner 10 · 1974', note: 'First Mercury flybys - 3 passes, one hemisphere only.' },
    ],
  },

  ceres: {
    id: 'ceres', name: 'CERES', shortName: 'Ceres', icon: '⚳', tier: 3, scoreMult: 1.45,
    kind: 'The dwarf planet · 2.5 year cruise',
    pitch: 'A third of all asteroid-belt mass. Bright salt deposits, a possible subsurface brine layer, and organic chemistry at Ernutet.',
    budget: 125, sciGoal: 1.15,
    flux: 0.13, fluxLabel: '×0.13 (solar works with big arrays)', delayMin: 17, delayLabel: '12-22 minutes',
    rad: 0, radLabel: 'none', thermalMin: 0, grav: '0.029 g - anchoring needed', distKm: 415000000,
    fuelMult: 0.55, tliShare: 0.62, transit: { fast: 700, balanced: 900, efficient: 1150 },
    txMult: 1.2, lowg: true,
    objectives: ['water', 'mapping', 'composition', 'environment', 'life'],
    sites: ['occator', 'ahuna_mons', 'ernutet'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'anchor', 'tumble'],
    event: { name: 'Belt cruise power audit', alert: 'Cruise heaters and the fading sunlight force a power review…',
      facts: [{ k: 'Rotation', v: '9.1 hours', tag: 'nasa' }, { k: 'Water share', v: '≈25% of mass may be water ice', tag: 'estimate' }] },
    orbits: { low: 'Low Ceres Orbit', high: 'High Ceres Orbit' },
    orbitInsight: { data: 'Escape velocity ≈0.51 km/s - you could jump off Ceres.',
      effect: 'Capture is cheap; the danger is staying: microgravity anchoring and slow tumbling on an irregular body.' },
    terms: { inj: 'Trans-Ceres injection', coast: 'Belt transfer', capture: 'Ceres orbit insertion', captureShort: 'COI', captureFail: 'drifted past Ceres', arrived: 'Ceres orbit established', choose: 'CHOOSE CERES ORBIT', survey: 'BEGIN CERES SURVEY' },
    travelTitle: 'How Fast to Ceres?',
    travelSub: 'The belt is far but shallow: arrival is cheap, cruise is long. Dawn spiralled in with ion engines.',
    modeRefs: {
      fast: 'High-energy direct cruise (≈23 months)',
      balanced: 'Dawn-class spiral capture (≈30 months)',
      efficient: 'Low-thrust ion spiral (≈38 months, Dawn heritage)',
    },
    heritage: [
      { name: 'Dawn · 2015-18', note: 'First spacecraft to orbit two extraterrestrial bodies (Vesta + Ceres).' },
      { name: 'Occator bright spots', note: 'Salt crust from brines reaching the surface - an ocean world in miniature.' },
    ],
  },
};
Object.assign(DESTS, {
  psyche: {
    id: 'psyche', name: '16 PSYCHE', shortName: 'Psyche', icon: '⬡', tier: 4, scoreMult: 1.55,
    kind: 'The metal world · Mars-assist arrival',
    pitch: 'An asteroid made largely of metal - possibly the exposed core of a shattered protoplanet. Visit a planetary core without digging.',
    budget: 140, sciGoal: 1.2,
    flux: 0.10, fluxLabel: '×0.10 (large arrays, Psyche is solar-powered)', delayMin: 20, delayLabel: '13-27 minutes',
    rad: 0, radLabel: 'none', thermalMin: 0, grav: '≈0.012 g (est.) - anchoring critical', distKm: 480000000,
    fuelMult: 0.4, tliShare: 0.62, transit: { fast: 1400, balanced: 1800, efficient: 2300 },
    txMult: 1.25, lowg: true,
    objectives: ['mapping', 'composition', 'environment'],
    sites: ['metal_highlands', 'crater_field', 'fracture_belt'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'anchor', 'tumble', 'targeting'],
    event: { name: 'Belt cruise power audit', alert: 'Cruise heaters and fading sunlight force a power review…',
      facts: [{ k: 'Composition', v: 'metal-rich (iron-nickel)', tag: 'estimate' }, { k: 'Diameter', v: '≈226 km', tag: 'nasa' }] },
    orbits: { low: 'Close Science Orbit', high: 'High Survey Orbit' },
    orbitInsight: { data: 'Escape velocity ≈0.14 km/s - a slow throw would escape.',
      effect: 'Capture is nearly free. The Psyche mission flies four increasingly close science orbits - each step costs only small burns.' },
    terms: { inj: 'Trans-Psyche injection', coast: 'Belt transfer', capture: 'Psyche orbit insertion', captureShort: 'POI', captureFail: 'drifted past Psyche', arrived: 'Psyche orbit established', choose: 'CHOOSE SCIENCE ORBIT', survey: 'BEGIN PSYCHE SURVEY' },
    travelTitle: 'How Fast to Psyche?',
    travelSub: 'No air, tiny gravity: arrival is cheap. A Mars gravity assist does the heavy lifting.',
    modeRefs: {
      fast: 'Direct high-energy cruise (≈3.8 years)',
      balanced: 'Mars gravity assist (NASA Psyche mission profile, 2023 → 2029)',
      efficient: 'Extended assist chain (≈6+ years)',
    },
    heritage: [
      { name: 'Psyche · launched 2023', note: 'NASA mission on the way - Mars assist 2026, arrival 2029.' },
      { name: 'Why a metal world', note: 'If it is an exposed core, it tests how terrestrial planets formed.' },
    ],
  },

  europa: {
    id: 'europa', name: 'EUROPA', shortName: 'Europa', icon: '◍', tier: 5, scoreMult: 1.7,
    kind: 'Jupiter\'s ocean moon · radiation zone',
    pitch: 'A global saltwater ocean under a young ice shell - more liquid water than all of Earth\'s oceans. Jupiter\'s radiation belts are the price of entry.',
    budget: 155, sciGoal: 1.25,
    flux: 0.037, fluxLabel: '×0.037 (RTG REQUIRED)', delayMin: 43, delayLabel: '35-52 minutes',
    rad: 3, radLabel: 'EXTREME - Jupiter radiation belts', thermalMin: 0, grav: '0.134 g', distKm: 628000000,
    fuelMult: 1.65, tliShare: 0.55, transit: { fast: 1500, balanced: 2100, efficient: 2700 },
    txMult: 1.25,
    objectives: ['water', 'mapping', 'composition', 'environment', 'life'],
    sites: ['conamara_chaos', 'tara_regio', 'tyre'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'radburst', 'plume'],
    event: { name: 'Jupiter eclipse shadow', alert: 'Jupiter is swallowing the Sun - eclipse shadow inbound…',
      facts: [{ k: 'Eclipse shadow', v: '≈85 min per 3.55-day orbit (approx)', tag: 'approx' }, { k: 'Ocean depth', v: '60-150 km under 15-25 km ice (approx)', tag: 'approx' }] },
    orbits: { low: 'Low Science Orbit', high: 'High Radiation-Safe Orbit' },
    orbitInsight: { data: 'Jupiter\'s magnetosphere delivers ~5400 mSv/day at Europa - lethal for unprotected electronics (approx).',
      effect: 'Europa Clipper orbits JUPITER, diving in for ~35 km flybys. Low orbit at Europa means radiation dose and risk.' },
    terms: { inj: 'Trans-Jupiter injection', coast: 'Interplanetary cruise', capture: 'Jupiter orbit insertion', captureShort: 'JOI', captureFail: 'flew past Jupiter', arrived: 'Jovian system arrival complete', choose: 'CHOOSE SCIENCE ORBIT', survey: 'BEGIN EUROPA SURVEY' },
    travelTitle: 'How Fast to Jupiter?',
    travelSub: 'Galileo and Europa Clipper both used gravity assists to reach the Jovian system. Rad-hard avionics are the survival kit.',
    modeRefs: {
      fast: 'Direct high-energy cruise (≈4 years, big capture burn)',
      balanced: 'Assist tour (Europa Clipper profile: ≈5.5 years, arrives 2030)',
      efficient: 'Extended assist chain (≈7+ years, cheapest capture)',
    },
    heritage: [
      { name: 'Europa Clipper · arrives 2030', note: 'Nearly 50 flybys at 25-35 km altitude behind a titanium vault.' },
      { name: 'Galileo · 1995-2003', note: 'Discovered the induced magnetic signature of a salty ocean.' },
      { name: 'JUICE (ESA) · arrives 2031', note: 'Will fly Europa twice, then orbit Ganymede.' },
    ],
  },

  titan: {
    id: 'titan', name: 'TITAN', shortName: 'Titan', icon: '♄', tier: 5, scoreMult: 1.75,
    kind: 'Saturn\'s haze world · 7 year cruise',
    pitch: 'Rivers and seas of liquid methane under an orange nitrogen haze. The only other world where it rains. Thick air makes flying easy - and downlinks slow.',
    budget: 165, sciGoal: 1.2,
    flux: 0.011, fluxLabel: '×0.011 (RTG REQUIRED)', delayMin: 76, delayLabel: '67-85 minutes',
    rad: 0, radLabel: 'thick atmosphere shields', thermalMin: 0, grav: '0.14 g', distKm: 1300000000,
    fuelMult: 1.45, tliShare: 0.55, transit: { fast: 2000, balanced: 2500, efficient: 3200 },
    txMult: 1.3, atmo: true,
    objectives: ['composition', 'mapping', 'environment', 'life'],
    sites: ['kraken_mare', 'shangri_la', 'sotra_patera'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'icing', 'rain'],
    event: { name: 'Titan dusk haze dimming', alert: 'The haze thickens as the sun drops…',
      facts: [{ k: 'Surface pressure', v: '1.45× Earth - no pressure suit needed (approx)', tag: 'approx' }, { k: 'Temperature', v: '−179°C', tag: 'nasa' }] },
    orbits: { low: 'Low Titan Orbit', high: 'High Survey Orbit' },
    orbitInsight: { data: 'Surface pressure 1.45 bar and gravity 0.14 g: a human could fly with strap-on wings; a rotorcraft flies easily.',
      effect: 'The atmosphere is a resource: parachutes and rotors work (Dragonfly). Orbit choice trades downlink geometry vs haze detail.' },
    terms: { inj: 'Trans-Saturn injection', coast: 'Interplanetary cruise', capture: 'Saturn orbit insertion', captureShort: 'SOI', captureFail: 'flew past Saturn', arrived: 'Saturn system arrival complete', choose: 'CHOOSE TITAN ORBIT', survey: 'BEGIN TITAN SURVEY' },
    travelTitle: 'How Fast to Saturn?',
    travelSub: 'Cassini\'s VVEJ path (Venus-Venus-Earth-Jupiter assists) took 7 years. Huygens then parachuted to the surface.',
    modeRefs: {
      fast: 'Direct high-energy cruise (≈5.5 years)',
      balanced: 'Cassini VVEJ assist profile (≈7 years)',
      efficient: 'Extended assist chain (≈8.5+ years, cheapest capture)',
    },
    heritage: [
      { name: 'Cassini-Huygens · 2004-2017', note: 'Radar-mapped the methane seas; Huygens landed in 2005.' },
      { name: 'Dragonfly · launches 2028', note: 'A nuclear rotorcraft flying site-to-site on Titan, arrives 2034.' },
      { name: 'Prebiotic chemistry', note: 'Titan\'s atmosphere builds complex organics - a frozen laboratory of early chemistry.' },
    ],
  },

  enceladus: {
    id: 'enceladus', name: 'ENCELADUS', shortName: 'Enceladus', icon: '◌', tier: 6, scoreMult: 1.8,
    kind: 'Saturn\'s plume world · 7+ year cruise',
    pitch: 'The brightest body in the solar system, wrapped in fresh snow - and venting its ocean into space through warm fissures at the south pole. Cassini flew through the plumes and tasted salt and organics.',
    budget: 165, sciGoal: 1.2,
    flux: 0.011, fluxLabel: '×0.011 (RTG REQUIRED)', delayMin: 76, delayLabel: '67-85 minutes',
    rad: 0, radLabel: 'none', thermalMin: 0, grav: '0.011 g', distKm: 1300000000,
    fuelMult: 1.55, tliShare: 0.55, transit: { fast: 2200, balanced: 2700, efficient: 3400 },
    txMult: 1.3,
    objectives: ['water', 'composition', 'environment', 'life'],
    sites: ['baghdad_sulcus', 'damascus_sulcus', 'plume_alt'],
    pool: ['meteoroid', 'leak', 'seu', 'flare', 'ringdust', 'plume'],
    event: { name: 'Saturn eclipse + ring shadow', alert: 'Saturn and its rings are eclipsing the Sun…',
      facts: [{ k: 'Albedo', v: '≈0.99 - freshest snow in the solar system (approx)', tag: 'approx' }, { k: 'Plume speed', v: '~200 m/s escape, feeds Saturn\'s E-ring', tag: 'nasa' }] },
    orbits: { low: 'Low Plume-Crossing Orbit', high: 'High Safe Orbit' },
    orbitInsight: { data: 'E-ring particles - actually Enceladus plume ice - orbit Saturn along Enceladus\'s path.',
      effect: 'Low orbit crosses the plume and the E-ring: higher science, higher particle risk. Sealed systems earn their cost.' },
    terms: { inj: 'Trans-Saturn injection', coast: 'Interplanetary cruise', capture: 'Saturn orbit insertion', captureShort: 'SOI', captureFail: 'flew past Saturn', arrived: 'Saturn system arrival complete', choose: 'CHOOSE ENCELADUS ORBIT', survey: 'BEGIN ENCELADUS SURVEY' },
    travelTitle: 'How Fast to Saturn?',
    travelSub: 'Same long road as Titan - but the treasure is a free sample: an ocean spraying itself into space.',
    modeRefs: {
      fast: 'Direct high-energy cruise (≈6 years)',
      balanced: 'Cassini VVEJ assist profile (≈7 years)',
      efficient: 'Extended assist chain (≈9 years, cheapest capture)',
    },
    heritage: [
      { name: 'Cassini · 2005-2017', note: 'Discovered the plumes in 2005; flew through them 2008-2015 finding H₂O, salts, H₂ and organics.' },
      { name: 'The hydrogen clue', note: 'H₂ in the plume suggests hydrothermal chemistry - food for microbes, no sunlight needed.' },
      { name: 'Orbilander concept', note: 'The follow-up mission NASA scientists ranked top: land, then sniff for life.' },
    ],
  },

  pluto: {
    id: 'pluto', name: 'PLUTO', shortName: 'Pluto', icon: '♇', tier: 7, scoreMult: 1.9,
    kind: 'Kuiper Belt dwarf planet · flyby only',
    pitch: 'A 9.5-year voyage to the edge. New Horizons chose speed over stopping: one 30,000 km/h pass, 21 hours of close science, then 15 months of downlink.',
    budget: 160, sciGoal: 1.2,
    flux: 0.0006, fluxLabel: '×0.0006 (RTG REQUIRED - 1000× dimmer than Earth)', delayMin: 250, delayLabel: '≈4.2 hours one way',
    rad: 1, radLabel: 'cosmic rays only', thermalMin: 0, grav: '0.063 g', distKm: 5200000000,
    fuelMult: 0.6, tliShare: 0.7, transit: { fast: 3000, balanced: 3470, efficient: 5200 },
    txMult: 1.45, flyby: true,
    objectives: ['mapping', 'composition', 'environment'],
    sites: ['sputnik_pass', 'terminator_sweep', 'occultation_track'],
    pool: ['meteoroid', 'leak', 'seu', 'targeting', 'downlink'],
    event: { name: 'Deep-space power audit', alert: 'A decade-old power system far from the Sun must be audited…',
      facts: [{ k: 'Sunlight at Pluto', v: '≈1/900 of Earth noon - dusk-bright', tag: 'derived' }, { k: 'Temperature', v: '≈−229°C', tag: 'nasa' }] },
    orbits: null,
    orbitInsight: null,
    terms: { inj: 'Trans-Pluto injection', coast: 'Cruise to the Kuiper Belt', capture: 'Closest-approach targeting', captureShort: 'TARGETING', captureFail: 'missed the aimpoint', arrived: 'Flyby sequence armed', choose: '', survey: 'BEGIN FLYBY SEQUENCE' },
    travelTitle: 'How Fast to Pluto?',
    travelSub: 'Stopping at Pluto costs almost as much as getting there - so New Horizons flew straight through. Your fuelMult is low; your time is long.',
    modeRefs: {
      fast: 'Direct high-energy cruise (≈8 years)',
      balanced: 'Jupiter gravity assist (New Horizons profile: 2006 → 2015, ≈9.5 years)',
      efficient: 'Slow ballistic cruise (≈14 years)',
    },
    heritage: [
      { name: 'New Horizons · 2015', note: 'The fastest launch ever, a Jupiter assist, and the first close-up of Pluto.' },
      { name: 'Sputnik Planitia', note: 'Nitrogen-ice glaciers that convect and flow - geology 5 billion km out.' },
      { name: 'Arrokoth · 2019', note: 'Extended mission: the most distant object ever explored.' },
    ],
  },
});

const destOf = () => DESTS[M.dest] || DESTS.moon;
const DEST_ORDER = ['moon', 'mars', 'venus', 'mercury', 'ceres', 'psyche', 'europa', 'titan', 'enceladus', 'pluto'];
// Canvas disc style key per destination (planetDisc falls back to Mercury gray).
const DEST_DISC = { moon: null, mars: 'Mars', venus: 'Venus', mercury: 'Mercury', ceres: 'Mercury', psyche: 'Mercury', europa: 'Jupiter', titan: 'Saturn', enceladus: 'Saturn', pluto: 'Mercury' };
// Stylised world position for the destination-picking scene (AU-based, ecliptic plane).
function destPos(d, days) {
  const parentOf = { europa: 'Jupiter', titan: 'Saturn', enceladus: 'Saturn', pluto: 'Neptune', ceres: null, psyche: null };
  const au = { moon: 0.0026, mars: 1.52, venus: 0.72, mercury: 0.39, ceres: 2.77, psyche: 3.0, europa: 5.2, titan: 9.5, enceladus: 9.55, pluto: 39.5 };
  const parent = d.id === 'moon' ? 'Earth' : parentOf[d.id];
  if (parent && Astro.planetPos) {
    const pp = Astro.planetPos(parent, days);
    if (pp) {
      if (parent === 'Earth') return { x: pp.x + 0.06, y: pp.y + 0.03 };
      const a = Math.atan2(pp.y, pp.x);
      const r = Math.max(0.3, Math.hypot(pp.x, pp.y));
      if (['europa', 'titan', 'enceladus'].includes(d.id)) return { x: pp.x + Math.cos(a + 1.2) * Math.max(0.5, r * 0.035), y: pp.y + Math.sin(a + 1.2) * Math.max(0.35, r * 0.025) };
      return pp;
    }
  }
  if (parent === 'Earth') return null;
  const a = au[d.id] != null ? au[d.id] * 2.4 : 6;   // fixed pseudo-angle per world
  return { x: Math.cos(a) * au[d.id], y: Math.sin(a) * au[d.id] * 0.98 };
}
// ---------------------------------------------------------------- destination sites
// Same field shape as the lunar SITES registry (state.js); merged into SITES so
// site(), instrBonus() and every existing helper keep working untouched.
// facts[] are plain rows with confidence tags - used where no CSV dataset exists.
const DEST_SITES = {
  // ---- MARS
  jezero: {
    id: 'jezero', lat: 18.44, lon: 77.45, name: 'Jezero Crater', short: 'JEZERO', site: 'Western delta, Jezero crater',
    kind: 'Ancient river delta · biosignature hunt',
    pitch: 'Perseverance landed here in 2021: a 3.5-billion-year-old river delta where sediment layers may preserve signs of ancient microbial life.',
    sci: 1.15, obj: { life: 1.25, water: 1.15, composition: 1.1, mapping: 1.0, environment: 0.9 },
    bonus: { spectrometer: 10, ice: 4, camera: 4 },
    drain: 0.9, tx: 1.0, txRisk: 0, fuel: 2, dust: 1.5, quake: 0.3,
    gain: 'Delta sediments: life ×1.25, Spectrometer +10', loss: 'Dusty air: dust threat moderate · −2% fuel',
    facts: [{ k: 'Delta age', v: '≈3.5 billion years', tag: 'approx' }, { k: 'Sample cache', v: 'Perseverance is caching tubes for return', tag: 'nasa' }],
  },
  gale: {
    id: 'gale', lat: -5.4, lon: 137.8, name: 'Gale Crater', short: 'GALE', site: 'Mount Sharp foothills (Curiosity)',
    kind: 'Layered mountain · habitability record',
    pitch: 'Curiosity has been climbing Mount Sharp since 2012, reading a billion years of lakebed layers that record when Mars turned dry.',
    sci: 1.0, obj: { composition: 1.2, environment: 1.1, life: 1.0, mapping: 1.0, water: 0.85 },
    bonus: { spectrometer: 8, atmos: 8 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 0, dust: 1.3, quake: 0.3,
    gain: 'Layered chemistry ×1.2: Spectrometer +8, Atmos suite +8', loss: 'Already Curiosity\'s home: novelty ×0.85 for water science',
    facts: [{ k: 'Curiosity drive', v: '30+ km climbed since 2012', tag: 'nasa' }, { k: 'Key find', v: 'ancient habitable lakebed chemistry', tag: 'nasa' }],
  },
  utopia: {
    id: 'utopia', lat: 25.1, lon: 109.9, name: 'Utopia Planitia', short: 'UTOPIA', site: 'Northern ice-rich plains',
    kind: 'Vast northern lowland · ground ice',
    pitch: 'Radar sees a huge reservoir of buried water ice under the flat northern plains - the target for ISRU pilots and the Zhurong rover\'s playground.',
    sci: 1.05, obj: { water: 1.2, mapping: 1.1, environment: 1.0, composition: 0.95, life: 0.9 },
    bonus: { ice: 10, camera: 4 },
    drain: 0.95, tx: 1.0, txRisk: 0, fuel: 1, dust: 1.2, quake: 0.2,
    gain: 'Buried ice ×1.2: Ice Probe +10', loss: 'Flat monotone terrain: composition ×0.95',
    facts: [{ k: 'Ground ice depth', v: 'a few cm to metres below the surface (approx)', tag: 'approx' }, { k: 'Zhurong', v: 'China rover explored here 2021-22', tag: 'nasa' }],
  },
  south_cap: {
    id: 'south_cap', lat: -87, lon: 0, name: 'South Polar Cap', short: 'SOUTH CAP', site: 'Residual water-ice cap',
    kind: 'Polar ice · CO₂ + water stratigraphy',
    pitch: 'Layered ice a kilometre thick: CO₂ frost over water ice, with escarpments that expose the climate record.',
    sci: 1.1, obj: { water: 1.25, environment: 1.05, mapping: 1.0, composition: 1.05, life: 0.8 },
    bonus: { ice: 10, atmos: 6 },
    drain: 1.1, tx: 1.1, txRisk: 4, fuel: 3, dust: 0.7, quake: 0.2,
    gain: 'Water ice ×1.25: Ice Probe +10, Atmos +6', loss: 'Polar geometry: downlink +10% power & +4 risk, −3% fuel',
    facts: [{ k: 'Cap thickness', v: 'up to ≈3 km of stacked ice', tag: 'nasa' }, { k: 'CO₂ ice', v: 'seasonal frost sublimates each summer', tag: 'nasa' }], iceSite: true,
  },

  // ---- VENUS
  cloud_deck: {
    id: 'cloud_deck', lat: 2, lon: 180, name: 'Cloud Deck · 55 km', short: 'CLOUD DECK', site: 'Temperate band of the cloud layer',
    kind: 'Aerostat platform · habitable band',
    pitch: 'At 55 km the pressure is Earth-like and the air - though acid - carries mysterious particles some scientists have dared to call possible biosignatures.',
    sci: 1.15, obj: { composition: 1.2, environment: 1.15, mapping: 0.9, life: 1.0, water: 0.8 },
    bonus: { atmos: 12, spectrometer: 6 },
    drain: 1.0, tx: 0.9, txRisk: 0, fuel: 2, dust: 0.4, quake: 0,
    gain: 'Atmos suite +12, composition ×1.2 in the cloud band', loss: 'Acid aerosols everywhere: corrosion threat HIGH',
    facts: [{ k: 'Pressure at 55 km', v: '≈1 bar (Earth-like)', tag: 'nasa' }, { k: 'Temperature', v: '≈30-70°C in the band (approx)', tag: 'approx' }],
  },
  sapas_mons: {
    id: 'sapas_mons', lat: 8.5, lon: 188, name: 'Sapas Mons', short: 'SAPAS MONS', site: 'Atla Regio volcanic rise',
    kind: 'Shield volcano · possible active vents',
    pitch: 'Radar-bright flows and a 400 km-wide shield: Venus Express saw thermal anomalies that hint volcanism is still alive here.',
    sci: 1.05, obj: { composition: 1.15, mapping: 1.1, environment: 1.0, life: 0.8, water: 0.8 },
    bonus: { spectrometer: 8, camera: 6 },
    drain: 1.05, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.5, quake: 0.7,
    gain: 'Fresh basalt chemistry ×1.15 · Spectrometer +8', loss: 'Terra inferno: surface soak threat CRITICAL, −2% fuel',
    facts: [{ k: 'Surface temperature', v: '≈465°C (lead melts at 327°C)', tag: 'nasa' }, { k: 'Possible activity', v: 'thermal anomalies seen 2014-15 (approx)', tag: 'approx' }],
  },
  maxwell_montes: {
    id: 'maxwell_montes', lat: 65.2, lon: 3.3, name: 'Maxwell Montes', short: 'MAXWELL', site: 'Ishtar Terra highlands',
    kind: 'Highest peaks · 11 km above the plains',
    pitch: 'The tallest range on Venus - high enough that radar shows a possible metallic frost glittering on the summit rock.',
    sci: 1.1, obj: { mapping: 1.2, environment: 1.05, composition: 1.05, life: 0.8, water: 0.8 },
    bonus: { camera: 10, spectrometer: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 3, dust: 0.4, quake: 0.5,
    gain: 'Radar imaging ×1.2: Camera +10', loss: 'Steep terrain: −3% fuel for approach',
    facts: [{ k: 'Height', v: '≈11 km above mean radius (vs Everest 8.8 km)', tag: 'nasa' }, { k: 'Metal frost', v: 'conductive minerals may plate the peaks (hypothesis)', tag: 'estimate' }],
  },

  // ---- MERCURY
  borealis_pole: {
    id: 'borealis_pole', lat: 88, lon: 0, name: 'Borealis Pole Craters', short: 'NORTH POLE', site: 'Permanently shadowed polar craters',
    kind: 'Polar ice · never-sunlit crater floors',
    pitch: 'On the planet closest to the Sun, MESSENGER found water ice hiding in craters that never see daylight - including one crater floor preserved for billions of years.',
    sci: 1.15, obj: { water: 1.25, environment: 1.0, mapping: 1.0, composition: 1.0, life: 0.8 },
    bonus: { ice: 12, spectrometer: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.6, quake: 0.3,
    gain: 'Polar ice ×1.25: Ice Probe +12', loss: 'Shadowed thermal regime: cycling threat moderate',
    facts: [{ k: 'Polar ice', v: 'confirmed by MESSENGER neutron data (2012)', tag: 'nasa' }, { k: 'Irony', v: 'the hottest planet hosts water ice', tag: 'nasa' }], iceSite: true,
  },
  caloris: {
    id: 'caloris', lat: 30, lon: 190, name: 'Caloris Basin', short: 'CALORIS', site: '1,550 km impact basin',
    kind: 'Giant impact basin · volcanic fill',
    pitch: 'A planet-wide shockwave focused on the far side when this basin formed. Its floor flooded with lava - Mercury\'s geology in one cross-section.',
    sci: 1.05, obj: { composition: 1.15, mapping: 1.15, environment: 0.95, water: 0.85, life: 0.8 },
    bonus: { spectrometer: 8, camera: 8 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.8, quake: 0.5,
    gain: 'Basin stratigraphy ×1.15: Spectrometer +8, Camera +8', loss: 'Hot equatorial plain: cycling threat HIGH',
    facts: [{ k: 'Basin diameter', v: '≈1,550 km', tag: 'nasa' }, { k: 'Weird terrain', v: 'antipodal shattered hills mapped by Mariner 10', tag: 'nasa' }],
  },
  hokusai: {
    id: 'hokusai', lat: 57.8, lon: 226.6, name: 'Hokusai Crater', short: 'HOKUSAI', site: 'Bright-rayed young crater',
    kind: 'Fresh rayed crater · young regolith',
    pitch: 'Hokusai\'s rays stretch across the whole northern hemisphere - the freshest exposed chemistry Mercury has to offer.',
    sci: 1.08, obj: { composition: 1.2, mapping: 1.05, environment: 0.95, water: 0.85, life: 0.8 },
    bonus: { spectrometer: 10, camera: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.7, quake: 0.4,
    gain: 'Fresh ejecta chemistry ×1.2: Spectrometer +10', loss: 'Terminator heat contrast: cycling threat moderate · −2% fuel',
    facts: [{ k: 'Ray length', v: 'rays span most of the hemisphere', tag: 'nasa' }, { k: 'BepiColombo', v: 'orbiter arriving 2026 will re-map these rays', tag: 'nasa' }],
  },

  // ---- CERES
  occator: {
    id: 'occator', lat: 19.8, lon: 239.3, name: 'Occator Crater', short: 'OCCATOR', site: 'Cerealia Facula bright dome',
    kind: 'Salt deposits · brine reservoir',
    pitch: 'Dawn found the famous bright spots: sodium carbonate left by briny water rising from a deep reservoir - cryovolcanism in slow motion.',
    sci: 1.15, obj: { water: 1.2, composition: 1.15, life: 1.05, mapping: 1.0, environment: 0.95 },
    bonus: { ice: 8, spectrometer: 8 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.5, quake: 0.2,
    gain: 'Brine chemistry ×1.15: Ice Probe +8, Spectrometer +8', loss: 'Microgravity anchoring required everywhere',
    facts: [{ k: 'Bright spots', v: 'sodium carbonate salt crust', tag: 'nasa' }, { k: 'Brine source', v: 'deep reservoir persists to this day (estimate)', tag: 'estimate' }],
  },
  ahuna_mons: {
    id: 'ahuna_mons', lat: -10.5, lon: 316.4, name: 'Ahuna Mons', short: 'AHUNA MONS', site: 'Lonely cryovolcano',
    kind: 'Cryovolcanic dome · young ice mountain',
    pitch: 'A 4 km mountain of viscous ice that erupted from the interior - the only true volcano between Mars and Jupiter.',
    sci: 1.1, obj: { environment: 1.15, water: 1.1, composition: 1.1, mapping: 1.0, life: 0.95 },
    bonus: { ice: 6, radiation: 8, camera: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.4, quake: 0.4,
    gain: 'Cryovolcanism study ×1.15: Radiation Sensor +8', loss: 'Steep dome in 0.029 g: anchoring threat HIGH, −2% fuel',
    facts: [{ k: 'Height', v: '≈4 km above the plains', tag: 'nasa' }, { k: 'Age', v: 'geologically young (≤ tens of Myr)', tag: 'estimate' }],
  },
  ernutet: {
    id: 'ernutet', lat: 32.4, lon: 236.9, name: 'Ernutet Crater', short: 'ERNUTET', site: 'Organic-rich crater rim',
    kind: 'Organic chemistry · aliphatic signatures',
    pitch: 'Dawn\'s spectrometer found aliphatic organics distributed around Ernutet - chemistry that matters to anyone hunting prebiotic stories.',
    sci: 1.12, obj: { life: 1.2, composition: 1.15, water: 1.0, mapping: 1.0, environment: 0.9 },
    bonus: { spectrometer: 10, ice: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.4, quake: 0.2,
    gain: 'Organics hunt ×1.2: Spectrometer +10', loss: 'Subtle signatures: cameras contribute little here',
    facts: [{ k: 'Organics', v: 'aliphatic compounds mapped 2017', tag: 'nasa' }, { k: 'Significance', v: 'not biomarkers - but prebiotic feedstock', tag: 'nasa' }],
  },

  // ---- PSYCHE (target zones use the mission-design naming of the Psyche mission)
  metal_highlands: {
    id: 'metal_highlands', lat: 0, lon: 90, name: 'Central Metal Plains', short: 'METAL PLAINS', site: 'High-albedo central zone',
    kind: 'Metal-rich terrain · spectrometer core target',
    pitch: 'The brightest, most metal-rich terrain on Psyche - if this is an exposed core, these readings are the direct test.',
    sci: 1.15, obj: { composition: 1.25, mapping: 1.05, environment: 0.95, life: 0.8, water: 0.8 },
    bonus: { spectrometer: 12, camera: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 0, dust: 0.3, quake: 0.1,
    gain: 'Metal chemistry ×1.25: Spectrometer +12', loss: 'Anchoring on bare metal: harpoons mandatory (game model)',
    facts: [{ k: 'Composition', v: 'metal-rich (iron-nickel + silicate mix, estimate)', tag: 'estimate' }, { k: 'Gravity', v: '≈0.012 g - a hop lasts minutes (est.)', tag: 'estimate' }],
  },
  crater_field: {
    id: 'crater_field', lat: -25, lon: 180, name: 'Iron Crater Field', short: 'CRATER FIELD', site: 'Large-crater cluster',
    kind: 'Impact scars · stratigraphy of a core',
    pitch: 'Craters in metal behave nothing like craters in rock - flow-like floor deposits here hint at how a shattered core refroze.',
    sci: 1.05, obj: { mapping: 1.2, composition: 1.1, environment: 1.0, life: 0.8, water: 0.8 },
    bonus: { camera: 12, spectrometer: 6 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.3, quake: 0.2,
    gain: 'Impact stratigraphy ×1.2: Camera +12', loss: 'Loose metal regolith: tumbling threat moderate',
    facts: [{ k: 'Terrain', v: 'metal craters with flow-like floors (approx)', tag: 'approx' }],
  },
  fracture_belt: {
    id: 'fracture_belt', lat: 15, lon: 270, name: 'Deep Fracture Belt', short: 'FRACTURES', site: 'Grooved ridge system',
    kind: 'Tectonic grooves · frozen core dynamics',
    pitch: 'Ridges and grooves record the shrinking, freezing of a cooling core - an environment field no orbit has ever visited.',
    sci: 1.1, obj: { environment: 1.2, mapping: 1.1, composition: 1.05, life: 0.8, water: 0.8 },
    bonus: { radiation: 6, camera: 6, spectrometer: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.3, quake: 0.3,
    gain: 'Core-freeze record ×1.2: Radiation Sensor +6, Camera +6', loss: 'Shadow geometry swings: −1% fuel',
    facts: [{ k: 'Mission orbits', v: 'Psyche plans 4 orbits, each closer (A-D)', tag: 'nasa' }],
  },

  // ---- EUROPA
  conamara_chaos: {
    id: 'conamara_chaos', lat: 9.7, lon: 86, name: 'Conamara Chaos', short: 'CONAMARA', site: 'Disrupted ice blocks and melt lens',
    kind: 'Chaos terrain · ice-ocean exchange',
    pitch: 'Icebergs frozen mid-capsized: at Conamara the shell visibly broke, drifted and refroze - the clearest window on ocean exchange.',
    sci: 1.12, obj: { water: 1.2, composition: 1.1, environment: 1.05, life: 1.0, mapping: 1.0 },
    bonus: { ice: 10, spectrometer: 6 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.3, quake: 0.8,
    gain: 'Ice-ocean exchange ×1.2: Ice Probe +10', loss: 'Radiation zone: SEU threat HIGH · −2% fuel',
    facts: [{ k: 'Ice shell', v: '15-25 km thick over a 60-150 km ocean (approx)', tag: 'approx' }, { k: 'Radiation', v: '≈5.4 Sv/day near Europa (approx)', tag: 'approx' }],
  },
  tara_regio: {
    id: 'tara_regio', lat: -37, lon: 177, name: 'Tara Regio', short: 'TARA REGIO', site: 'Plume-candidate chaos zone',
    kind: 'Warm chaos · possible active plumes',
    pitch: 'Hubble saw absorptions above Tara Regio twice - suspected water plumes venting ocean onto the surface, exactly where Clipper will look.',
    sci: 1.15, obj: { life: 1.25, water: 1.2, composition: 1.1, mapping: 0.95, environment: 0.95 },
    bonus: { ice: 8, spectrometer: 10, atmos: 6 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.3, quake: 0.9,
    gain: 'Biosignature hunt ×1.25: Spectrometer +10, Ice +8', loss: 'Plume timing is luck: quake threat CRITICAL',
    facts: [{ k: 'Plume evidence', v: 'H2O absorptions seen twice at Tara (2014, 2016)', tag: 'nasa' }, { k: 'Salt', v: 'coloration suggests ocean salts reach the surface', tag: 'nasa' }], iceSite: true,
  },
  tyre: {
    id: 'tyre', lat: 33.6, lon: 213.5, name: 'Tyre Impact', short: 'TYRE', site: 'Multi-ring impact structure',
    kind: 'Large impact · shell stratigraphy',
    pitch: 'A 140 km multi-ring scar where the impactor punched toward the ocean and the shell answered with concentric fractures.',
    sci: 1.05, obj: { mapping: 1.2, composition: 1.05, environment: 1.0, water: 1.0, life: 0.9 },
    bonus: { camera: 12, radiation: 6 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.3, quake: 0.7,
    gain: 'Shell stratigraphy ×1.2: Camera +12', loss: 'Radiation zone: SEU threat HIGH',
    facts: [{ k: 'Structure', v: '≈140 km multi-ring basin', tag: 'nasa' }, { k: 'Clipper plan', v: 'flybys image at 25-35 km altitude', tag: 'nasa' }],
  },

  // ---- TITAN
  kraken_mare: {
    id: 'kraken_mare', lat: 68, lon: 50, name: 'Kraken Mare', short: 'KRAKEN MARE', site: 'Largest methane sea',
    kind: 'Hydrocarbon sea · 400,000 km²',
    pitch: 'Bigger than the Caspian Sea - liquid methane and ethane with dissolved nitrogen, rimmed by channels that monsoon rains carved.',
    sci: 1.15, obj: { composition: 1.25, environment: 1.1, mapping: 1.05, life: 1.0, water: 0.8 },
    bonus: { atmos: 10, spectrometer: 8 },
    drain: 0.95, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.2, quake: 0.2,
    gain: 'Sea chemistry ×1.25: Atmos +10, Spectrometer +8', loss: 'Haze dims imaging: fog threat moderate',
    facts: [{ k: 'Depth', v: '≥300 m measured by Cassini radar sounder (approx)', tag: 'approx' }, { k: 'Waves', v: 'Cassini saw only tiny ripples - calm seas', tag: 'nasa' }],
  },
  shangri_la: {
    id: 'shangri_la', lat: -10, lon: 175, name: 'Shangri-La', short: 'SHANGRI-LA', site: 'Dark dune fields (Huygens nearby)',
    kind: 'Organic dunes · descent heritage',
    pitch: 'Huygens parachuted onto this region in 2005 and found rounded pebbles - rivers did the work. The dunes are organic sand from the atmosphere.',
    sci: 1.0, obj: { composition: 1.15, mapping: 1.1, life: 1.05, environment: 1.0, water: 0.8 },
    bonus: { spectrometer: 6, camera: 8 },
    drain: 0.95, tx: 1.0, txRisk: 0, fuel: 0, dust: 0.3, quake: 0.1,
    gain: 'Dune organics ×1.15: Camera +8', loss: 'Huygens already sampled nearby: novelty ×0.9 for environment',
    facts: [{ k: 'Huygens landing', v: '14 Jan 2005 - first and only Titan landing', tag: 'nasa' }, { k: 'Dune sand', v: 'organic grains from atmospheric photochemistry', tag: 'nasa' }],
  },
  sotra_patera: {
    id: 'sotra_patera', lat: -15, lon: 169, name: 'Sotra Patera', short: 'SOTRA', site: 'Cryovolcano candidate + flow field',
    kind: 'Possible cryovolcano · 1 km deep pit',
    pitch: 'A deep pit with flows and a summit collapse - the best candidate for an active cryovolcano, and Dragonfly\'s far-horizon science.',
    sci: 1.1, obj: { environment: 1.2, life: 1.1, composition: 1.05, mapping: 1.05, water: 0.9 },
    bonus: { radiation: 6, atmos: 6, ice: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.2, quake: 0.5,
    gain: 'Interior process hunt ×1.2: Radiation +6, Atmos +6', loss: 'Rugged approach: −2% fuel',
    facts: [{ k: 'Pit depth', v: '≈1 km, with ≈1,000 m relief', tag: 'approx' }, { k: 'Dragonfly', v: 'rotorcraft will hop 8+ km flights site to site', tag: 'nasa' }],
  },

  // ---- ENCELADUS
  baghdad_sulcus: {
    id: 'baghdad_sulcus', lat: -80, lon: 30, name: 'Baghdad Sulcus', short: 'BAGHDAD SULCUS', site: 'Tiger-stripe warm fissure',
    kind: 'Active vent fissure · warmest stripe',
    pitch: 'One of four great fissures that vent the ocean. Cassini\'s CDA dust analyser flew through these jets - salt, silica and H₂ came back.',
    sci: 1.2, obj: { life: 1.25, water: 1.2, composition: 1.15, environment: 1.0, mapping: 0.9 },
    bonus: { ice: 10, spectrometer: 10 },
    drain: 1.05, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.4, quake: 0.6,
    gain: 'Direct ocean sampling ×1.25: Ice +10, Spectrometer +10', loss: 'Active venting: plume backfire threat HIGH',
    facts: [{ k: 'Vent temperature', v: 'warmest measured spot on Enceladus', tag: 'nasa' }, { k: 'Cassini pass', v: 'flew 25 km above the plume in 2015', tag: 'nasa' }], iceSite: true,
  },
  damascus_sulcus: {
    id: 'damascus_sulcus', lat: -80, lon: 100, name: 'Damascus Sulcus', short: 'DAMASCUS SULCUS', site: 'Tiger-stripe fissure (secondary)',
    kind: 'Vent fissure · comparative chemistry',
    pitch: 'The other great fissure: comparing its jet chemistry with Baghdad\'s tells whether the ocean is uniform or compartmentalised.',
    sci: 1.12, obj: { water: 1.15, composition: 1.2, life: 1.15, environment: 1.0, mapping: 0.95 },
    bonus: { spectrometer: 12, ice: 6 },
    drain: 1.05, tx: 1.0, txRisk: 0, fuel: 2, dust: 0.4, quake: 0.6,
    gain: 'Comparative chemistry ×1.2: Spectrometer +12', loss: 'E-ring particle flux: dust threat moderate',
    facts: [{ k: 'Jets', v: 'multiple active jets imaged by Cassini ISS', tag: 'nasa' }],
  },
  plume_alt: {
    id: 'plume_alt', lat: -85, lon: 60, name: 'Plume Corridor · 50 km', short: 'PLUME CORRIDOR', site: 'In-plume fly-through track at 50 km altitude',
    kind: 'In-situ plume sampling track',
    pitch: 'The corridor Cassini flew: 50 km above the south pole, inside the plume itself, where the ocean sprays directly onto your instruments.',
    sci: 1.25, obj: { life: 1.3, composition: 1.2, water: 1.25, environment: 1.0, mapping: 0.8 },
    bonus: { ice: 12, spectrometer: 12, atmos: 8 },
    drain: 1.1, tx: 1.1, txRisk: 4, fuel: 3, dust: 0.6, quake: 0.3,
    gain: 'Purest plume sample: life ×1.3, Ice +12, Spectrometer +12', loss: 'Particle flux + downlink geometry: +4 tx risk, −3% fuel',
    facts: [{ k: 'Cassini fly-through', v: 'CDA + INMS sampled grains and gas in situ', tag: 'nasa' }, { k: 'H₂ found', v: 'hydrothermal source chemistry (2017 result)', tag: 'nasa' }], iceSite: true,
  },

  // ---- PLUTO (flyby targeting zones - one pass, no orbit)
  sputnik_pass: {
    id: 'sputnik_pass', lat: 20, lon: 180, name: 'Sputnik Planitia Pass', short: 'SPUTNIK PASS', site: 'Closest-approach track over the nitrogen ice sheet',
    kind: 'Flyby core target · 12,500 km closest approach',
    pitch: 'New Horizons\' aimpoint: nitrogen-ice glaciers convecting like a lava lamp, mountain ranges of frozen water floating on them.',
    sci: 1.2, obj: { composition: 1.2, mapping: 1.2, environment: 1.0, life: 0.8, water: 1.0 },
    bonus: { camera: 12, spectrometer: 6 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.1, quake: 0.1,
    gain: 'Core flyby target: Camera +12, composition ×1.2', loss: 'One pass, 21 hours of close science - targeting must be perfect',
    facts: [{ k: 'Ice sheet', v: '≈1,000 km N₂ ice basin, actively convecting', tag: 'nasa' }, { k: 'Mountains', v: 'water-ice peaks up to ≈4 km', tag: 'nasa' }],
  },
  terminator_sweep: {
    id: 'terminator_sweep', lat: 0, lon: 0, name: 'Terminator Sweep', short: 'TERMINATOR', site: 'Day-night line imaging track',
    kind: 'Flyby imaging · long-shadow relief',
    pitch: 'Shooting across the terminator turns flat ice into topographic maps - New Horizons\' best relief came from grazing light.',
    sci: 1.1, obj: { mapping: 1.25, composition: 1.0, environment: 1.0, water: 0.9, life: 0.8 },
    bonus: { camera: 14, radiation: 4 },
    drain: 1.0, tx: 1.0, txRisk: 0, fuel: 1, dust: 0.1, quake: 0.1,
    gain: 'Relief imaging ×1.25: Camera +14', loss: 'Dim light at 39 AU: exposure times long',
    facts: [{ k: 'Sunlight', v: '≈1/900 of Earth noon - like 30 min after sunset', tag: 'derived' }],
  },
  occultation_track: {
    id: 'occultation_track', lat: -45, lon: 90, name: 'Occultation Track', short: 'OCCULTATION', site: 'Radio occultation + atmosphere sweep',
    kind: 'Flyby atmosphere science · UV + radio',
    pitch: 'As Pluto eclipses the probe\'s radio link, the signal bends through its thin N₂ atmosphere - ALICE\'s UV scan found it escaping, New Horizons measured it.',
    sci: 1.12, obj: { environment: 1.25, composition: 1.1, mapping: 1.0, water: 0.85, life: 0.8 },
    bonus: { atmos: 12, radiation: 6 },
    drain: 1.0, tx: 1.15, txRisk: 4, fuel: 1, dust: 0.1, quake: 0.1,
    gain: 'Atmosphere escape ×1.25: Atmos +12', loss: 'Link geometry: downlink +15% power, +4 risk',
    facts: [{ k: 'Atmosphere', v: 'N₂ + CH₄ + CO, ≈10 μbar surface, escaping to space', tag: 'nasa' }, { k: 'Haze', v: 'blue haze layers imaged against the Sun', tag: 'nasa' }],
  },
};

// Merge destination sites into the global registry (lunar sites stay untouched).
Object.assign(SITES, DEST_SITES);
// ---------------------------------------------------------------- destination hazards
// Same shape as the lunar HAZARDS (state.js). `nasaNote` replaces the dataset
// lookup when no CSV row exists for this world - the hazard panel renders it as
// a plain labelled note instead of an insight row.
const DEST_HAZARDS = {
  conjunction: {
    id: 'conjunction', name: 'Solar Conjunction Blackout', icon: '☉', slots: [2],
    brief: 'The Sun is sliding between Earth and the spacecraft. Radio links degrade for weeks - the classic mission pause.',
    nasaNote: 'Near solar conjunction, Mars missions pause surface operations for about two weeks - Mars Odyssey, Curiosity and Perseverance all do this every ~26 months.',
    kitRef: 'DATASYS.large',
    options: () => [
      { id: 'pause', name: 'Pause operations until the link clears', desc: 'Store nothing new; wait out the blackout window.', fx: { science: -10 } },
      { id: 'blind', name: 'Keep observing on autonomous schedule', desc: 'Pre-loaded command sequence runs without ground input.', chance: 0.5, fx: {}, bad: { science: -16, risk: +8 } },
    ],
    kit: { id: 'kit', name: 'Buffer through the blackout', desc: 'Your large recorder holds everything until the link reopens.', fx: { science: -4 } },
  },
  radburst: {
    id: 'radburst', name: 'Radiation Belt Peak', icon: '☢', slots: [1, 2],
    brief: 'Jupiter\'s magnetosphere concentrates a burst of energetic particles along your orbit - the worst environment in the solar system.',
    nasaNote: 'Europa Clipper carries a titanium vault because electronics near Jupiter would otherwise fail within months of unprotected exposure.',
    kitRef: 'NAVS.radhard',
    options: slot => [
      { id: 'shelter', name: 'Power down behind the ice/structure', desc: 'Use the hull and local ice as shielding.', fx: slot === 2 ? { power: -10, science: -6 } : { power: -10 } },
      { id: 'push', name: 'Keep operating through the peak', desc: 'Electronics take the full dose.', fx: { risk: +18 } },
    ],
    kit: { id: 'kit', name: 'Let the rad-hard vault absorb it', desc: 'Error-correcting, shielded avionics ride it out.', fx: { power: -2 } },
  },
  plume: {
    id: 'plume', name: 'Plume Fly-through Window', icon: '✳', slots: [2],
    brief: 'Sensors confirm an active venting plume on your track - a free direct sample of an alien ocean, if you dare fly through it.',
    nasaNote: 'Cassini flew through Enceladus\'s plume several times; the grains it collected revealed salts, silica and molecular hydrogen - hydrothermal chemistry.',
    kitRef: null,
    options: () => [
      { id: 'through', name: 'Fly through the plume core', desc: 'Maximum sample density; particle flux stresses the spacecraft.', fx: { science: +12, risk: +10 } },
      { id: 'edge', name: 'Skim the plume edge', desc: 'Safer geometry, thinner sample.', fx: { science: -6 } },
    ],
    kit: null,
  },
  ringdust: {
    id: 'ringdust', name: 'E-Ring Particle Flux', icon: '◌', slots: [1, 2],
    brief: 'Enceladus\'s own plume ice, orbiting Saturn as the E-ring, is sandblasting the spacecraft.',
    nasaNote: 'The E-ring is made almost entirely of Enceladus plume particles - Cassini mapped it from inside.',
    kitRef: 'DATASYS.sealed',
    options: () => [
      { id: 'recal', name: 'Recalibrate and heat-cycle panels', desc: 'Restore data quality at a power cost.', fx: { power: -12 } },
      { id: 'accept', name: 'Accept degraded data', desc: 'Contaminated readings are thrown away.', fx: { science: -14 } },
      { id: 'spin', name: 'Spin up to shed particles', desc: 'Uses propellant and stresses the structure.', fx: { fuel: -8, risk: +5 } },
    ],
    kit: { id: 'kit', name: 'Close covers and shield optics', desc: 'Your sealed recorder kit keeps optics clean.', fx: { power: -2 } },
  },
  icing: {
    id: 'icing', name: 'Methane Icing on Systems', icon: '❆', slots: [2],
    brief: 'At −179°C, moisture and condensates freeze onto radiators and moving parts - Dragonfly\'s rotor blades are designed against exactly this.',
    nasaNote: 'Titan\'s surface temperature is a steady −179°C; methane can rain or condense while nitrogen fog rolls through.',
    kitRef: 'THERMALS.radiator',
    options: () => [
      { id: 'heatcycle', name: 'Run active heat cycles', desc: 'Warm the affected systems periodically.', fx: { power: -12 } },
      { id: 'wait', name: 'Wait out the condensation', desc: 'Lose observing time; nothing freezes.', fx: { science: -8 } },
      { id: 'push', name: 'Keep the mechanism moving', desc: 'Icing risk is a gamble.', chance: 0.5, fx: {}, bad: { power: -16, risk: +8 } },
    ],
    kit: { id: 'kit', name: 'Rely on the active thermal loop', desc: 'Your radiator system keeps critical surfaces above the frost point.', fx: { power: -3 } },
  },
  rain: {
    id: 'rain', name: 'Methane Rain Squall', icon: '🌧', slots: [2],
    brief: 'A methane squall rolls over the target - liquid hydrocarbon on optics and radiators.',
    nasaNote: 'Cassini observed bright transient features in Titan\'s low latitudes - likely methane rainstorms, matching the river networks Huygens saw.',
    kitRef: 'DATASYS.sealed',
    options: () => [
      { id: 'shelter', name: 'Shelter the instruments', desc: 'Pause observing until the squall passes.', fx: { science: -10 } },
      { id: 'through', name: 'Observe through the rain', desc: 'Storms are science too - if the optics survive.', chance: 0.5, fx: {}, bad: { power: -14, risk: +6 } },
    ],
    kit: { id: 'kit', name: 'Sealed optics shrug it off', desc: 'Covered optics and panels keep working.', fx: { science: -3 } },
  },
  acid: {
    id: 'acid', name: 'Sulfuric Acid Aerosols', icon: '☣', slots: [1, 2],
    brief: 'Venus\'s cloud decks are concentrated sulfuric acid - every surface facing the sky is being etched.',
    nasaNote: 'Venus\'s clouds are 75-95% sulfuric acid droplets; Soviet Venera landers recorded corrosive attack on exposed sensors.',
    kitRef: 'THERMALS.armor',
    options: () => [
      { id: 'ascend', name: 'Climb above the cloud deck', desc: 'Thinner sample, survivable chemistry.', fx: { fuel: -8 } },
      { id: 'seal', name: 'Seal up and endure the pass', desc: 'Coatings take the damage.', chance: 0.5, fx: {}, bad: { power: -16 } },
    ],
    kit: { id: 'kit', name: 'Hardened armor shrugs off acid', desc: 'Whipple-hardened coatings keep optics and panels clean.', fx: { power: -2 } },
  },
  soak: {
    id: 'soak', name: 'Thermal Soak 465°C', icon: '♨', slots: [2],
    brief: 'Surface heat is soaking into everything: electronics rated for Earth-orbit are inside an oven that melts solder at the seams.',
    nasaNote: 'Venera 13 survived 127 minutes before its battery and systems gave out - the longest any spacecraft has lasted on Venus\'s surface.',
    kitRef: 'THERMALS.armor',
    options: () => [
      { id: 'powerdown', name: 'Shut down non-essentials', desc: 'Cut internal heat generation; lose observing time.', fx: { science: -12 } },
      { id: 'cooling', name: 'Run active cooling hard', desc: 'Phase-change heat sinks take the load.', fx: { power: -18 } },
    ],
    kit: { id: 'kit', name: 'Armor thermal mass absorbs it', desc: 'Your hardened armor spreads and sheds the soak.', fx: { power: -4 } },
  },
  wind: {
    id: 'wind', name: 'Superrotation Wind Shear', icon: '🌀', slots: [1],
    brief: 'The atmosphere laps the planet every 4 days at 360 km/h - shear layers are bending the platform\'s attitude.',
    nasaNote: 'Akatsuki tracks cloud features racing around Venus in ~4 Earth days - 60× faster than the planet rotates.',
    kitRef: 'NAVS.startrack',
    options: () => [
      { id: 'burns', name: 'Correct with attitude burns', desc: 'Hold the pointing exactly.', fx: { fuel: -8 } },
      { id: 'drift', name: 'Drift with the wind', desc: 'Save fuel; lose some data quality.', fx: { science: -6 } },
    ],
    kit: { id: 'kit', name: 'Star tracker auto-stabilises', desc: 'Precision navigation trims attitude with minimal fuel.', fx: { fuel: -2 } },
  },
  cycling: {
    id: 'cycling', name: 'Extreme Thermal Cycling', icon: '♨', slots: [1, 2],
    brief: 'Mercury\'s surface swings 600°C between noon and midnight - every solder joint flexes with each terminator pass.',
    nasaNote: 'Mercury\'s solar day lasts 176 Earth days; the day-night swing spans −180°C to +430°C.',
    kitRef: 'THERMALS.radiator',
    options: slot => [
      { id: 'sunshade', name: 'Rotate to the shade attitude', desc: 'Protect the bus; lose some observing geometry.', fx: slot === 2 ? { power: -8, science: -4 } : { power: -8 } },
      { id: 'push', name: 'Keep instruments on target', desc: 'Thermal stress is a gamble.', chance: 0.5, fx: {}, bad: { power: -16, risk: +6 } },
    ],
    kit: { id: 'kit', name: 'Radiator loop evens the load', desc: 'Your radiator system smooths the thermal gradient.', fx: { power: -3 } },
  },
  anchor: {
    id: 'anchor', name: 'Microgravity Anchor Failure', icon: '⚓', slots: [2],
    brief: 'The surface anchor is not holding: the lander\'s feet slowly push the body away on every scan recoil.',
    nasaNote: 'On a body with 0.03 g or less, touching anything changes your orbit - anchoring and reaction control, not wheels, keep you in place.',
    kitRef: 'NAVS.startrack',
    options: () => [
      { id: 'harpoon', name: 'Fire the anchoring harpoon', desc: 'Re-anchor hard; spend propellant on recoil.', fx: { fuel: -6 } },
      { id: 'driftscan', name: 'Switch to drifting scans', desc: 'Scan while flying free; geometric precision suffers.', fx: { science: -8 } },
    ],
    kit: { id: 'kit', name: 'Terrain-relative station-keeping', desc: 'Your star tracker holds the geometry autonomously.', fx: { science: -2 } },
  },
  tumble: {
    id: 'tumble', name: 'Irregular Tumble', icon: '↻', slots: [1],
    brief: 'The body\'s irregular gravity is torquing the spacecraft: attitude is slowly tumbling and thermal limits approach.',
    nasaNote: 'Small bodies are lumpy - gravity gradients tumble orbiters; Psyche\'s mission design accounts for its irregular shape.',
    kitRef: 'NAVS.startrack',
    options: () => [
      { id: 'gyros', name: 'Fight it with reaction wheels', desc: 'Hold attitude; drain power.', fx: { power: -10 } },
      { id: 'wait', name: 'Wait for a stable attitude', desc: 'Lose observing time, save consumables.', fx: { science: -8 } },
    ],
    kit: { id: 'kit', name: 'Star tracker takes over', desc: 'Autonomous attitude hold with minimal draw.', fx: { power: -2 } },
  },
  targeting: {
    id: 'targeting', name: 'Flyby Targeting Error', icon: '◎', slots: [1],
    brief: 'Tracking refines the closest-approach prediction: a 100 km error at 5 billion km is the difference between science and a miss.',
    nasaNote: 'New Horizons navigated by optical navigation to an aimpoint within ~100 km after 9.5 years - the greatest navigation stunt of its decade.',
    kitRef: 'NAVS.startrack',
    options: () => [
      { id: 'trim', name: 'Trim burn to the corrected aimpoint', desc: 'Spend propellant; hit the target.', fx: { fuel: -10 } },
      { id: 'accept', name: 'Accept the wider corridor', desc: 'The pass still works - with worse geometry.', chance: 0.5, fx: {}, bad: { science: -14 } },
    ],
    kit: { id: 'kit', name: 'Optical navigation auto-corrects', desc: 'Your star tracker serves as the precision optic.', fx: { fuel: -3 } },
  },
  downlink: {
    id: 'downlink', name: 'Downlink Bottleneck', icon: '📡', slots: [2],
    brief: 'The deep-space network window is short: hours of data must fit through a link measured in bits per second.',
    nasaNote: 'New Horizons needed ~15 months to downlink all its Pluto data at ~1-2 kbps - priority lists decided what science arrived first.',
    kitRef: 'COMMS.highgain',
    options: () => [
      { id: 'priority', name: 'Downlink priority science only', desc: 'Compress and drop the tail of the list.', fx: { science: -12 } },
      { id: 'full', name: 'Hold everything for a long queue', desc: 'Keep the spacecraft busy for months.', fx: { power: -16 } },
    ],
    kit: { id: 'kit', name: 'High-gain autonomy link', desc: 'Your large antenna + onboard autonomy squeezes the window.', fx: { power: -4 } },
  },
};

Object.assign(HAZARDS, DEST_HAZARDS);

// ---------------------------------------------------------------- new subsystem + objective
// RTG power: the deep-space answer (solar flux dies beyond ~5 AU).
POWER_SYSTEMS.rtg = {
  id: 'rtg', name: 'Radioisotope Thermoelectric Generator', role: 'Deep-space power',
  cost: 26, mass: 60, power: 85, comm: 0, battery: false, risk: 0, rtg: true,
  gain: 'Distance-proof power: sunlight irrelevant; waste heat lightens heater load',
  loss: 'Expensive, heavy; less raw output than big solar',
};

// Atmospheric suite: for worlds with weather worth sniffing.
INSTRUMENTS.atmos = {
  id: 'atmos', name: 'Atmospheric Suite', role: 'Air, volatiles and escape',
  cost: 16, mass: 35, draw: 7, scan: 50,
  gain: 'Sniffs atmospheres and volatiles; shines on cloudy or venting worlds',
  loss: 'Weak on airless worlds',
};

// Biosignature objective (destination-gated: only worlds where the question is real).
OBJECTIVES.life = {
  id: 'life', name: 'Biosignature Search', icon: '✷',
  question: 'Is there life - or the chemistry that leads to it - beyond Earth?',
  values: 'Organic & metabolic signatures',
  instruments: { spectrometer: 12, atmos: 12, ice: 8, camera: 2, radiation: 0 },
  dataRate: 0.30,
  nasa: { key: 'Water in LCROSS impact plume (Cabeus crater; south pole)', ds: 'moon', label: 'Habitability checklist: water · energy · organics', note: 'Perseverance caches Jezero delta samples for return; Cassini found H₂ and organics in Enceladus\'s plume - the three ingredients for life as we know it, measured where oceans touch rock.' },
  consequence: 'Spectrometer or Atmos Suite +12 per scan. Biosignatures hide in wet, chemically active places.',
};

// ---------------------------------------------------------------- destination hazard weights
// Per-destination slot weight tables (moon keeps the original state.js function).
function destHazardWeights(slot, ctx = {}) {
  const d = destOf();
  const solar = M.scenario === 'solar';
  const rocket = ctx.rocket || M.selectedVehicle || 'medium';
  const low = (ctx.orbit || M.selectedOrbit) === 'low';
  const reg = site();
  const w = Object.assign({}, slot === 1 ? d.hz1 : d.hz2);
  if (w.leak) w.leak = { light: 1.4, medium: 0.9, heavy: 0.6 }[rocket];
  if (w.seu) w.seu = w.seu * (solar ? 1.8 : 1) * (ctx.exposure || 1);
  if (w.flare) w.flare = w.flare * (solar ? 3 : 1);
  if (slot === 2) {
    if (d.dustBase) w.dust = (reg.dust || 0.4) * d.dustBase * (low ? 1.0 : 0.3);
    if (d.quakeBase) w.quake = (reg.quake || 0.2) * d.quakeBase * (low ? 1.1 : 0.5);
  }
  return w;
}

// Attach per-slot weight tables to every non-lunar destination.
const HZ_TABLES = {
  mars:    { hz1: { meteoroid: 1.0, leak: 1, seu: 0.6, flare: 0.4 }, hz2: { seu: 0.5, flare: 0.4, conjunction: 0.9, meteoroid: 0.4 }, dustBase: 0.8, quakeBase: 0.4 },
  venus:   { hz1: { meteoroid: 0.6, leak: 1, seu: 0.4, flare: 0.3, wind: 1.1 }, hz2: { acid: 1.3, soak: 1.1, seu: 0.4, flare: 0.2 } },
  mercury: { hz1: { meteoroid: 0.8, leak: 1, seu: 0.9, flare: 1.3, cycling: 0.8 }, hz2: { cycling: 1.1, seu: 0.8, flare: 0.9, conjunction: 0.5, meteoroid: 0.4 } },
  ceres:   { hz1: { meteoroid: 0.5, leak: 1, seu: 0.5, flare: 0.3, tumble: 0.7 }, hz2: { anchor: 1.2, tumble: 0.5, meteoroid: 0.3 } },
  psyche:  { hz1: { meteoroid: 0.5, leak: 1, seu: 0.5, flare: 0.3, targeting: 0.9, tumble: 0.6 }, hz2: { anchor: 1.3, tumble: 0.5, meteoroid: 0.3 } },
  europa:  { hz1: { meteoroid: 0.7, leak: 1, seu: 1.0, flare: 0.3, radburst: 1.2 }, hz2: { radburst: 1.4, seu: 0.7, plume: 0.8, meteoroid: 0.4 }, quakeBase: 0.6, dustBase: 0.2 },
  titan:   { hz1: { meteoroid: 0.5, leak: 1, seu: 0.5, flare: 0.2 }, hz2: { icing: 1.1, rain: 0.9, seu: 0.4, meteoroid: 0.2 }, quakeBase: 0.1, dustBase: 0.3 },
  enceladus: { hz1: { meteoroid: 0.6, leak: 1, seu: 0.5, flare: 0.2, ringdust: 0.9 }, hz2: { plume: 1.2, ringdust: 0.8, seu: 0.4, meteoroid: 0.3 } },
  pluto:   { hz1: { meteoroid: 0.4, leak: 1, seu: 0.6, flare: 0.2, targeting: 1.2 }, hz2: { downlink: 1.3, seu: 0.5, meteoroid: 0.2 } },
};
for (const [id, t] of Object.entries(HZ_TABLES)) Object.assign(DESTS[id], t);
// Full hazard pool per destination (for threat forecast + weights filtering).
for (const d of Object.values(DESTS)) {
  if (d.id === 'moon') continue;
  d.pool = [...new Set([...Object.keys(d.hz1), ...Object.keys(d.hz2)])];
}

// ---------------------------------------------------------------- light-time response lag
// Far destinations cannot be flown from Earth in real time. Hazard responses at
// distant worlds cost 25% more UNLESS the response is your onboard subsystem kit
// (autonomy) or you carry a large high-gain antenna (autonomy-grade link).
function lagFactor(isKit) {
  const d = destOf();
  if (d.delayMin < 15 || isKit) return 1;
  if (d.delayMin >= 30) return (M.selectedComms === 'highgain') ? 1.05 : 1.25;
  return 1.1;
}
function scaleFxLag(fx, lag) {
  if (lag === 1 || !fx) return fx;
  const o = Object.assign({}, fx);
  for (const k of ['power', 'fuel', 'science']) if (o[k] < 0) o[k] = Math.round(o[k] * lag);
  return o;
}

// ---------------------------------------------------------------- mission patches (achievement set)
const ACH = {
  KEY: 'lunaris-patches',
  load() { try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch (e) { return {}; } },
  save(x) { try { localStorage.setItem(this.KEY, JSON.stringify(x)); } catch (e) { /* ignore */ } },
  award(destId, score, grade) {
    const all = this.load(), cur = all[destId];
    if (!cur || score > cur.score) {
      all[destId] = { score, grade, at: new Date().toISOString().slice(0, 10) };
      this.save(all);
    }
  },
  count() { return Object.keys(this.load()).length; },
  forDest(id) { return this.load()[id] || null; },
};
// __PART5__

// Load-time mission reset: every registry (DESTS, SITES, HAZARDS, OBJECTIVES,
// POWER_SYSTEMS.rtg, INSTRUMENTS.atmos) is merged by now.
resetMission();
