# Raw reference dataset: Robbins lunar crater database

- File: `lunar_craters_robbins_full.csv` — 384,278 impact craters with id, latitude, longitude,
  diameter (km), depth (km) and size class.
- Retrieved from the Hugging Face mirror `juliensimon/lunar-craters-robbins`
  (file `data/lunar_craters.parquet`, 2026-11-10).
- Original source: **Moon Crater Database v1 Robbins** (S.J. Robbins, 2019), published by the
  USGS Astrogeology Science Center ("A new global database of lunar impact craters >1-2 km").
  Official page: https://astrogeology.usgs.gov/search/map/moon_crater_database_v1_robbins
- This folder is NOT loaded by the game runtime and NOT embedded for file:// play; it is shipped
  as a raw scientific reference for judges and developers (the 15 in-game datasets stay in `data/`).
