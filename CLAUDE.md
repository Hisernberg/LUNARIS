# LUNARIS - notes for AI assistants

Spec: LUNARIS_GDD (Design Beyond Earth). Data: the 15 CSVs in `data/` (authoritative; never edit values in code).

## Hard constraints
- Vanilla HTML/CSS/JS + Canvas 2D + Web Audio only. No frameworks, engines, backend, image or audio files.
- Every visual is procedural (`src/render_core.js` + `src/render_scenes.js`); every sound is synthesized (`src/audio.js`).
- Classic `<script>` tags (not ES modules) so the game runs from `file://`.
  Globals: `NasaData`, `MathX`, `Astro`, `M` + option tables, `Sfx`, `Draw`, `Scenes`, `UI`, `Game`.
- The 7-phase flow is the product: EXPLORE → CHOOSE → ENGINEER → OPERATE → RETURN → EXPLAIN → LEARN.
  Don't cut phases; extend them.

## Scientific honesty
- Lunar/solar values are shown only via `NasaData.show(key, ds)` / `dRow()` with a confidence tag.
  15 datasets are registered in `src/data.js`; spatial datasets key on their name column, generic ones on `parameter` or `category|parameter`.
- Gameplay numbers live in `src/state.js` and are labelled "game model" in the UI. Never present them as NASA measurements.
- If any CSV changes: `node tools/embed-csv.js` to regenerate `data/embedded.js`.

## Architecture
- `Game.go(state)` switches state; `ENTER[state]` runs setup; `Game.setPhase()` handles sub-steps.
- Engineering: 8 tables in state.js; `computeDesign`/`validateDesign` are the only stat aggregators; hazard counters map via `counterFor()`; deploy animation state is `Game.deploys`/`Game.foldAt`.
- Travel: `travelPlan(id, mass, engine)` (time, fuel split TLI/LOI, cruise power, risk, night factor, transit-hazard chance). `departEarth()` and `arrive()` spend the fuel. Earth-Moon distances injected from the orbit CSV at boot (`setEarthMoon`).
- Launch timeline `Scenes.LT`: pre-launch poll → T-5 countdown → ignition. Nothing lifts off before T-0.
- Hazards: `startHazard(slot)` pauses the phase (`Game.hazard.resume`); clocks use `Draw.progressT(phase)` to freeze.
- Data model: `runScan` generates GB = science × `objective().dataRate`, capped by the recorder (`M.storageGB`); overflow is lost and reported; downlink converts stored → returned.
- Debrief: `evaluate()` (deterministic), `decisionChains()` + `dataChart()` in ui.js, canvas visuals in `Scenes.SCENES.RESULT`.
- LEARN: `HISTORY` (localStorage, last 6 runs) → comparison table in the report.
- Canvas is a fixed 1280x720 stage scaled by `fit()`. Decision panels occupy x≥790; keep scene content left of that.
- Explore layer: `Draw.Cam` (tween camera), `Draw.hitTest(x, y)` for picking, `Astro.planetPos` for positions from the elements dataset.

## Testing
- `node tools/balance-check.js` — must keep every objective × site × condition path winnable with optimal play.
- Serve with `python -m http.server 8123`; run the browser QA pass in skills/qa-loop.md.
- Earth/Moon are equirectangular maps built in `Draw.init()` (~1.2 s), wrapped onto spinning globes via
  size-bucketed lookups; a globe re-renders only when its longitude moves a texel. Keep frames at a few ms.
- Spin: `Draw.earth(ctx,x,y,r,hours)`, `Draw.moon(ctx,x,y,r,{lon})`. Journey scenes use MET-based spin, others the 4 h/s time-lapse. Target/survey/transmission Moon stays static (markers).
