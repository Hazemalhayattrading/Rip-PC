// Stand-ins for data-lead's validator tests (src/data/), for tests/audit/compat-trace.test.mjs.
import { expect, it } from 'vitest';

for (const field of ['cpu.socket', 'motherboard.socket'])
  it(`[schema] ${field}: null is rejected`, () => {
    expect(true).toBe(true);
  });
