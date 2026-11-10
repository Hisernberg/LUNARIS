# Skill: qa-loop (self-evaluation to perfection)

The QA loop runs after every change: (1) static checks, (2) headless balance, (3) browser run, (4) fix + re-run.

## 1. Static checks (fast)
```bash
for f in src/*.js tools/*.js; do node --check "$f"; done
node tools/embed-csv.js        # regenerate the file:// fallback after ANY data/ change
```

## 2. Headless balance (no browser)
```bash
node tools/balance-check.js
```
Must print `✓ every objective × site × condition path is winnable with optimal play` and list 4 objective best-plans. If a path is unwinnable or a best score falls below ~85 (goal 70 + margin), re-tune the option tables — never the datasets.

## 3. Browser run
```bash
cd lunaris && python -m http.server 8123    # serve; or open index.html directly (file:// uses embedded CSVs)
```
Automated pass (Playwright/headless browser or the agent-browser skill):
1. TITLE renders; no console errors; datasets count shown.
2. EXPLORE: drag pans, wheel zooms, clicking a body tweens the camera + info card with tagged NASA values; click MOON → MOONVIEW.
3. BRIEFING → OBJECTIVE → TARGET → DESIGN: pick one option per group; craft visibly unfolds; tiles update.
4. DESIGN_REVIEW: fail a check deliberately (over-mass design) → NO-GO; fix → GO.
5. TRAJECTORY → LAUNCH (poll, countdown, liftoff) → TRANSFER (TLI/coast/LOI) → ORBIT → SURVEY (scan + hazard) → EVENT → TRANSMISSION → RESULT → REPORT.
6. REPORT: data chart generated ≥ returned; decision chains populated; history table appears on the second run.

## 4. Definition of done (from the GDD)
A player who knows nothing about mission design can complete a mission, understand the major decisions, see genuine NASA science represented visually (tagged), and explain why the final mission result happened.

## Common failure signatures
| Symptom | Likely cause |
|---|---|
| blank screen | JS error in boot order — check script tags in index.html |
| `data unavailable` rows | key not in dataset → use full `category|parameter` key |
| deploy animation stuck | `Game.foldAt[k]` not set (selection replaced, not new) |
| transfer never completes | `travelPlan()` returns huge hours — check EARTH_MOON injection at boot |
| unwinnable path in balance check | a rule/threshold was tightened without re-tuning costs |
