# Skill: visual-fidelity (rendering rules)

Purpose: cinematic, high-fidelity 2D scientific visualization — explicitly NOT pixel art / 8-bit / CRT / arcade-retro.

## Non-negotiable look rules (from the GDD)
- No pixel art, no 8-bit, no deliberate retro treatment. Smooth gradients, soft glows, restrained mission-control UI.
- Everything is procedural (`src/render_core.js`): no image files, no sprite sheets. Earth and Moon are generated pixel-by-pixel at boot (noise terrain, crater height maps, baked relief shading) and wrapped onto spinning spheres via per-pixel lookups.
- Rotation periods come from the orbital dataset (`Draw.earthLon/moonLon`); journey scenes spin on mission elapsed time, others on a labelled 1 s = 4 h time-lapse. Survey/target/transmission views keep the Moon still so site markers stay put.
- The solar-system layer (`Draw.solarSystem`) uses simplified Keplerian positions from `planetary_orbital_elements.csv` with log-scaled planet sizes. The "not to scale" caption is mandatory — never let a stylised visual masquerade as data.
- Camera: `Draw.Cam` tweens position+zoom (explore layer), `journeyCam()` blends Earth→wide→Moon framings during transfer.

## Layers
| Layer | Responsibility |
|---|---|
| World | Solar system, celestial bodies, sites, environmental effects |
| Craft | Procedural spacecraft geometry + animated deployment (see skills/origami-craft.md) |
| Motion | Camera travel, zoom, orbit, launch, scanning, downlink |
| UI | Mission HUD, engineering panels, selection states, telemetry (DOM overlay) |
| Science | Maps, charts, thermal/radiation/illumination visualizations |
| Report | Visual mission reconstruction + decision analysis |

## Performance budget
- Globes re-render only when their longitude moves a texel (size-bucketed 128/256/512 px lookups).
- Frame target: a few ms per frame; particles capped at 600; panel DOM rebuilt only on state change.
- Canvas is a fixed 1280x720 logical stage scaled to the window (`fit()`); keep scene content left of the decision panel (panel starts at x≈790).

## Adding a scene
1. Add `SCENES.<STATE>` in `src/render_scenes.js`, register the state in `ENTER` + `STAGE_INFO` (tracker label) and add a `P.<STATE>` panel in `src/ui.js`.
2. Reuse primitives (`background, grid, tag, stamp, glow, route, orbitHalf`) instead of ad-hoc drawing.
3. Verify in the browser QA loop (skills/qa-loop.md) and check the frame stays smooth during the longest scene (TRANSFER).
