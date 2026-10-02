'use strict';
// Lighthouse CI for the landing page, mobile (Lighthouse's default: simulated slow 4G, 4x CPU slowdown).
// Run: npx lhci autorun   (CHROME_PATH must point at Chromium; see docs/qa/test-plan.md §6.3)
// Every threshold, the run count and the aggregation come from tests/perf/budget.json.
module.exports = require('./tests/perf/lhci-config.cjs').buildLhciConfig({ preset: 'mobile' });
