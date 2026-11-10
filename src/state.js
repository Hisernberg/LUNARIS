// LUNARIS mission model: objectives, sites, subsystem tables, travel, hazards,
// the central mission state M, and the simplified gameplay formulas.
// EVERY number in the GAME MODEL sections is a simplified gameplay value chosen for
// balance - none of them is a NASA measurement. Real values come only from the CSV
// datasets in data/ (see src/data.js) and are always shown with their confidence tag.

const RULES = {
  startBudget: 100,     // $M (a mission condition may cut this)
  scienceGoal: 70,      // science needed for the primary objective (a condition may raise it)
  partialMin: 40,       // below this nothing meaningful was returned -> FAILURE
  healthyPower: 15,     // objective: spacecraft must end the mission with at least this power
  fuelReserve: 10,      // objective: fuel kept for an extended mission / safe disposal
  minPower: 60,         // % power margin required at launch
  minArrivalFuel: 10,   // % fuel that must remain after lunar orbit insertion
  lowPower: 20,         // below this: +risk (thin power margin)
  lowFuel: 10,          // below this after orbit: +risk (thin propellant margin)
  riskHigh: 40,         // >= : data-loss anomaly during transmission
  riskCritical: 75,     // >= : spacecraft enters safe mode, mission lost
  anomalyLoss: 0.2,     // fraction of data lost to a high-risk anomaly
};

// ---------------------------------------------------------------- science objectives (CHOOSE)
// An objective is the scientific question the mission answers. It rewards its best
// instrument and multiplies how much data each scan produces.
const OBJECTIVES = {
  mapping: {
    id: 'mapping', name: 'Surface Mapping', icon: '▦',
    question: 'What does the surface look like in fine detail, and where are the safe, interesting places?',
    values: 'Imaging coverage · terrain visibility',
    instruments: { camera: 14, ice: 2, radiation: 0, spectrometer: 2 },
    dataRate: 0.36,      // GB of data produced per science point (game model)
    nasa: { key: 'Mean radius', ds: 'moon', label: 'Moon mean radius 1,737 km', note: 'An orbiter at ~100 km altitude images this whole sphere in weeks - terrain data drives every landing site choice since Apollo.' },
    consequence: 'Camera +14 per scan. High data volume: imaging eats storage and downlink.',
  },
  composition: {
    id: 'composition', name: 'Composition Analysis', icon: '⚗',
    question: 'What is the surface made of - and what can be mined, refined or built from it?',
    values: 'Scientific composition data',
    instruments: { spectrometer: 14, camera: 2, ice: 4, radiation: 0 },
    dataRate: 0.28,
    nasa: { key: 'Maria (dark plains)|Rock chemistry', ds: 'regions', label: 'Maria chemistry: iron & titanium rich', note: 'Spectrometers from orbit mapped these provinces globally - composition decides where ISRU factories make sense.' },
    consequence: 'Spectrometer +14 per scan. Spectra are data-hungry but less than full imaging.',
  },
  environment: {
    id: 'environment', name: 'Radiation & Environment', icon: '☢',
    question: 'How harsh is the local environment for people and machines that will follow?',
    values: 'Environmental measurements',
    instruments: { radiation: 14, ice: 2, camera: 0, spectrometer: 2 },
    dataRate: 0.20,
    nasa: { key: 'Surface dose rate measured during Apollo', ds: 'moon', label: 'Apollo surface dose 0.8-1.5 mrad/h', note: 'No magnetic field and no atmosphere: measuring the radiation and thermal environment protects every future crew and lander.' },
    consequence: 'Radiation Sensor +14 per scan. Low data volume, but storm risk hits this mission hardest.',
  },
  water: {
    id: 'water', name: 'Water / Volatile Investigation', icon: '❄',
    question: 'How much water ice is really there, and where can it be extracted?',
    values: 'Science at high-value targets',
    instruments: { ice: 14, spectrometer: 6, camera: 0, radiation: 2 },
    dataRate: 0.25,
    nasa: { key: 'Water in LCROSS impact plume (Cabeus crater; south pole)', ds: 'moon', label: 'LCROSS plume ~6% water', note: 'Water ice hides in permanently shadowed craters at the poles. Confirming and mapping it is the top lunar ISRU question.' },
    consequence: 'Neutron/Ice Probe +14 per scan, +6 at the South Pole. Polar targets multiply the science.',
  },
};

// ---------------------------------------------------------------- survey sites (CHOOSE)
// Coordinates of Apollo sites come from the regions CSV (dataKey); others are
// approximate, for map placement only. obj = science multiplier per objective.
const SITES = {
  south_pole: {
    id: 'south_pole', name: 'South Polar Region', short: 'SOUTH POLE', site: 'Cabeus / Shackleton craters', side: 'near',
    lat: -84.9, lon: -35.5, kind: 'Polar · permanently shadowed craters',
    pitch: 'Water ice may be trapped in craters that never see sunlight - and the floors are the coldest measured places in the solar system.',
    sci: 1.1, obj: { water: 1.2, mapping: 1.0, composition: 1.0, environment: 0.9 },
    bonus: { spectrometer: 8, ice: 6, camera: -8 },
    drain: 1.15, tx: 1.0, txRisk: 0, fuel: 3, dust: 0.8, quake: 0.6,
    gain: 'Water-ice science: ice +6, Spectrometer +8, science ×1.1; water ×1.2', loss: 'Darkest, coldest target: night drain ×1.15, Camera −8, −3% fuel plane change',
    data: ['Water in LCROSS impact plume (Cabeus crater; south pole)', 'Hydrogen signature over south polar region (Lunar Prospector)', 'Coldest measured temperature (permanently shadowed craters)'],
    dataDs: ['moon', 'moon', 'moon'],
  },
  tranquillitatis: {
    id: 'tranquillitatis', name: 'Mare Tranquillitatis Pit', short: 'TRANQUILLITATIS', site: 'Near the Apollo 11 landing site', side: 'near',
    dataKey: 'Apollo 11 - Mare Tranquillitatis|Lunar Module landing coordinates', lat: 0.67416, lon: 23.47314,
    kind: 'Mare (lava plain) · nearside equatorial',
    pitch: 'A 100 m pit with a shadowed overhang that stays near room temperature, in iron- and titanium-rich basalt.',
    sci: 0.9, obj: { composition: 1.1, mapping: 1.0, environment: 1.0, water: 0.85 },
    bonus: { camera: 8, ice: 2 },
    drain: 0.9, tx: 0.8, txRisk: 0, fuel: 0, dust: 1.0, quake: 0.4,
    gain: 'Composition ×1.1: young mare chemistry · Camera +8', loss: 'Apollo 11 already sampled this mare: science ×0.9 · water poor ×0.85',
    data: ['Mare Tranquillitatis pit|Depth', 'Mare Tranquillitatis pit|Temperature in shadowed part (steady)', 'Maria (dark plains)|Rock chemistry'],
    dataDs: ['regions', 'regions', 'regions'],
  },
  marius: {
    id: 'marius', name: 'Marius Hills Pit', short: 'MARIUS HILLS', site: 'Oceanus Procellarum (location approximate)', side: 'near',
    lat: 14.1, lon: -56.8, kind: 'Possible lava-tube skylight · nearside',
    pitch: 'A skylight into a lava tube - a natural radiation shelter and a study target for future habitats.',
    sci: 1.0, obj: { environment: 1.15, mapping: 1.0, composition: 0.9, water: 0.9 },
    bonus: { radiation: 10, camera: 4 },
    drain: 1.0, tx: 0.85, txRisk: 0, fuel: 2, dust: 1.0, quake: 0.4,
    gain: 'Environment ×1.15: shelter study · Radiation Sensor +10', loss: 'Little composition interest ×0.9 · −2% fuel',
    data: ['Marius Hills pit|Depth', 'Marius Hills pit|Width', 'Radiation|Surface dose rate measured during Apollo'],
    dataDs: ['regions', 'regions', 'moon'],
  },
  descartes: {
    id: 'descartes', name: 'Descartes Highlands', short: 'DESCARTES', site: 'Apollo 16 landing region', side: 'near',
    dataKey: 'Apollo 16 - Descartes Highlands|Lunar Module landing coordinates', lat: -8.9734, lon: 15.5011,
    kind: 'Highlands (bright terrain) · central nearside',
    pitch: 'Ancient calcium- and aluminium-rich crust under the deepest regolith on the nearside.',
    sci: 1.05, obj: { composition: 1.1, mapping: 1.0, water: 0.8, environment: 0.95 },
    bonus: { spectrometer: 8 },
    drain: 1.0, tx: 0.9, txRisk: 0, fuel: 2, dust: 2.4, quake: 0.5,
    gain: 'Old crust chemistry ×1.1 · Spectrometer +8', loss: 'Deep dusty regolith: HIGH dust threat in low orbit',
    data: ['Apollo 16 - Descartes Highlands|Lunar Module landing coordinates', 'Highlands (bright terrain)|Rock chemistry', 'Highlands (bright terrain)|Regolith depth (older highlands)'],
    dataDs: ['regions', 'regions', 'regions'],
  },
  farside: {
    id: 'farside', name: 'Far Side Highlands', short: 'FAR SIDE', site: 'Beyond the lunar limb (location illustrative)', side: 'far',
    lat: 15, lon: 175, kind: 'Farside highlands · never visible from Earth',
    pitch: 'The least-explored hemisphere, with a thicker crust and the huge South Pole-Aitken basin - and no direct line to Earth.',
    sci: 1.25, obj: { mapping: 1.15, environment: 1.05, composition: 1.0, water: 0.9 },
    bonus: { camera: 4, radiation: 4 },
    drain: 1.0, tx: 1.4, txRisk: 8, fuel: 5, dust: 1.2, quake: 0.5,
    gain: 'Least explored: mapping ×1.15, science ×1.25', loss: 'No line of sight to Earth: downlink +40% power & +8 risk, −5% fuel',
    data: ['Farside|Crust thickness', 'Moon orbit|Sidereal rotation period', 'One-way light/radio delay at mean distance'],
    dataDs: ['regions', 'orbit', 'orbit'],
  },
  aristarchus: {
    id: 'aristarchus', name: 'Aristarchus Plateau', short: 'ARISTARCHUS', site: 'Brightest crater on the nearside', side: 'near',
    lat: 23.73, lon: -47.49, kind: 'Young rayed crater on a volcanic rise',
    pitch: 'The brightest and one of the youngest large craters, sitting on a rise with volcanic rilles - geology live in one frame.',
    sci: 1.08, obj: { composition: 1.15, mapping: 1.05, water: 0.85, environment: 0.95 },
    bonus: { spectrometer: 6, camera: 4 },
    drain: 1.0, tx: 0.9, txRisk: 0, fuel: 2, dust: 1.6, quake: 0.6,
    gain: 'Fresh crater chemistry ×1.15 · Spectrometer +6, Camera +4', loss: 'Bright rugged terrain: dust threat moderate · −2% fuel',
    data: ['Aristarchus', 'Kepler', 'Maria (dark plains)|Lava flooding era'],
    dataDs: ['craters', 'craters', 'regions'],
  },
};

// ---------------------------------------------------------------- mission conditions
// One is drawn at random for every run. Each changes which design is best.
const SCENARIOS = {
  solar: {
    id: 'solar', name: 'Solar Maximum', icon: '☀',
    brief: 'The Sun is near peak activity. Solar particle storms and bit-flips are far more likely.',
    effects: ['Every risk increase is ×1.5', 'Radiation Sensor +10 science per scan', 'Solar-storm and computer-upset threat HIGH'],
    nasa: 'Unshielded dose from Aug 1972 solar particle event (estimate)', nasaLabel: 'Aug 1972 solar storm, unshielded dose',
    riskMult: 1.5, bonus: { radiation: 10 },
  },
  night: {
    id: 'night', name: 'Deep Night / Eclipse', icon: '☾',
    brief: 'The survey will run through darkness or an eclipse shadow. Heaters will run hard with no sunlight on the panels.',
    effects: ['Night/eclipse drain ×1.5 (battery absorbs most)', 'Using reserve power costs 20% (battery: 8%)'],
    nasa: 'Synodic period (sunrise to sunrise)', nasaLabel: 'Lunar day + night cycle',
    drainMult: 1.5, reserve: 20, batteryReserve: 8,
  },
  budget: {
    id: 'budget', name: 'Budget Cut', icon: '$',
    brief: 'Funding was reduced after mission approval. Every dollar - and every subsystem choice - has to count.',
    effects: ['Budget cap cut to 80% of the destination norm (scaled to every world)'],
    budgetFactor: 0.8,
  },
  ice: {
    id: 'ice', name: 'Ice Hunt', icon: '❄',
    brief: 'Mission scientists want proof of buried water ice. The bar for success is higher everywhere.',
    effects: ['Science goal raised to 80', 'Ice Probe +8 per scan at any ice site (polar craters, plumes, ice shells)'],
    nasa: 'Water in LCROSS impact plume (Cabeus crater; south pole)', nasaLabel: 'LCROSS plume water (Cabeus)',
    goal: 80, bonus: { ice: 8 }, bonusRegion: 'south_pole', iceAny: true,
  },
};

// ---------------------------------------------------------------- spacecraft subsystems (ENGINEER)
// Every subsystem is a real trade-off: each table entry lists exactly what it costs.
const BUS = { cost: 15, mass: 250, comm: 40 };

const VEHICLES = {
  light: {
    id: 'light', name: 'Light Rocket', role: 'Low cost / low capacity',
    cost: 15, capacity: 520, fuel: 60, propellantMass: 120, comm: 10, risk: 5,
    antenna: 'Compact antenna', antennaSize: 8,
    gain: 'Cheapest launch', loss: 'Tight mass, little fuel, leak-prone',
  },
  medium: {
    id: 'medium', name: 'Medium Rocket', role: 'Balanced',
    cost: 30, capacity: 600, fuel: 85, propellantMass: 150, comm: 20, risk: 0,
    antenna: 'Standard dish', antennaSize: 12,
    gain: 'Good fuel, standard dish', loss: 'Moderate cost',
  },
  heavy: {
    id: 'heavy', name: 'Heavy Rocket', role: 'High capacity',
    cost: 50, capacity: 800, fuel: 100, propellantMass: 180, comm: 30, risk: 0,
    antenna: 'Large high-gain dish', antennaSize: 16,
    gain: 'Full fuel, big dish, 800 kg', loss: 'Half the budget',
  },
};

const ENGINES = {
  std: {
    id: 'std', name: 'Standard Engine', role: 'Baseline propulsion',
    cost: 0, mass: 10, fuelMult: 1.0, protects: [],
    gain: 'No extra cost or mass', loss: 'No fuel savings',
  },
  efficient: {
    id: 'efficient', name: 'High-Efficiency Engine', role: 'Propellant economy',
    cost: 8, mass: 25, fuelMult: 0.85, protects: [],
    gain: 'All burns use 15% less fuel', loss: 'Costly and heavier',
  },
  powerful: {
    id: 'powerful', name: 'High-Thrust Engine', role: 'Energy margin',
    cost: 12, mass: 40, fuelMult: 0.75, protects: [],
    gain: 'Fast transfers become affordable', loss: 'Heaviest engine: +40 kg',
  },
  redundant: {
    id: 'redundant', name: 'Engine + Redundant Tank', role: 'Leak-proof propulsion',
    cost: 10, mass: 45, fuelMult: 1.0, fuelBonus: 10, protects: ['leak'],
    gain: '+10% fuel capacity, leak-proof', loss: 'Heaviest kit: +45 kg',
  },
};

const POWER_SYSTEMS = {
  basic: {
    id: 'basic', name: 'Basic Solar', role: 'Low cost / low mass',
    cost: 6, mass: 40, power: 70, comm: 0, battery: false, risk: 5,
    gain: 'Cheap and light', loss: 'Low power, no reserve',
  },
  highcap: {
    id: 'highcap', name: 'High-Capacity Solar', role: 'Higher power',
    cost: 14, mass: 85, power: 100, comm: 20, battery: false, risk: 0,
    gain: 'Max power, stronger transmitter', loss: 'Heavier, costlier',
  },
  battery: {
    id: 'battery', name: 'Solar + Battery Backup', role: 'Resilience',
    cost: 20, mass: 120, power: 85, comm: 10, battery: true, risk: 0,
    gain: 'Battery absorbs lunar-night drain', loss: 'Heaviest, most expensive',
  },
};

const THERMALS = {
  basic: {
    id: 'basic', name: 'Basic MLI Blanket', role: 'Baseline insulation',
    cost: 0, mass: 0, drainMult: 1.0, protects: [],
    gain: 'Free', loss: 'Full night drain, no physical protection',
  },
  radiator: {
    id: 'radiator', name: 'Radiator + Insulation', role: 'Thermal control',
    cost: 6, mass: 25, drainMult: 0.85, protects: [],
    gain: 'Night heater load −15%', loss: 'Moderate mass and cost',
  },
  armor: {
    id: 'armor', name: 'Hardened Armor + Whipple', role: 'Environmental survival',
    cost: 12, mass: 55, drainMult: 0.7, protects: ['meteoroid', 'flare'],
    gain: 'Night drain −30% · blocks meteoroids & storms', loss: 'Heaviest thermal option',
  },
};

const COMMS = {
  patch: {
    id: 'patch', name: 'Patch Antenna', role: 'Minimal link',
    cost: 0, mass: 0, comm: 0, power: 0, protects: [],
    gain: 'Free', loss: 'Weak downlink: full-resolution data costs more power',
  },
  dish: {
    id: 'dish', name: 'Gimbaled Dish', role: 'Standard link',
    cost: 8, mass: 12, comm: 12, power: 4, protects: [],
    gain: 'Stronger, steerable downlink', loss: 'Mass, cost, power draw',
  },
  highgain: {
    id: 'highgain', name: 'Large High-Gain Antenna', role: 'Data return',
    cost: 15, mass: 25, comm: 28, power: 8, protects: [],
    gain: 'Best data return from anywhere', loss: 'Expensive, heavy, power-hungry',
  },
};

const NAVS = {
  imu: {
    id: 'imu', name: 'Basic IMU', role: 'Baseline navigation',
    cost: 0, mass: 0, power: 0, science: 0, protects: [], risk: 5,
    gain: 'Free', loss: 'Coarse pointing (−2 science per scan) · leaky memory',
  },
  startrack: {
    id: 'startrack', name: 'Star Tracker + Terrain Nav', role: 'Precision',
    cost: 8, mass: 12, power: 3, science: 2, protects: [], risk: 0,
    gain: 'Sharper pointing: +2 science per scan', loss: 'Moderate cost',
  },
  radhard: {
    id: 'radhard', name: 'Rad-Hard Avionics + Star Tracker', role: 'Storm-proof navigation',
    cost: 14, mass: 30, power: 4, science: 2, protects: ['seu', 'flare'], risk: 0,
    gain: 'Error-correcting memory: rides out particle hits', loss: 'Costly electronics, +30 kg',
  },
};

const INSTRUMENTS = {
  camera: {
    id: 'camera', name: 'Imaging Camera', role: 'Surface imaging',
    cost: 8, mass: 25, draw: 5, scan: 50,
    gain: 'Cheap, light, low power', loss: 'Lowest base science',
  },
  radiation: {
    id: 'radiation', name: 'Radiation Sensor', role: 'Radiation environment',
    cost: 14, mass: 45, draw: 8, scan: 52,
    gain: 'Good science; shines in storms & pits', loss: 'Moderate resource demand',
  },
  ice: {
    id: 'ice', name: 'Neutron / Ice Probe', role: 'Volatile detection',
    cost: 18, mass: 50, draw: 9, scan: 50,
    gain: 'The water question; +6 science at the poles', loss: 'Costly; weak away from polar ice',
  },
  spectrometer: {
    id: 'spectrometer', name: 'Spectrometer', role: 'Composition analysis',
    cost: 20, mass: 55, draw: 10, scan: 58,
    gain: 'Highest base science', loss: 'Costliest, heaviest, power-hungry',
  },
};

const DATASYS = {
  compact: {
    id: 'compact', name: 'Compact Recorder', role: 'Minimal storage',
    cost: 0, mass: 0, storage: 24, power: 0, protects: [],
    gain: 'Free', loss: 'Only 24 GB: big scans overflow and are lost',
  },
  large: {
    id: 'large', name: 'Large Recorder', role: 'Full storage',
    cost: 5, mass: 15, storage: 40, power: 2, protects: [],
    gain: '40 GB: holds any scan', loss: 'Cost and mass',
  },
  sealed: {
    id: 'sealed', name: 'Sealed Recorder + Covers', role: 'Dust-proof data',
    cost: 9, mass: 20, storage: 32, power: 2, protects: ['dust'],
    gain: '32 GB · dust-proof optics and panels', loss: 'Costly; smaller than the Large Recorder',
  },
};

// ---------------------------------------------------------------- travel (before launch)
const PARKING_HOURS = 2.7;
const TRAVEL_MODES = {
  fast: {
    id: 'fast', name: 'Fast Transfer', short: 'FAST', speed: 1.80, path: 1.0, usage: 'HIGH',
    desc: 'Direct, high-energy trajectory. Arrive first - burn the most propellant.',
    ref: 'Quicker than Apollo 8 (≈69 h 08 m to lunar orbit)',
  },
  balanced: {
    id: 'balanced', name: 'Balanced Transfer', short: 'BALANCED', speed: 1.461, path: 1.0, usage: 'MEDIUM',
    desc: 'Classic Apollo-style coast: moderate time, moderate propellant.',
    ref: 'Apollo 11 reference (≈75 h 50 m to reach the Moon)',
  },
  efficient: {
    id: 'efficient', name: 'Fuel-Saving Transfer', short: 'FUEL-SAVING', speed: 1.183, path: 1.3, usage: 'LOW',
    desc: 'Wider, low-energy trajectory. Saves propellant for lunar operations - arrives days later.',
    ref: 'Artemis I / Blue Ghost reference (≈5-25 days, fuel-saving paths)',
  },
};
const EARTH_MOON = { mean: 384400, perigee: 363300, apogee: 405500 };
function setEarthMoon(d) { for (const k of ['mean', 'perigee', 'apogee']) if (isFinite(d[k])) EARTH_MOON[k] = d[k]; }

const ORBITS = {
  low: {
    id: 'low', name: 'Low Lunar Orbit',
    desc: 'Closer to the surface: sharper observations, more correction burns.',
    fx: { fuel: -18, power: -8, science: +12, risk: +10 },
  },
  high: {
    id: 'high', name: 'Higher Lunar Orbit',
    desc: 'Farther from the surface: stable and cheap, but less detail.',
    fx: { fuel: -6, power: -3, science: 0, risk: 0 },
  },
};

const SCANS = {
  quick:    { id: 'quick',    name: 'Quick Scan',    mult: 0.6,  power: -10, risk: 0,   desc: 'Short pass, minimal power and data.' },
  standard: { id: 'standard', name: 'Standard Scan', mult: 1.0,  power: -16, risk: +8,  desc: 'Balanced observation campaign.' },
  deep:     { id: 'deep',     name: 'Deep Scan',     mult: 1.35, power: -21, risk: +16, desc: 'Long, intensive campaign - may overflow the recorder.' },
};

const EVENT = {
  drain: 14, batteryDrain: 5, reserve: 16, batteryReserve: 6,
  options: {
    reduce:  { id: 'reduce',  key: 'A', name: 'Reduce Survey Intensity', desc: 'Cut instrument time to save energy.' },
    reserve: { id: 'reserve', key: 'B', name: 'Use Reserve Power',       desc: 'Draw down reserves to keep observing.' },
    full:    { id: 'full',    key: 'C', name: 'Continue Full Operation', desc: 'Push hardware beyond its comfort zone.' },
  },
};

const TRANSMISSIONS = {
  compressed: { id: 'compressed', name: 'Compressed Transmission', mult: 0.75, desc: 'Smaller files. 25% of detail is lost.' },
  full:       { id: 'full',       name: 'Full-Resolution Transmission', mult: 1.0, desc: 'Every measurement sent at full detail.' },
};

// ---------------------------------------------------------------- hazards
// Slot 1 strikes during the lunar transfer, slot 2 mid-survey. The matching subsystem
// choice unlocks a cheap response (see each hazard's `kit`).
const HAZARDS = {
  meteoroid: {
    id: 'meteoroid', name: 'Meteoroid Swarm', icon: '☄', slots: [1, 2],
    brief: 'Tracking reports a swarm of small meteoroids on a crossing path. Impact in 90 seconds.',
    nasa: { key: 'Atmospheric surface pressure', ds: 'moon', label: 'Lunar surface pressure', note: 'Effectively no atmosphere: meteoroids reach the Moon at full speed, which is why it is covered in craters.' },
    kitRef: 'THERMALS.armor',
    options: () => [
      { id: 'evade', name: 'Evasive burn', desc: 'Fire thrusters and dodge the swarm.', fx: { fuel: -10 } },
      { id: 'brace', name: 'Turn the bus into the swarm', desc: 'Protect the solar panels; take hits on the body.', fx: { power: -12, risk: +10 } },
      { id: 'hold', name: 'Hold course', desc: 'Most swarms miss. Most.', chance: 0.5, fx: {}, bad: { power: -22, risk: +15 } },
    ],
    kit: { id: 'kit', name: 'Face the Whipple shield forward', desc: 'Your hardened armor vaporises the particles on impact.', fx: { risk: +2 } },
  },
  leak: {
    id: 'leak', name: 'Propellant Leak', icon: '⛽', slots: [1],
    brief: 'Pressure is dropping in tank B - a stuck valve is venting propellant into space.',
    nasa: { key: 'Escape velocity', ds: 'moon', label: 'Lunar escape velocity', note: 'To be captured, LUNARIS-01 must still brake below this speed on arrival - that needs propellant.' },
    kitRef: 'ENGINES.redundant',
    options: () => [
      { id: 'isolate', name: 'Close the isolation valve', desc: 'Stop the leak but lose what is left in tank B.', fx: { fuel: -15 } },
      { id: 'patch', name: 'Cycle the valve and patch software', desc: 'Save most propellant; costs power and adds risk.', fx: { power: -10, fuel: -5, risk: +6 } },
      { id: 'ignore', name: 'Treat it as a sensor glitch', desc: 'Maybe the pressure gauge is lying.', chance: 0.4, fx: {}, bad: { fuel: -22, risk: +8 } },
    ],
    kit: { id: 'kit', name: 'Switch to the redundant tank', desc: 'Seal tank B and feed the engine from the spare.', fx: { fuel: -3 } },
  },
  seu: {
    id: 'seu', name: 'Flight Computer Upset', icon: '⚠', slots: [1, 2],
    brief: 'A high-energy particle flipped bits in the flight computer. LUNARIS-01 dropped into safe mode.',
    nasa: { key: 'Surface dose rate measured during Apollo', ds: 'moon', label: 'Radiation dose (Apollo)', note: 'No magnetic field or thick atmosphere shields the Moon - or a spacecraft near it.' },
    kitRef: 'NAVS.radhard',
    options: slot => [
      { id: 'reboot', name: 'Full reboot from backup', desc: 'Safe but slow: systems idle while restarting.', fx: slot === 2 ? { power: -10, science: -8 } : { power: -10 } },
      { id: 'hotpatch', name: 'Hot-patch and resume', desc: 'Fast, but corrupted memory may linger.', fx: { risk: +14 } },
    ],
    kit: { id: 'kit', name: 'Let rad-hard avionics self-correct', desc: 'Error-correcting memory repairs the flipped bits.', fx: { power: -2 } },
  },
  flare: {
    id: 'flare', name: 'Solar Particle Event', icon: '☀', slots: [1, 2],
    brief: 'A solar flare launched a storm of energetic protons toward the Moon. Arrival in minutes.',
    nasa: { key: 'Unshielded dose from Aug 1972 solar particle event (estimate)', ds: 'moon', label: 'Aug 1972 storm, unshielded', note: 'A potentially lethal dose for astronauts - and a serious threat to electronics.' },
    kitRef: 'NAVS.radhard',
    options: slot => [
      { id: 'safe', name: 'Instruments off until it passes', desc: slot === 2 ? 'Lose observing time.' : 'Power down everything non-essential.', fx: slot === 2 ? { science: -14 } : { power: -10 } },
      { id: 'push', name: 'Keep operating through the storm', desc: 'Nothing lost now - electronics take the dose.', fx: { risk: +18 } },
    ],
    kit: { id: 'kit', name: 'Rely on rad-hard avionics', desc: 'Shielded electronics ride out the storm.', fx: { risk: +4 } },
  },
  dust: {
    id: 'dust', name: 'Charged Dust Contamination', icon: '◌', slots: [2],
    brief: 'Electrostatically charged dust lofted near the day-night line is clinging to optics and solar panels.',
    nasa: { key: 'Dust covering that halves solar-cell output', ds: 'dust', label: 'Dust that halves solar output', note: 'Lunar dust is charged by solar radiation and clings to surfaces; Apollo 17 reported false instrument readings.' },
    kitRef: 'DATASYS.sealed',
    scenarioNote: 'Simplified game scenario inspired by NASA dust-hazard data.',
    options: () => [
      { id: 'recal', name: 'Recalibrate and heat-cycle panels', desc: 'Restore data quality at a power cost.', fx: { power: -12 } },
      { id: 'accept', name: 'Accept degraded data', desc: 'Contaminated readings are thrown away.', fx: { science: -14 } },
      { id: 'spin', name: 'Spin up to shed the dust', desc: 'Uses propellant and stresses the structure.', fx: { fuel: -8, risk: +5 } },
    ],
    kit: { id: 'kit', name: 'Close covers and vibrate panels', desc: 'Your sealed recorder kit keeps optics clean.', fx: { power: -2 } },
  },
  quake: {
    id: 'quake', name: 'Deep Moonquake Swarm', icon: '〰', slots: [2],
    brief: 'Seismometers on the surface 700 km below report a deep moonquake swarm - the ground under your target is ringing.',
    nasa: { key: 'Deep moonquakes|Count', ds: 'quakes', label: 'Apollo deep moonquakes', note: 'Deep moonquakes repeat on a ~27-day tidal cycle and ring for minutes: even at 700-1200 km depth they shake surface optics.' },
    kitRef: 'NAVS.startrack',
    scenarioNote: 'Simplified game scenario inspired by the Apollo seismic dataset.',
    options: slot => [
      { id: 'pause', name: 'Pause observations until it passes', desc: 'Deep quakes ring for minutes, not hours.', fx: { science: -8 } },
      { id: 'stabilise', name: 'Stabilise pointing and push on', desc: 'Burn thrusters to hold the boresight steady.', fx: { fuel: -6, power: -6 } },
      { id: 'ignore', name: 'Keep the scan running', desc: 'Optics are rated for tremors. Probably.', chance: 0.55, fx: {}, bad: { science: -16, risk: +6 } },
    ],
    kit: { id: 'kit', name: 'Trust terrain-relative navigation', desc: 'Your star tracker auto-stabilises the pointing.', fx: { science: -3 } },
  },
};

// ---------------------------------------------------------------- mission state helpers
const M = {};
const objective = () => OBJECTIVES[M.objective] || OBJECTIVES.mapping;
const scenario = () => SCENARIOS[M.scenario] || SCENARIOS.solar;
const site = () => SITES[M.region] || SITES.south_pole;
// Difficulty-aware caps (DIFFS/MODE_CFG live in src/modes.js, loaded before this file).
// The destination multiplies both the budget norm and the science goal.
const baseBudget = () => Math.round((destOf().budget) * (scenario().budgetFactor || 1));
const budgetCap = () => {
  if (MODE_CFG.mode === 'sandbox') return Math.round(destOf().budget * 1.5);
  return Math.max(50, baseBudget() + diff().budget);
};
const scienceGoal = () => Math.max(30, Math.round((scenario().goal || RULES.scienceGoal) * destOf().sciGoal) + diff().goal);

// Per-scan bonus: objective affinity + site bonus + condition bonus.
// The Ice Hunt condition applies its ice bonus at ANY destination's ice site
// (polar craters, plume corridors, ice shells), not just the lunar south pole.
function instrBonus(i) {
  const obj = objective(), sc = scenario();
  const objBonus = (obj.instruments[i.id] || 0);
  const iceSite = sc.iceAny && site().iceSite;
  const condBonus = sc.bonusRegion ? ((sc.bonusRegion === M.region || iceSite) ? ((sc.bonus || {})[i.id] || 0) : 0)
                                   : ((sc.bonus || {})[i.id] || 0);
  return objBonus + ((site().bonus || {})[i.id] || 0) + condBonus;
}
// Science multiplier from the site's objective affinity.
function objMult() { return site().obj[M.objective] || 1; }

// Risk increases are amplified by the Solar Maximum condition and the difficulty.
const rk = v => (v > 0 ? Math.round(v * (scenario().riskMult || 1) * diff().riskMult) : v);
const rkFx = fx => { const o = Object.assign({}, fx); if (o.risk) o.risk = rk(o.risk); return o; };

function pickScenario(avoid) {
  const ids = Object.keys(SCENARIOS).filter(id => id !== avoid);
  return ids[Math.floor(Math.random() * ids.length)];
}

// ---------------------------------------------------------------- formulas
const clamp01 = x => Math.max(0.1, Math.min(1, x));
const loiFuel = mass => Math.round(mass / 10);

// Full consequences of a travel strategy for a spacecraft of the given mass + engine.
// The Moon keeps the original distance-jitter model; every other destination uses
// its own transit table and propellant scaling (fuelMult = energy of transfer +
// capture relative to a lunar mission, tuned per destination).
function travelPlan(id, mass = M.mass, engine = M.selectedEngine) {
  const m = TRAVEL_MODES[id], b = TRAVEL_MODES.balanced;
  const e = ENGINES[engine || 'std'];
  const d = destOf();
  const energy = Math.pow(m.speed / b.speed, 1.2);
  if (d.id !== 'moon') {
    const days = d.transit[id];
    const hours = PARKING_HOURS + days * 24;
    const refHours = PARKING_HOURS + d.transit.balanced * 24;
    const fuelTotal = Math.round(mass / 10 * energy * d.fuelMult * (e ? e.fuelMult : 1));
    const tli = Math.round(fuelTotal * d.tliShare), loi = fuelTotal - tli;
    return {
      id, name: m.name, short: m.short, usage: m.usage, dist: d.distKm, hours, cruiseHours: hours - PARKING_HOURS,
      fuelTotal, tli, loi,
      cruisePower: Math.min(12, Math.max(0, Math.round((days / 60) * 4))),
      risk: rk(Math.max(0, Math.round((energy - 1) * 14))),
      nightFactor: Math.max(0.5, 1 + 0.6 * (hours / refHours - 1)),
      hazardChance: Math.max(0.35, Math.min(1, 0.55 + d.rad * 0.15)),
      exposure: 1 + d.rad * 0.3,
      modeRef: (d.modeRefs || {})[id] || m.ref,
    };
  }
  const dist = M.moonDistance || EARTH_MOON.mean, dr = dist / EARTH_MOON.mean;
  const cruiseHours = dist * m.path / m.speed / 3600;
  const hours = PARKING_HOURS + cruiseHours;
  const refCruise = EARTH_MOON.mean / b.speed / 3600;
  const fuelTotal = Math.round(mass / 10 * energy * Math.sqrt(dr) * (e ? e.fuelMult : 1));
  const tli = Math.round(fuelTotal * 0.6), loi = fuelTotal - tli;
  return {
    id, name: m.name, short: m.short, usage: m.usage, dist, hours, cruiseHours, fuelTotal, tli, loi,
    cruisePower: Math.max(0, Math.round((cruiseHours / 24 - 2) * 3)),
    risk: rk(Math.max(0, Math.round((energy - 1) * 14))),
    nightFactor: 1 + 0.6 * ((PARKING_HOURS + cruiseHours) / (PARKING_HOURS + refCruise) - 1),
    hazardChance: clamp01((cruiseHours - 45) / 40),
    exposure: cruiseHours / refCruise,
    modeRef: m.ref,
  };
}

// Selected engineer configuration -> full design numbers.
// Solar-derived power scales with the destination's solar flux; the RTG does not.
// Destinations with radiation belts add an environmental risk term that rad-hard
// avionics and armor blunt (Jupiter is survivable only with the vault approach).
function computeDesign(sel) {
  const v = VEHICLES[sel.vehicle], e = ENGINES[sel.engine], p = POWER_SYSTEMS[sel.power],
        th = THERMALS[sel.thermal], c = COMMS[sel.comms], n = NAVS[sel.nav],
        i = INSTRUMENTS[sel.payload], d = DATASYS[sel.data];
  const dest = destOf();
  const groups = [v, e, p, th, c, n, i, d];
  const complete = groups.every(Boolean);
  const budgetUsed = BUS.cost + groups.reduce((a, g) => a + (g ? g.cost : 0), 0);
  const mass = BUS.mass + groups.reduce((a, g) => a + (g ? (g.propellantMass || g.mass || 0) : 0), 0);
  const fuelCap = v ? v.fuel + ((e && e.fuelBonus) || 0) : null;
  const draw = (i ? i.draw : 0) + (c ? c.power : 0) + (n ? n.power : 0) + (d ? d.power : 0);
  const fluxFactor = p && p.rtg ? 1 : Math.max(0.3, Math.min(2, 0.55 + 0.45 * dest.flux));
  const power = p ? Math.round(p.power * fluxFactor) - draw : null;
  const reg = site();
  const sciMult = objMult();
  const envRisk = dest.rad ? Math.round(dest.rad * 6
    * (sel.nav === 'radhard' ? 0.25 : 1) * (sel.thermal === 'armor' ? 0.6 : 1)) : 0;
  const destFuelMult = dest.id === 'moon' ? 1 : dest.fuelMult;
  const modeEnergies = ['fast', 'balanced', 'efficient'].map(id => Math.pow(TRAVEL_MODES[id].speed / TRAVEL_MODES.balanced.speed, 1.2));
  const bestArrival = fuelCap != null
    ? fuelCap - Math.min(...modeEnergies.map(en => Math.round(loiFuel(mass) * destFuelMult * (e ? e.fuelMult : 1) * en)))
    : null;
  return {
    complete, budgetUsed, mass,
    fuel: fuelCap,
    capacity: v ? v.capacity : null,
    power,
    arrivalFuel: bestArrival,
    comm: BUS.comm + (v ? v.comm : 0) + (p ? p.comm : 0) + (c ? c.comm : 0),
    storage: d ? d.storage : null,
    sciencePotential: i ? Math.round(i.scan * reg.sci * sciMult) + instrBonus(i) : null,
    drainMult: th ? th.drainMult : 1,
    risk: rk((v ? v.risk : 0) + (p ? p.risk : 0) + (n ? n.risk || 0 : 0)) + envRisk,
    fluxFactor, envRisk,
  };
}

function validateDesign(sel) {
  const d = computeDesign(sel);
  const v = VEHICLES[sel.vehicle];
  const cap = budgetCap();
  const dest = destOf();
  const thTier = { basic: 0, radiator: 1, armor: 2 }[sel.thermal] != null ? { basic: 0, radiator: 1, armor: 2 }[sel.thermal] : 0;
  const envNeed = dest.thermalMin || 0;
  const checks = [
    {
      id: 'budget', label: 'Budget', ok: d.budgetUsed <= cap, gate: true,
      value: `$${d.budgetUsed}M of $${cap}M`,
      fix: `Over budget by $${d.budgetUsed - cap}M. Swap any subsystem for a cheaper one.`,
    },
    {
      id: 'mass', label: 'Mass', ok: d.capacity == null ? false : d.mass <= d.capacity, gate: true,
      value: `${d.mass} kg of ${d.capacity == null ? '?' : d.capacity} kg (${v.name})`,
      fix: `${Math.max(0, d.mass - d.capacity)} kg too heavy for the ${v.name}. Use a bigger rocket or lighter equipment.`,
    },
    {
      id: 'power', label: 'Power', ok: d.power != null && d.power >= RULES.minPower, gate: true,
      value: `${d.power == null ? '—' : d.power}% (minimum ${RULES.minPower}%)`,
      fix: dest.flux < 0.3
        ? 'Solar flux is far too weak this far from the Sun. Only the RTG (Radioisotope Generator) delivers full power here.'
        : 'Instrument, antenna, navigation and data systems draw too much power. Pick a stronger power system or lighter-load modules.',
    },
    {
      id: 'mission', label: 'Mission (fuel to reach orbit)', ok: d.arrivalFuel != null && d.arrivalFuel >= RULES.minArrivalFuel, gate: true,
      value: `${d.fuel}% → ${d.arrivalFuel}% after arrival on a balanced transfer (minimum ${RULES.minArrivalFuel}%)`,
      fix: `Not enough propellant for ${dest.shortName} arrival. Carry more fuel (bigger rocket, efficient engine, redundant tank) or reduce mass.`,
    },
    envNeed > 0 && {
      id: 'env', label: 'Environment (thermal protection)', gate: true,
      ok: thTier >= envNeed,
      value: `${THERMALS[sel.thermal] ? THERMALS[sel.thermal].name : 'no thermal system'} (needs tier ${envNeed})`,
      fix: envNeed >= 2
        ? `${dest.shortName} requires Hardened Armor + Whipple: the environment here destroys lesser spacecraft (Venera 13 survived 127 minutes).`
        : `${dest.shortName} requires at least the Radiator + Insulation kit: extreme thermal cycling flexes lesser designs apart.`,
    },
    {
      id: 'fit', label: 'Objective fit', ok: (() => {
        const best = objective().instruments;
        const id = sel.payload;
        return id != null && (best[id] || 0) >= Math.max(...Object.values(best));
      })(),
      value: sel.payload ? `${INSTRUMENTS[sel.payload].name} for ${objective().name}` : 'no instrument',
      fix: (() => {
        const best = objective().instruments;
        const top = Math.max(...Object.values(best));
        const name = Object.entries(best).filter(([, val]) => val >= top).map(([k]) => INSTRUMENTS[k].name)[0];
        return `${objective().name} rewards ${name} most (+${top} per scan). A different instrument is playable - but harder.`;
      })(),
    },
  ].filter(Boolean);
  return { design: d, checks, ok: checks.filter(c => c.gate).every(c => c.ok) };
}

// ---------------------------------------------------------------- hazard odds
// Moon keeps its original weight model; every other destination uses its own
// per-slot tables (destinations.js) blended with rocket / orbit / condition context.
function hazardWeights(slot, ctx = {}) {
  const d = destOf();
  if (d.id !== 'moon') return destHazardWeights(slot, ctx);
  const solar = M.scenario === 'solar';
  const rocket = ctx.rocket || M.selectedVehicle || 'medium';
  const low = (ctx.orbit || M.selectedOrbit) === 'low';
  if (slot === 1) {
    const ex = ctx.exposure || (M.travel ? M.travel.exposure : 1);
    return {
      meteoroid: 1.0,
      leak: { light: 1.4, medium: 0.9, heavy: 0.6 }[rocket],
      seu: (solar ? 1.1 : 0.6) * ex,
      flare: (solar ? 1.6 : 0.3) * ex,
    };
  }
  const reg = site();
  return {
    meteoroid: low ? 0.8 : 0.5,
    dust: reg.dust * (low ? 1.0 : 0.3),
    seu: solar ? 0.9 : 0.5,
    flare: solar ? 1.8 : 0.3,
    quake: (reg.quake || 0.4) * (low ? 1.1 : 0.5),
  };
}

function drawHazard(slot, exclude, roll = Math.random()) {
  const w = hazardWeights(slot);
  if (exclude) delete w[exclude];
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const [id, v] of Object.entries(w)) { acc += v / total; if (roll < acc) return id; }
  return Object.keys(w).pop();
}

// Counter for a hazard, e.g. 'THERMALS.armor' -> the option object if selected.
const SELECT_KEYS = {
  VEHICLES: 'selectedVehicle', ENGINES: 'selectedEngine', POWER_SYSTEMS: 'selectedPowerSystem',
  THERMALS: 'selectedThermal', COMMS: 'selectedComms', NAVS: 'selectedNav',
  INSTRUMENTS: 'selectedPayload', DATASYS: 'selectedData',
};
// Top-level const tables do not attach to window, so resolve them explicitly.
const KIT_TABLES = { VEHICLES, ENGINES, POWER_SYSTEMS, THERMALS, COMMS, NAVS, INSTRUMENTS, DATASYS };
function counterFor(h) {
  if (!h.kitRef) return { table: null, id: null, selected: false, option: null };   // kit-less hazards (e.g. plume fly-through)
  const [table, id] = h.kitRef.split('.');
  const sel = M[SELECT_KEYS[table]];
  return { table, id, selected: sel === id, option: (KIT_TABLES[table] || {})[id] };
}

// Chance that each hazard strikes at least once, for the pre-launch threat forecast.
// Only the destination's own hazard pool is forecast.
function threatForecast() {
  const pool = destOf().pool || Object.keys(HAZARDS);
  const p = (slot, orbit) => { const w = hazardWeights(slot, { orbit }); const t = Object.values(w).reduce((a, b) => a + b, 0); return id => (w[id] || 0) / t; };
  const p1 = p(1, 'high'), p2low = p(2, 'low'), p2high = p(2, 'high');
  const lvl = x => (x >= 0.4 ? 'HIGH' : x >= 0.2 ? 'MODERATE' : 'LOW');
  return Object.values(HAZARDS).filter(h => pool.includes(h.id)).map(h => {
    const both = orbit => 1 - (1 - p1(h.id)) * (1 - (orbit === 'low' ? p2low : p2high)(h.id));
    const worst = Math.max(both('low'), both('high'));
    const c = counterFor(h);
    return { id: h.id, name: h.name, p: worst, level: lvl(worst), lowOnly: h.id === 'dust' || h.id === 'meteoroid' ? both('low') - both('high') > 0.08 : false, kit: c.option, kitSelected: c.selected };
  });
}

// ---------------------------------------------------------------- mission state
function resetMission(scenarioId) {
  const prev = M.scenario;
  Object.assign(M, {
    missionStage: 'TITLE', checkpoint: 0, dest: null,
    scenario: scenarioId || pickScenario(prev),
    objective: null, region: null,
    budget: RULES.startBudget, budgetUsed: 0, mass: 0,
    power: 100, fuel: 100, science: 0, communication: 0, risk: 0,
    dataGenerated: 0, dataStored: 0, dataReturned: 0, storageGB: 0,
    selectedVehicle: null, selectedEngine: null, selectedPowerSystem: null, selectedThermal: null,
    selectedComms: null, selectedNav: null, selectedPayload: null, selectedData: null,
    selectedOrbit: null, selectedObservation: null, selectedEventResponse: null, selectedTransmission: null,
    missionStatus: null, reasons: [], objectives: [],
    collectedScience: 0, transmittedFraction: 1, scanAdjust: 0, storageLost: 0,
    hazards: [],
    timeline: [],
    travelMode: null, travel: null, flightPhase: null,
    moonDistance: Math.round(EARTH_MOON.perigee + Math.random() * (EARTH_MOON.apogee - EARTH_MOON.perigee)),
    failure: null, flags: {}, log: [],
  });
  M.budget = budgetCap();
}
// NOTE: the load-time resetMission() call lives at the END of destinations.js -
// it must run after destOf/DESTS exist, otherwise budgetCap() hits a TDZ error.

const RES_LABEL = { power: 'Power', fuel: 'Fuel', science: 'Science', risk: 'Risk', budget: 'Budget', mass: 'Mass', data: 'Data' };

// Chip = small labelled consequence. Tone never relies on colour alone (arrow + sign).
function chip(key, v) {
  const minus = '−';
  const good = key === 'risk' || key === 'mass' || key === 'budgetCost' ? v < 0 : v > 0;
  const arrow = v === 0 ? '•' : good ? '▲' : '▼';
  const sign = v > 0 ? '+' : v < 0 ? minus : '±';
  let txt;
  if (key === 'budgetCost') txt = `Budget ${minus}$${Math.abs(v)}M`;
  else if (key === 'mass') txt = `Mass +${v} kg`;
  else if (key === 'data') txt = `Data ${sign}${Math.abs(v)} GB`;
  else txt = `${RES_LABEL[key]} ${sign}${Math.abs(v)}${key === 'power' || key === 'fuel' ? '%' : ''}`;
  return { t: `${arrow} ${txt}`, tone: v === 0 ? 'neutral' : good ? 'good' : 'bad' };
}
const note = t => ({ t, tone: 'neutral' });

function fxChips(fx) {
  return ['science', 'data', 'power', 'fuel', 'risk'].filter(k => fx[k] !== undefined && fx[k] !== 0 || k === 'science' && fx[k]).map(k => chip(k, fx[k]));
}

function addLog(stage, title, chips, detail) {
  M.log.push({ stage, title, chips, detail: detail || '' });
}

// Applies resource deltas, then checks threshold consequences. Returns chips for the toast.
function applyFx(stage, title, fx, detail) {
  const chips = fxChips(fx);
  if (fx.power) M.power = Math.max(0, Math.min(100, M.power + fx.power));
  if (fx.fuel) M.fuel = Math.max(0, Math.min(100, M.fuel + fx.fuel));
  if (fx.science) M.science = Math.max(0, M.science + fx.science);
  if (fx.risk) M.risk = Math.max(0, M.risk + fx.risk);
  if (fx.data) { M.dataGenerated = Math.max(0, M.dataGenerated + fx.data); }
  // resource timeline for the debrief chart (transfer burns, scans, events, downlink)
  M.timeline.push({ stage, p: M.power, f: M.fuel, s: M.science, r: M.risk, d: M.dataStored });
  addLog(stage, title, chips, detail);
  return chips.concat(checkThresholds(stage));
}

function checkThresholds(stage) {
  if (M.power <= 0 && !M.failure) {
    M.failure = `Power depleted during ${stage.toLowerCase()} - the spacecraft browned out and lost contact.`;
    addLog(stage, 'POWER DEPLETED', [{ t: '✖ Spacecraft lost', tone: 'bad' }], 'Power reached 0%.');
    return [{ t: '✖ Spacecraft lost', tone: 'bad' }];
  }
  if (M.power < RULES.lowPower && !M.flags.lowPower) {
    M.flags.lowPower = true;
    const r = rk(10);
    M.risk += r;
    addLog(stage, 'Low power margin', [chip('risk', r)], `Power fell below ${RULES.lowPower}%: less margin for anomalies.`);
    return [chip('risk', r)];
  }
  return [];
}

// ---- Checkpoint: objective + site + validated design
function commitDesign(sel) {
  const d = computeDesign(sel);
  const v = VEHICLES[sel.vehicle], e = ENGINES[sel.engine], p = POWER_SYSTEMS[sel.power],
        th = THERMALS[sel.thermal], c = COMMS[sel.comms], n = NAVS[sel.nav],
        i = INSTRUMENTS[sel.payload], dt = DATASYS[sel.data];
  Object.assign(M, {
    selectedVehicle: v.id, selectedEngine: e.id, selectedPowerSystem: p.id, selectedThermal: th.id,
    selectedComms: c.id, selectedNav: n.id, selectedPayload: i.id, selectedData: dt.id,
    budgetUsed: d.budgetUsed, budget: budgetCap() - d.budgetUsed, mass: d.mass,
    power: d.power, fuel: d.fuel, communication: d.comm, storageGB: d.storage, risk: d.risk, science: 0,
    dataGenerated: 0, dataStored: 0, dataReturned: 0,
  });
  const obj = objective(), reg = site(), b = instrBonus(i);
  addLog('Objective', obj.name, [note(`Goal ${scienceGoal()} science`), note(`Data ×${obj.dataRate.toFixed(2)} GB/pt`)], obj.question);
  addLog('Target', reg.name, [note(reg.short), note(`Science ×${reg.sci}`)], reg.pitch);
  addLog('Design', v.name, [chip('budgetCost', v.cost), note(`Fuel ${d.fuel}%`), note(`Payload ≤ ${v.capacity} kg`), note(`Comm +${v.comm}`)]
    .concat(v.risk ? [chip('risk', rk(v.risk))] : []), `${v.antenna}. ${v.gain}; ${v.loss.toLowerCase()}.`);
  addLog('Design', e.name, [chip('budgetCost', e.cost), chip('mass', e.mass), note(`Burn fuel ×${e.fuelMult}`)], `${e.gain}; ${e.loss.toLowerCase()}.`);
  addLog('Design', p.name, [chip('budgetCost', p.cost), chip('mass', p.mass), note(`Power ${p.power}%`)]
    .concat(p.comm ? [note(`Comm +${p.comm}`)] : []).concat(p.risk ? [chip('risk', rk(p.risk))] : []),
    p.battery ? 'Battery absorbs most of the lunar-night power drain.' : p.gain + '.');
  addLog('Design', th.name, [chip('budgetCost', th.cost), chip('mass', th.mass), note(`Night drain ×${th.drainMult}`)], th.gain + '.');
  addLog('Design', c.name, [chip('budgetCost', c.cost), chip('mass', c.mass), note(`Comm +${c.comm}`)].concat(c.power ? [chip('power', -c.power)] : []), `${c.gain}; ${c.loss.toLowerCase()}.`);
  addLog('Design', n.name, [chip('budgetCost', n.cost), chip('mass', n.mass)].concat(n.power ? [chip('power', -n.power)] : []), `${n.gain}; ${n.loss.toLowerCase()}.`);
  addLog('Design', i.name, [chip('budgetCost', i.cost), chip('mass', i.mass), chip('power', -i.draw), note(`Scan science ${i.scan}${b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) + ' bonus' : ''}`)], i.role + '.');
  addLog('Design', dt.name, [chip('budgetCost', dt.cost), chip('mass', dt.mass), note(`Storage ${dt.storage} GB`)], dt.gain + '.');
}

// ---- Travel strategy, trans-lunar injection, lunar orbit insertion
const travelAllowed = (id, fuel = M.fuel, mass = M.mass, engine = M.selectedEngine) =>
  fuel - travelPlan(id, mass, engine).fuelTotal >= RULES.minArrivalFuel;

function setTravel(id) {
  const tp = travelPlan(id);
  M.travelMode = id;
  M.travel = tp;
  const d = destOf();
  addLog('Travel', tp.name, [note(`≈${MathX.fmtDuration(tp.hours)}`), chip('fuel', -tp.fuelTotal)].concat(tp.risk ? [chip('risk', tp.risk)] : []),
    `Estimated ${d.shortName} arrival ${MathX.fmtDuration(tp.hours, true)}; transfer propellant ${tp.fuelTotal}% (departure ${tp.tli}% + capture ${tp.loi}%).${d.modeRefs ? ' ' + (tp.modeRef || '') : ''}`);
  return tp;
}

function departEarth() {
  const tp = M.travel || setTravel('balanced');
  const d = destOf();
  M.flightPhase = 'TRANS_LUNAR_TRANSFER';
  return applyFx('Transfer', `${d.terms.inj} burn`, { fuel: -tp.tli, risk: tp.risk },
    `${tp.name}: ${tp.usage.toLowerCase()}-energy departure from Earth orbit - game model.`);
}

function arrive() {
  const tp = M.travel || setTravel('balanced');
  const d = destOf();
  const chips = [];
  if (tp.cruisePower) chips.push(...applyFx('Transfer', `Cruise systems (${MathX.fmtDuration(tp.cruiseHours)} coast)`, { power: -tp.cruisePower },
    'Heaters, attitude control and communications while coasting - game model.'));
  if (M.failure) return chips;
  if (d.flyby) {
    // Flyby destinations: no capture burn - a small targeting trim, then straight to the pass.
    M.flightPhase = 'FLYBY_APPROACH';
    const trim = Math.max(2, Math.round(tp.loi * 0.25));
    if (M.fuel < trim) {
      M.failure = `Not enough propellant for the ${d.terms.capture.toLowerCase()} trim (${M.fuel}% left, ${trim}% needed) - the pass geometry drifted off.`;
      addLog('Transfer', 'TARGETING TRIM FAILED', [{ t: `✖ ${d.terms.captureFail}`, tone: 'bad' }], M.failure);
      M.fuel = 0;
      return chips.concat([{ t: `✖ ${d.terms.captureFail}`, tone: 'bad' }]);
    }
    chips.push(...applyFx('Transfer', `${d.terms.capture} trim`, { fuel: -trim },
      `No capture burn on a flyby: a small trim sets the ${d.shortName} aimpoint (New Horizons hit ~100 km after 9.5 years).`));
    return chips;
  }
  M.flightPhase = 'LUNAR_ORBIT_INSERTION';
  if (M.fuel < tp.loi) {
    M.failure = `Not enough propellant for ${d.terms.capture.toLowerCase()} (${M.fuel}% left, ${tp.loi}% needed) - LUNARIS-01 ${d.terms.captureFail}.`;
    M.flags.missedCapture = true;
    addLog('Transfer', `${d.terms.capture.toUpperCase()} FAILED`, [{ t: `✖ Missed capture`, tone: 'bad' }], M.failure);
    M.fuel = 0;
    return chips.concat([{ t: '✖ Missed capture', tone: 'bad' }]);
  }
  chips.push(...applyFx('Transfer', `${d.terms.capture} burn`, { fuel: -tp.loi },
    `Braking burn for a ${tp.name.toLowerCase()} arrival (spacecraft mass ${M.mass} kg) - game model.`));
  if (!orbitAllowed('high') && !orbitAllowed('low')) {
    M.failure = `Captured by ${d.shortName}, but only ${M.fuel}% propellant is left - not enough to reach a stable science orbit.`;
    addLog('Transfer', 'NO SCIENCE ORBIT', [{ t: '✖ Orbit unreachable', tone: 'bad' }], M.failure);
  }
  return chips;
}

function orbitFx(id) {
  const f = rkFx(ORBITS[id].fx);
  f.fuel -= site().fuel;
  return f;
}
function orbitAllowed(id) { return M.fuel + orbitFx(id).fuel >= 0; }

function chooseOrbit(id) {
  M.selectedOrbit = id;
  const pc = site().fuel;
  const name = (destOf().orbits || {})[id] || ORBITS[id].name;
  const chips = applyFx('Orbit', name, orbitFx(id), ORBITS[id].desc + (pc ? ` Includes ${pc}% fuel to align the orbit over ${site().short.toLowerCase()}.` : ''));
  if (M.fuel < RULES.lowFuel && !M.flags.lowFuel) {
    M.flags.lowFuel = true;
    const r = rk(15);
    M.risk += r;
    addLog('Orbit', 'Thin propellant margin', [chip('risk', r)], `Fuel below ${RULES.lowFuel}%: little left for orbit corrections.`);
    chips.push(chip('risk', r));
  }
  return chips;
}

// ---- Hazards
// Light-time lag: at far destinations ground-in-the-loop responses cost more
// unless the response is your onboard kit (autonomy) or you carry a large
// high-gain antenna (autonomy-grade link). See lagFactor in destinations.js.
function hazardOptions(id, slot) {
  const h = HAZARDS[id];
  const opts = h.options(slot).map(o => {
    const lag = lagFactor(!!o.isKit);
    return Object.assign({}, o, {
      fx: scaleFxLag(rkFx(o.fx), lag),
      bad: o.bad ? scaleFxLag(rkFx(o.bad), lag) : null,
      lagged: lag > 1,
    });
  });
  const c = counterFor(h);
  if (c.selected && h.kit) opts.unshift(Object.assign({}, h.kit, { fx: rkFx(h.kit.fx), isKit: true }));
  return opts;
}

function resolveHazard(id, optId, slot, roll = Math.random()) {
  const h = HAZARDS[id];
  const opts = hazardOptions(id, slot);
  const o = opts.find(x => x.id === optId) || opts[0];   // unknown id (stale choice): fall back safely
  let fx = o.fx, outcome = null;
  if (o.chance != null) {
    roll += diff().luck;            // cadets are luckier, veterans less so
    const lucky = roll < o.chance;
    fx = lucky ? o.fx : o.bad;
    outcome = lucky ? 'lucky' : 'unlucky';
  }
  fx = Object.assign({}, fx);
  let sciNote = [];
  if (fx.science && slot === 2) { M.scanAdjust += fx.science; sciNote = [chip('science', fx.science)]; delete fx.science; }
  M.hazards.push({ slot, id, opt: optId, outcome });
  const title = `${h.name}: ${o.name}${outcome ? (outcome === 'lucky' ? ' - lucky miss' : ' - it hit') : ''}`;
  const idx = M.log.length;
  const chips = sciNote.concat(applyFx('Hazard', title, fx, outcome === 'lucky' ? 'The gamble paid off - no damage.' : o.desc));
  const logged = sciNote.concat(M.log[idx].chips);
  M.log[idx].chips = logged.length ? logged : [note('No damage')];
  if (!chips.length) chips.push(note('No damage'));
  return { chips, outcome };
}

// ---- Survey: science + data generation (storage cap applies)
function scanFx(id) {
  const s = SCANS[id], i = INSTRUMENTS[M.selectedPayload], reg = site();
  if (!i) return { science: 0, power: 0, risk: 0, _base: 0, _bonus: 0 };   // guard: no committed payload yet
  const base = Math.round(i.scan * s.mult * reg.sci * objMult());
  const bonus = instrBonus(i);
  return { science: Math.max(0, base + bonus), power: s.power, risk: rk(s.risk), _base: base, _bonus: bonus };
}

function runScan(id) {
  M.selectedObservation = id;
  const fx = scanFx(id);
  const i = INSTRUMENTS[M.selectedPayload];
  const adj = M.scanAdjust;
  const sci = Math.max(0, fx.science + adj);
  const rate = objective().dataRate;
  const generatedGB = Math.round(sci * rate * 10) / 10;
  const storedGB = Math.min(generatedGB, M.storageGB);
  const lostGB = Math.round((generatedGB - storedGB) * 10) / 10;
  const lostSci = Math.round(lostGB / rate);
  // fx.data is applied once inside applyFx (and logged); never add generatedGB here as well.
  const beforeStored = M.dataStored;
  M.dataStored = Math.min(M.storageGB, Math.round((M.dataStored + storedGB) * 10) / 10);
  M.storageLost = Math.round((M.storageLost + lostGB) * 10) / 10;
  const effSci = Math.max(0, sci - lostSci);
  const chips = applyFx('Survey', SCANS[id].name,
    { science: effSci, data: storedGB, power: fx.power, risk: fx.risk },
    `${i.name} ${fx._base}${fx._bonus ? ` ${fx._bonus > 0 ? '+' : '−'} ${Math.abs(fx._bonus)} bonus` : ''}${adj ? ` − ${-adj} lost to hazard` : ''} science · ${generatedGB} GB generated${lostGB > 0 ? `, ${lostGB} GB overflow lost (${lostSci} science)` : ''} - game model.`);
  if (lostGB > 0) M.flags.storageOverflow = true;
  return chips;
}

// ---- Mission event (deep night / eclipse heater load; RTG waste heat helps)
const hasBattery = () => POWER_SYSTEMS[M.selectedPowerSystem] && POWER_SYSTEMS[M.selectedPowerSystem].battery;
const hasRtg = () => POWER_SYSTEMS[M.selectedPowerSystem] && POWER_SYSTEMS[M.selectedPowerSystem].rtg;
function eventDrain() {
  const th = THERMALS[M.selectedThermal] || THERMALS.basic;
  const base = hasBattery() ? EVENT.batteryDrain : EVENT.drain;
  return Math.max(2, Math.round(base * th.drainMult * (hasRtg() ? 0.8 : 1) * site().drain * (scenario().drainMult || 1) * (M.travel ? M.travel.nightFactor : 1)));
}
function applyEventDrain() {
  return applyFx('Event', `${destOf().event.name} drain`, { power: -eventDrain() },
    hasBattery() ? 'Battery backup covered most of the heater load.' : hasRtg() ? 'The RTG\'s waste heat lightened the heater load.' : 'No battery: heaters drew directly from the power budget.');
}

function eventFx(id) {
  const sc = scenario();
  if (id === 'reduce') return { science: -10, power: 0, risk: -5 };
  if (id === 'reserve') return { science: 0, power: -(hasBattery() ? (sc.batteryReserve || EVENT.batteryReserve) : (sc.reserve || EVENT.reserve)), risk: 0 };
  return { science: +8, power: -8, risk: rk(20) };
}

function chooseEvent(id) {
  M.selectedEventResponse = id;
  const o = EVENT.options[id];
  return applyFx('Event', `${o.key} - ${o.name}`, eventFx(id), o.desc);
}

// ---- Transmission (RETURN): stored data -> returned data -> science
// Deep-space link budgets are worse: each destination adds a tx multiplier.
function txCost(id, comm = M.communication) {
  const base = id === 'full' ? 10 + (100 - comm) / 3 : 4 + (100 - comm) / 6;
  return Math.round(base * site().tx * destOf().txMult);
}
function txFx(id) {
  const mult = TRANSMISSIONS[id].mult;
  const weak = id === 'full' && M.communication < 65 ? 12 : 0;
  const risk = weak + site().txRisk;
  return { science: 0, power: -txCost(id), risk: risk ? rk(risk) : 0, _mult: mult };
}

function transmit(id) {
  M.selectedTransmission = id;
  M.collectedScience = M.science;
  const fx = txFx(id);
  const mult = fx._mult, cost = -fx.power;
  delete fx._mult;
  const returnable = Math.round(M.science * mult);
  const chips = [];
  if (cost > M.power) {
    // Brownout mid-transmission: only part of the data arrives.
    M.transmittedFraction = M.power / cost;
    const received = Math.round(returnable * M.transmittedFraction);
    fx.science = received - M.science;
    fx.power = -M.power;
    M.dataReturned = Math.round(M.dataStored * mult * M.transmittedFraction * 10) / 10;
  } else {
    fx.science = returnable - M.science;
    M.dataReturned = Math.round(M.dataStored * mult * 10) / 10;
  }
  const far = site().side === 'far' ? ` Far side: data stored and relayed when LUNARIS-01 rounds the limb.` : '';
  const delay = destOf().delayMin >= 15 ? ` One-way light time ${destOf().delayLabel}: the ground sees everything ${destOf().delayMin >= 120 ? 'hours' : 'minutes'} late.` : '';
  chips.push(...applyFx('Transmission', TRANSMISSIONS[id].name, fx,
    `Comm capability ${M.communication} (${commLabel(M.communication)}): link cost ${cost}% power.${far}${delay}`));

  if (!M.failure && M.risk >= RULES.riskHigh && M.risk < RULES.riskCritical) {
    const loss = Math.round(M.science * RULES.anomalyLoss);
    M.science -= loss;
    M.dataReturned = Math.max(0, Math.round((M.dataReturned - loss * objective().dataRate) * 10) / 10);
    M.flags.anomaly = loss;
    addLog('Transmission', 'High-risk anomaly', [chip('science', -loss)],
      `Risk ${M.risk} ≥ ${RULES.riskHigh}: a safe-mode interruption corrupted part of the data.`);
    chips.push(chip('science', -loss));
  }
  return chips;
}

const commLabel = c => (c >= 75 ? 'STRONG' : c >= 60 ? 'MODERATE' : 'WEAK');

// ---- Evaluation (deterministic given the mission state)
function objectives() {
  const goal = scienceGoal();
  return [
    { id: 'science', label: `Return ≥ ${goal} science to Earth`, ok: M.science >= goal, value: `${M.science}` },
    { id: 'power', label: `Spacecraft healthy (power ≥ ${RULES.healthyPower}%)`, ok: !M.failure && M.power >= RULES.healthyPower, value: `${M.power}%` },
    { id: 'fuel', label: `Fuel reserve ≥ ${RULES.fuelReserve}% for extended mission`, ok: M.fuel >= RULES.fuelReserve, value: `${M.fuel}%` },
  ];
}

function evaluate() {
  const reasons = [];
  const obj = objectives();
  let status;
  if (M.failure) {
    status = 'FAILURE'; reasons.push(M.failure);
  } else if (M.risk >= RULES.riskCritical) {
    status = 'FAILURE';
    reasons.push(`Mission risk reached ${M.risk} (critical ≥ ${RULES.riskCritical}). Stressed hardware entered permanent safe mode.`);
  } else if (M.science < RULES.partialMin) {
    status = 'FAILURE';
    reasons.push(`Only ${M.science} science returned - below the ${RULES.partialMin} needed for a meaningful result.`);
  } else if (obj.every(o => o.ok)) {
    status = 'SUCCESS';
    reasons.push(`All objectives met: ${M.science} science delivered and the spacecraft is healthy with fuel in reserve.`);
  } else {
    status = 'PARTIAL SUCCESS';
    reasons.push(`Data returned, but ${obj.filter(o => !o.ok).length} of 3 objectives missed.`);
  }
  if (status !== 'FAILURE') for (const o of obj) if (!o.ok) reasons.push(`Missed: ${o.label} - you ended with ${o.value}.`);
  for (const hz of M.hazards) {
    const h = HAZARDS[hz.id];
    reasons.push(`${h.name}: ${hz.opt === 'kit' ? 'your subsystem handled it' : hz.outcome === 'unlucky' ? 'the gamble failed' : hz.outcome === 'lucky' ? 'the gamble paid off' : 'handled at a cost'}.`);
  }
  if (M.flags.anomaly) reasons.push(`High risk cost ${M.flags.anomaly} science in a transmission anomaly.`);
  if (M.flags.storageOverflow) reasons.push(`The recorder overflowed: ${M.storageLost} GB of observations were lost before they could be sent.`);
  if (M.selectedTransmission === 'compressed' && status !== 'FAILURE') reasons.push('Compression saved power but discarded 25% of the data detail.');
  if (M.flags.lowFuel) reasons.push('A thin propellant margin raised mission risk.');
  if (M.flags.lowPower && !M.failure) reasons.push('Power dropped dangerously low, raising risk.');
  M.missionStatus = status;
  M.reasons = reasons;
  M.objectives = obj;
  return { status, reasons };
}

const riskLevel = r => (r >= RULES.riskCritical ? 'CRITICAL' : r >= RULES.riskHigh ? 'HIGH' : r >= 20 ? 'MODERATE' : 'LOW');

function strategyLabel() {
  let bold = 0, careful = 0;
  if (M.selectedOrbit === 'low') bold++; else careful++;
  if (M.selectedObservation === 'deep') bold++; if (M.selectedObservation === 'quick') careful++;
  if (M.selectedEventResponse === 'full') bold++; if (M.selectedEventResponse === 'reduce') careful++;
  if (M.selectedTransmission === 'full') bold++; else if (M.selectedTransmission) careful++;
  if (bold >= 3) return { name: 'SCIENCE-FOCUSED', next: 'Try a safety-focused run: higher orbit, Standard Scan and protect your margins.' };
  if (careful >= 3) return { name: 'SAFETY-FOCUSED', next: 'Try an efficiency-focused run: a Light rocket and a design under $65M.' };
  if (M.budgetUsed <= 65) return { name: 'EFFICIENCY-FOCUSED', next: 'Try a science-focused run: the objective\'s best instrument, low orbit and Deep Scan.' };
  return { name: 'BALANCED', next: 'Try another world or site: every destination rewards a different objective-instrument pairing.' };
}

// ---- LEARN: mission log persisted across runs for design comparison
const HISTORY = {
  KEY: 'lunaris-history',
  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; }
  },
  save(entry) {
    try {
      const list = this.load();
      list.unshift(entry);
      localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 6)));
    } catch (e) { /* storage unavailable */ }
  },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ } },
};

function recordRun() {
  if (!M.region || !M.objective) return;   // only record completed missions
  const score = computeScore();
  if (M.missionStatus === 'SUCCESS') ACH.award(M.dest || 'moon', score.total, score.grade);
  HISTORY.save({
    date: new Date().toISOString().slice(0, 10),
    status: M.missionStatus,
    score: score.total, grade: score.grade,
    mode: score.mode, diff: score.diff,
    science: M.science, goal: scienceGoal(),
    power: M.power, fuel: M.fuel,
    budget: M.budgetUsed, risk: M.risk,
    dest: destOf().shortName,
    objective: objective().name, region: site().short,
    travel: M.travel ? M.travel.short : '—',
    condition: scenario().name,
    instrument: M.selectedPayload ? INSTRUMENTS[M.selectedPayload].name : '—',
    storage: strategyLabel().name,
    hazards: M.hazards.length,
  });
}
