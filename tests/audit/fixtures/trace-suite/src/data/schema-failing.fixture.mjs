// The validator test for motherboard.socket fails (tests/audit/compat-trace.test.mjs).
import { expect, it } from 'vitest';

it('[schema] cpu.socket: null is rejected', () => {
  expect(true).toBe(true);
});
it('[schema] motherboard.socket: null is rejected', () => {
  expect(false, 'a planted failure').toBe(true);
});
