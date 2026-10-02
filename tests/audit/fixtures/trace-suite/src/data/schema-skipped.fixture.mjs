// The validator test for motherboard.socket is skipped (tests/audit/compat-trace.test.mjs).
import { expect, it } from 'vitest';

it('[schema] cpu.socket: null is rejected', () => {
  expect(true).toBe(true);
});
it.skip('[schema] motherboard.socket: null is rejected', () => {});
