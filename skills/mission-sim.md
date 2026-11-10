# Skill: mission-sim (operate/return loop + evaluation)

Purpose: the mission must play end-to-end, propagate decisions into consequences, and explain the result.

## State machine (src/game.js)
`TITLE → EXPLORE → MOONVIEW → BRIEFING → OBJECTIVE → TARGET → DESIGN → DESIGN_REVIEW →
TRAJECTORY → LAUNCH → TRANSFER → ORBIT_DECISION → SURVEY → MISSION_EVENT → TRANSMISSION → RESULT → REPORT`

- `Game.go(state)` switches state; `ENTER[state]` runs setup; `Game.setPhase()` handles sub-steps (choose → animating → done).
- TRANSFER flight phases: `parking → tli → cruise → loi → arrived`, mirrored in `M.flightPhase`. Fuel is deducted at TLI (`departEarth`) and LOI (`arrive`).
- Timed transitions live in `update(dt)`; UI panels rebuild only on state/phase/selection change (never per frame).
- Hazards: slot 1 during transfer (probability = `travelPlan().hazardChance`), slot 2 mid-survey. `startHazard(slot)` pauses the current phase (`Game.hazard.resume`); progress clocks use `Draw.progressT(phase)` so they freeze while a hazard is open.
- Hazards pool: meteoroid, leak, seu, flare, dust, quake. Odds via `hazardWeights(slot)` (condition, vehicle, orbit, exposure). Some options are gambles with visible odds (`chance`/`bad`).

## Decision → consequence propagation (src/state.js)
- `applyFx(stage, title, fx, detail)` is the single path for resource changes; it logs to `M.log` (the debrief reads this) and fires threshold consequences (power 0 = lost; low power/fuel raise risk).
- Solar Maximum multiplies every positive risk increase (`rk()`).
- Science losses during the survey reduce the scan result (`M.scanAdjust`) so hazards mid-scan remain visible in the final number.
- Transmission: `txCost()` (comm capability + site) → power cost; compressed discards 25%; brownout sends only a fraction (`M.transmittedFraction`); risk ≥ 40 corrupts 20%.
- `evaluate()` is deterministic from M: SUCCESS needs science ≥ goal AND power ≥ 15 AND fuel ≥ 10; risk ≥ 75 or power 0 or science < 40 = FAILURE; else PARTIAL. Reasons list must explain every missed objective and every hazard outcome.
- On REPORT entry: `recordRun()` stores the run in localStorage (`HISTORY`, last 6) for the LEARN comparison table.

## QA workflow
1. `node tools/balance-check.js` (headless enumeration, see skills/origami-craft.md).
2. Serve: `python -m http.server 8123` → http://localhost:8123.
3. Playwright/manual pass: mission start → site selection → design → validation → simulation → transmission → report; verify no console errors, all buttons reachable, every number tagged.
4. After any CSV edit: `node tools/embed-csv.js` first.
