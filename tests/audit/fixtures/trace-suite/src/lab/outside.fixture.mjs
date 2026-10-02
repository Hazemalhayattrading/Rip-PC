// A rule-like test outside the test root: compat-trace must not count it.
import { expect, it } from 'vitest';

it('[cpu-socket] ok: counted only under src/engine', () => {
  expect(true).toBe(true);
});
