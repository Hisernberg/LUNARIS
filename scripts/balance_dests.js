#!/usr/bin/env node
// LUNARIS balance sweep: verifies every (destination × objective × condition × difficulty)
// combination has at least one design that passes design review AND can reach full success
// (goal science returned, fuel reserve, healthy power) through an optimal no-hazard path.
// Prints failures with the binding constraint so numbers can be tuned.

const fs = require('fs');
const code = ['mathx.js', 'modes.js', 'state.js', 'destinations.js']
  .map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n;\n');

const harness = `
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
${code}
globalThis.__api = { DESTS, DEST_ORDER, OBJECTIVES, SCENARIOS, DIFFS, SITES, INSTRUMENTS, POWER_SYSTEMS,
  M, MODE_CFG, Game: { sel: {} }, validateDesign, computeDesign, budgetCap, scienceGoal, scanFx,
  instrBonus, travelPlan, txCost, eventDrain, objMult, site: () => SITES[M.region],
  RULES, THERMALS, TRANSMISSIONS, ORBITS };
`;
new Function(harness)();

const A = globalThis.__api;
const best = (obj) => Math.max(...Object.values(obj));
const topInstruments = (obj) => Object.entries(obj.instruments).filter(([, v]) => v >= best(obj.instruments)).map(([k]) => k);

let failures = 0, checked = 0;
const rows = [];

for (const destId of A.DEST_ORDER) {
  const d = A.DESTS[destId];
  for (const objId of d.objectives) {
    for (const scenId of Object.keys(A.SCENARIOS)) {
      for (const diffId of ['cadet', 'engineer', 'veteran']) {
        checked++;
        A.MODE_CFG.mode = 'career'; A.MODE_CFG.diff = diffId;
        A.M.dest = destId; A.M.objective = objId; A.M.scenario = scenId; A.M.region = null;
        A.M.selectedVehicle = null; A.M.selectedEngine = null; A.M.selectedComms = null;
        const goal = A.scienceGoal(), cap = A.budgetCap();
        let found = null;
        outer:
        for (const siteId of d.sites) {
          const reg = A.SITES[siteId];
          A.M.region = siteId;
          const bestPay = topInstruments(A.OBJECTIVES[objId]);
          for (const vehicle of Object.keys(A.SITES) && ['light', 'medium', 'heavy'])
          for (const engine of ['std', 'efficient', 'powerful', 'redundant'])
          for (const power of Object.keys(A.POWER_SYSTEMS))
          for (const thermal of Object.keys(A.THERMALS))
          for (const comms of Object.keys({ patch: 1, dish: 1, highgain: 1 }))
          for (const nav of ['imu', 'startrack', 'radhard'])
          for (const payload of Object.keys(A.INSTRUMENTS))
          for (const data of Object.keys({ compact: 1, large: 1, sealed: 1 })) {
            if (!bestPay.includes(payload)) continue;   // fit check requires the objective's best instrument(s)
            const sel = { vehicle, engine, power, thermal, comms, nav, payload, data };
            Object.assign(A.M, { selectedVehicle: vehicle, selectedEngine: engine, selectedPowerSystem: power,
              selectedThermal: thermal, selectedComms: comms, selectedNav: nav, selectedPayload: payload, selectedData: data });
            const v = A.validateDesign(sel);
            if (!v.ok) continue;
            const design = v.design;
            // optimal no-hazard mission path: any travel mode, any orbit, one scan, event, best affordable tx
            for (const modeId of ['efficient', 'balanced', 'fast']) {
              const tp = A.travelPlan(modeId, design.mass, engine);
              let fuel = design.fuel - tp.fuelTotal;
              if (fuel < A.RULES.minArrivalFuel) continue;
              A.M.travel = tp;
              A.M.communication = design.comm;
              for (const orbitId of ['high', 'low']) {
                const fuel2 = fuel + A.ORBITS[orbitId].fx.fuel - reg.fuel;
                if (fuel2 < A.RULES.fuelReserve) continue;
                for (const scanId of ['standard', 'deep']) {
                  const fx = A.scanFx(scanId);
                  const sci = Math.max(0, fx.science) + (A.ORBITS[orbitId].fx.science || 0);
                  const rate = A.OBJECTIVES[objId].dataRate;
                  const genGB = sci * rate;
                  const lost = Math.max(0, genGB - design.storage);
                  const effSci = Math.max(0, sci - Math.round(lost / rate));
                  const powerEnd = design.power - Math.abs(fx.power) - A.eventDrain();
                  for (const txId of ['compressed', 'full']) {
                    const cost = A.txCost(txId);
                    const p2 = powerEnd - cost;
                    if (p2 < A.RULES.healthyPower) continue;
                    const returned = Math.round(effSci * A.TRANSMISSIONS[txId].mult);
                    if (returned >= goal) {
                      found = { siteId, sel, cost: design.budgetUsed, cap, goal, sci: returned, scan: scanId, tx: txId,
                        powerEnd: p2, fuelEnd: fuel2, risk: design.risk };
                      break outer;
                    }
                  }
                }
              }
            }
          }
        }
        if (!found) {
          failures++;
          rows.push(`  ✗ ${destId} / ${objId} / ${scenId} / ${diffId}  (goal ${goal}, cap $${cap}M)`);
        } else if (process.argv.includes('-v')) {
          const f = found;
          console.log(`  ✓ ${destId}/${objId}/${scenId}/${diffId}: $${f.cost}M ${Object.values(f.sel).join('+')} @ ${f.siteId} ${f.scan} ${f.tx} → ${f.sci}/${f.goal} sci, ${f.powerEnd}% pwr, ${f.fuelEnd}% fuel, risk ${f.risk}`);
        }
      }
    }
  }
}

console.log(`\nchecked ${checked} combos · ${failures} infeasible`);
if (failures) { console.log('INFEASIBLE:'); console.log(rows.join('\n')); process.exit(1); }
console.log('ALL FEASIBLE ✓');
