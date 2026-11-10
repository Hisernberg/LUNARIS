# Skill: origami-craft (spacecraft engineering layer)

Purpose: the spacecraft is the main engineering puzzle; it must visibly transform as it is engineered.

## Model side (src/state.js)
- Eight subsystem groups, each a table of trade-offs: `VEHICLES, ENGINES, POWER_SYSTEMS, THERMALS, COMMS, NAVS, INSTRUMENTS, DATASYS`.
- Every option declares `cost`, `mass` (or `propellantMass`), and effects; gains/losses are shown to the player BEFORE committing (`▲ benefit / ▼ cost` chips).
- `computeDesign(sel)` aggregates: budget, mass vs vehicle capacity, power (system output − payload/comms/nav/data draws), fuel, comm, storage, science potential. Nothing else may derive design stats.
- `validateDesign(sel)` produces the review checks: budget, mass, power, mission fuel, plus an informational objective-fit row. Critical checks are the first four; objective fit never blocks launch.
- Hazard counters live inside subsystems: meteoroid → `THERMALS.armor`, leak → `ENGINES.redundant`, seu/flare → `NAVS.radhard`, dust → `DATASYS.sealed`. `counterFor()` maps a hazard to the installed counter via `SELECT_KEYS`.
- Data is a first-class resource: scans generate GB (`objective().dataRate` × science); anything above `DATASYS.*.storage` is lost (`M.storageLost`) and reported in the debrief.

## Visual side (src/render_core.js)
- `Draw.spacecraft(ctx, x, y, s, ang, cfg, t, {deploy, tint, thrust})` renders the craft from subsystem ids.
- Unfold animation: modules `power, comms, payload, data` have per-module deploy 0→1 (`Game.foldAt[k]` timestamp → `Game.deploys[k]`, eased out). A new selection in `Game.sel` that was previously null triggers `Sfx.fold()` + a `FOLD +` flash.
- Thermal armor/radiator, nav pod, engine nozzle and redundant tank render conditionally on ids — keep them in sync when adding options.
- Craft config always comes from `Draw.craftCfg()` (committed design before launch, live selection after). Do not read `Game.sel` inside draw functions directly.

## Balance workflow
1. Edit option tables.
2. `node tools/balance-check.js` — must print "every objective × site × condition path is winnable with optimal play".
3. Target: optimal play wins everywhere; a random valid design wins ~15-35% of paths.
4. Keep the cheapest full design ≤ ~$65M (usable under the $80M budget cut) and the most expensive around $167M (never usable) — the spread IS the lesson.
