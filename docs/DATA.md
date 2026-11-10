# LUNARIS - dataset provenance

The four original datasets came with the project upload and are kept verbatim. The eleven datasets
below were compiled for LUNARIS in Nov 2026; every row carries its `source_name` + `source_url`.
Values were verified against the sources during compilation; anything that could not be verified
precisely is marked approximate in `game_note` and tagged `ESTIMATE · UNCERTAIN` in-game.

| Dataset | Rows | Key sources (opened during compilation) |
|---|---|---|
| solar_system_bodies.csv | 119 | NASA NSSDCA Planetary Fact Sheet — https://nssdc.gsfc.nasa.gov/planetary/factsheet/ |
| planetary_orbital_elements.csv | 56 | JPL SSD, Keplerian Elements for Approximate Positions (Table 1, J2000) — https://ssd.jpl.nasa.gov/planets/approx_pos.html |
| lunar_landing_sites.csv | 23 | NASA NSSDCA Lunar Landing Sites (Apollo LM coords, Wagner et al. 2017 DE421) — https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html ; NASA/agency mission pages for robotic + CLPS landers |
| lunar_maria.csv | 14 | IAU/USGS Gazetteer of Planetary Nomenclature (Moon) — https://planetarynames.wr.usgs.gov/ |
| lunar_craters_named.csv | 13 | IAU/USGS Gazetteer; NASA NSSDCA ice pages for polar craters |
| lunar_polar_ice_evidence.csv | 9 | NSSDCA "Ice on the Moon"; NASA Mini-SAR press release (2010) — https://science.nasa.gov/missions/mini-rf/nasa-radar-finds-ice-deposits-at-moons-north-pole ; NASA Moon Water and Ices |
| lunar_resources.csv | 13 | NASA Science "Moon Composition"; Kulcinski et al. (1988) He-3 mining analysis (ADS) |
| moonquake_dataset.csv | 10 | Nakamura (1982) Apollo seismic final summary — http://adsabs.harvard.edu/full/1982LPSC...13..117N ; Onodera et al. (2024) JGR — 46 newly identified shallow moonquakes |
| lunar_temperature_profile.csv | 8 | NSSDCA Moon Fact Sheet; SSERVI "coldest place" (LRO Diviner); NASA LRO pit study |
| earth_moon_transfer_examples.csv | 9 | NASA Apollo flight journals / mission reports (TLI Δv ≈3.05 km/s, LOI ≈0.89 km/s); NASA Artemis I/II mission pages (Artemis II flew 2026-04-01, 9 d 1 h 32 m); NSSDCA Luna 2; CLPS updates |
| lunar_missions_history.csv | 31 | NASA NSSDCA spacecraft pages (per-row); NASA mission pages; agency releases |

Notes
- Apollo landing coordinates are exact NSSDCA values (DE421 ME/PA reference). Robotic/CLPS site
  coordinates are approximate and labelled as such (map placement only).
- He-3 abundance (4-10 ppb) and total reserve (~1M tonnes) are literature estimates — tagged
  ESTIMATE · UNCERTAIN everywhere they appear.
- Mini-SAR tonnage is a minimum estimate ("at least 600 million metric tons", NASA 2010).
- The game additionally derives values at runtime (radio delay, scale comparisons, Moon phase model);
  those display the `DERIVED FROM NASA` or `GAME MODEL` tag, never `NASA DATA`.
