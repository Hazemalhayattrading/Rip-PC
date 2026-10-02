// The fixture suite for tests/audit/compat-trace.test.mjs. Its files are *.fixture.mjs, so the
// repo's own Vitest run never collects them; only this config does.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'node',
    include: ['src/**/*.fixture.mjs'],
  },
});
