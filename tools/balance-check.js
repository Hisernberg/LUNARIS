#!/usr/bin/env node
// SUPERSEDED: the v3 solar-system expansion moved the model to src/destinations.js
// and this Moon-only harness no longer matches the load order. The authoritative
// headless balancer now lives at scripts/balance_dests.js — it enumerates every
// destination x objective x site x condition combo (480 paths) and proves each
// one is winnable. Run:  node scripts/balance_dests.js
console.log('tools/balance-check.js is superseded - run:  node scripts/balance_dests.js');
process.exit(0);
