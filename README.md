<div align="center">

# 🌙 LUNARIS: Design Beyond Earth

**Explore the solar system. Choose the mission. Engineer the spacecraft. Discover the consequences.**

*NASA Space Apps Challenge 2026 · Challenge: Space Mission Design Game*

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?logo=javascript&logoColor=black)
![Canvas 2D](https://img.shields.io/badge/Canvas_2D-procedural-0b3d6e)
![Web Audio](https://img.shields.io/badge/Web_Audio-synthesized-0b3d6e)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![NASA data](https://img.shields.io/badge/NASA_data-15_datasets_·_396_values-1f6feb)

</div>

---

LUNARIS is the next generation of the LUNA-01 Mission Control prototype: a browser game in which the
player **explores a living solar system**, selects a **lunar science objective and destination**,
**engineers a specialized spacecraft** through an Origami-inspired interface, simulates the mission,
and receives a **visual scientific debrief** explaining why the mission succeeded or failed.

> **The Moon does not adapt to your spacecraft. Your spacecraft must adapt to the Moon.**

## The seven-phase experience (one continuous engineering story)

| Phase | What the player does | Where |
|---|---|---|
| 1 · EXPLORE | Navigate planets and natural satellites with smooth camera travel; open real-data info cards | solar-system layer (Keplerian positions) |
| 2 · CHOOSE | Define the science objective (mapping / composition / radiation / water-ice) and the lunar site | 6 sites × 4 objectives |
| 3 · ENGINEER | Configure the spacecraft: 8 subsystem groups unfold on the craft as you choose them | origami interface |
| 4 · OPERATE | Launch, transfer, orbit, survey, survive hazards | full mission simulation |
| 5 · RETURN | Manage data storage and the downlink home | data-constrained transmission |
| 6 · EXPLAIN | Read a visual mission report: route, environment, data flow, decision chains | debrief layer |
| 7 · LEARN | Compare your last designs run-over-run | mission history table |

**Every interaction answers three questions visually: what changed? why did it change? what does it affect next?**

## Play it right now

**▶ https://hisernberg.github.io/LUNARIS/** — the game is deployed live on GitHub Pages
(all 15 datasets load over https; the same build also works offline — see below).

## v2 · MISSION CONTROL — ways to play

| Mode | What it is |
| --- | --- |
| **Solo Career** | The full mission loop with score, grade (S–D) and Hall of Fame. |
| **Team Mission (2–4, hot-seat)** | Pass one console around: Mission Director, Spacecraft Engineer, Science Lead and Operations each *own* their calls; screens hand over automatically and the owner commits every decision. |
| **Sandbox** | $150M, pick your own condition, generous margins — experiment freely. |
| **Challenge codes** | `COPY MISSION CODE` packs a complete design (difficulty, condition, objective, site, all subsystems) into one URL. Send it to a friend: same design, who flies it better? Codes auto-load from `#m=…` links. |

**Difficulties:** CADET (helpful, forgiving) · ENGINEER (the designed experience) · VETERAN (tight budget, harsher odds, ×1.35 score). The composite score is fully transparent — every point line (science, status, budget efficiency, margins, risk control, hazard handling, team synergy) is shown in the debrief.

**Also in v2:** autosave + RESUME, first-run coaching tips per phase, a 19-term mission glossary (`?`), a resource-timeline chart (power/fuel/science/risk across the whole mission) in the report, a local Hall of Fame, reduced-motion support and keyboard access (1–4 pick options, M mute, ? glossary).

## v3.1 · ONBOARDING & JUDGE SURFACES

- **60-second first-run briefing** — four cards (the loop, engineering, flying, scoring) shown once per browser; skip/finish/ESC all dismiss it for good. Built for anyone opening the app cold: judges, students, family.
- **Mission Atlas** (`MISSION ATLAS · 10 WORLDS` on the title) — every flyable world on one comparison screen: budget, one-way light time, balanced transit, solar flux, gravity, option counts and the one-line pitch, tier-sorted. The "same loop, re-priced physics" story in a single glance.
- **About · Challenge Alignment** — what the game is, the five things it teaches, all 15 NASA datasets with the live value count, and the classroom/accessibility story (offline zip, hot-seat crew, difficulty tiers, glossary).

## Play it in 30 seconds

No installation, no build step, no internet connection needed.

- **Double-click `index.html`** — works on `file://` (uses embedded copies of the CSVs).
- **Or serve it** (recommended for demos): `python -m http.server 8123` → <http://localhost:8123>.

| Control | Action |
|---|---|
| Mouse / click | Explore, choose options |
| Drag / scroll | Pan + zoom the solar system |
| `1`–`5` or `A`–`D` | Pick decision options |
| `Esc` | Defocus in the explore layer |
| `M` | Toggle sound |

## What's new vs. LUNA-01 Mission Control

| Area | LUNA-01 | LUNARIS |
|---|---|---|
| Opening | Menu | Interactive solar system with camera travel |
| Mission definition | 1 of 5 fixed targets | 4 science objectives × 6 sites with data-driven fit |
| Engineering | 4 slots | 8 subsystem groups (vehicle, propulsion, power, thermal, comms, navigation, payload, data) with visible origami deployment |
| Data | abstract "science" | GB storage/recorder/downlink economics with generated-vs-returned debrief charts |
| Hazards | 5 | 6 (adds deep moonquake swarms grounded in the Apollo seismic dataset) |
| Debrief | stats + log | visual report: route, environment strip, data-flow chart, decision-impact chains |
| Replay | new run | run history comparison (LEARN) |
| Datasets | 4 CSVs | 15 CSVs (~396 sourced values) |

## NASA data and scientific honesty

Every displayed value carries a confidence tag and source tooltip:

| Tag | Meaning |
|---|---|
| `NASA DATA` | value as given by the NASA source |
| `NASA · APPROX.` | the source marks it approximate |
| `NASA · QUALITATIVE` | the source only gives a qualitative value |
| `ESTIMATE · UNCERTAIN` | literature/model estimate, low confidence |
| `DERIVED FROM NASA` | computed from NASA values |
| `LAB SIMULANT` | measured on simulant, not real Moon dust |
| `GAME MODEL` | simplified gameplay number — **never** a NASA measurement |

Dataset inventory (provenance in [docs/DATA.md](docs/DATA.md)): the four original
datasets (environment, dust, orbit, regions) + eleven new ones built for LUNARIS: planetary fact-sheet
bodies, JPL Keplerian elements, landing sites, maria, craters, polar-ice evidence, ISRU resources,
Apollo moonquake catalog, temperature profile, Earth-Moon transfer examples, and a lunar mission
history (Luna 1 → Artemis II) — plus a raw scientific reference dataset in `data/raw/`:
the full Robbins lunar crater database (384,278 craters ≥ 1 km, USGS v1, not loaded by the runtime).

## Architecture

```
index.html / style.css     page shell + mission-operations UI (1280x720 stage, scaled)
data/*.csv                 the 15 NASA-sourced datasets (authoritative)
data/embedded.js           generated file:// fallback (node tools/embed-csv.js)
src/data.js                CSV loader/parser, confidence tags, value formatting
src/mathx.js               vectors, easing, noise, bezier, Kepler solver
src/astro.js               Moon phase / planet positions / epoch clock
src/state.js               objectives, sites, subsystems, travel, hazards, formulas, evaluation
src/audio.js               procedural Web Audio music + effects
src/render_core.js         stars, procedural globes, solar-system layer, camera, origami spacecraft
src/render_scenes.js       one procedural scene per game state + launch timeline + debrief visuals
src/ui.js                  HUD, tracker, decision panels, debrief report, history (LEARN)
src/game.js                state machine, input, main loop, boot
skills/*.md                knowledge layer: data, craft, sim, visuals, QA loop
tools/embed-csv.js         regenerate embedded copies
tools/balance-check.js     headless enumeration of every objective × site × condition path
```

Runtime decision: HTML5 + CSS3 + vanilla JS + Canvas 2D + Web Audio (the GDD's runtime row), with the
rendering isolated in `render_core.js` so a Phaser 4 renderer can be dropped in behind the same scene
API. Zero dependencies keeps the game runnable offline from `file://` — important for judges.

## Balance and testing

- `tools/balance-check.js` loads the real datasets + model in Node and enumerates every
  objective × site × condition × design × travel × orbit × scan × event × transmission path
  (2.68 million paths). Result: **every path is winnable with optimal play**; the best plans per
  objective land at 95-119 science against goals of 70-80.
- A random valid design played perfectly afterwards wins ~30% of paths — the right designs matter.
- `src/state.js` holds every gameplay number, labelled as a simplified game model.

## Assumptions and limitations

- Travel/orbit/launch sequences are stylised animations calibrated to historical references
  (Apollo 8/11, Artemis I/II, Chang'e 5, Blue Ghost) — not a physics-grade orbital simulation.
- Planet sizes in the solar-system view are log-scaled for visibility; orbit positions use simplified
  Keplerian elements (epoch J2000). Captions state this on-screen.
- Some site coordinates (polar and far-side, recent commercial landers) are approximate and labelled so.
- Gameplay numbers (budget, power, fuel, data, risk) are a transparent simplified model, never NASA data.
