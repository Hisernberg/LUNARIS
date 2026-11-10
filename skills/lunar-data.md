# Skill: lunar-data (NASA dataset layer)

Purpose: every displayed lunar/solar-system value must be traceable to a dataset row.

## Hard rules
- The CSVs in `data/` are authoritative. Never edit a value inside the game code; the game reads rows by key.
- Every displayed value goes through `NasaData.show(key, ds)` or `dRow(label, key, ds)` in `src/ui.js`, which attaches the confidence tag and source tooltip.
- Never present a game-derived number as a NASA measurement. The tag vocabulary (`src/data.js`):
  `nasa` (NASA DATA), `approx` (NASA · APPROX.), `qual` (NASA · QUALITATIVE), `estimate` (ESTIMATE · UNCERTAIN),
  `derived` (DERIVED FROM NASA), `lab` (LAB SIMULANT), `game` (GAME MODEL).
- Two schemas exist:
  - generic: `category,parameter,value,unit,game_note,source_name,source_url` — lookup key is `parameter` or `category|parameter` (use the full form when parameter names repeat, e.g. `Earth|Escape velocity`).
  - spatial (sites / maria / craters / history): keyed by the name column (`site`, `name`, `mission`).
- `data/embedded.js` is generated. After ANY dataset change run: `node tools/embed-csv.js`.
- When a new dataset is added: register it in `DATASETS` in `src/data.js`, re-run the embedder, and add at least one facts-feed entry in `src/ui.js` so the data is visible to players.

## Dataset inventory (15)
| id | file | used for |
|---|---|---|
| moon | moon_environment_dataset.csv | gravity, temperature, water, radiation, atmosphere |
| dust | moon_dust_dataset.csv | regolith/dust properties, dust hazard grounding |
| orbit | earth_moon_orbital_dataset.csv | travel distances, rotation periods, spin, radio delay |
| regions | moon_regions_non_polar_dataset.csv | Apollo coordinates, pits, crust, chemistry |
| bodies | solar_system_bodies.csv | exploration layer info cards (planets, Moon, Pluto) |
| elements | planetary_orbital_elements.csv | Kepler positions in the solar-system view |
| sites | lunar_landing_sites.csv | site markers + mission history map |
| maria | lunar_maria.csv | map features, facts |
| craters | lunar_craters_named.csv | map features, site data (Aristarchus) |
| ice | lunar_polar_ice_evidence.csv | water objective grounding |
| resources | lunar_resources.csv | composition objective grounding |
| quakes | moonquake_dataset.csv | quake hazard grounding, facts |
| temps | lunar_temperature_profile.csv | thermal/night event grounding |
| transfers | earth_moon_transfer_examples.csv | travel-strategy calibration narrative |
| history | lunar_missions_history.csv | context, facts |

## Adding a value
1. Verify it against a real source (open the page). Record `source_name` + `source_url` in the row.
2. Mark estimates in `game_note` ("estimate", "could be off considerably") so `classify()` tags them honestly.
3. Re-run `node tools/embed-csv.js`, then `node tools/balance-check.js` (some rows feed the model).
