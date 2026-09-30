'use strict';
// Lighthouse CI for the landing page, desktop preset.
// Run: npx lhci autorun --config=./lighthouserc.desktop.cjs
// Every threshold, the run count and the aggregation come from tests/perf/budget.json.
module.exports = require('./tests/perf/lhci-config.cjs').buildLhciConfig({ preset: 'desktop' });
